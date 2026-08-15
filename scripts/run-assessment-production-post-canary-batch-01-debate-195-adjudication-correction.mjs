#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_ROOT,
  validatePostCanaryBatch01Debate195CorrectionOutput
} from "./lib/assessment-production-post-canary-batch-01-debate-195-adjudication-correction.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const ROOT = POST_CANARY_BATCH_01_DEBATE_195_CORRECTION_ROOT;
const activationPath = `${ROOT}/execution-activation.json`;
const manifest = JSON.parse(await readFile(activationPath, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

assertV4(
  manifest.status ===
      "frozen-one-score-blind-debate-195-burden-adjustment-correction-context-authorized" &&
    manifest.productionCanary === false &&
    manifest.batchNumber === 1 &&
    manifest.correctionNumber === 1 &&
    manifest.stagingOnly === true &&
    manifest.contexts.length === 1 &&
    manifest.contexts[0].debateNumber === "195" &&
    manifest.model.label === "5.6 Sol" &&
    manifest.model.slug === "gpt-5.6-sol" &&
    manifest.model.reasoningEffort === "low" &&
    manifest.model.authentication === "ChatGPT subscription" &&
    manifest.model.scoreBlind === true &&
    manifest.model.roundedIntegerScoreTiesPermitted === true &&
    manifest.authorization.correctionModelContext === true &&
    manifest.authorization.adjudicationModelContext === false &&
    manifest.authorization.judgmentModelContexts === false &&
    manifest.authorization.deterministicMerge === false &&
    manifest.authorization.paidServices === false &&
    manifest.authorization.finalLedgerAssembly === false &&
    manifest.authorization.scoreDerivation === false &&
    manifest.authorization.productionMutation === false &&
    manifest.executionPolicy.contexts === 1 &&
    manifest.executionPolicy.attemptsPerContext === 1 &&
    manifest.executionPolicy.retriesMaximum === 0 &&
    manifest.executionPolicy.timeoutExtensionsMaximum === 0 &&
    manifest.executionPolicy.recursiveCorrectionContextsMaximum === 0 &&
    manifest.executionPolicy.maximumParallelContexts === 1 &&
    manifest.executionPolicy.scheduler === "single-context",
  "Debate 195 burden-adjustment correction execution is unauthorized"
);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assertV4(
    sha256(await readFile(file)) === digest,
    `source hash mismatch: ${file}`
  );
}
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(future)), `future output exists: ${future}`);
}

const originalOutputBytesBefore = await readFile(
  manifest.preservedOriginal.output
);
const originalOutputBefore = JSON.parse(originalOutputBytesBefore);
assertV4(
  sha256(originalOutputBytesBefore) === manifest.preservedOriginal.outputSha256 &&
    originalOutputBefore.moveDecisions.length === 18 &&
    sha256(Buffer.from(canonicalJson(originalOutputBefore.moveDecisions))) ===
      manifest.preservedOriginal.moveDecisionsSha256,
  "preserved Debate 195 output changed before correction execution"
);

const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
await access(codex);
await access(authSource);

