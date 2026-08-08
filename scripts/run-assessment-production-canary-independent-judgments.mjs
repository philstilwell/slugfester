#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT = "docs/assessment-production/canary-v1-independent-judgments";
const manifest = JSON.parse(await readFile(`${ROOT}/execution-manifest.json`, "utf8"));
const codex = manifest.executionEnvironment.codexPath;
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const tail = (value, maximum = 12000) => value.length <= maximum ? value : value.slice(-maximum);

assertV4(
  manifest.status === "frozen-twenty-production-canary-independent-judgment-contexts-authorized" &&
    manifest.productionCanary === true &&
    manifest.stagingOnly === true &&
    manifest.authorization.modelContexts === true &&
    manifest.contexts.length === 20 &&
    manifest.executionPolicy.maximumParallelContexts === 2 &&
    JSON.stringify(manifest.executionPolicy.schedulerRamp) === JSON.stringify([1, 2]) &&
    manifest.executionPolicy.firstRealContextOperationalCanary === true &&
    manifest.executionPolicy.retriesMaximum === 0,
  "production-canary independent-judgment execution is unauthorized"
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
  assertV4(remainingGateMs > 0, "absolute independent-judgment gate timeout reached before context launch");
  const contextTimeoutMs = Math.min(manifest.executionPolicy.timeoutMsPerContext, remainingGateMs);
  const temporary = await mkdtemp(
    path.join(os.tmpdir(), `slugfester-production-judgment-${context.debateNumber}-${context.reviewerPass.toLowerCase()}-`)
  );
  const isolatedCodexHome = await mkdtemp(
    path.join(os.tmpdir(), `slugfester-production-judgment-home-${context.debateNumber}-${context.reviewerPass.toLowerCase()}-`)
  );
  const startedAt = new Date().toISOString();
  const started = Date.now();
  activeContexts += 1;
  maximumParallelContextsObserved = Math.max(maximumParallelContextsObserved, activeContexts);
  let record;
  try {
    for (const [source, target] of [
      [manifest.modelInputs.manual, "manual.md"],
      [context.sourcePacket, "source-packet.json"],
      [context.judgmentPacket, "judgment-packet.json"],
      [context.schema, "schema.json"]
    ]) await copyFile(source, path.join(temporary, target));
    await copyFile(authSource, path.join(isolatedCodexHome, "auth.json"));
    const env = { ...process.env, CODEX_HOME: isolatedCodexHome };
    for (const key of manifest.executionPolicy.removedEnvironmentVariables) delete env[key];
    const prompt = `Read manual.md, source-packet.json, judgment-packet.json, and schema.json completely; read nothing else. Act only as isolated independent performance Judge ${context.reviewerPass} for production-canary Debate ${context.debateNumber}. Judge every locked move exactly once. The score-blind inventory, chronology, source evidence, routes, sections, weights, propositions, and attribution are immutable. Use only legal earlier-opposing targets exposed by the schema. Apply the response-component, partial-answer, burden-relevance, logical-coherence, evidence-warrant, precision, calibration, charity, confidence, and strict burden-residual anchors literally. Do not calculate scores, name a winner, claim audio review, alter candidate selection, or write Overall Commentary, AI Extension, or publication prose. The other independent judgment, all other debates, and all legacy assessment material are unavailable. Return exactly one schema-conforming JSON object and no commentary.`;
    process.stdout.write(
      `[production-canary-judgment] starting index ${contextIndex} ${manifest.model.label}/${manifest.model.reasoningEffort} Debate ${context.debateNumber} Pass ${context.reviewerPass}\n`
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
        "--disable", "plugins",
        "--disable", "remote_plugin",
        "--disable", "skill_search",
        "--disable", "apps",
        "--disable", "memories",
        "--disable", "multi_agent",
        "--disable", "browser_use",
        "--disable", "computer_use",
        "--disable", "workspace_dependencies",
        "--sandbox", "read-only",
        "--color", "never",
        "--output-schema", "schema.json",
        "--output-last-message", "result.json",
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
      reviewerPass: context.reviewerPass,
      reviewerRole: context.reviewerRole,
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
      lockedInventorySha256: context.lockedInventoryCanonicalSha256,
      meteredApiCostUsd: 0,
      transcriptionCostUsd: 0,
      stdoutSha256: sha256(invocation.stdout),
      stderrSha256: sha256(invocation.stderr)
    };
    let preservedJudgmentSha256 = null;
    if (resultExists) {
      await mkdir(path.dirname(context.judgmentOutput), { recursive: true });
      await copyFile(resultPath, context.judgmentOutput);
      preservedJudgmentSha256 = sha256(await readFile(context.judgmentOutput));
    }
    if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null || !resultExists) {
      record = {
        ...base,
        status: invocation.timedOut ? "timed-out" : !resultExists ? "result-missing" : "transport-failed",
        accepted: false,
        judgmentWritten: resultExists,
        judgmentSha256: preservedJudgmentSha256,
        stdoutTail: tail(invocation.stdout),
        stderrTail: tail(invocation.stderr)
      };
    } else {
      const validation = await run(
        process.execPath,
        [
          "scripts/validate-assessment-production-canary-independent-judgment.mjs",
          context.judgmentOutput,
          manifest.preparation,
          context.debateNumber,
          context.reviewerPass,
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
        judgmentWritten: true,
        judgmentSha256: preservedJudgmentSha256,
        validationSummary: valid ? JSON.parse(validation.stdout) : null,
        validationMessage: valid ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-12000),
        rawOutputSha256: valid ? sha256(await readFile(context.rawOutput)) : null,
        validationSha256: valid ? sha256(await readFile(context.validationOutput)) : null,
        provenanceSha256: valid ? sha256(await readFile(context.provenanceOutput)) : null,
        stdoutTail: valid ? null : tail(invocation.stdout),
        stderrTail: valid ? null : tail(invocation.stderr)
      };
    }
  } catch (error) {
    const judgmentWritten = await exists(context.judgmentOutput);
    record = {
      contextIndex,
      debateNumber: context.debateNumber,
      reviewerPass: context.reviewerPass,
      reviewerRole: context.reviewerRole,
      model: manifest.model.label,
      modelSlug: manifest.model.slug,
      reasoningEffort: manifest.model.reasoningEffort,
      attemptCount: 1,
      retryCount: 0,
      startedAt,
      completedAt: new Date().toISOString(),
      elapsedMs: Date.now() - started,
      authentication: "ChatGPT subscription",
      apiKeysRemoved: true,
      copiedInputBytes: context.copiedInputBytes,
      lockedInventorySha256: context.lockedInventoryCanonicalSha256,
      meteredApiCostUsd: 0,
      transcriptionCostUsd: 0,
      status: "runner-error",
      accepted: false,
      judgmentWritten,
      judgmentSha256: judgmentWritten ? sha256(await readFile(context.judgmentOutput)) : null,
      error: tail(error?.stack ?? String(error))
    };
  } finally {
    activeContexts -= 1;
    await rm(temporary, { recursive: true, force: true });
    await rm(isolatedCodexHome, { recursive: true, force: true });
  }
  process.stdout.write(
    `[production-canary-judgment] Debate ${context.debateNumber} Pass ${context.reviewerPass} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`
  );
  return record;
}

