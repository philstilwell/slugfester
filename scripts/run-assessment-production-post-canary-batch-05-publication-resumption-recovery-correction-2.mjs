#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  POST_CANARY_BATCH_05_DEBATE_109_CORRECTION_2_ROOT,
  validateDebate109Correction2Output
} from "./lib/assessment-production-post-canary-batch-05-publication-resumption-recovery-correction-2.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const ROOT = POST_CANARY_BATCH_05_DEBATE_109_CORRECTION_2_ROOT;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const activation = JSON.parse(await readFile(path.resolve(ACTIVATION), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(activation.status ===
  "frozen-four-context-batch-05-debate-109-pro-shared-correction-2-authorized" &&
  activation.contexts?.length === 4 && activation.authorization?.correctionModelExecution === true &&
  activation.authorization?.retry === false && activation.authorization?.timeoutExtension === false &&
  activation.authorization?.furtherRecursiveCorrection === false &&
  activation.model?.slug === "gpt-5.6-sol" && activation.model?.reasoningEffort === "low" &&
  activation.model?.authentication === "ChatGPT subscription" &&
  activation.executionPolicy?.attemptsPerContext === 1 &&
  activation.executionPolicy?.retriesMaximum === 0 &&
  activation.executionPolicy?.timeoutExtensionsMaximum === 0 &&
  activation.executionPolicy?.maximumParallelContexts === 2 &&
  canonicalJson(activation.executionPolicy?.schedulerRamp) === canonicalJson([1, 2]),
"the correction-2 execution is not authorized");
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `correction-2 source hash mismatch: ${file}`);
}
for (const future of activation.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(future)), `future correction-2 output exists: ${future}`);
}
const codex = activation.executionEnvironment.codexPath;
const authSource = path.join(os.homedir(), ".codex", "auth.json");
await access(codex); await access(authSource);

function invoke(args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(codex, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = ""; let stderr = ""; let timedOut = false; let forceTimer;
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM");
      forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000); }, timeoutMs);
    child.on("error", (error) => { clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer);
      resolve({ code: null, signal: null, stdout, stderr, timedOut, error }); });
    child.on("close", (code, signal) => { clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer);
      resolve({ code, signal, stdout, stderr, timedOut, error: null }); });
  });
}

