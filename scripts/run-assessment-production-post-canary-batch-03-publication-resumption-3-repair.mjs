#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { DEBATE_27_PUBLICATION_REPAIR_ROOT, validateDebate27RepairOutput } from "./lib/assessment-production-post-canary-batch-03-publication-resumption-3-repair.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const ACTIVATION = `${DEBATE_27_PUBLICATION_REPAIR_ROOT}/execution-activation.json`;
const activation = JSON.parse(await readFile(path.resolve(ACTIVATION), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(
  activation.status === "four-frozen-bounded-debate-27-publication-repair-contexts-authorized" && activation.contexts?.length === 4 &&
    activation.authorization?.repairModelExecution === true && activation.authorization?.deterministicOutputValidation === true &&
    activation.authorization?.retry === false && activation.authorization?.timeoutExtension === false && activation.authorization?.recursiveRepair === false && activation.authorization?.paidServices === false &&
    activation.modelInputs?.oneRepairPacketPerContext === true && activation.modelInputs?.acceptedOutputsUnavailable === true && activation.modelInputs?.otherRepairPacketsUnavailable === true,
  "the Debate 27 repair execution is not authorized"
);
assertV4(
  activation.model?.label === "5.6 Sol" && activation.model?.slug === "gpt-5.6-sol" && activation.model?.reasoningEffort === "low" && activation.model?.authentication === "ChatGPT subscription" &&
    activation.executionPolicy?.attemptsPerContext === 1 && activation.executionPolicy?.retriesMaximum === 0 && activation.executionPolicy?.timeoutExtensionsMaximum === 0 && activation.executionPolicy?.recursiveCorrectionContextsMaximum === 0 &&
    activation.executionPolicy?.maximumParallelContexts === 2 && canonicalJson(activation.executionPolicy?.schedulerRamp) === canonicalJson([1, 2]),
  "the Debate 27 repair execution controls changed"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) assertV4(sha256(await readFile(path.resolve(file))) === digest, `Debate 27 repair source hash mismatch: ${file}`);
for (const future of activation.futureOutputPathsExcludedFromSourceHashes) assertV4(!(await exists(future)), `future Debate 27 repair output exists: ${future}`);

function invoke(args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(activation.executionEnvironment.codexPath, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let forceTimer = null;
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
  const temporary = await mkdtemp(path.join(os.tmpdir(), `batch-03-debate-27-repair-${context.packetIndex}-`));
  const codexHome = await mkdtemp(path.join(os.tmpdir(), `batch-03-debate-27-repair-home-${context.packetIndex}-`));
  const authSource = path.join(os.homedir(), ".codex", "auth.json");
  const startedAt = new Date().toISOString();
  const started = Date.now();
  let record;
  activeContexts += 1;
  maximumObservedConcurrency = Math.max(maximumObservedConcurrency, activeContexts);
  try {
    const copies = [[activation.modelInputs.productionWorkflow, "production-workflow.md"], [activation.modelInputs.readinessWorkflow, "readiness-workflow.md"], [activation.modelInputs.outputContract, "output-contract.md"], [activation.modelInputs.manual, "repair-manual.md"], [context.packet, "packet.json"], [context.schema, "schema.json"]];
    for (const [source, target] of copies) await copyFile(path.resolve(source), path.join(temporary, target));
    await copyFile(authSource, path.join(codexHome, "auth.json"));
    const env = { ...process.env, CODEX_HOME: codexHome };
    for (const key of activation.executionPolicy.removedEnvironmentVariables) delete env[key];
    const prompt = [
      "Read production-workflow.md, readiness-workflow.md, output-contract.md, repair-manual.md, packet.json, and schema.json completely and no other files.",
      `Act only as isolated Debate 27 bounded publication repair editor ${context.packetIndex}.`,
      `Rewrite exactly the ${context.writableFieldCount} correctedCritiques ${context.writableFieldCount === 1 ? "entry" : "entries"} named by the schema, preserving the supplied adjudicated substance and locked score band.`,
      "For each critique, write exactly four ordered labeled sentences, target 112–118 words, remain within 105–130 words, preferably exceed 900 characters and never fall below 880 characters, and end every sentence with terminal punctuation.",
      "Participant judgment is closed and score-blind. Scores are repository-owned and immutable. Do not infer, emit, recalculate, or suggest changing a numerical score.",
      "Do not emit any tag, quote, commentary, AI Extension, other move, other repair packet, other debate, accepted output, or unlisted field.",
      "Return exactly one schema-conforming JSON object and nothing else."
    ].join(" ");
    process.stdout.write(`[batch-03-debate-27-publication-repair] starting packet ${context.packetIndex} 5.6 Sol/low\n`);
    const invocation = await invoke(["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", activation.model.slug, "-c", `model_reasoning_effort="${activation.model.reasoningEffort}"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env }, activation.executionPolicy.timeoutMsPerContext);
    const resultPath = path.join(temporary, "result.json");
    const resultExists = await exists(resultPath);
    const base = { contextIndex: context.contextIndex, packetIndex: context.packetIndex, debateNumber: "27", debateId: context.debateId, model: activation.model.label, reasoningEffort: activation.model.reasoningEffort, attemptCount: 1, retryCount: 0, timeoutExtensionCount: 0, recursiveCorrectionContextCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, commandExitCode: invocation.code, terminationSignal: invocation.signal, authentication: "ChatGPT subscription", apiKeysRemoved: true, isolatedTemporaryCodexHome: true, isolatedTemporaryWorkingDirectory: true, acceptedOutputsAvailableToModel: false, otherRepairPacketsAvailableToModel: false, participantJudgmentWasScoreBlind: true, scoresImmutable: true, writableFields: context.writableFields, copiedInputBytes: context.copiedInputBytes, meteredApiCostUsd: 0, paidServiceCallsThisStage: 0, modelAuthoredScores: 0, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr) };
    if (invocation.error || invocation.timedOut || invocation.code !== 0 || invocation.signal !== null || !resultExists) {
      record = { ...base, status: invocation.timedOut ? "timed-out" : !resultExists ? "result-missing" : "transport-failed", gateAcceptancePassed: false, outputWritten: false, failureMessage: `${invocation.error?.stack ?? ""}\n${invocation.stdout}\n${invocation.stderr}`.trim().slice(-10000) };
    } else {
      const resultBytes = await readFile(resultPath);
      await mkdir(path.dirname(path.resolve(context.repairOutput)), { recursive: true });
      await writeFile(path.resolve(context.repairOutput), resultBytes);
      let validationSummary = null;
      let validationMessage = null;
      try { validationSummary = validateDebate27RepairOutput(JSON.parse(resultBytes), JSON.parse(await readFile(path.resolve(context.packet), "utf8"))); }
      catch (error) { validationMessage = (error.stack ?? error.message).slice(-10000); }
      const accepted = validationSummary?.status === "passed";
      await mkdir(path.dirname(path.resolve(context.validation)), { recursive: true });
      await mkdir(path.dirname(path.resolve(context.provenance)), { recursive: true });
      await writeFile(path.resolve(context.validation), `${JSON.stringify({ schemaVersion: "1.0-assessment-production-post-canary-batch-03-debate-27-publication-repair-validation", protocolId: activation.protocolId, status: accepted ? "passed" : "failed", debateNumber: "27", packetIndex: context.packetIndex, outputSha256: sha256(resultBytes), validationSummary, validationMessage, modelAuthoredScores: 0 }, null, 2)}\n`);
      await writeFile(path.resolve(context.provenance), `${JSON.stringify({ schemaVersion: "1.0-assessment-production-post-canary-batch-03-debate-27-publication-repair-provenance", protocolId: activation.protocolId, debateNumber: "27", packetIndex: context.packetIndex, model: activation.model, authentication: "ChatGPT subscription", attemptCount: 1, retryCount: 0, timeoutExtensionCount: 0, recursiveCorrectionContextCount: 0, apiKeysRemoved: true, participantJudgmentWasScoreBlind: true, scoresImmutable: true, acceptedOutputsAvailableToModel: false, otherRepairPacketsAvailableToModel: false, copiedInputs: Object.fromEntries(copies.map(([source, target]) => [target, { source, sha256: activation.sourceHashes[source] }])), outputSha256: sha256(resultBytes), modelAuthoredScores: 0, meteredApiCostUsd: 0, paidServiceCallsThisStage: 0 }, null, 2)}\n`);
      record = { ...base, status: accepted ? "completed-valid" : "output-validation-failed", gateAcceptancePassed: accepted, outputWritten: true, repairOutputSha256: sha256(resultBytes), validationWritten: true, provenanceWritten: true, validationSummary, validationMessage };
    }
  } catch (error) {
    record = { contextIndex: context.contextIndex, packetIndex: context.packetIndex, debateNumber: "27", model: "5.6 Sol", reasoningEffort: "low", attemptCount: 1, retryCount: 0, timeoutExtensionCount: 0, recursiveCorrectionContextCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, authentication: "ChatGPT subscription", apiKeysRemoved: true, acceptedOutputsAvailableToModel: false, otherRepairPacketsAvailableToModel: false, meteredApiCostUsd: 0, paidServiceCallsThisStage: 0, modelAuthoredScores: 0, status: "runner-error", gateAcceptancePassed: false, failureMessage: (error.stack ?? String(error)).slice(-10000) };
  } finally {
    activeContexts -= 1;
    await rm(temporary, { recursive: true, force: true });
    await rm(codexHome, { recursive: true, force: true });
  }
  return record;
}
async function runPool(contexts, maximumConcurrency) {
  const results = [];
  let next = 0;
  async function worker() { while (next < contexts.length) { const index = next; next += 1; results[index] = await runContext(contexts[index]); } }
  await Promise.all(Array.from({ length: Math.min(maximumConcurrency, contexts.length) }, () => worker()));
  return results;
}
const gateStartedAt = new Date().toISOString();
const started = Date.now();
const results = [];
const phaseRecords = [];
let priorRampPassed = true;
for (const phase of activation.executionPolicy.rampPhases) {
  if (!priorRampPassed) { phaseRecords.push({ ...phase, attemptedContextIndexes: [], validContextIndexes: [], passed: false, skippedBecausePriorRampFailed: true }); continue; }
  const phaseResults = await runPool(phase.contextIndexes.map((index) => activation.contexts[index]), phase.maximumParallelContexts);
  results.push(...phaseResults);
  const allValid = phaseResults.every(({ gateAcceptancePassed }) => gateAcceptancePassed);
  phaseRecords.push({ ...phase, attemptedContextIndexes: phaseResults.map(({ contextIndex }) => contextIndex), validContextIndexes: phaseResults.filter(({ gateAcceptancePassed }) => gateAcceptancePassed).map(({ contextIndex }) => contextIndex), passed: allValid, skippedBecausePriorRampFailed: false });
  if (phase.expansionRequiresAllValid && !allValid) priorRampPassed = false;
}
results.sort((left, right) => left.contextIndex - right.contextIndex);
const attempted = new Set(results.map(({ contextIndex }) => contextIndex));
const unattemptedContextIndexes = activation.contexts.map(({ contextIndex }) => contextIndex).filter((index) => !attempted.has(index));
const validContexts = results.filter(({ gateAcceptancePassed }) => gateAcceptancePassed).length;
const execution = { schemaVersion: "1.0-assessment-production-post-canary-batch-03-debate-27-publication-repair-model-execution", protocolId: activation.protocolId, status: validContexts === 4 ? "batch-03-debate-27-four-context-publication-repair-passed" : "batch-03-debate-27-publication-repair-failed", gateStartedAt, gateCompletedAt: new Date().toISOString(), contextsPlanned: 4, contextsAttempted: results.length, contextsUnattempted: unattemptedContextIndexes.length, unattemptedContextIndexes, validContexts, invalidContexts: results.length - validContexts, attempts: results.length, retries: 0, timeoutExtensions: 0, recursiveCorrectionContexts: 0, maximumObservedConcurrency, schedulerRamp: [1, 2], wallElapsedMs: Date.now() - started, aggregateModelElapsedMs: results.reduce((sum, result) => sum + result.elapsedMs, 0), rampPhases: phaseRecords, results, originalFailedOutputPreserved: true, acceptedNineDebateCohortUnavailableToModels: true, participantJudgmentWasScoreBlind: true, scoresImmutable: true, meteredApiCostUsd: 0, paidServiceCallsThisStage: 0, modelAuthoredScores: 0, authorization: { deterministicAnalysisAndMerge: true, deterministicCohortReplay: validContexts === 4, retry: false, timeoutExtension: false, recursiveRepair: false, paidServices: false, productionMutation: false, nextBatchSelection: false } };
await writeFile(path.resolve(activation.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify({ status: execution.status, contextsAttempted: execution.contextsAttempted, contextsUnattempted: execution.contextsUnattempted, validContexts, invalidContexts: execution.invalidContexts, elapsedMinutes: Number((execution.wallElapsedMs / 60000).toFixed(2)), attempts: execution.attempts, retries: 0, timeoutExtensions: 0, meteredApiCostUsd: 0, paidServiceCalls: 0, modelAuthoredScores: 0 }, null, 2));