const resultsByIndex = new Array(manifest.contexts.length);
const rampPhases = [];
async function runPhase(phase) {
  const startedAt = new Date().toISOString();
  let cursor = 0;
  async function worker() {
    while (cursor < phase.contextIndexes.length) {
      const position = cursor;
      cursor += 1;
      const contextIndex = phase.contextIndexes[position];
      resultsByIndex[contextIndex] = await executeContext(manifest.contexts[contextIndex], contextIndex);
    }
  }
  await Promise.all(
    Array.from(
      { length: Math.min(phase.maximumParallelContexts, phase.contextIndexes.length) },
      () => worker()
    )
  );
  const passed = phase.contextIndexes.every((index) => resultsByIndex[index].accepted);
  rampPhases.push({
    ...phase,
    startedAt,
    completedAt: new Date().toISOString(),
    attemptedContextIndexes: [...phase.contextIndexes],
    validContextIndexes: phase.contextIndexes.filter((index) => resultsByIndex[index].accepted),
    passed,
    skippedBecausePriorRampFailed: false
  });
  return passed;
}

let expansionAuthorized = true;
for (const phase of manifest.executionPolicy.rampPhases) {
  if (!expansionAuthorized) {
    rampPhases.push({
      ...phase,
      startedAt: null,
      completedAt: null,
      attemptedContextIndexes: [],
      validContextIndexes: [],
      passed: false,
      skippedBecausePriorRampFailed: true
    });
    continue;
  }
  const passed = await runPhase(phase);
  if (phase.expansionRequiresAllValid && !passed) expansionAuthorized = false;
}

const results = resultsByIndex.filter(Boolean);
const validContexts = results.filter((result) => result.accepted).length;
const unattemptedContextIndexes = manifest.contexts
  .map((_, index) => index)
  .filter((index) => !resultsByIndex[index]);
const passed = results.length === manifest.contexts.length && validContexts === manifest.contexts.length;
const execution = {
  schemaVersion: "1.0-production-canary-independent-judgment-model-execution",
  protocolId: manifest.protocolId,
  status: passed
    ? "twenty-production-canary-independent-judgment-contexts-passed"
    : "production-canary-independent-judgment-gate-complete-with-failure",
  productionCanary: true,
  stagingOnly: true,
  gateStartedAt,
  gateCompletedAt: new Date().toISOString(),
  contextsPlanned: manifest.contexts.length,
  contextsAttempted: results.length,
  contextsUnattempted: manifest.contexts.length - results.length,
  unattemptedContextIndexes,
  validContexts,
  invalidContexts: results.length - validContexts,
  attempts: results.length,
  retries: 0,
  parallelismMaximumAllowed: manifest.executionPolicy.maximumParallelContexts,
  maximumParallelContextsObserved,
  schedulerRamp: manifest.executionPolicy.schedulerRamp,
  rampPhases,
  rampPassed: rampPhases.slice(0, 2).every((phase) => phase.passed),
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
    disagreementExtraction: false,
    paidTranscription: false,
    audioVerification: false,
    adjudicationExecution: false,
    scoreDerivation: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false
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
