#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  CHECKPOINT_V22_REPAIR_ROOT,
  validateCheckpointV22RepairOutput
} from "./lib/assessment-production-checkpoint-v2.2-publication-repair.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const activationPath = `${CHECKPOINT_V22_REPAIR_ROOT}/execution-activation.json`;
const activation = JSON.parse(await readFile(path.resolve(activationPath), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(
  activation.status === "frozen-one-isolated-two-field-debate-50-publication-repair-authorized" &&
    activation.authorization.repairModelContext === true &&
    activation.authorization.deterministicRepairValidation === true &&
    activation.authorization.retry === false &&
    activation.authorization.furtherCorrectionModelExecution === false &&
    activation.authorization.productionMutation === false &&
    activation.executionPolicy.attemptsPerContext === 1 &&
    activation.executionPolicy.retriesMaximum === 0 &&
    activation.executionPolicy.maximumParallelContexts === 1 &&
    activation.model.label === "5.6 Sol" &&
    activation.model.slug === "gpt-5.6-sol" &&
    activation.model.reasoningEffort === "low" &&
    activation.model.authentication === "ChatGPT subscription",
  "repair execution is not authorized or its controls changed"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest, `source hash mismatch: ${file}`);
}
for (const future of activation.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(future)), `future output exists: ${future}`);
}

const codex = activation.executionEnvironment.codexPath;
const authSource = path.join(os.homedir(), ".codex", "auth.json");
await access(codex);
await access(authSource);
const temporary = await mkdtemp(path.join(os.tmpdir(), "checkpoint-v22-publication-repair-"));
const codexHome = await mkdtemp(path.join(os.tmpdir(), "checkpoint-v22-publication-repair-home-"));

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
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (forceTimer) clearTimeout(forceTimer);
      resolve({ code, signal, stdout, stderr, timedOut });
    });
  });
}

