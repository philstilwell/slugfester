#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ORIGINAL_CONTEXT_INDEXES, ROOT } from
  "./lib/assessment-production-post-canary-batch-14-publication-resumption-1.mjs";
import { validatePostCanaryBatch14PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-14-publication-validation.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const ACTIVATION = `${ROOT}/execution-activation.json`;
const activation = JSON.parse(await readFile(path.resolve(ACTIVATION)));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(
  activation.status === "frozen-nine-original-unattempted-batch-14-publication-contexts-activated" &&
    activation.authorization?.modelExecution === true &&
    activation.contexts?.length === 9 &&
    canonicalJson(activation.contexts.map((context) => context.originalContextIndex)) ===
      canonicalJson(ORIGINAL_CONTEXT_INDEXES),
  "nine-context resumption execution is not activated"
);
assertV4(
  activation.executionPolicy?.attemptsPerContext === 1 &&
    activation.executionPolicy?.retriesMaximum === 0 &&
    activation.executionPolicy?.timeoutExtensionsMaximum === 0 &&
    activation.executionPolicy?.correctionContextsMaximum === 0 &&
    activation.executionPolicy?.maximumParallelContexts === 2 &&
    canonicalJson(activation.executionPolicy?.schedulerRamp) === canonicalJson([1, 2]),
  "nine-context execution policy changed"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `source hash mismatch: ${file}`);
}
for (const future of activation.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(future)), `future output exists: ${future}`);
}
const codex = activation.executionEnvironment.codexPath;
const caffeinate = activation.executionEnvironment.hostAwakeGuard.path;
const authSource = path.join(os.homedir(), ".codex", "auth.json");
await access(codex); await access(caffeinate); await access(authSource);

function invoke(args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(caffeinate,
      [...activation.executionEnvironment.hostAwakeGuard.args, codex, ...args],
      { ...options, detached: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = ""; let stderr = ""; let timedOut = false; let forceTimer;
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const terminateGroup = (signal) => {
      try { process.kill(-child.pid, signal); } catch { child.kill(signal); }
    };
    const timer = setTimeout(() => {
      timedOut = true;
      terminateGroup("SIGTERM");
      forceTimer = setTimeout(() => terminateGroup("SIGKILL"), 5000);
    }, timeoutMs);
    child.on("error", (error) => {
      clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer);
      resolve({ code: null, signal: null, stdout, stderr, timedOut, error });
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer);
      resolve({ code, signal, stdout, stderr, timedOut, error: null });
    });
  });
}

