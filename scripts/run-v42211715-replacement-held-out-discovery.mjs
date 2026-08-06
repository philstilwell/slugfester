#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { validateV42219ChunkLedger } from "./lib/v42219-generalized-partition.mjs";

const ROOT = "docs/calibration/v4.2.21.17.15/replacement-held-out-discovery";
const manifest = JSON.parse(await readFile(`${ROOT}/execution-manifest.json`, "utf8"));
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assertV4(
  manifest.status === "frozen-eighteen-replacement-held-out-discovery-contexts-authorized"
    && manifest.authorization.modelContexts
    && manifest.heldOut
    && manifest.executionPolicy.maximumParallelContexts === 4,
  "held-out discovery execution is unauthorized",
);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
}
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) {
  await access(future).then(() => { throw new Error(`future output exists: ${future}`); }, () => true);
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

async function executeContext(context, contextIndex) {
  const debate = preparation.contexts.find((item) => item.debateNumber === context.debateNumber);
  const chunk = debate.chunks.find((item) => item.chunkId === context.chunkId);
  validateV42219ChunkLedger(await readFile(context.chunkLedgerPath), await readFile(context.fullLedger), chunk);
  const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-held-out-${context.debateNumber}-${context.chunkId}-`));
  const codexHome = await mkdtemp(path.join(os.tmpdir(), `slugfester-held-out-home-${context.debateNumber}-${context.chunkId}-`));
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
      [context.chunkLedgerPath, "chunk-ledger.jsonl"],
    ]) await copyFile(source, path.join(temporary, target));
    await copyFile(authSource, path.join(codexHome, "auth.json"));
    const env = { ...process.env, CODEX_HOME: codexHome };
    for (const key of ["OPENAI_API_KEY", "OPENAI_ORG_ID", "CODEX_API_KEY"]) delete env[key];
    const prompt = `Read manual.md, packet.json, schema.json, and every line of chunk-ledger.jsonl; read nothing else. Act only as the isolated simplified score-blind source-discovery reviewer for held-out Debate ${context.debateNumber}, ${context.chunkId}. The owned core is events ${context.coreStartEvent} through ${context.coreEndEvent}; boundary context is events ${context.contextStartEvent} through ${context.contextEndEvent}. Review the entire context. Emit zero to ten chronological load-bearing candidates whose start event lies inside the core. For every reply, describe the earlier contrary position it addresses; never emit target IDs, moveKind, evidence text, ratings, scores, sections, a winner, or assessment/publication prose. Return exactly one schema-conforming JSON object.`;
    process.stdout.write(`[v4.2.21.17.15] starting ${manifest.model.label}/${manifest.model.reasoningEffort} Debate ${context.debateNumber} ${context.chunkId}\n`);
    const invocation = await run(codex, [
      "exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules",
      "--model", manifest.model.slug,
      "-c", `model_reasoning_effort="${manifest.model.reasoningEffort}"`,
      "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search",
      "--disable", "apps", "--disable", "memories", "--disable", "multi_agent",
      "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies",
      "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt,
    ], { cwd: temporary, env }, manifest.executionPolicy.timeoutMsPerContext);
    const resultExists = await access(path.join(temporary, "result.json")).then(() => true, () => false);
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
      timedOut: invocation.timedOut,
      commandExitCode: invocation.code,
      terminationSignal: invocation.signal,
      authentication: "ChatGPT subscription",
      apiKeysRemoved: true,
      meteredApiCostUsd: 0,
      transcriptionCostUsd: 0,
      stdoutSha256: sha256(invocation.stdout),
      stderrSha256: sha256(invocation.stderr),
    };
    if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null || !resultExists) {
      record = {
        ...base,
        status: invocation.timedOut ? "timed-out" : !resultExists ? "result-missing" : "transport-failed",
        accepted: false,
        rawOutputWritten: false,
        diagnostic: `${invocation.stdout}\n${invocation.stderr}`.trim().slice(-6000),
      };
    } else {
      await mkdir(path.dirname(context.rawOutput), { recursive: true });
      await copyFile(path.join(temporary, "result.json"), context.rawOutput);
      const validation = await run(process.execPath, [
        "scripts/validate-v422112-discovery.mjs",
        context.rawOutput,
        manifest.preparation,
        context.debateNumber,
        context.chunkId,
      ], { cwd: process.cwd(), env: process.env }, 120000);
      const valid = validation.code === 0;
      record = {
        ...base,
        status: valid ? "completed-valid" : "output-validation-failed",
        accepted: valid,
        rawOutputWritten: true,
        rawOutputSha256: sha256(await readFile(context.rawOutput)),
        validationSummary: valid ? JSON.parse(validation.stdout) : null,
        validationMessage: valid ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-6000),
      };
    }
  } finally {
    activeContexts -= 1;
    await rm(temporary, { recursive: true, force: true });
    await rm(codexHome, { recursive: true, force: true });
  }
  process.stdout.write(`[v4.2.21.17.15] Debate ${context.debateNumber} ${context.chunkId} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`);
  return record;
}

const gateStartedAt = new Date().toISOString();
const gateStarted = Date.now();
const results = new Array(manifest.contexts.length);
let nextIndex = 0;
async function worker() {
  while (nextIndex < manifest.contexts.length) {
    const contextIndex = nextIndex;
    nextIndex += 1;
    results[contextIndex] = await executeContext(manifest.contexts[contextIndex], contextIndex);
  }
}
await Promise.all(Array.from(
  { length: Math.min(manifest.executionPolicy.maximumParallelContexts, manifest.contexts.length) },
  () => worker(),
));

const validContexts = results.filter((result) => result.accepted).length;
const execution = {
  schemaVersion: "4.2.21.17.15-replacement-held-out-discovery-model-execution",
  protocolId: manifest.protocolId,
  status: validContexts === manifest.contexts.length
    ? "eighteen-replacement-held-out-discovery-contexts-passed"
    : "replacement-held-out-discovery-complete-with-failure",
  heldOut: true,
  gateStartedAt,
  gateCompletedAt: new Date().toISOString(),
  contextsPlanned: manifest.contexts.length,
  contextsAttempted: results.length,
  validContexts,
  invalidContexts: results.length - validContexts,
  attempts: results.length,
  retries: 0,
  parallelismMaximumAllowed: manifest.executionPolicy.maximumParallelContexts,
  maximumParallelContextsObserved,
  wallElapsedMs: Date.now() - gateStarted,
  modelWorkElapsedMs: results.reduce((sum, result) => sum + result.elapsedMs, 0),
  results,
  meteredApiCostUsd: 0,
  transcriptionCostUsd: 0,
  authorization: {
    deterministicAnalysis: true,
    retry: false,
    semanticCorrection: false,
    independentJudgmentExecution: false,
    scoreDerivation: false,
  },
};
await writeFile(manifest.artifacts.execution, `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify({
  status: execution.status,
  contextsAttempted: results.length,
  validContexts,
  invalidContexts: execution.invalidContexts,
  wallElapsedMinutes: Number((execution.wallElapsedMs / 60000).toFixed(2)),
  modelWorkElapsedMinutes: Number((execution.modelWorkElapsedMs / 60000).toFixed(2)),
  maximumParallelContextsObserved,
  retries: 0,
  meteredApiCostUsd: 0,
  transcriptionCostUsd: 0,
}, null, 2));

