#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ROOT, validateFieldDisjointRepairOutput } from
  "./lib/assessment-production-post-canary-batch-13-debate-70-publication-field-disjoint-repair-1.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ACTIVATION = `${ROOT}/execution-activation.json`;
const activation = JSON.parse(await readFile(path.resolve(ACTIVATION)));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(
  activation.status === "frozen-three-context-five-field-batch-13-debate-70-publication-repair-activated" &&
    activation.authorization?.modelExecution === true && activation.contexts?.length === 3 &&
    activation.executionPolicy?.attemptsPerContext === 1 &&
    activation.executionPolicy?.retriesMaximum === 0 &&
    activation.executionPolicy?.timeoutExtensionsMaximum === 0 &&
    activation.executionPolicy?.furtherCorrectionContextsMaximum === 0 &&
    activation.executionPolicy?.maximumParallelContexts === 2,
  "field-disjoint repair execution is not activated"
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
  const temporary = await mkdtemp(path.join(os.tmpdir(), `batch-13-field-repair-${context.contextIndex}-`));
  const isolatedCodexHome = await mkdtemp(path.join(os.tmpdir(), `batch-13-field-repair-home-${context.contextIndex}-`));
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
      [activation.modelInputs.repairManual, "repair-manual.md"],
      [context.packet, "packet.json"],
      [context.schema, "schema.json"]
    ];
    for (const [source, target] of copies) {
      await copyFile(path.resolve(source), path.join(temporary, target));
    }
    await copyFile(authSource, path.join(isolatedCodexHome, "auth.json"));
    const env = { ...process.env, CODEX_HOME: isolatedCodexHome };
    for (const key of activation.executionPolicy.removedEnvironmentVariables) delete env[key];
    const prompt = [
      "Read production-workflow.md, readiness-workflow.md, output-contract.md, repair-manual.md, packet.json, and schema.json completely and no other files.",
      `Act only as the isolated score-locked publication repair editor for ${context.shardId}.`,
      "Author every correction string required by schema.json and no other field. Map each fieldKey only to its target in packet.json.",
      "For each critique, write exactly four ordered labeled sentences. Count every whitespace-separated token including the label words; target 112–118 total tokens, do not exceed 122 by your own count, and use at least 900 characters to preserve a safe margin.",
      "For a quote target, copy a 6–14 word exact contiguous substring from the supplied sourceExcerpt.",
      "The rejected prior strings and full failed publication output are unavailable. Do not infer or recreate them.",
      "Participant judgment is closed and every score is repository-owned and immutable. Do not calculate, change, emit, or recommend any score.",
      "Use no outside source, legacy assessment, other debate, ranking, winner, or other model context. Add no fallacy or bias tags.",
      "Return exactly one schema-conforming JSON object and nothing else."
    ].join(" ");
    process.stdout.write(`[batch-13-field-repair] starting context ${context.contextIndex} ${context.shardId} (${context.writableFieldCount} fields)\n`);
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
      contextIndex: context.contextIndex,
      shardId: context.shardId,
      debateNumber: context.debateNumber,
      debateId: context.debateId,
      model: activation.model.label,
      reasoningEffort: activation.model.reasoningEffort,
      authentication: "ChatGPT subscription",
      writableFields: context.writableFields,
      writableFieldCount: context.writableFieldCount,
      attemptCount: 1,
      retryCount: 0,
      timeoutExtensionCount: 0,
      furtherCorrectionContextCount: 0,
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
      failedPublicationOutputAvailableToModel: false,
      rejectedPriorStringsAvailableToModel: false,
      modelAuthoredScores: 0,
      meteredApiCostUsd: 0,
      paidServiceCallsThisStage: 0,
      stdoutSha256: sha256(invocation.stdout),
      stderrSha256: sha256(invocation.stderr)
    };
    if (invocation.error || invocation.timedOut || invocation.code !== 0 ||
      invocation.signal !== null || !resultExists) {
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
      await mkdir(path.dirname(path.resolve(context.output)), { recursive: true });
      await writeFile(path.resolve(context.output), resultBytes);
      let validationSummary = null; let validationMessage = null;
      try {
        validationSummary = validateFieldDisjointRepairOutput(
          JSON.parse(resultBytes),
          JSON.parse(await readFile(path.resolve(context.packet)))
        );
      } catch (error) {
        validationMessage = (error.stack ?? error.message).slice(-10000);
      }
      const accepted = validationSummary?.status === "passed";
      const validation = {
        schemaVersion: "1.0-assessment-production-post-canary-batch-13-publication-field-disjoint-repair-validation",
        protocolId: activation.protocolId,
        status: accepted ? "passed" : "failed",
        contextIndex: context.contextIndex,
        shardId: context.shardId,
        debateNumber: context.debateNumber,
        writableFields: context.writableFields,
        outputSha256: sha256(resultBytes),
        validationSummary,
        validationMessage,
        modelAuthoredScores: 0
      };
      const provenance = {
        schemaVersion: "1.0-assessment-production-post-canary-batch-13-publication-field-disjoint-repair-provenance",
        protocolId: activation.protocolId,
        contextIndex: context.contextIndex,
        shardId: context.shardId,
        debateNumber: context.debateNumber,
        debateId: context.debateId,
        model: activation.model,
        authentication: "ChatGPT subscription",
        writableFields: context.writableFields,
        attemptCount: 1,
        retryCount: 0,
        timeoutExtensionCount: 0,
        furtherCorrectionContextCount: 0,
        failedPublicationOutputAvailableToModel: false,
        rejectedPriorStringsAvailableToModel: false,
        copiedInputs: Object.fromEntries(copies.map(([source, target]) => [target, {
          source, sha256: activation.sourceHashes[source]
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
      contextIndex: context.contextIndex,
      shardId: context.shardId,
      debateNumber: context.debateNumber,
      debateId: context.debateId,
      writableFields: context.writableFields,
      writableFieldCount: context.writableFieldCount,
      attemptCount: 1,
      retryCount: 0,
      timeoutExtensionCount: 0,
      furtherCorrectionContextCount: 0,
      startedAt,
      completedAt: new Date().toISOString(),
      elapsedMs: Date.now() - started,
      status: "runner-error",
      gateAcceptancePassed: false,
      outputWritten: await exists(context.output),
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
  process.stdout.write(`[batch-13-field-repair] ${context.shardId} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`);
  return record;
}

const queue = [];
const results = [];
async function worker() {
  while (queue.length) results.push(await runContext(queue.shift()));
}
const gateStartedAt = new Date().toISOString();
const gateStarted = Date.now();
const canaryResult = await runContext(activation.contexts[0]);
results.push(canaryResult);
const expansionAuthorized = canaryResult.gateAcceptancePassed;
if (expansionAuthorized) {
  queue.push(...activation.contexts.slice(1));
  await Promise.all([worker(), worker()]);
}
results.sort((left, right) => left.contextIndex - right.contextIndex);
const validContexts = results.filter((result) => result.gateAcceptancePassed).length;
const unattemptedContextIndexes = activation.contexts
  .map((context) => context.contextIndex)
  .filter((index) => !results.some((result) => result.contextIndex === index));
const passed = results.length === 3 && validContexts === 3;
const execution = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-13-publication-field-disjoint-repair-execution",
  protocolId: activation.protocolId,
  status: passed
    ? "three-field-disjoint-batch-13-debate-70-publication-repair-contexts-passed"
    : "three-field-disjoint-batch-13-debate-70-publication-repair-contexts-completed-with-failure",
  gateStartedAt,
  gateCompletedAt: new Date().toISOString(),
  contextsPlanned: 3,
  contextsAttempted: results.length,
  contextsUnattempted: unattemptedContextIndexes.length,
  unattemptedContextIndexes,
  validContexts,
  invalidContexts: results.length - validContexts,
  attempts: results.length,
  retries: 0,
  timeoutExtensions: 0,
  furtherCorrectionContexts: 0,
  maximumObservedConcurrency,
  schedulerRamp: [1, 2],
  canaryContextIndex: 0,
  canaryPassed: canaryResult.gateAcceptancePassed,
  expansionAuthorized,
  wallElapsedMs: Date.now() - gateStarted,
  aggregateModelElapsedMs: results.reduce((sum, result) => sum + result.elapsedMs, 0),
  results,
  fieldDisjointAcrossContexts: new Set(results.flatMap((result) => result.writableFields)).size ===
    results.reduce((sum, result) => sum + result.writableFieldCount, 0),
  hostAwakeGuardAppliedToEveryAttempt: results.every((result) => result.hostAwakeGuardApplied),
  meteredApiCostUsd: 0,
  paidServiceCallsThisStage: 0,
  modelAuthoredScores: 0,
  nextRequiredAction: passed
    ? "deterministically-merge-and-validate-debate-70-then-prepare-five-unattempted-contexts"
    : "merge-only-debates-whose-complete-frozen-shard-set-passed-then-stop-without-further-correction"
};
await writeFile(path.resolve(activation.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify({
  status: execution.status,
  contextsAttempted: execution.contextsAttempted,
  validContexts,
  invalidContexts: execution.invalidContexts,
  maximumObservedConcurrency,
  wallElapsedMinutes: Number((execution.wallElapsedMs / 60000).toFixed(2)),
  aggregateModelElapsedMinutes: Number((execution.aggregateModelElapsedMs / 60000).toFixed(2)),
  attempts: execution.attempts,
  retries: 0,
  timeoutExtensions: 0,
  furtherCorrections: 0,
  costUsd: 0,
  nextRequiredAction: execution.nextRequiredAction
}, null, 2));
if (!passed) process.exitCode = 2;
