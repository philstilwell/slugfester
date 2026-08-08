#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import { validateV42219ChunkLedger } from "./lib/v42219-generalized-partition.mjs";

const ROOT = "docs/assessment-production/canary-v1-discovery";
const manifest = JSON.parse(await readFile(`${ROOT}/execution-manifest.json`, "utf8"));
const codex = manifest.executionEnvironment.codexPath;
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

assertV4(
  manifest.status === "frozen-thirty-six-production-canary-discovery-contexts-authorized" &&
    manifest.productionCanary === true &&
    manifest.stagingOnly === true &&
    manifest.authorization.modelContexts === true &&
    manifest.contexts.length === 36 &&
    manifest.executionPolicy.maximumParallelContexts === 4 &&
    JSON.stringify(manifest.executionPolicy.schedulerRamp) === JSON.stringify([1, 2, 4]) &&
    manifest.executionPolicy.rampOneServesAsOperationalCanary === true &&
    manifest.executionPolicy.retriesMaximum === 0,
  "production canary discovery execution is unauthorized"
);
assertV4(
  execFileSync(codex, ["--version"], { encoding: "utf8" }).trim() ===
    manifest.executionEnvironment.codexCliVersion,
  "the frozen Codex CLI version changed"
);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
}
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(future)), `future output already exists: ${future}`);
}
await access(codex);
await access(authSource);

function run(command, args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let forceTimer = null;
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000);
    }, timeoutMs);
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (forceTimer) clearTimeout(forceTimer);
      resolve({ code, signal, stdout, stderr, timedOut });
    });
  });
}

const preparation = JSON.parse(await readFile(manifest.preparation, "utf8"));
let activeContexts = 0;
let maximumParallelContextsObserved = 0;
const gateStartedAt = new Date().toISOString();
const gateStarted = Date.now();
const gateDeadline = gateStarted + manifest.executionPolicy.absoluteGateTimeoutMs;

