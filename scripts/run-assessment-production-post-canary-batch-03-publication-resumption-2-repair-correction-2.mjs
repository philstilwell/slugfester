#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  DEBATE_157_CORRECTION_2_ROOT,
  validateDebate157Correction2Output
} from "./lib/assessment-production-post-canary-batch-03-publication-resumption-2-repair-correction-2.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ACTIVATION = `${DEBATE_157_CORRECTION_2_ROOT}/execution-activation.json`;
const activation = JSON.parse(await readFile(path.resolve(ACTIVATION), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(
  activation.status === "one-frozen-debate-157-publication-repair-correction-2-context-authorized" &&
    activation.authorization?.correctionModelExecution === true &&
    activation.authorization?.recursiveRecoveryExceptionUsed === true &&
    activation.authorization?.retry === false &&
    activation.authorization?.timeoutExtension === false &&
    activation.authorization?.paidServices === false &&
    activation.context?.writableFieldCount === 2 &&
    activation.modelInputs?.failedRepairOutputUnavailable === true,
  "the one-time Debate 157 correction-2 model execution is not authorized"
);
assertV4(
  activation.model?.label === "5.6 Sol" &&
    activation.model?.slug === "gpt-5.6-sol" &&
    activation.model?.reasoningEffort === "low" &&
    activation.model?.authentication === "ChatGPT subscription" &&
    activation.executionPolicy?.attemptsPerContext === 1 &&
    activation.executionPolicy?.retriesMaximum === 0 &&
    activation.executionPolicy?.timeoutExtensionsMaximum === 0 &&
    activation.executionPolicy?.recursiveRecoveryContextsMaximum === 1 &&
    activation.executionPolicy?.APIKeysRemoved === true,
  "the correction-2 execution controls changed"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest, `correction-2 source hash mismatch: ${file}`);
}
for (const future of activation.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(future)), `future correction-2 output exists: ${future}`);
}

function invoke(args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(activation.executionEnvironment.codexPath, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
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
      clearTimeout(timer);
      if (forceTimer) clearTimeout(forceTimer);
      resolve({ code: null, signal: null, stdout, stderr, timedOut, error });
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (forceTimer) clearTimeout(forceTimer);
      resolve({ code, signal, stdout, stderr, timedOut, error: null });
    });
  });
}