let activeContexts = 0;
let maximumObservedConcurrency = 0;
async function runContext(context) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), `batch-05-debate-109-correction-2-${context.contextIndex}-`));
  const codexHome = await mkdtemp(path.join(os.tmpdir(), `batch-05-debate-109-correction-2-home-${context.contextIndex}-`));
  const startedAt = new Date().toISOString(); const started = Date.now(); let record;
  activeContexts += 1; maximumObservedConcurrency = Math.max(maximumObservedConcurrency, activeContexts);
  try {
    const copies = [[activation.modelInputs.productionWorkflow, "production-workflow.md"],
      [activation.modelInputs.readinessWorkflow, "readiness-workflow.md"],
      [activation.modelInputs.outputContract, "output-contract.md"],
      [activation.modelInputs.manual, "manual.md"], [context.packet, "packet.json"],
      [context.schema, "schema.json"]];
    for (const [source, target] of copies) await copyFile(path.resolve(source), path.join(temporary, target));
    await copyFile(authSource, path.join(codexHome, "auth.json"));
    const env = { ...process.env, CODEX_HOME: codexHome };
    for (const key of activation.executionPolicy.removedEnvironmentVariables) delete env[key];
    const prompt = [
      "Read production-workflow.md, readiness-workflow.md, output-contract.md, manual.md, packet.json, and schema.json completely and no other files.",
      `Act only as isolated Debate 109 pro/shared correction-2 editor ${context.packetIndex}.`,
      "Rewrite exactly the two correctedCritiques named by the packet and schema while preserving adjudicated substance and the locked score band.",
      "Write exactly four ordered labeled sentences per critique, target 112–118 words, remain within 105–130 words and at least 880 characters, and end every sentence with terminal punctuation. Count words before returning.",
      "All other pro/shared fields and the accepted con shard are immutable and unavailable. Do not calculate, emit, or change any numerical score.",
      "Return exactly one schema-conforming JSON object and nothing else."
    ].join(" ");
    process.stdout.write(`[batch-05-debate-109-correction-2] starting index ${context.contextIndex} ${activation.model.label}/${activation.model.reasoningEffort}\n`);
    const invocation = await invoke(["exec", "--ephemeral", "--skip-git-repo-check",
      "--ignore-user-config", "--ignore-rules", "--model", activation.model.slug,
      "-c", `model_reasoning_effort=\"${activation.model.reasoningEffort}\"`,
      "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search",
      "--disable", "apps", "--disable", "memories", "--disable", "multi_agent",
      "--disable", "browser_use", "--disable", "computer_use",
      "--disable", "workspace_dependencies", "--sandbox", "read-only",
      "--output-schema", "schema.json", "--output-last-message", "result.json", prompt],
    { cwd: temporary, env }, activation.executionPolicy.timeoutMsPerContext);
    const resultPath = path.join(temporary, "result.json");
    const resultExists = await exists(resultPath);
    const base = { contextIndex: context.contextIndex, packetIndex: context.packetIndex,
      debateNumber: "109", debateId: context.debateId, shardId: context.shardId,
      model: activation.model.label, reasoningEffort: activation.model.reasoningEffort,
      attemptCount: 1, retryCount: 0, timeoutExtensionCount: 0,
      furtherRecursiveCorrectionCount: 0, startedAt, completedAt: new Date().toISOString(),
      elapsedMs: Date.now() - started, timedOut: invocation.timedOut,
      commandExitCode: invocation.code, terminationSignal: invocation.signal,
      authentication: "ChatGPT subscription", apiKeysRemoved: true,
      isolatedTemporaryCodexHome: true, isolatedTemporaryWorkingDirectory: true,
      publicationWasScoreLocked: true, scoresImmutable: true,
      writableFields: context.writableFields, copiedInputBytes: context.copiedInputBytes,
      meteredApiCostUsd: 0, paidServiceCallsThisStage: 0, modelAuthoredScores: 0,
      scorePassesExecutedThisStage: 0, stdoutSha256: sha256(invocation.stdout),
      stderrSha256: sha256(invocation.stderr) };
    if (invocation.error || invocation.timedOut || invocation.code !== 0 ||
      invocation.signal !== null || !resultExists) {
      record = { ...base, status: invocation.timedOut ? "timed-out" :
        !resultExists ? "result-missing" : "transport-failed",
        gateAcceptancePassed: false, outputWritten: false,
        failureMessage: `${invocation.error?.stack ?? ""}\n${invocation.stdout}\n${invocation.stderr}`.trim().slice(-10000) };
    } else {
      const resultBytes = await readFile(resultPath);
      await mkdir(path.dirname(path.resolve(context.output)), { recursive: true });
      await writeFile(path.resolve(context.output), resultBytes);
      let validationSummary = null; let validationMessage = null;
      try { validationSummary = validateDebate109Correction2Output(JSON.parse(resultBytes),
        JSON.parse(await readFile(path.resolve(context.packet), "utf8"))); }
      catch (error) { validationMessage = (error.stack ?? error.message).slice(-10000); }
      const accepted = validationSummary?.status === "passed";
      const validation = { schemaVersion: "1.0-assessment-production-post-canary-batch-05-debate-109-correction-2-validation",
        protocolId: activation.protocolId, status: accepted ? "passed" : "failed",
        contextIndex: context.contextIndex, packetIndex: context.packetIndex,
        debateNumber: "109", shardId: context.shardId, outputSha256: sha256(resultBytes),
        validationSummary, validationMessage, modelAuthoredScores: 0 };
      const provenance = { schemaVersion: "1.0-assessment-production-post-canary-batch-05-debate-109-correction-2-provenance",
        protocolId: activation.protocolId, contextIndex: context.contextIndex,
        packetIndex: context.packetIndex, debateNumber: "109", shardId: context.shardId,
        model: activation.model, authentication: "ChatGPT subscription", attemptCount: 1,
        retryCount: 0, timeoutExtensionCount: 0, furtherRecursiveCorrectionCount: 0,
        apiKeysRemoved: true, isolatedTemporaryCodexHome: true,
        isolatedTemporaryWorkingDirectory: true, publicationWasScoreLocked: true,
        scoresImmutable: true, writableFields: context.writableFields,
        copiedInputs: Object.fromEntries(copies.map(([source, target]) => [target,
          { source, sha256: activation.sourceHashes[source] }])),
        outputSha256: sha256(resultBytes), modelAuthoredScores: 0,
        meteredApiCostUsd: 0, paidServiceCallsThisStage: 0 };
      const validationBytes = Buffer.from(`${JSON.stringify(validation, null, 2)}\n`);
      const provenanceBytes = Buffer.from(`${JSON.stringify(provenance, null, 2)}\n`);
      await mkdir(path.dirname(path.resolve(context.validation)), { recursive: true });
      await mkdir(path.dirname(path.resolve(context.provenance)), { recursive: true });
      await writeFile(path.resolve(context.validation), validationBytes);
      await writeFile(path.resolve(context.provenance), provenanceBytes);
      record = { ...base, status: accepted ? "completed-valid" : "output-validation-failed",
        gateAcceptancePassed: accepted, outputWritten: true, outputSha256: sha256(resultBytes),
        validationSha256: sha256(validationBytes), provenanceSha256: sha256(provenanceBytes),
        validationSummary, validationMessage };
    }
  } catch (error) {
    record = { contextIndex: context.contextIndex, packetIndex: context.packetIndex,
      debateNumber: "109", shardId: context.shardId, attemptCount: 1, retryCount: 0,
      timeoutExtensionCount: 0, furtherRecursiveCorrectionCount: 0,
      startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started,
      authentication: "ChatGPT subscription", meteredApiCostUsd: 0,
      paidServiceCallsThisStage: 0, modelAuthoredScores: 0, status: "runner-error",
      gateAcceptancePassed: false, outputWritten: await exists(context.output),
      failureMessage: (error.stack ?? String(error)).slice(-10000) };
  } finally {
    activeContexts -= 1; await rm(temporary, { recursive: true, force: true });
    await rm(codexHome, { recursive: true, force: true });
  }
  process.stdout.write(`[batch-05-debate-109-correction-2] index ${context.contextIndex} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`);
  return record;
}

