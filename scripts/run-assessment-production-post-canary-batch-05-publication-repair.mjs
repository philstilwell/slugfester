#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  POST_CANARY_BATCH_05_DEBATE_64_REPAIR_ROOT,
  validateDebate64RepairOutput
} from "./lib/assessment-production-post-canary-batch-05-publication-repair.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT = POST_CANARY_BATCH_05_DEBATE_64_REPAIR_ROOT;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const activation = JSON.parse(await readFile(path.resolve(ACTIVATION), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(
  activation.status ===
      "frozen-one-isolated-two-field-batch-05-debate-64-publication-repair-context-authorized" &&
    activation.batchNumber === 5 && activation.contexts?.length === 1 &&
    activation.authorization?.repairModelExecution === true &&
    activation.authorization?.deterministicRepairOutputValidation === true &&
    activation.authorization?.deterministicMergeAndCompleteValidation === true &&
    activation.authorization?.retry === false &&
    activation.authorization?.timeoutExtension === false &&
    activation.authorization?.recursiveCorrectionModelExecution === false &&
    activation.authorization?.paidServices === false &&
    activation.authorization?.productionMutation === false,
  "the Debate 64 publication repair execution is not authorized"
);
assertV4(
  activation.model?.label === "5.6 Sol" && activation.model?.slug === "gpt-5.6-sol" &&
    activation.model?.reasoningEffort === "low" &&
    activation.model?.authentication === "ChatGPT subscription" &&
    activation.executionPolicy?.attemptsPerContext === 1 &&
    activation.executionPolicy?.retriesMaximum === 0 &&
    activation.executionPolicy?.timeoutExtensionsMaximum === 0 &&
    activation.executionPolicy?.recursiveCorrectionContextsMaximum === 0 &&
    activation.executionPolicy?.maximumParallelContexts === 1 &&
    JSON.stringify(activation.executionPolicy?.schedulerRamp) === JSON.stringify([1]) &&
    activation.executionPolicy?.APIKeysRemoved === true,
  "the Debate 64 repair execution controls changed"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `repair source hash mismatch: ${file}`);
}
for (const future of activation.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(future)), `future repair output exists: ${future}`);
}

const codex = activation.executionEnvironment.codexPath;
const authSource = path.join(os.homedir(), ".codex", "auth.json");
await access(codex);
await access(authSource);
const context = activation.contexts[0];