const context = activation.context;
const temporary = await mkdtemp(path.join(os.tmpdir(), "batch-03-debate-157-correction-2-"));
const codexHome = await mkdtemp(path.join(os.tmpdir(), "batch-03-debate-157-correction-2-home-"));
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const startedAt = new Date().toISOString();
const started = Date.now();
let record;
try {
  const copies = [
    [activation.modelInputs.productionWorkflow, "production-workflow.md"],
    [activation.modelInputs.readinessWorkflow, "readiness-workflow.md"],
    [activation.modelInputs.outputContract, "output-contract.md"],
    [activation.modelInputs.manual, "correction-manual.md"],
    [context.packet, "packet.json"],
    [context.schema, "schema.json"]
  ];
  for (const [source, target] of copies) await copyFile(path.resolve(source), path.join(temporary, target));
  await copyFile(authSource, path.join(codexHome, "auth.json"));
  const env = { ...process.env, CODEX_HOME: codexHome };
  for (const key of activation.executionPolicy.removedEnvironmentVariables) delete env[key];
  const prompt = [
    "Read production-workflow.md, readiness-workflow.md, output-contract.md, correction-manual.md, packet.json, and schema.json completely and no other files.",
    "Act only as the isolated Debate 157 correction-2 editor for the two schema-named critique fields.",
    "Use only the original critiques and locked moves inside packet.json as substantive inputs; the prior failed repair response is unavailable and unaccepted.",
    "Return both corrected critiques. Preserve adjudicated substance and the locked score band.",
    "For each critique, use exactly four ordered labeled sentences, target 112–118 words, remain within 105–130 words, prefer at least 900 characters and never fall below 880 characters, and end every sentence with terminal punctuation.",
    "Participant judgment is closed and score-blind. Do not infer, emit, recalculate, or propose changing a numerical score.",
    "Emit no unlisted field, other move, other debate, tag, quote, commentary, or AI Extension.",
    "Return exactly one schema-conforming JSON object and nothing else."
  ].join(" ");
  process.stdout.write(`[batch-03-debate-157-correction-2] starting 5.6 Sol/low\n`);
  const invocation = await invoke([
    "exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules",
    "--model", activation.model.slug,
    "-c", `model_reasoning_effort="${activation.model.reasoningEffort}"`,
    "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search",
    "--disable", "apps", "--disable", "memories", "--disable", "multi_agent",
    "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies",
    "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt
  ], { cwd: temporary, env }, activation.executionPolicy.timeoutMsPerContext);
  const resultPath = path.join(temporary, "result.json");
  const resultExists = await exists(resultPath);
  const base = {
    contextIndex: 0,
    correctionId: "correction-2",
    debateNumber: "157",
    debateId: context.debateId,
    model: activation.model.label,
    reasoningEffort: activation.model.reasoningEffort,
    attemptCount: 1,
    retryCount: 0,
    timeoutExtensionCount: 0,
    recursiveRecoveryContextCount: 1,
    startedAt,
    completedAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    timedOut: invocation.timedOut,
    commandExitCode: invocation.code,
    terminationSignal: invocation.signal,
    authentication: "ChatGPT subscription",
    apiKeysRemoved: true,
    isolatedTemporaryCodexHome: true,
    isolatedTemporaryWorkingDirectory: true,
    failedRepairOutputAvailableToModel: false,
    participantJudgmentWasScoreBlind: true,
    scoresImmutable: true,
    writableFields: context.writableFields,
    copiedInputBytes: context.copiedInputBytes,
    meteredApiCostUsd: 0,
    paidServiceCallsThisStage: 0,
    modelAuthoredScores: 0,
    stdoutSha256: sha256(invocation.stdout),
    stderrSha256: sha256(invocation.stderr)
  };
  if (invocation.error || invocation.timedOut || invocation.code !== 0 || invocation.signal !== null || !resultExists) {
    record = {
      ...base,
      status: invocation.timedOut ? "timed-out" : !resultExists ? "result-missing" : "transport-failed",
      gateAcceptancePassed: false,
      outputWritten: false,
      failureMessage: `${invocation.error?.stack ?? ""}\n${invocation.stdout}\n${invocation.stderr}`.trim().slice(-10000)
    };
  } else {
    const resultBytes = await readFile(resultPath);
    await writeFile(path.resolve(context.output), resultBytes);
    let validationSummary = null;
    let validationMessage = null;
    try {
      validationSummary = validateDebate157Correction2Output(
        JSON.parse(resultBytes),
        JSON.parse(await readFile(path.resolve(context.packet), "utf8"))
      );
    } catch (error) {
      validationMessage = (error.stack ?? error.message).slice(-10000);
    }
    const accepted = validationSummary?.status === "passed";
    await writeFile(path.resolve(context.validation), `${JSON.stringify({
      schemaVersion: "1.0-assessment-production-post-canary-batch-03-debate-157-publication-repair-correction-2-validation",
      protocolId: activation.protocolId,
      status: accepted ? "passed" : "failed",
      debateNumber: "157",
      correctionId: "correction-2",
      outputSha256: sha256(resultBytes),
      validationSummary,
      validationMessage,
      modelAuthoredScores: 0
    }, null, 2)}\n`);
    await writeFile(path.resolve(context.provenance), `${JSON.stringify({
      schemaVersion: "1.0-assessment-production-post-canary-batch-03-debate-157-publication-repair-correction-2-provenance",
      protocolId: activation.protocolId,
      debateNumber: "157",
      correctionId: "correction-2",
      model: activation.model,
      authentication: "ChatGPT subscription",
      attemptCount: 1,
      retryCount: 0,
      timeoutExtensionCount: 0,
      recursiveRecoveryContextCount: 1,
      failedRepairOutputAvailableToModel: false,
      copiedInputs: Object.fromEntries(copies.map(([source, target]) => [target, { source, sha256: activation.sourceHashes[source] }])),
      outputSha256: sha256(resultBytes),
      meteredApiCostUsd: 0,
      paidServiceCallsThisStage: 0,
      modelAuthoredScores: 0
    }, null, 2)}\n`);
    record = {
      ...base,
      status: accepted ? "completed-valid" : "output-validation-failed",
      gateAcceptancePassed: accepted,
      outputWritten: true,
      outputSha256: sha256(resultBytes),
      validationWritten: true,
      provenanceWritten: true,
      validationSummary,
      validationMessage
    };
  }
} catch (error) {
  record = {
    contextIndex: 0,
    correctionId: "correction-2",
    debateNumber: "157",
    model: "5.6 Sol",
    reasoningEffort: "low",
    attemptCount: 1,
    retryCount: 0,
    timeoutExtensionCount: 0,
    recursiveRecoveryContextCount: 1,
    startedAt,
    completedAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    authentication: "ChatGPT subscription",
    apiKeysRemoved: true,
    failedRepairOutputAvailableToModel: false,
    meteredApiCostUsd: 0,
    paidServiceCallsThisStage: 0,
    modelAuthoredScores: 0,
    status: "runner-error",
    gateAcceptancePassed: false,
    failureMessage: (error.stack ?? String(error)).slice(-10000)
  };
} finally {
  await rm(temporary, { recursive: true, force: true });
  await rm(codexHome, { recursive: true, force: true });
}

const execution = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-03-debate-157-publication-repair-correction-2-model-execution",
  protocolId: activation.protocolId,
  status: record.gateAcceptancePassed
    ? "batch-03-debate-157-publication-repair-correction-2-passed"
    : "batch-03-debate-157-publication-repair-correction-2-failed",
  gateStartedAt: startedAt,
  gateCompletedAt: new Date().toISOString(),
  contextsPlanned: 1,
  contextsAttempted: 1,
  validContexts: record.gateAcceptancePassed ? 1 : 0,
  invalidContexts: record.gateAcceptancePassed ? 0 : 1,
  attempts: 1,
  retries: 0,
  timeoutExtensions: 0,
  recursiveRecoveryContexts: 1,
  result: record,
  failedOriginalRepairOutputPreservedAndUnaccepted: true,
  failedOriginalRepairOutputAvailableToModel: false,
  participantJudgmentWasScoreBlind: true,
  scoresImmutable: true,
  meteredApiCostUsd: 0,
  paidServiceCallsThisStage: 0,
  modelAuthoredScores: 0,
  authorization: {
    deterministicAnalysis: true,
    sevenContextResumptionPreparation: record.gateAcceptancePassed,
    retry: false,
    timeoutExtension: false,
    furtherRecursiveCorrection: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  }
};
await writeFile(path.resolve(activation.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify({
  status: execution.status,
  validContexts: execution.validContexts,
  invalidContexts: execution.invalidContexts,
  attempts: 1,
  retries: 0,
  timeoutExtensions: 0,
  recursiveRecoveryContexts: 1,
  directIncrementalCostUsd: 0
}, null, 2));