async function runPool(contexts, maximumConcurrency) {
  const results = []; let next = 0;
  async function worker() { while (next < contexts.length) { const index = next; next += 1;
    results[index] = await runContext(contexts[index]); } }
  await Promise.all(Array.from({ length: Math.min(maximumConcurrency, contexts.length) }, () => worker()));
  return results;
}
const gateStartedAt = new Date().toISOString(); const gateStarted = Date.now();
const results = []; const phaseRecords = []; let priorRampPassed = true;
for (const phase of activation.executionPolicy.rampPhases) {
  if (!priorRampPassed) { phaseRecords.push({ ...phase, attemptedContextIndexes: [],
    validContextIndexes: [], passed: false, skippedBecausePriorRampFailed: true }); continue; }
  const phaseResults = await runPool(phase.contextIndexes.map((index) => activation.contexts[index]),
    phase.maximumParallelContexts);
  results.push(...phaseResults);
  const allValid = phaseResults.every((result) => result.gateAcceptancePassed);
  phaseRecords.push({ ...phase, attemptedContextIndexes: phaseResults.map((r) => r.contextIndex),
    validContextIndexes: phaseResults.filter((r) => r.gateAcceptancePassed).map((r) => r.contextIndex),
    passed: allValid, skippedBecausePriorRampFailed: false });
  if (phase.expansionRequiresAllValid && !allValid) priorRampPassed = false;
}
results.sort((a, b) => a.contextIndex - b.contextIndex);
const attempted = new Set(results.map((r) => r.contextIndex));
const unattemptedContextIndexes = activation.contexts.map((r) => r.contextIndex)
  .filter((index) => !attempted.has(index));
const validContexts = results.filter((r) => r.gateAcceptancePassed).length;
const wallElapsedMs = Date.now() - gateStarted;
const execution = { schemaVersion: "1.0-assessment-production-post-canary-batch-05-debate-109-correction-2-execution",
  protocolId: activation.protocolId, status: validContexts === 4
    ? "batch-05-debate-109-four-context-correction-2-gate-passed"
    : "batch-05-debate-109-correction-2-gate-complete-with-failure",
  gateStartedAt, gateCompletedAt: new Date().toISOString(), contextsPlanned: 4,
  contextsAttempted: results.length, contextsUnattempted: unattemptedContextIndexes.length,
  unattemptedContextIndexes, validContexts, invalidContexts: results.length - validContexts,
  attempts: results.length, retries: 0, timeoutExtensions: 0,
  furtherRecursiveCorrections: 0, maximumObservedConcurrency,
  schedulerRamp: [1, 2], wallElapsedMs,
  aggregateModelElapsedMs: results.reduce((sum, r) => sum + r.elapsedMs, 0),
  rampPhases: phaseRecords, results, rejectedProShardPreserved: true,
  acceptedConShardPreserved: true, publicationWasScoreLocked: true,
  scoresImmutable: true, meteredApiCostUsd: 0, paidServiceCallsThisStage: 0,
  modelAuthoredScores: 0, scorePassesExecutedThisStage: 0 };
await writeFile(path.resolve(activation.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify({ status: execution.status, contextsAttempted: execution.contextsAttempted,
  contextsUnattempted: execution.contextsUnattempted, validContexts,
  invalidContexts: execution.invalidContexts, elapsedMinutes: Number((wallElapsedMs / 60000).toFixed(2)),
  attempts: execution.attempts, retries: 0, timeoutExtensions: 0,
  furtherRecursiveCorrections: 0, meteredApiCostUsd: 0,
  paidServiceCalls: 0, modelAuthoredScores: 0 }, null, 2));