function invoke(args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(codex, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
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

const temporary = await mkdtemp(path.join(os.tmpdir(), "batch-05-debate-64-publication-repair-"));
const codexHome = await mkdtemp(path.join(os.tmpdir(), "batch-05-debate-64-publication-repair-home-"));
const startedAt = new Date().toISOString();
const started = Date.now();
let record;
try {
  const copies = [
    [activation.modelInputs.productionWorkflow, "production-workflow.md"],
    [activation.modelInputs.readinessWorkflow, "readiness-workflow.md"],
    [activation.modelInputs.outputContract, "output-contract.md"],
    [activation.modelInputs.manual, "repair-manual.md"],
    [context.packet, "packet.json"], [context.schema, "schema.json"]
  ];
  for (const [source, target] of copies) await copyFile(path.resolve(source), path.join(temporary, target));
  await copyFile(authSource, path.join(codexHome, "auth.json"));
  const env = { ...process.env, CODEX_HOME: codexHome };
  for (const key of activation.executionPolicy.removedEnvironmentVariables) delete env[key];
  const prompt = [
    "Read production-workflow.md, readiness-workflow.md, output-contract.md, repair-manual.md, packet.json, and schema.json completely and no other files.",
    "Act only as the isolated Batch 5 Debate 64 bounded publication repair editor.",
    "Return exactly the two correctedFields keys required by schema.json and no other writable field.",
    "For the quotation, copy an exact 6–14 word target substring from its supplied quote-eligible sourceExcerpt; acceptance is 3–18 words and transcript tokens must be unchanged.",
    "For the critique, preserve its adjudicated substance and locked score band while producing exactly four ordered labeled sentences; target 112–118 words, remain within 105–130 words and at least 880 characters, and end every sentence with terminal punctuation.",
    "Participant judgment is closed. Scores are repository-owned and immutable. Do not calculate, emit, infer, suggest, or change any score.",
    "Do not emit tags, commentary, AI Extension material, another move, another debate, or any unlisted field.",
    "Return exactly one schema-conforming JSON object and nothing else."
  ].join(" ");
  process.stdout.write(`[batch-05-publication-repair] starting Debate 64 ${activation.model.label}/${activation.model.reasoningEffort}\n`);
  const invocation = await invoke([
    "exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules",
    "--model", activation.model.slug,
    "-c", `model_reasoning_effort="${activation.model.reasoningEffort}"`,
    "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search",
    "--disable", "apps", "--disable", "memories", "--disable", "multi_agent",
    "--disable", "browser_use", "--disable", "computer_use",
    "--disable", "workspace_dependencies", "--sandbox", "read-only",
    "--output-schema", "schema.json", "--output-last-message", "result.json", prompt
  ], { cwd: temporary, env }, activation.executionPolicy.timeoutMsPerContext);
  const resultPath = path.join(temporary, "result.json");
  const resultExists = await exists(resultPath);
  const base = {
    contextIndex: 0, packetIndex: 0, debateNumber: "64", debateId: context.debateId,
    repairType: context.repairType, model: activation.model.label,
    modelSlug: activation.model.slug, reasoningEffort: activation.model.reasoningEffort,
    attemptCount: 1, retryCount: 0, timeoutExtensionCount: 0,
    recursiveCorrectionContextCount: 0, startedAt, completedAt: new Date().toISOString(),
    elapsedMs: Date.now() - started, timedOut: invocation.timedOut,
    commandExitCode: invocation.code, terminationSignal: invocation.signal,
    authentication: "ChatGPT subscription", apiKeysRemoved: true,
    isolatedTemporaryCodexHome: true, isolatedTemporaryWorkingDirectory: true,
    participantJudgmentWasScoreBlind: true, publicationWasScoreLocked: true,
    scoresImmutable: true, writableFields: context.writableFields,
    copiedInputBytes: context.copiedInputBytes, meteredApiCostUsd: 0,
    paidServiceCallsThisStage: 0, modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0,
    stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr)
  };
  if (invocation.error || invocation.timedOut || invocation.code !== 0 ||
      invocation.signal !== null || !resultExists) {
    record = {
      ...base,
      status: invocation.timedOut ? "timed-out" : !resultExists ? "result-missing" : "transport-failed",
      gateAcceptancePassed: false, outputWritten: false,
      failureMessage: `${invocation.error?.stack ?? ""}\n${invocation.stdout}\n${invocation.stderr}`
        .trim().slice(-10000)
    };
  } else {
    const resultBytes = await readFile(resultPath);
    await mkdir(path.dirname(path.resolve(context.repairOutput)), { recursive: true });
    await writeFile(path.resolve(context.repairOutput), resultBytes);
    let validationSummary = null;
    let validationMessage = null;
    try {
      validationSummary = validateDebate64RepairOutput(
        JSON.parse(resultBytes), JSON.parse(await readFile(path.resolve(context.packet), "utf8"))
      );
    } catch (error) { validationMessage = (error.stack ?? error.message).slice(-10000); }
    const accepted = validationSummary?.status === "passed";
    const validation = {
      schemaVersion: "1.0-assessment-production-post-canary-batch-05-debate-64-publication-repair-validation",
      protocolId: activation.protocolId, status: accepted ? "passed" : "failed",
      debateNumber: "64", packetIndex: 0, repairOutputSha256: sha256(resultBytes),
      validationSummary, validationMessage, modelAuthoredScores: 0
    };
    const provenance = {
      schemaVersion: "1.0-assessment-production-post-canary-batch-05-debate-64-publication-repair-provenance",
      protocolId: activation.protocolId, debateNumber: "64", packetIndex: 0,
      model: activation.model, authentication: "ChatGPT subscription", reasoningEffort: "low",
      attemptCount: 1, retryCount: 0, timeoutExtensionCount: 0,
      recursiveCorrectionContextCount: 0, apiKeysRemoved: true,
      isolatedTemporaryCodexHome: true, isolatedTemporaryWorkingDirectory: true,
      participantJudgmentWasScoreBlind: true, publicationWasScoreLocked: true,
      scoresImmutable: true, writableFields: context.writableFields,
      copiedInputs: Object.fromEntries(copies.map(([source, target]) => [
        target, { source, sha256: activation.sourceHashes[source] }
      ])),
      repairOutputSha256: sha256(resultBytes), modelAuthoredScores: 0,
      meteredApiCostUsd: 0, paidServiceCallsThisStage: 0
    };
    await mkdir(path.dirname(path.resolve(context.validation)), { recursive: true });
    await mkdir(path.dirname(path.resolve(context.provenance)), { recursive: true });
    await writeFile(path.resolve(context.validation), `${JSON.stringify(validation, null, 2)}\n`);
    await writeFile(path.resolve(context.provenance), `${JSON.stringify(provenance, null, 2)}\n`);
    record = {
      ...base, status: accepted ? "completed-valid" : "output-validation-failed",
      gateAcceptancePassed: accepted, outputWritten: true,
      repairOutputSha256: sha256(resultBytes), validationWritten: true,
      provenanceWritten: true, validationSummary, validationMessage
    };
  }
} catch (error) {
  record = {
    contextIndex: 0, packetIndex: 0, debateNumber: "64", debateId: context.debateId,
    repairType: context.repairType, model: "5.6 Sol", modelSlug: "gpt-5.6-sol",
    reasoningEffort: "low", attemptCount: 1, retryCount: 0,
    timeoutExtensionCount: 0, recursiveCorrectionContextCount: 0,
    startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started,
    authentication: "ChatGPT subscription", apiKeysRemoved: true,
    participantJudgmentWasScoreBlind: true, publicationWasScoreLocked: true,
    scoresImmutable: true, writableFields: context.writableFields,
    meteredApiCostUsd: 0, paidServiceCallsThisStage: 0, modelAuthoredScores: 0,
    status: "runner-error", gateAcceptancePassed: false,
    outputWritten: await exists(context.repairOutput),
    failureMessage: (error.stack ?? String(error)).slice(-10000)
  };
} finally {
  await rm(temporary, { recursive: true, force: true });
  await rm(codexHome, { recursive: true, force: true });
}

const accepted = record.gateAcceptancePassed === true;
const execution = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-debate-64-publication-repair-model-execution",
  protocolId: activation.protocolId,
  status: accepted
    ? "batch-05-debate-64-one-context-publication-repair-gate-passed"
    : "batch-05-debate-64-publication-repair-gate-complete-with-failure",
  gateStartedAt: startedAt, gateCompletedAt: new Date().toISOString(),
  contextsPlanned: 1, contextsAttempted: 1, contextsUnattempted: 0,
  unattemptedContextIndexes: [], validContexts: accepted ? 1 : 0,
  invalidContexts: accepted ? 0 : 1, attempts: 1, retries: 0,
  timeoutExtensions: 0, recursiveCorrectionContexts: 0,
  maximumObservedConcurrency: 1, schedulerRamp: [1],
  wallElapsedMs: Date.now() - started, aggregateModelElapsedMs: record.elapsedMs,
  results: [record], originalFailedOutputPreserved: true,
  participantJudgmentWasScoreBlind: true, publicationWasScoreLocked: true,
  scoresImmutable: true, meteredApiCostUsd: 0, paidServiceCallsThisStage: 0,
  modelAuthoredScores: 0, scorePassesExecutedThisStage: 0,
  authorization: {
    deterministicAnalysis: true,
    deterministicMergeAndCompleteValidation: accepted,
    sevenContextResumptionPreparation: false,
    retry: false, timeoutExtension: false, recursiveCorrectionModelExecution: false,
    paidServices: false, productionMutation: false, nextBatchSelection: false
  }
};
await writeFile(path.resolve(activation.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify({
  status: execution.status, contextsAttempted: 1, validContexts: execution.validContexts,
  invalidContexts: execution.invalidContexts,
  elapsedMinutes: Number((execution.wallElapsedMs / 60000).toFixed(2)),
  attempts: 1, retries: 0, timeoutExtensions: 0, recursiveCorrectionContexts: 0,
  meteredApiCostUsd: 0, paidServiceCalls: 0, modelAuthoredScores: 0
}, null, 2));