async function executeContext(context, contextIndex) {
  const debate = preparation.contexts.find((item) => item.debateNumber === context.debateNumber);
  const chunk = debate.chunks.find((item) => item.chunkId === context.chunkId);
  validateV42219ChunkLedger(
    await readFile(context.chunkLedgerPath),
    await readFile(context.fullLedger),
    chunk
  );
  const remainingGateMs = gateDeadline - Date.now();
  assertV4(remainingGateMs > 0, "absolute discovery gate timeout reached before context launch");
  const contextTimeoutMs = Math.min(manifest.executionPolicy.timeoutMsPerContext, remainingGateMs);
  const temporary = await mkdtemp(
    path.join(os.tmpdir(), `slugfester-production-discovery-${context.debateNumber}-${context.chunkId}-`)
  );
  const isolatedCodexHome = await mkdtemp(
    path.join(os.tmpdir(), `slugfester-production-discovery-home-${context.debateNumber}-${context.chunkId}-`)
  );
  const startedAt = new Date().toISOString();
  const started = Date.now();
  activeContexts += 1;
  maximumParallelContextsObserved = Math.max(maximumParallelContextsObserved, activeContexts);
  let record;
  try {
    for (const [source, target] of [
      [manifest.modelInputs.manual, "manual.md"],
      [context.packet, "packet.json"],
      [context.schemaPath, "schema.json"],
      [context.chunkLedgerPath, "chunk-ledger.jsonl"]
    ]) await copyFile(source, path.join(temporary, target));
    await copyFile(authSource, path.join(isolatedCodexHome, "auth.json"));
    const env = { ...process.env, CODEX_HOME: isolatedCodexHome };
    for (const key of manifest.executionPolicy.removedEnvironmentVariables) delete env[key];
    const prompt = `Read manual.md, packet.json, schema.json, and every line of chunk-ledger.jsonl; read nothing else. Act only as the isolated simplified score-blind source-discovery reviewer for production-canary Debate ${context.debateNumber}, ${context.chunkId}. The owned core is events ${context.coreStartEvent} through ${context.coreEndEvent}; boundary context is events ${context.contextStartEvent} through ${context.contextEndEvent}. Review the entire context. Emit zero to ten chronological load-bearing candidates whose start event lies inside the core. For every reply, describe the earlier contrary position it addresses; never emit target IDs, moveKind, evidence text, ratings, scores, sections, a winner, tags, Overall Commentary, AI Extension, or assessment/publication prose. Return exactly one schema-conforming JSON object.`;
    process.stdout.write(
      `[production-canary-discovery] starting ${manifest.model.label}/${manifest.model.reasoningEffort} Debate ${context.debateNumber} ${context.chunkId}\n`
    );
    const invocation = await run(
      codex,
      [
        "exec",
        "--ephemeral",
        "--skip-git-repo-check",
        "--ignore-user-config",
        "--ignore-rules",
        "--model",
        manifest.model.slug,
        "-c",
        `model_reasoning_effort="${manifest.model.reasoningEffort}"`,
        "--disable",
        "plugins",
        "--disable",
        "remote_plugin",
        "--disable",
        "skill_search",
        "--disable",
        "apps",
        "--disable",
        "memories",
        "--disable",
        "multi_agent",
        "--disable",
        "browser_use",
        "--disable",
        "computer_use",
        "--disable",
        "workspace_dependencies",
        "--sandbox",
        "read-only",
        "--color",
        "never",
        "--output-schema",
        "schema.json",
        "--output-last-message",
        "result.json",
        prompt
      ],
      { cwd: temporary, env },
      contextTimeoutMs
    );
    const resultPath = path.join(temporary, "result.json");
    const resultExists = await exists(resultPath);
    const base = {
      contextIndex,
      debateNumber: context.debateNumber,
      chunkId: context.chunkId,
      model: manifest.model.label,
      modelSlug: manifest.model.slug,
      reasoningEffort: manifest.model.reasoningEffort,
      attemptCount: 1,
      retryCount: 0,
      startedAt,
      completedAt: new Date().toISOString(),
      elapsedMs: Date.now() - started,
      timeoutMsApplied: contextTimeoutMs,
      timedOut: invocation.timedOut,
      commandExitCode: invocation.code,
      terminationSignal: invocation.signal,
      authentication: "ChatGPT subscription",
      apiKeysRemoved: true,
      meteredApiCostUsd: 0,
      transcriptionCostUsd: 0,
      stdoutSha256: sha256(invocation.stdout),
      stderrSha256: sha256(invocation.stderr)
    };
    if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null || !resultExists) {
      record = {
        ...base,
        status: invocation.timedOut ? "timed-out" : !resultExists ? "result-missing" : "transport-failed",
        accepted: false,
        rawOutputWritten: false,
        stdoutTail: invocation.stdout.slice(-12000),
        stderrTail: invocation.stderr.slice(-12000)
      };
    } else {
      await mkdir(path.dirname(context.rawOutput), { recursive: true });
      await copyFile(resultPath, context.rawOutput);
      const validation = await run(
        process.execPath,
        [
          "scripts/validate-v422112-discovery.mjs",
          context.rawOutput,
          manifest.preparation,
          context.debateNumber,
          context.chunkId
        ],
        { cwd: process.cwd(), env: process.env },
        120000
      );
      const valid = validation.code === 0 && validation.signal === null && !validation.timedOut;
      record = {
        ...base,
        status: valid ? "completed-valid" : "output-validation-failed",
        accepted: valid,
        rawOutputWritten: true,
        rawOutputSha256: sha256(await readFile(context.rawOutput)),
        validationSummary: valid ? JSON.parse(validation.stdout) : null,
        validationMessage: valid ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-6000),
        stdoutTail: valid ? null : invocation.stdout.slice(-12000),
        stderrTail: valid ? null : invocation.stderr.slice(-12000),
        validationStdoutTail: valid ? null : validation.stdout.slice(-12000),
        validationStderrTail: valid ? null : validation.stderr.slice(-12000)
      };
    }
  } finally {
    activeContexts -= 1;
    await rm(temporary, { recursive: true, force: true });
    await rm(isolatedCodexHome, { recursive: true, force: true });
  }
  process.stdout.write(
    `[production-canary-discovery] Debate ${context.debateNumber} ${context.chunkId} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`
  );
  return record;
}

