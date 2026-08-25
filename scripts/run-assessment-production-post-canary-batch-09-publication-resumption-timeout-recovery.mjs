#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { POST_CANARY_BATCH_09_PUBLICATION_TIMEOUT_RECOVERY_ROOT as ROOT, validatePublicationTimeoutRecoveryShardOutput } from "./lib/assessment-production-post-canary-batch-09-publication-resumption-timeout-recovery.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const ACTIVATION = `${ROOT}/execution-activation.json`;
const activation = JSON.parse(await readFile(path.resolve(ACTIVATION)));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(activation.status === "frozen-eight-context-batch-09-publication-timeout-recovery-activated" && activation.contexts?.length === 8 && activation.authorization?.modelExecution === true && activation.model?.slug === "gpt-5.6-sol" && activation.model?.reasoningEffort === "low" && activation.model?.authentication === "ChatGPT subscription", "recovery execution is not activated");
assertV4(activation.executionPolicy?.attemptsPerContext === 1 && activation.executionPolicy?.retriesMaximum === 0 && activation.executionPolicy?.timeoutExtensionsMaximum === 0 && activation.executionPolicy?.recursiveCorrectionsMaximum === 0 && activation.executionPolicy?.maximumParallelContexts === 2 && canonicalJson(activation.executionPolicy?.schedulerRamp) === canonicalJson([1, 2]), "execution policy changed");
for (const [file, digest] of Object.entries(activation.sourceHashes)) assertV4(sha256(await readFile(path.resolve(file))) === digest, `source hash mismatch: ${file}`);
for (const future of activation.futureOutputPathsExcludedFromSourceHashes) assertV4(!(await exists(future)), `future output exists: ${future}`);
const codex = activation.executionEnvironment.codexPath;
const caffeinate = activation.executionEnvironment.hostAwakeGuard.path;
assertV4(sha256(await readFile(caffeinate)) === activation.executionEnvironment.hostAwakeGuard.sha256, "host-awake guard hash changed");
const authSource = path.join(os.homedir(), ".codex", "auth.json");
await access(codex); await access(caffeinate); await access(authSource);

function invoke(codexArgs, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(caffeinate, [...activation.executionEnvironment.hostAwakeGuard.args, codex, ...codexArgs], { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = ""; let stderr = ""; let timedOut = false; let forceTimer;
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000); }, timeoutMs);
    child.on("error", (error) => { clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer); resolve({ code: null, signal: null, stdout, stderr, timedOut, error }); });
    child.on("close", (code, signal) => { clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer); resolve({ code, signal, stdout, stderr, timedOut, error: null }); });
  });
}

