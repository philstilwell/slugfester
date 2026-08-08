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

const ROOT = "docs/assessment-production/canary-v1-inventory";
const manifest = JSON.parse(await readFile(`${ROOT}/execution-manifest.json`, "utf8"));
const codex = manifest.executionEnvironment.codexPath;
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

assertV4(
  manifest.status === "frozen-ten-production-canary-score-blind-inventory-contexts-authorized" &&
    manifest.productionCanary === true &&
    manifest.stagingOnly === true &&
    manifest.authorization.modelContexts === true &&
    manifest.contexts.length === 10 &&
    manifest.executionPolicy.maximumParallelContexts === 2 &&
    JSON.stringify(manifest.executionPolicy.schedulerRamp) === JSON.stringify([1, 2]) &&
    manifest.executionPolicy.rampOneServesAsOperationalCanary === true &&
    manifest.executionPolicy.retriesMaximum === 0,
  "production-canary inventory execution is unauthorized"
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

let activeContexts = 0;
let maximumParallelContextsObserved = 0;
const gateStartedAt = new Date().toISOString();
const gateStarted = Date.now();
const gateDeadline = gateStarted + manifest.executionPolicy.absoluteGateTimeoutMs;

async function executeContext(context, contextIndex) {
  const remainingGateMs = gateDeadline - Date.now();
  assertV4(remainingGateMs > 0, "absolute inventory gate timeout reached before context launch");
  const contextTimeoutMs = Math.min(manifest.executionPolicy.timeoutMsPerContext, remainingGateMs);
  const temporary = await mkdtemp(
    path.join(os.tmpdir(), `slugfester-production-inventory-${context.debateNumber}-`)
  );
  const isolatedCodexHome = await mkdtemp(
    path.join(os.tmpdir(), `slugfester-production-inventory-home-${context.debateNumber}-`)
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
      [context.modelCandidateTransport, "candidate-evidence-bundle.json"],
      [context.schema, "schema.json"]
    ]) await copyFile(source, path.join(temporary, target));
    await copyFile(authSource, path.join(isolatedCodexHome, "auth.json"));
    const env = { ...process.env, CODEX_HOME: isolatedCodexHome };
    for (const key of manifest.executionPolicy.removedEnvironmentVariables) delete env[key];
    const prompt = `Read manual.md, packet.json, candidate-evidence-bundle.json, and schema.json completely; read nothing else. Act only as the isolated score-blind inventory curator for production-canary Debate ${context.debateNumber}. All ${context.candidates} discovered candidates remain present with source-exact excerpts. Produce four to six weighted issue sections totaling exactly 100 percent, with one or two pro and one or two con selections in every section and no candidate used twice. Define one route per side and its burden bridges. Author only each selected candidate ID, a unique move ID, a global constructive-or-reply classification, and a source-faithful proposition. A reply must have an earlier selected opposing move in source chronology, but do not name targets. Ratings, response topology, burden contact, adjustments, scores, winners, tags, Overall Commentary, AI Extension, and publication prose are prohibited. Return exactly one schema-conforming JSON object.`;
    process.stdout.write(
      `[production-canary-inventory] starting ${manifest.model.label}/${manifest.model.reasoningEffort} Debate ${context.debateNumber}\n`
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
      copiedInputBytes: context.copiedInputBytes,
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
        proposalWritten: false,
        stdoutTail: invocation.stdout.slice(-12000),
        stderrTail: invocation.stderr.slice(-12000)
      };
    } else {
      await mkdir(path.dirname(context.proposalOutput), { recursive: true });
      await copyFile(resultPath, context.proposalOutput);
      const validation = await run(
        process.execPath,
        [
          "scripts/validate-assessment-production-canary-inventory.mjs",
          context.proposalOutput,
          manifest.preparation,
          context.debateNumber,
          "--write"
        ],
        { cwd: process.cwd(), env: process.env },
        180000
      );
      const valid = validation.code === 0 && validation.signal === null && !validation.timedOut;
      record = {
        ...base,
        status: valid ? "completed-valid" : "output-validation-failed",
        accepted: valid,
        proposalWritten: true,
        proposalSha256: sha256(await readFile(context.proposalOutput)),
        validationSummary: valid ? JSON.parse(validation.stdout) : null,
        validationMessage: valid ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-10000),
        lockedInventorySha256: valid ? sha256(await readFile(context.lockedInventoryOutput)) : null,
        validationSha256: valid ? sha256(await readFile(context.validationOutput)) : null,
        provenanceSha256: valid ? sha256(await readFile(context.provenanceOutput)) : null,
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
    `[production-canary-inventory] Debate ${context.debateNumber} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`
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
  const passed = indexes.every((index) => resultsByIndex[index].accepted);
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
  rampPassed = await runFixedIndexes(
    Array.from({ length: manifest.contexts.length - 3 }, (_, index) => index + 3),
    2,
    "steady-two"
  );
}

const results = resultsByIndex.filter(Boolean);
const validContexts = results.filter((result) => result.accepted).length;
const execution = {
  schemaVersion: "1.0-production-canary-score-blind-inventory-model-execution",
  protocolId: manifest.protocolId,
  status: validContexts === manifest.contexts.length
    ? "ten-production-canary-score-blind-inventory-contexts-passed"
    : "production-canary-score-blind-inventory-complete-with-failure",
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
  scoresDerived: 0,
  authorization: {
    deterministicAnalysis: true,
    retry: false,
    semanticCorrection: false,
    independentJudgmentPacketPreparation: validContexts === manifest.contexts.length,
    independentJudgmentModelExecution: false,
    scoreDerivation: false,
    productionMutation: false
  }
};
await writeFile(manifest.artifacts.execution, `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify({
  status: execution.status,
  contextsAttempted: execution.contextsAttempted,
  contextsUnattempted: execution.contextsUnattempted,
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