let activeContexts = 0;
let maximumObservedConcurrency = 0;
async function runContext(context) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), `batch-14-publication-resumption-${context.debateNumber}-`));
  const isolatedCodexHome = await mkdtemp(path.join(os.tmpdir(), `batch-14-publication-resumption-home-${context.debateNumber}-`));
  const startedAt = new Date().toISOString();
  const started = Date.now();
  let record;
  activeContexts += 1;
  maximumObservedConcurrency = Math.max(maximumObservedConcurrency, activeContexts);
  try {
    const copies = [
      [activation.modelInputs.productionWorkflow, "production-workflow.md"],
      [activation.modelInputs.readinessWorkflow, "readiness-workflow.md"],
      [activation.modelInputs.outputContract, "output-contract.md"],
      [activation.modelInputs.manual, "manual.md"],
      [activation.modelInputs.referenceCatalog, "reference-catalog.json"],
      [context.packet, "packet.json"],
      [context.schema, "schema.json"]
    ];
    for (const [source, target] of copies) await copyFile(path.resolve(source), path.join(temporary, target));
    await copyFile(authSource, path.join(isolatedCodexHome, "auth.json"));
    const env = { ...process.env, CODEX_HOME: isolatedCodexHome };
    for (const key of activation.executionPolicy.removedEnvironmentVariables) delete env[key];
    const prompt = [
      "Read production-workflow.md, readiness-workflow.md, output-contract.md, manual.md, reference-catalog.json, packet.json, and schema.json completely and no other files.",
      `Act only as the isolated publication editor for Debate ${context.debateNumber}.`,
      "This is the original first attempt for this debate, not a retry. Participant judgment, adjudication, move selection, and every score are closed and repository-owned; participant judgment was score-blind.",
      "Author exactly the schema fields: an 18–28 word summary; source-exact representative quotes targeting 6–14 words; prose for every locked move; Overall Commentary; optional material-only local reference tags; and a balanced, separately disclosed AI Extension with globally unique item IDs and complete novelty mappings.",
      "Write every critique in exactly four ordered labeled sentences, target 112–118 words, stay within 105–130 words, use at least 880 characters, and end every sentence with terminal punctuation.",
      "Before returning, count and verify every critique's four sentences, word range, minimum character count, ordered labels, and terminal punctuation; verify both representative quotes are exact contiguous source substrings.",
      "Never infer, emit, recalculate, or suggest changing a score; never change identity, structure, move selection, or source evidence; never consult legacy assessment material, Debate 53 output, other debates, rankings, winners, or another model context; never attribute AI material to a participant.",
      "Use no CJK, Hangul, Kana, or replacement characters and no prohibited rational-invulnerability language.",
      "Return exactly one schema-conforming JSON object and nothing else."
    ].join(" ");
    process.stdout.write(`[batch-14-publication-resumption] starting original index ${context.originalContextIndex} Debate ${context.debateNumber}\n`);
    const invocation = await invoke([
      "exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules",
      "--model", activation.model.slug,
      "-c", `model_reasoning_effort=\"${activation.model.reasoningEffort}\"`,
      "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search",
      "--disable", "apps", "--disable", "memories", "--disable", "multi_agent",
      "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies",
      "--sandbox", "read-only", "--output-schema", "schema.json",
      "--output-last-message", "result.json", prompt
    ], { cwd: temporary, env }, activation.executionPolicy.timeoutMsPerContext);
    const resultPath = path.join(temporary, "result.json");
    const resultExists = await exists(resultPath);
    const base = {
      resumptionIndex: context.resumptionIndex,
      originalContextIndex: context.originalContextIndex,
      debateNumber: context.debateNumber,
      debateId: context.debateId,
      model: activation.model.label,
      reasoningEffort: activation.model.reasoningEffort,
      authentication: "ChatGPT subscription",
      originalFirstAttempt: true,
      priorAttemptCount: 0,
      attemptCount: 1,
      retryCount: 0,
      timeoutExtensionCount: 0,
      correctionContextCount: 0,
      startedAt,
      completedAt: new Date().toISOString(),
      elapsedMs: Date.now() - started,
      timedOut: invocation.timedOut,
      commandExitCode: invocation.code,
      terminationSignal: invocation.signal,
      apiKeysRemoved: true,
      isolatedTemporaryCodexHome: true,
      isolatedTemporaryWorkingDirectory: true,
      hostAwakeGuardApplied: true,
      participantJudgmentWasScoreBlind: true,
      ownDebateScoresImmutable: true,
      copiedInputBytes: context.copiedInputBytes,
      meteredApiCostUsd: 0,
      paidServiceCallsThisStage: 0,
      modelAuthoredScores: 0,
      scorePassesExecutedThisStage: 0,
      stdoutSha256: sha256(invocation.stdout),
      stderrSha256: sha256(invocation.stderr)
    };
    if (invocation.error || invocation.timedOut || invocation.code !== 0 || invocation.signal !== null || !resultExists) {
      record = {
        ...base,
        status: invocation.timedOut ? "timed-out" : !resultExists ? "result-missing" : "transport-failed",
        gateAcceptancePassed: false,
        outputWritten: false,
        validationWritten: false,
        provenanceWritten: false,
        failureMessage: `${invocation.error?.stack ?? ""}\n${invocation.stdout}\n${invocation.stderr}`.trim().slice(-10000)
      };
    } else {
      const resultBytes = await readFile(resultPath);
      await mkdir(path.dirname(path.resolve(context.rawOutput)), { recursive: true });
      await writeFile(path.resolve(context.rawOutput), resultBytes);
      let validationSummary = null; let validationMessage = null;
      try {
        validationSummary = validatePostCanaryBatch14PublicationOutput(
          JSON.parse(resultBytes),
          JSON.parse(await readFile(path.resolve(context.packet)))
        );
      } catch (error) {
        validationMessage = (error.stack ?? error.message).slice(-10000);
      }
      const accepted = validationSummary?.status === "passed";
      const validation = {
        schemaVersion: "1.0-assessment-production-post-canary-batch-14-publication-resumption-validation",
        protocolId: activation.protocolId,
        status: accepted ? "passed" : "failed",
        originalContextIndex: context.originalContextIndex,
        debateNumber: context.debateNumber,
        debateId: context.debateId,
        outputSha256: sha256(resultBytes),
        validationSummary,
        validationMessage,
        modelAuthoredScores: 0,
        lockedScoresUnchanged: accepted ? true : null
      };
      const provenance = {
        schemaVersion: "1.0-assessment-production-post-canary-batch-14-publication-resumption-provenance",
        protocolId: activation.protocolId,
        originalContextIndex: context.originalContextIndex,
        debateNumber: context.debateNumber,
        debateId: context.debateId,
        model: activation.model,
        authentication: "ChatGPT subscription",
        originalFirstAttempt: true,
        priorAttemptCount: 0,
        attemptCount: 1,
        retryCount: 0,
        timeoutExtensionCount: 0,
        correctionContextCount: 0,
        hostAwakeGuardApplied: true,
        copiedInputs: Object.fromEntries(copies.map(([source, target]) => [target, {
          source,
          sha256: activation.sourceHashes[source]
        }])),
        outputSha256: sha256(resultBytes),
        modelAuthoredScores: 0,
        meteredApiCostUsd: 0,
        paidServiceCallsThisStage: 0
      };
      const validationBytes = Buffer.from(`${JSON.stringify(validation, null, 2)}\n`);
      const provenanceBytes = Buffer.from(`${JSON.stringify(provenance, null, 2)}\n`);
      await mkdir(path.dirname(path.resolve(context.validation)), { recursive: true });
      await mkdir(path.dirname(path.resolve(context.provenance)), { recursive: true });
      await writeFile(path.resolve(context.validation), validationBytes);
      await writeFile(path.resolve(context.provenance), provenanceBytes);
      record = {
        ...base,
        status: accepted ? "completed-valid" : "output-validation-failed",
        gateAcceptancePassed: accepted,
        outputWritten: true,
        outputSha256: sha256(resultBytes),
        validationWritten: true,
        validationSha256: sha256(validationBytes),
        provenanceWritten: true,
        provenanceSha256: sha256(provenanceBytes),
        validationSummary,
        validationMessage
      };
    }
  } catch (error) {
    record = {
      resumptionIndex: context.resumptionIndex,
      originalContextIndex: context.originalContextIndex,
      debateNumber: context.debateNumber,
      debateId: context.debateId,
      model: activation.model.label,
      reasoningEffort: activation.model.reasoningEffort,
      originalFirstAttempt: true,
      priorAttemptCount: 0,
      attemptCount: 1,
      retryCount: 0,
      timeoutExtensionCount: 0,
      correctionContextCount: 0,
      startedAt,
      completedAt: new Date().toISOString(),
      elapsedMs: Date.now() - started,
      status: "runner-error",
      gateAcceptancePassed: false,
      outputWritten: await exists(context.rawOutput),
      validationWritten: await exists(context.validation),
      provenanceWritten: await exists(context.provenance),
      modelAuthoredScores: 0,
      meteredApiCostUsd: 0,
      paidServiceCallsThisStage: 0,
      failureMessage: (error.stack ?? String(error)).slice(-10000)
    };
  } finally {
    activeContexts -= 1;
    await rm(temporary, { recursive: true, force: true });
    await rm(isolatedCodexHome, { recursive: true, force: true });
  }
  process.stdout.write(`[batch-14-publication-resumption] Debate ${context.debateNumber} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`);
  return record;
}