function invoke(args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(codex, args, {
      ...options,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let forceTimer = null;
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
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

const context = manifest.contexts[0];
const temporary = await mkdtemp(
  path.join(os.tmpdir(), "slugfester-debate-195-correction-")
);
const codexHome = await mkdtemp(
  path.join(os.tmpdir(), "slugfester-debate-195-correction-home-")
);
const startedAt = new Date().toISOString();
const started = Date.now();
let result;
let validationRecord;

try {
  const copies = [
    [context.manual, "manual.md"],
    [context.packet, "packet.json"],
    [context.schema, "schema.json"]
  ];
  let copiedInputBytes = 0;
  for (const [source, target] of copies) {
    const bytes = await readFile(source);
    copiedInputBytes += bytes.length;
    await copyFile(source, path.join(temporary, target));
  }
  assertV4(
    copiedInputBytes === context.copiedInputBytes,
    "Debate 195 correction copied-input accounting changed"
  );
  await copyFile(authSource, path.join(codexHome, "auth.json"));
  const environment = { ...process.env, CODEX_HOME: codexHome };
  for (const key of manifest.executionPolicy.removedEnvironmentVariables) {
    delete environment[key];
  }
  const prompt =
    "Read manual.md, packet.json, and schema.json; read nothing else. Act only as the isolated, score-blind burden-adjustment correction adjudicator for post-canary Batch 1 Debate 195. Decide exactly the two anonymous candidate pairs in the required pro-then-con order. Select only candidate 1 or candidate 2 as a complete object. Never mix, average, interpolate, repair, rewrite, or invent a candidate. The eighteen preserved move decisions and the prior output are unavailable and immutable. Never request or produce move decisions, pass identities, initial rationales, provenance, calculated scores, winner labels, legacy assessments, other debates, Overall Commentary, AI Extension, or publication prose. Return exactly one schema-conforming JSON object.";
  process.stdout.write(
    `[debate-195-correction] starting ${manifest.model.label}/${manifest.model.reasoningEffort} one-shot context\n`
  );
  const invocation = await invoke(
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
      "--disable",
      "plugins",
      "--disable",
      "remote_plugin",
      "--disable",
      "skill_search",
      "--disable",
      "apps",
      "--disable",
      "memories",
      "--disable",
      "multi_agent",
      "--disable",
      "browser_use",
      "--disable",
      "computer_use",
      "--disable",
      "workspace_dependencies",
      "--sandbox",
      "read-only",
      "--output-schema",
      "schema.json",
      "--output-last-message",
      "result.json",
      prompt
    ],
    { cwd: temporary, env: environment },
    manifest.executionPolicy.timeoutMsPerContext
  );
  const resultPath = path.join(temporary, "result.json");
  const resultExists = await exists(resultPath);
  const base = {
    contextIndex: 0,
    debateNumber: "195",
    debateId: context.debateId,
    correctionType: context.correctionType,
    model: manifest.model.label,
    modelSlug: manifest.model.slug,
    reasoningEffort: manifest.model.reasoningEffort,
    scoreBlind: true,
    roundedIntegerScoreTiesPermitted: true,
    attemptCount: 1,
    retryCount: 0,
    timeoutExtensionCount: 0,
    recursiveCorrectionCount: 0,
    startedAt,
    completedAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    timedOut: invocation.timedOut,
    commandExitCode: invocation.code,
    terminationSignal: invocation.signal,
    authentication: "ChatGPT subscription",
    apiKeysRemoved: true,
    copiedInputBytes,
    audioTranscriptInputs: [],
    meteredApiCostUsd: 0,
    paidServiceCalls: 0,
    transcriptionCostUsdThisStage: 0,
    stdoutSha256: sha256(invocation.stdout),
    stderrSha256: sha256(invocation.stderr)
  };

  if (
    invocation.timedOut ||
    invocation.code !== 0 ||
    invocation.signal !== null ||
    !resultExists
  ) {
    const failureMessage = `${invocation.stdout}\n${invocation.stderr}`
      .trim()
      .slice(-10000);
    result = {
      ...base,
      status: invocation.timedOut
        ? "timed-out"
        : !resultExists
          ? "result-missing"
          : "transport-failed",
      gateAcceptancePassed: false,
      outputWritten: false,
      failureMessage
    };
    validationRecord = {
      schemaVersion:
        "1.0-assessment-production-post-canary-batch-01-debate-195-burden-adjustment-correction-validation",
      protocolId: manifest.protocolId,
      status: "correction-output-unavailable-transport-failure",
      validatedAt: new Date().toISOString(),
      debateNumber: "195",
      outputAvailable: false,
      outputSha256: null,
      gateAcceptancePassed: false,
      validationSummary: null,
      validationMessage: failureMessage,
      preservedMoveDecisions: 18,
      originalOutputUnchanged: true,
      deterministicMergeAuthorized: false,
      scoresDerived: 0
    };
  } else {
    await mkdir(path.dirname(context.output), { recursive: true });
    await copyFile(resultPath, context.output);
    const outputBytes = await readFile(context.output);
    let validation = null;
    let validationMessage = null;
    try {
      validation = validatePostCanaryBatch01Debate195CorrectionOutput(
        JSON.parse(outputBytes),
        JSON.parse(await readFile(context.packet, "utf8"))
      );
    } catch (error) {
      validationMessage = error.stack ?? error.message;
    }
    result = {
      ...base,
      status:
        validation?.status === "passed"
          ? "completed-valid"
          : "output-validation-failed",
      gateAcceptancePassed: validation?.status === "passed",
      outputWritten: true,
      outputSha256: sha256(outputBytes),
      validationSummary: validation,
      validationMessage: validationMessage?.slice(-10000) ?? null
    };
    validationRecord = {
      schemaVersion:
        "1.0-assessment-production-post-canary-batch-01-debate-195-burden-adjustment-correction-validation",
      protocolId: manifest.protocolId,
      status:
        validation?.status === "passed"
          ? "debate-195-burden-adjustment-correction-output-valid"
          : "debate-195-burden-adjustment-correction-output-invalid",
      validatedAt: new Date().toISOString(),
      debateNumber: "195",
      outputAvailable: true,
      outputSha256: sha256(outputBytes),
      packetSha256: sha256(await readFile(context.packet)),
      gateAcceptancePassed: validation?.status === "passed",
      validationSummary: validation,
      validationMessage: validationMessage?.slice(-10000) ?? null,
      preservedMoveDecisions: 18,
      originalOutputUnchanged: true,
      deterministicMergeAuthorized: false,
      scoresDerived: 0
    };
  }
} catch (error) {
  const failureMessage = (error.stack ?? String(error)).slice(-10000);
  result = {
    contextIndex: 0,
    debateNumber: "195",
    debateId: context.debateId,
    correctionType: context.correctionType,
    model: manifest.model.label,
    modelSlug: manifest.model.slug,
    reasoningEffort: manifest.model.reasoningEffort,
    scoreBlind: true,
    roundedIntegerScoreTiesPermitted: true,
    attemptCount: 1,
    retryCount: 0,
    timeoutExtensionCount: 0,
    recursiveCorrectionCount: 0,
    startedAt,
    completedAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    authentication: "ChatGPT subscription",
    apiKeysRemoved: true,
    copiedInputBytes: context.copiedInputBytes,
    audioTranscriptInputs: [],
    meteredApiCostUsd: 0,
    paidServiceCalls: 0,
    transcriptionCostUsdThisStage: 0,
    status: "runner-error",
    gateAcceptancePassed: false,
    outputWritten: await exists(context.output),
    failureMessage
  };
  validationRecord = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-01-debate-195-burden-adjustment-correction-validation",
    protocolId: manifest.protocolId,
    status: "correction-runner-error",
    validatedAt: new Date().toISOString(),
    debateNumber: "195",
    outputAvailable: await exists(context.output),
    outputSha256: (await exists(context.output))
      ? sha256(await readFile(context.output))
      : null,
    gateAcceptancePassed: false,
    validationSummary: null,
    validationMessage: failureMessage,
    preservedMoveDecisions: 18,
    originalOutputUnchanged: true,
    deterministicMergeAuthorized: false,
    scoresDerived: 0
  };
} finally {
  await rm(temporary, { recursive: true, force: true });
  await rm(codexHome, { recursive: true, force: true });
}

const originalOutputBytesAfter = await readFile(
  manifest.preservedOriginal.output
);
const originalOutputAfter = JSON.parse(originalOutputBytesAfter);
assertV4(
  sha256(originalOutputBytesAfter) === manifest.preservedOriginal.outputSha256 &&
    sha256(Buffer.from(canonicalJson(originalOutputAfter.moveDecisions))) ===
      manifest.preservedOriginal.moveDecisionsSha256,
  "preserved Debate 195 output changed during correction execution"
);
validationRecord.originalOutputUnchanged = true;
validationRecord.originalOutputSha256 = sha256(originalOutputBytesAfter);
validationRecord.preservedMoveDecisionsSha256 = sha256(
  Buffer.from(canonicalJson(originalOutputAfter.moveDecisions))
);
await writeFile(
  manifest.artifacts.validation,
  `${JSON.stringify(validationRecord, null, 2)}\n`
);

const passed = result.gateAcceptancePassed === true;
const execution = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-debate-195-burden-adjustment-correction-model-execution",
  protocolId: manifest.protocolId,
  status: passed
    ? "one-score-blind-debate-195-burden-adjustment-correction-context-passed"
    : "debate-195-burden-adjustment-correction-gate-complete-with-failure",
  productionCanary: false,
  batchNumber: 1,
  correctionNumber: 1,
  stagingOnly: true,
  developmentValidationOnly: false,
  gateStartedAt: startedAt,
  gateCompletedAt: new Date().toISOString(),
  contextsPlanned: 1,
  contextsAttempted: 1,
  validContexts: passed ? 1 : 0,
  invalidContexts: passed ? 0 : 1,
  attempts: 1,
  retries: 0,
  timeoutExtensions: 0,
  recursiveCorrections: 0,
  maximumObservedConcurrency: 1,
  wallElapsedMs: Date.now() - started,
  aggregateModelElapsedMs: result.elapsedMs,
  results: [result],
  correctionModelContexts: 1,
  adjudicationModelContexts: 0,
  judgmentModelContexts: 0,
  paidServiceCalls: 0,
  meteredApiCostUsd: 0,
  transcriptionCostUsdThisStage: 0,
  directIncrementalCostUsd: 0,
  deterministicMerges: 0,
  finalLedgersAssembled: 0,
  scoresDerived: 0,
  publicationReconstructions: 0,
  productionMutations: 0,
  nextBatchSelections: 0,
  preservedOriginalOutputSha256: sha256(originalOutputBytesAfter),
  preservedMoveDecisionsSha256:
    validationRecord.preservedMoveDecisionsSha256,
  authorization: {
    deterministicAnalysis: true,
    deterministicMerge: false,
    retry: false,
    timeoutExtension: false,
    recursiveCorrection: false,
    judgmentModelExecution: false,
    paidServices: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction:
    "run-deterministic-debate-195-correction-analysis-without-merging"
};
await writeFile(
  manifest.artifacts.execution,
  `${JSON.stringify(execution, null, 2)}\n`
);

process.stdout.write(
  `[debate-195-correction] ${result.status} in ${(result.elapsedMs / 60000).toFixed(2)}m\n`
);
console.log(
  JSON.stringify(
    {
      status: execution.status,
      contextsAttempted: 1,
      validContexts: execution.validContexts,
      burdenAdjustmentDecisions:
        result.validationSummary?.burdenAdjustmentDecisions ?? null,
      candidateSelections:
        result.validationSummary?.candidateSelections ?? null,
      preservedMoveDecisions: 18,
      wallElapsedMinutes: Number((execution.wallElapsedMs / 60000).toFixed(2)),
      retries: 0,
      timeoutExtensions: 0,
      recursiveCorrections: 0,
      deterministicMerges: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0,
      scoresDerived: 0
    },
    null,
    2
  )
);