let activeContexts = 0;
let maximumObservedConcurrency = 0;
async function runContext(context) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), `batch-09-publication-timeout-recovery-${context.contextIndex}-`));
  const codexHome = await mkdtemp(path.join(os.tmpdir(), `batch-09-publication-timeout-recovery-home-${context.contextIndex}-`));
  const startedAt = new Date().toISOString(); const started = Date.now(); let record;
  activeContexts += 1; maximumObservedConcurrency = Math.max(maximumObservedConcurrency, activeContexts);
  try {
    const copies = [[activation.modelInputs.productionWorkflow, "production-workflow.md"], [activation.modelInputs.readinessWorkflow, "readiness-workflow.md"], [activation.modelInputs.outputContract, "output-contract.md"], [activation.modelInputs.publicationManual, "publication-manual.md"], [activation.modelInputs.referenceCatalog, "reference-catalog.json"], [activation.modelInputs.recoveryManual, "recovery-manual.md"], [context.packet, "packet.json"], [context.schema, "schema.json"]];
    for (const [source, target] of copies) await copyFile(path.resolve(source), path.join(temporary, target));
    await copyFile(authSource, path.join(codexHome, "auth.json"));
    const env = { ...process.env, CODEX_HOME: codexHome };
    for (const key of activation.executionPolicy.removedEnvironmentVariables) delete env[key];
    const prompt = [
      "Read production-workflow.md, readiness-workflow.md, output-contract.md, publication-manual.md, reference-catalog.json, recovery-manual.md, packet.json, and schema.json completely and no other files.",
      `Act only as isolated Debate ${context.debateNumber} ${context.side}-side score-locked publication resumption editor.`,
      `Author exactly the original content fields listed in packet.json for ${context.shardId}; do not author the other shard or fixed fields.`,
      "Every move critique must use exactly four ordered labeled sentences, target 112–118 words, remain within 105–130 words and at least 880 characters, and end every sentence with terminal punctuation. Count before returning.",
      `Every AI Extension id must begin ai-${context.debateNumber}-${context.side}-.`,
      "Participant judgment is closed. Scores are repository-owned and immutable; do not infer, emit, recalculate, or recommend changing a score.",
      "Use no outside source, failed partial output, legacy assessment, other debate, ranking, or other model context.",
      "Return exactly one schema-conforming JSON object and nothing else."
    ].join(" ");
    process.stdout.write(`[batch-09-publication-timeout-recovery] starting ${context.contextIndex} Debate ${context.debateNumber} ${context.side}\n`);
    const invocation = await invoke(["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", activation.model.slug, "-c", `model_reasoning_effort=\"${activation.model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env }, activation.executionPolicy.timeoutMsPerContext);
    const resultPath = path.join(temporary, "result.json");
    const resultExists = await exists(resultPath);
    const base = { contextIndex: context.contextIndex, contextType: context.contextType, debateNumber: context.debateNumber, debateId: context.debateId, shardId: context.shardId, side: context.side, model: activation.model.label, reasoningEffort: activation.model.reasoningEffort, attemptCount: 1, retryCount: 0, timeoutExtensionCount: 0, recursiveCorrectionContextCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, commandExitCode: invocation.code, terminationSignal: invocation.signal, authentication: "ChatGPT subscription", apiKeysRemoved: true, isolatedTemporaryCodexHome: true, isolatedTemporaryWorkingDirectory: true, hostAwakeGuardApplied: true, hostAwakeGuardPath: caffeinate, participantJudgmentWasScoreBlind: true, publicationWasScoreLocked: true, scoresImmutable: true, writableFields: context.writableFields, meteredApiCostUsd: 0, paidServiceCallsThisStage: 0, modelAuthoredScores: 0, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr) };
    if (invocation.error || invocation.timedOut || invocation.code !== 0 || invocation.signal !== null || !resultExists) {
      record = { ...base, status: invocation.timedOut ? "timed-out" : !resultExists ? "result-missing" : "transport-failed", gateAcceptancePassed: false, outputWritten: false, failureMessage: `${invocation.error?.stack ?? ""}\n${invocation.stdout}\n${invocation.stderr}`.trim().slice(-10000) };
    } else {
      const resultBytes = await readFile(resultPath);
      await mkdir(path.dirname(path.resolve(context.output)), { recursive: true });
      await writeFile(path.resolve(context.output), resultBytes);
      let validationSummary = null; let validationMessage = null;
      try { validationSummary = validatePublicationTimeoutRecoveryShardOutput(JSON.parse(resultBytes), JSON.parse(await readFile(path.resolve(context.packet)))); } catch (error) { validationMessage = (error.stack ?? error.message).slice(-10000); }
      const accepted = validationSummary?.status === "passed";
      const validation = { schemaVersion: "1.0-assessment-production-post-canary-batch-09-publication-timeout-recovery-validation", protocolId: activation.protocolId, status: accepted ? "passed" : "failed", contextIndex: context.contextIndex, debateNumber: context.debateNumber, shardId: context.shardId, outputSha256: sha256(resultBytes), validationSummary, validationMessage, modelAuthoredScores: 0 };
      const provenance = { schemaVersion: "1.0-assessment-production-post-canary-batch-09-publication-timeout-recovery-provenance", protocolId: activation.protocolId, contextIndex: context.contextIndex, debateNumber: context.debateNumber, shardId: context.shardId, side: context.side, model: activation.model, authentication: "ChatGPT subscription", attemptCount: 1, retryCount: 0, timeoutExtensionCount: 0, recursiveCorrectionContextCount: 0, hostAwakeGuardApplied: true, apiKeysRemoved: true, isolatedTemporaryCodexHome: true, isolatedTemporaryWorkingDirectory: true, participantJudgmentWasScoreBlind: true, publicationWasScoreLocked: true, scoresImmutable: true, writableFields: context.writableFields, copiedInputs: Object.fromEntries(copies.map(([source, target]) => [target, { source, sha256: activation.sourceHashes[source] }])), outputSha256: sha256(resultBytes), modelAuthoredScores: 0, meteredApiCostUsd: 0, paidServiceCallsThisStage: 0 };
      const validationBytes = Buffer.from(`${JSON.stringify(validation, null, 2)}\n`); const provenanceBytes = Buffer.from(`${JSON.stringify(provenance, null, 2)}\n`);
      await mkdir(path.dirname(path.resolve(context.validation)), { recursive: true }); await mkdir(path.dirname(path.resolve(context.provenance)), { recursive: true });
      await writeFile(path.resolve(context.validation), validationBytes); await writeFile(path.resolve(context.provenance), provenanceBytes);
      record = { ...base, status: accepted ? "completed-valid" : "output-validation-failed", gateAcceptancePassed: accepted, outputWritten: true, outputSha256: sha256(resultBytes), validationWritten: true, validationSha256: sha256(validationBytes), provenanceWritten: true, provenanceSha256: sha256(provenanceBytes), validationSummary, validationMessage };
    }
  } catch (error) {
    record = { contextIndex: context.contextIndex, debateNumber: context.debateNumber, debateId: context.debateId, shardId: context.shardId, side: context.side, model: "5.6 Sol", reasoningEffort: "low", attemptCount: 1, retryCount: 0, timeoutExtensionCount: 0, recursiveCorrectionContextCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, authentication: "ChatGPT subscription", hostAwakeGuardApplied: true, meteredApiCostUsd: 0, paidServiceCallsThisStage: 0, modelAuthoredScores: 0, status: "runner-error", gateAcceptancePassed: false, outputWritten: await exists(context.output), failureMessage: (error.stack ?? String(error)).slice(-10000) };
  } finally { activeContexts -= 1; await rm(temporary, { recursive: true, force: true }); await rm(codexHome, { recursive: true, force: true }); }
  process.stdout.write(`[batch-09-publication-timeout-recovery] ${context.contextIndex} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`);
  return record;
}

async function runPool(contexts, maximumConcurrency) {
  const results = []; let next = 0;
  async function worker() { while (next < contexts.length) { const index = next; next += 1; results[index] = await runContext(contexts[index]); } }
  await Promise.all(Array.from({ length: Math.min(maximumConcurrency, contexts.length) }, () => worker()));
  return results;
}

const gateStartedAt = new Date().toISOString(); const gateStarted = Date.now(); const results = []; const phaseRecords = []; let priorRampPassed = true;
for (const phase of activation.executionPolicy.rampPhases) {
  if (!priorRampPassed) { phaseRecords.push({ ...phase, attemptedContextIndexes: [], validContextIndexes: [], passed: false, skippedBecausePriorRampFailed: true }); continue; }
  const phaseResults = await runPool(phase.contextIndexes.map((index) => activation.contexts[index]), phase.maximumParallelContexts);
  results.push(...phaseResults); const allValid = phaseResults.every((result) => result.gateAcceptancePassed);
  phaseRecords.push({ ...phase, attemptedContextIndexes: phaseResults.map((result) => result.contextIndex), validContextIndexes: phaseResults.filter((result) => result.gateAcceptancePassed).map((result) => result.contextIndex), passed: allValid, skippedBecausePriorRampFailed: false });
  if (phase.expansionRequiresAllValid && !allValid) priorRampPassed = false;
}
results.sort((a, b) => a.contextIndex - b.contextIndex);
const attempted = new Set(results.map((row) => row.contextIndex)); const validContexts = results.filter((row) => row.gateAcceptancePassed).length;
const execution = { schemaVersion: "1.0-assessment-production-post-canary-batch-09-publication-timeout-recovery-execution", protocolId: activation.protocolId, status: validContexts === 8 ? "completed-eight-valid-publication-timeout-recovery-contexts" : "publication-timeout-recovery-stopped-on-failure", gateStartedAt, gateCompletedAt: new Date().toISOString(), elapsedMs: Date.now() - gateStarted, batchNumber: 9, productionCanary: false, stagingOnly: true, model: activation.model, contextsPlanned: 8, contextsAttempted: results.length, validContexts, invalidContexts: results.length - validContexts, unattemptedContextIndexes: activation.contexts.filter((row) => !attempted.has(row.contextIndex)).map((row) => row.contextIndex), attempts: results.length, retries: 0, timeoutExtensions: 0, recursiveCorrectionContexts: 0, maximumObservedConcurrency, schedulerRamp: [1, 2], phaseRecords, hostAwakeGuard: activation.executionEnvironment.hostAwakeGuard, results, meteredApiCostUsd: 0, paidServiceCallsThisStage: 0, modelAuthoredScores: 0, scorePassesExecutedThisStage: 0, nextRequiredAction: validContexts === 8 ? "deterministic-merge-complete-validation-and-ten-debate-cohort-replay" : "stop-on-further-recovery-context-failure" };
await writeFile(path.resolve(activation.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify({ status: execution.status, attempted: execution.contextsAttempted, valid: execution.validContexts, invalid: execution.invalidContexts, unattempted: execution.unattemptedContextIndexes, maximumObservedConcurrency, attempts: execution.attempts, retries: 0, costUsd: 0, nextRequiredAction: execution.nextRequiredAction }, null, 2));
if (validContexts !== 8) process.exitCode = 2;