const resultsByIndex = new Array(manifest.contexts.length);
const rampPhases = [];
async function runFixedIndexes(indexes, maximumParallelContexts, phase) {
  const startedAt = new Date().toISOString();
  let cursor = 0;
  async function worker() {
    while (cursor < indexes.length) {
      const position = cursor;
      cursor += 1;
      const contextIndex = indexes[position];
      resultsByIndex[contextIndex] = await executeContext(manifest.contexts[contextIndex], contextIndex);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(maximumParallelContexts, indexes.length) }, () => worker())
  );
  const phaseResults = indexes.map((index) => resultsByIndex[index]);
  const passed = phaseResults.every((result) => result.accepted);
  rampPhases.push({
    phase,
    maximumParallelContexts,
    contextIndexes: indexes,
    startedAt,
    completedAt: new Date().toISOString(),
    passed
  });
  return passed;
}

let rampPassed = await runFixedIndexes([0], 1, "operational-canary-one");
if (rampPassed) rampPassed = await runFixedIndexes([1, 2], 2, "ramp-two");
if (rampPassed) {
  await runFixedIndexes(
    Array.from({ length: manifest.contexts.length - 3 }, (_, index) => index + 3),
    4,
    "steady-four"
  );
}

const results = resultsByIndex.filter(Boolean);
const validContexts = results.filter((result) => result.accepted).length;
const execution = {
  schemaVersion: "1.0-production-canary-discovery-model-execution",
  protocolId: manifest.protocolId,
  status: validContexts === manifest.contexts.length
    ? "thirty-six-production-canary-discovery-contexts-passed"
    : "production-canary-discovery-complete-with-failure",
  productionCanary: true,
  stagingOnly: true,
  gateStartedAt,
  gateCompletedAt: new Date().toISOString(),
  contextsPlanned: manifest.contexts.length,
  contextsAttempted: results.length,
  contextsUnattempted: manifest.contexts.length - results.length,
  validContexts,
  invalidContexts: results.length - validContexts,
  attempts: results.length,
  retries: 0,
  parallelismMaximumAllowed: manifest.executionPolicy.maximumParallelContexts,
  maximumParallelContextsObserved,
  schedulerRamp: manifest.executionPolicy.schedulerRamp,
  rampPhases,
  rampPassed,
  wallElapsedMs: Date.now() - gateStarted,
  modelWorkElapsedMs: results.reduce((sum, result) => sum + result.elapsedMs, 0),
  results,
  authentication: "ChatGPT subscription",
  meteredApiCostUsd: 0,
  transcriptionCostUsd: 0,
  authorization: {
    deterministicAnalysis: true,
    retry: false,
    semanticCorrection: false,
    inventoryPacketPreparation: false,
    inventoryModelExecution: false,
    scoreDerivation: false,
    productionMutation: false
  }
};
await writeFile(manifest.artifacts.execution, `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify({
  status: execution.status,
  contextsAttempted: results.length,
  validContexts,
  invalidContexts: execution.invalidContexts,
  wallElapsedMinutes: Number((execution.wallElapsedMs / 60000).toFixed(2)),
  aggregateModelMinutes: Number((execution.modelWorkElapsedMs / 60000).toFixed(2)),
  maximumParallelContextsObserved,
  retries: 0,
  authentication: execution.authentication,
  meteredApiCostUsd: 0,
  transcriptionCostUsd: 0,
  scoresDerived: 0
}, null, 2));