const byOriginalIndex = new Map(activation.contexts.map((context) => [context.originalContextIndex, context]));
async function runPool(originalContextIndexes, maximumConcurrency) {
  const queue = originalContextIndexes.map((index) => byOriginalIndex.get(index));
  const completed = [];
  async function worker() {
    while (queue.length) completed.push(await runContext(queue.shift()));
  }
  await Promise.all(Array.from({ length: Math.min(maximumConcurrency, queue.length) }, () => worker()));
  return completed.sort((left, right) => left.originalContextIndex - right.originalContextIndex);
}

const gateStartedAt = new Date().toISOString();
const gateStarted = Date.now();
const results = [];
const phaseRecords = [];
let expansionAuthorized = true;
for (const phase of activation.executionPolicy.rampPhases) {
  if (!expansionAuthorized) {
    phaseRecords.push({ ...phase, attemptedOriginalContextIndexes: [], validOriginalContextIndexes: [], passed: false, skippedBecausePriorRampFailed: true });
    continue;
  }
  const phaseResults = await runPool(phase.originalContextIndexes, phase.maximumParallelContexts);
  results.push(...phaseResults);
  const validOriginalContextIndexes = phaseResults.filter((result) => result.gateAcceptancePassed).map((result) => result.originalContextIndex);
  const passed = validOriginalContextIndexes.length === phase.originalContextIndexes.length;
  phaseRecords.push({ ...phase, attemptedOriginalContextIndexes: phaseResults.map((result) => result.originalContextIndex), validOriginalContextIndexes, passed, skippedBecausePriorRampFailed: false });
  if (phase.expansionRequiresAllValid && !passed) expansionAuthorized = false;
}
results.sort((left, right) => left.originalContextIndex - right.originalContextIndex);
const attempted = new Set(results.map((result) => result.originalContextIndex));
const unattemptedOriginalContextIndexes = ORIGINAL_CONTEXT_INDEXES.filter((index) => !attempted.has(index));
const validContexts = results.filter((result) => result.gateAcceptancePassed).length;
const passed = results.length === 9 && validContexts === 9;
const execution = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-14-publication-original-unattempted-context-resumption-execution",
  protocolId: activation.protocolId,
  status: passed
    ? "nine-original-unattempted-batch-14-publication-contexts-passed"
    : "nine-context-publication-resumption-stopped-with-failure",
  gateStartedAt,
  gateCompletedAt: new Date().toISOString(),
  contextsPlanned: 9,
  contextsAttempted: results.length,
  contextsUnattempted: unattemptedOriginalContextIndexes.length,
  unattemptedOriginalContextIndexes,
  validContexts,
  invalidContexts: results.length - validContexts,
  attempts: results.length,
  retries: 0,
  timeoutExtensions: 0,
  correctionContexts: 0,
  maximumObservedConcurrency,
  schedulerRamp: [1, 2],
  phaseRecords,
  wallElapsedMs: Date.now() - gateStarted,
  aggregateModelElapsedMs: results.reduce((sum, result) => sum + result.elapsedMs, 0),
  results,
  originalFirstAttemptsOnly: true,
  hostAwakeGuardAppliedToEveryAttempt: results.every((result) => result.hostAwakeGuardApplied),
  participantJudgmentWasScoreBlind: true,
  ownDebateScoresImmutable: true,
  meteredApiCostUsd: 0,
  paidServiceCallsThisStage: 0,
  modelAuthoredScores: 0,
  scorePassesExecutedThisStage: 0,
  nextRequiredAction: passed
    ? "deterministically-replay-nine-outputs-and-complete-ten-debate-publication-cohort"
    : "stop-no-automatic-retry-timeout-extension-or-correction"
};
await writeFile(path.resolve(activation.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify({
  status: execution.status,
  contextsAttempted: execution.contextsAttempted,
  validContexts,
  invalidContexts: execution.invalidContexts,
  unattemptedOriginalContextIndexes,
  maximumObservedConcurrency,
  wallElapsedMinutes: Number((execution.wallElapsedMs / 60000).toFixed(2)),
  aggregateModelElapsedMinutes: Number((execution.aggregateModelElapsedMs / 60000).toFixed(2)),
  attempts: execution.attempts,
  retries: 0,
  timeoutExtensions: 0,
  correctionContexts: 0,
  costUsd: 0,
  nextRequiredAction: execution.nextRequiredAction
}, null, 2));
if (!passed) process.exitCode = 2;