const startedAt = new Date().toISOString();
const started = Date.now();
let result;
try {
  const copies = [
    [activation.modelInputs.productionWorkflow, "production-workflow.md"],
    [activation.modelInputs.readinessWorkflow, "readiness-workflow.md"],
    [activation.modelInputs.outputContract, "output-contract.md"],
    [activation.modelInputs.manual, "repair-manual.md"],
    [activation.modelInputs.packet, "packet.json"],
    [activation.modelInputs.schema, "schema.json"]
  ];
  for (const [source, target] of copies) await copyFile(path.resolve(source), path.join(temporary, target));
  await copyFile(authSource, path.join(codexHome, "auth.json"));
  const env = { ...process.env, CODEX_HOME: codexHome };
  for (const key of activation.executionPolicy.removedEnvironmentVariables) delete env[key];
  const prompt = [
    "Read production-workflow.md, readiness-workflow.md, output-contract.md, repair-manual.md, packet.json, and schema.json completely and no other files.",
    "Act only as the isolated two-field publication repair editor for Debate 50.",
    "Rewrite exactly the two correctedCritiques entries named by the schema, preserving the supplied adjudicated substance and locked score band.",
    "For each critique, write exactly four complete ordered labeled sentences, target 112–118 words, remain within 105–130 words, preferably exceed 900 characters and never fall below 880 characters, and end each sentence with terminal punctuation.",
    "The participant judgment was score-blind; all scores remain repository-owned and immutable. Do not infer, emit, recalculate, or suggest changing a score.",
    "Do not emit any tag, quote, commentary, AI Extension, other move, other debate, or unlisted field. Use no CJK, Hangul, Kana, replacement characters, or prohibited rational-invulnerability language.",
    "Return exactly one schema-conforming JSON object and nothing else."
  ].join(" ");
  process.stdout.write("[checkpoint-v2.2-publication-repair] starting 5.6 Sol/low Debate 50 two-field context\n");
  const invocation = await invoke([
    "exec",
    "--ephemeral",
    "--skip-git-repo-check",
    "--ignore-user-config",
    "--ignore-rules",
    "--model",
    activation.model.slug,
    "-c",
    `model_reasoning_effort=\"${activation.model.reasoningEffort}\"`,
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
    "--output-schema", "schema.json",
    "--output-last-message", "result.json",
    prompt
  ], { cwd: temporary, env }, activation.executionPolicy.timeoutMsPerContext);
  const resultPath = path.join(temporary, "result.json");
  const resultExists = await exists(resultPath);
  const base = {
    contextIndex: 0,
    debateNumber: "50",
    debateId: activation.context.debateId,
    model: activation.model.label,
    reasoningEffort: activation.model.reasoningEffort,
    attemptCount: 1,
    retryCount: 0,
    furtherCorrectionContextCount: 0,
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
    participantJudgmentWasScoreBlind: true,
    scoresImmutable: true,
    writableFields: activation.context.writableFields,
    meteredApiCostUsd: 0,
    transcriptionCostUsdThisStage: 0,
    modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0,
    stdoutSha256: sha256(invocation.stdout),
    stderrSha256: sha256(invocation.stderr)
  };
  if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null || !resultExists) {
    result = {
      ...base,
      status: invocation.timedOut ? "timed-out" : !resultExists ? "result-missing" : "transport-failed",
      gateAcceptancePassed: false,
      outputWritten: false,
      failureMessage: `${invocation.stdout}\n${invocation.stderr}`.trim().slice(-10000)
    };
  } else {
    const resultBytes = await readFile(resultPath);
    await mkdir(path.dirname(path.resolve(activation.artifacts.repairOutput)), { recursive: true });
    await writeFile(path.resolve(activation.artifacts.repairOutput), resultBytes);
    let validationSummary = null;
    let validationMessage = null;
    try {
      validationSummary = validateCheckpointV22RepairOutput(
        JSON.parse(resultBytes),
        JSON.parse(await readFile(path.resolve(activation.context.packet), "utf8"))
      );
    } catch (error) {
      validationMessage = (error.stack ?? error.message).slice(-10000);
    }
    const accepted = validationSummary?.status === "passed";
    const validation = {
      schemaVersion: "1.0-production-checkpoint-v2.2-publication-repair-validation",
      protocolId: activation.protocolId,
      status: accepted ? "passed" : "failed",
      debateNumber: "50",
      repairOutputSha256: sha256(resultBytes),
      validationSummary,
      validationMessage,
      modelAuthoredScores: 0
    };
    const provenance = {
      schemaVersion: "1.0-production-checkpoint-v2.2-publication-repair-provenance",
      protocolId: activation.protocolId,
      debateNumber: "50",
      model: activation.model,
      authentication: "ChatGPT subscription",
      reasoningEffort: "low",
      attemptCount: 1,
      retryCount: 0,
      apiKeysRemoved: true,
      participantJudgmentWasScoreBlind: true,
      scoresImmutable: true,
      writableFields: activation.context.writableFields,
      copiedInputs: Object.fromEntries(copies.map(([source, target]) => [target, { source, sha256: activation.sourceHashes[source] }])),
      repairOutputSha256: sha256(resultBytes),
      modelAuthoredScores: 0,
      meteredApiCostUsd: 0
    };
    await writeFile(path.resolve(activation.artifacts.validation), `${JSON.stringify(validation, null, 2)}\n`);
    await writeFile(path.resolve(activation.artifacts.provenance), `${JSON.stringify(provenance, null, 2)}\n`);
    result = {
      ...base,
      status: accepted ? "completed-valid" : "output-validation-failed",
      gateAcceptancePassed: accepted,
      outputWritten: true,
      repairOutputSha256: sha256(resultBytes),
      validationWritten: true,
      provenanceWritten: true,
      validationSummary,
      validationMessage
    };
  }
} catch (error) {
  result = {
    contextIndex: 0,
    debateNumber: "50",
    model: "5.6 Sol",
    reasoningEffort: "low",
    attemptCount: 1,
    retryCount: 0,
    startedAt,
    completedAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    authentication: "ChatGPT subscription",
    apiKeysRemoved: true,
    meteredApiCostUsd: 0,
    modelAuthoredScores: 0,
    status: "runner-error",
    gateAcceptancePassed: false,
    outputWritten: await exists(activation.artifacts.repairOutput),
    failureMessage: (error.stack ?? String(error)).slice(-10000)
  };
} finally {
  await rm(temporary, { recursive: true, force: true });
  await rm(codexHome, { recursive: true, force: true });
}
const execution = {
  schemaVersion: "1.0-production-checkpoint-v2.2-publication-repair-model-execution",
  protocolId: activation.protocolId,
  status: result.gateAcceptancePassed ? "debate-50-two-field-publication-repair-passed" : "debate-50-two-field-publication-repair-failed",
  gateStartedAt: startedAt,
  gateCompletedAt: new Date().toISOString(),
  contextsPlanned: 1,
  contextsAttempted: 1,
  validContexts: result.gateAcceptancePassed ? 1 : 0,
  invalidContexts: result.gateAcceptancePassed ? 0 : 1,
  attempts: 1,
  retries: 0,
  furtherCorrectionContexts: 0,
  wallElapsedMs: result.elapsedMs,
  result,
  meteredApiCostUsd: 0,
  transcriptionCostUsdThisStage: 0,
  modelAuthoredScores: 0,
  authorization: {
    deterministicAnalysis: true,
    retry: false,
    furtherCorrectionModelExecution: false,
    publicationGateResumption: false,
    productionMutation: false
  }
};
await writeFile(path.resolve(activation.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify({
  status: execution.status,
  validContexts: execution.validContexts,
  elapsedMinutes: Number((result.elapsedMs / 60000).toFixed(2)),
  attempts: 1,
  retries: 0,
  meteredApiCostUsd: 0,
  modelAuthoredScores: 0
}, null, 2));
