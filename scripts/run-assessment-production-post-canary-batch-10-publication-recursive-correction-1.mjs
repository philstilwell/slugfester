#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ROOT, TARGET_FIELD, validateCorrectionOutput } from
  "./lib/assessment-production-post-canary-batch-10-publication-recursive-correction-1.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ACTIVATION = `${ROOT}/execution-activation.json`;
const activationBytes = await readFile(path.resolve(ACTIVATION));
const activation = JSON.parse(activationBytes);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(
  activation.status === "frozen-one-context-one-field-debate-21-publication-correction-activated" &&
    activation.authorization?.modelExecution === true &&
    activation.context?.writableFields?.length === 1 &&
    activation.context.writableFields[0] === TARGET_FIELD,
  "one-field correction execution is not activated"
);
assertV4(
  activation.executionPolicy?.attemptsPerContext === 1 &&
    activation.executionPolicy?.retriesMaximum === 0 &&
    activation.executionPolicy?.timeoutExtensionsMaximum === 0 &&
    activation.executionPolicy?.furtherRecursiveCorrectionsMaximum === 0,
  "execution policy changed"
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

const temporary = await mkdtemp(path.join(os.tmpdir(), "batch-10-debate-21-one-field-correction-"));
const isolatedCodexHome = await mkdtemp(path.join(os.tmpdir(), "batch-10-debate-21-one-field-correction-home-"));
const startedAt = new Date().toISOString();
const started = Date.now();
let execution;
try {
  const copies = [
    [activation.modelInputs.productionWorkflow, "production-workflow.md"],
    [activation.modelInputs.readinessWorkflow, "readiness-workflow.md"],
    [activation.modelInputs.outputContract, "output-contract.md"],
    [activation.modelInputs.publicationManual, "publication-manual.md"],
    [activation.modelInputs.timeoutRecoveryManual, "timeout-recovery-manual.md"],
    [activation.modelInputs.correctionManual, "correction-manual.md"],
    [activation.context.packet, "packet.json"],
    [activation.context.schema, "schema.json"]
  ];
  for (const [source, target] of copies) await copyFile(path.resolve(source), path.join(temporary, target));
  await copyFile(authSource, path.join(isolatedCodexHome, "auth.json"));
  const env = { ...process.env, CODEX_HOME: isolatedCodexHome };
  for (const key of activation.executionPolicy.removedEnvironmentVariables) delete env[key];
  const prompt = [
    "Read production-workflow.md, readiness-workflow.md, output-contract.md, publication-manual.md, timeout-recovery-manual.md, correction-manual.md, packet.json, and schema.json completely and no other files.",
    "Act only as the isolated Debate 21 one-field score-locked publication correction editor.",
    `Author only ${TARGET_FIELD}; every other field is unavailable and immutable.`,
    "Use exactly four ordered labeled sentences, target 112–118 words, remain within 105–130 words and at least 880 characters, and end every sentence with terminal punctuation. Count before returning.",
    "The failed output and failed critique are unavailable. Do not infer or recreate them.",
    "Participant judgment is closed. Scores are repository-owned and immutable; do not calculate, change, or recommend a score.",
    "Use no outside source, legacy assessment, other debate, ranking, winner, or other model context.",
    "Return exactly one schema-conforming JSON object and nothing else."
  ].join(" ");
  process.stdout.write("[batch-10-publication-correction] starting one fresh Debate 21 context\n");
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
    contextIndex: 0,
    contextType: activation.context.contextType,
    debateNumber: "21",
    debateId: activation.context.debateId,
    model: activation.model.label,
    reasoningEffort: activation.model.reasoningEffort,
    authentication: "ChatGPT subscription",
    writableFields: [TARGET_FIELD],
    attemptCount: 1,
    retryCount: 0,
    timeoutExtensionCount: 0,
    furtherRecursiveCorrectionContextCount: 0,
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
    failedOutputAvailableToModel: false,
    failedCritiqueAvailableToModel: false,
    modelAuthoredScores: 0,
    meteredApiCostUsd: 0,
    paidServiceCallsThisStage: 0,
    stdoutSha256: sha256(invocation.stdout),
    stderrSha256: sha256(invocation.stderr)
  };
  if (invocation.error || invocation.timedOut || invocation.code !== 0 || invocation.signal !== null || !resultExists) {
    execution = {
      schemaVersion: "1.0-assessment-production-post-canary-batch-10-publication-recursive-correction-execution",
      protocolId: activation.protocolId,
      status: invocation.timedOut ? "timed-out" : !resultExists ? "result-missing" : "transport-failed",
      gateAcceptancePassed: false,
      outputWritten: false,
      ...base,
      failureMessage: `${invocation.error?.stack ?? ""}\n${invocation.stdout}\n${invocation.stderr}`.trim().slice(-10000),
      nextRequiredAction: "stop-no-automatic-retry-or-further-correction"
    };
  } else {
    const resultBytes = await readFile(resultPath);
    await writeFile(path.resolve(activation.context.output), resultBytes);
    let validationSummary = null; let validationMessage = null;
    try {
      validationSummary = validateCorrectionOutput(
        JSON.parse(resultBytes),
        JSON.parse(await readFile(path.resolve(activation.context.packet)))
      );
    } catch (error) {
      validationMessage = (error.stack ?? error.message).slice(-10000);
    }
    const accepted = validationSummary?.status === "passed";
    const validation = {
      schemaVersion: "1.0-assessment-production-post-canary-batch-10-publication-recursive-correction-validation",
      protocolId: activation.protocolId,
      status: accepted ? "passed" : "failed",
      contextIndex: 0,
      debateNumber: "21",
      correctedField: TARGET_FIELD,
      outputSha256: sha256(resultBytes),
      validationSummary,
      validationMessage,
      modelAuthoredScores: 0
    };
    const provenance = {
      schemaVersion: "1.0-assessment-production-post-canary-batch-10-publication-recursive-correction-provenance",
      protocolId: activation.protocolId,
      contextIndex: 0,
      debateNumber: "21",
      model: activation.model,
      authentication: "ChatGPT subscription",
      writableFields: [TARGET_FIELD],
      attemptCount: 1,
      retryCount: 0,
      timeoutExtensionCount: 0,
      furtherRecursiveCorrectionContextCount: 0,
      failedOutputAvailableToModel: false,
      failedCritiqueAvailableToModel: false,
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
    await writeFile(path.resolve(activation.context.validation), validationBytes);
    await writeFile(path.resolve(activation.context.provenance), provenanceBytes);
    execution = {
      schemaVersion: "1.0-assessment-production-post-canary-batch-10-publication-recursive-correction-execution",
      protocolId: activation.protocolId,
      status: accepted ? "completed-valid" : "output-validation-failed",
      gateAcceptancePassed: accepted,
      outputWritten: true,
      outputSha256: sha256(resultBytes),
      validationWritten: true,
      validationSha256: sha256(validationBytes),
      provenanceWritten: true,
      provenanceSha256: sha256(provenanceBytes),
      validationSummary,
      validationMessage,
      ...base,
      nextRequiredAction: accepted
        ? "deterministically-replace-one-field-revalidate-con-merge-and-validate-debate-21"
        : "stop-no-automatic-retry-or-further-correction"
    };
  }
} catch (error) {
  execution = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-10-publication-recursive-correction-execution",
    protocolId: activation.protocolId,
    status: "runner-error",
    gateAcceptancePassed: false,
    outputWritten: await exists(activation.context.output),
    contextIndex: 0,
    debateNumber: "21",
    writableFields: [TARGET_FIELD],
    attemptCount: 1,
    retryCount: 0,
    timeoutExtensionCount: 0,
    furtherRecursiveCorrectionContextCount: 0,
    startedAt,
    completedAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    modelAuthoredScores: 0,
    meteredApiCostUsd: 0,
    paidServiceCallsThisStage: 0,
    failureMessage: (error.stack ?? String(error)).slice(-10000),
    nextRequiredAction: "stop-no-automatic-retry-or-further-correction"
  };
} finally {
  await rm(temporary, { recursive: true, force: true });
  await rm(isolatedCodexHome, { recursive: true, force: true });
}
await writeFile(path.resolve(activation.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify({
  status: execution.status,
  accepted: execution.gateAcceptancePassed,
  elapsedMinutes: Number((execution.elapsedMs / 60000).toFixed(2)),
  attempts: 1,
  retries: 0,
  timeoutExtensions: 0,
  furtherCorrections: 0,
  costUsd: 0,
  nextRequiredAction: execution.nextRequiredAction
}, null, 2));
if (!execution.gateAcceptancePassed) process.exitCode = 2;
