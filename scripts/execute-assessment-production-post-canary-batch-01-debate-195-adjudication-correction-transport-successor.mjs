#!/usr/bin/env node

import { spawn } from "node:child_process";
import { execFileSync } from "node:child_process";
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
  validatePostCanaryBatch01Debate195CorrectionOutput
} from "./lib/assessment-production-post-canary-batch-01-debate-195-adjudication-correction.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/dispute-only-adjudication/correction-2";
const preparationPath = `${ROOT}/execution-preparation-manifest.json`;
const activationPath = `${ROOT}/execution-activation.json`;
const outputPath = `${ROOT}/correction-output.json`;
const executionPath = `${ROOT}/model-execution.json`;
const validationPath = `${ROOT}/correction-validation.json`;
const analysisPath = `${ROOT}/analysis.json`;
const authorizedIndex = process.argv.indexOf("--authorized-at");
const authorizedAt =
  authorizedIndex >= 0 ? process.argv[authorizedIndex + 1] : null;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const executionTools = [
  "scripts/execute-assessment-production-post-canary-batch-01-debate-195-adjudication-correction-transport-successor.mjs",
  "scripts/test-assessment-production-post-canary-batch-01-debate-195-adjudication-correction-transport-successor-gate.mjs"
];

assertV4(
  authorizedAt && !Number.isNaN(Date.parse(authorizedAt)),
  "--authorized-at requires an ISO timestamp"
);
assertV4(!(await exists(activationPath)), `${activationPath} already exists`);

const preparationBytes = await readFile(preparationPath);
const preparation = JSON.parse(preparationBytes);
assertV4(
  preparation.status ===
      "frozen-one-score-blind-debate-195-burden-adjustment-transport-successor-context-prepared-not-authorized" &&
    preparation.productionCanary === false &&
    preparation.batchNumber === 1 &&
    preparation.correctionNumber === 2 &&
    preparation.predecessorCorrectionNumber === 1 &&
    preparation.stagingOnly === true &&
    preparation.contexts.length === 1 &&
    preparation.contexts[0].debateNumber === "195" &&
    preparation.contexts[0].burdenAdjustmentDisputes === 2 &&
    preparation.contexts[0].candidateSelections === 2 &&
    preparation.contexts[0].moveDecisions === 0 &&
    preparation.transportSuccessor.arrayItemsValueType === "object" &&
    preparation.transportSuccessor.staticValidationPassed === true &&
    preparation.transportSuccessor.APITransportAcceptanceProven === false &&
    preparation.executionPolicy.contexts === 1 &&
    preparation.executionPolicy.attemptsPerContext === 1 &&
    preparation.executionPolicy.retriesMaximum === 0 &&
    preparation.executionPolicy.timeoutExtensionsMaximum === 0 &&
    preparation.executionPolicy.recursiveCorrectionContextsMaximum === 0 &&
    preparation.executionPolicy.maximumParallelContexts === 1 &&
    preparation.executionPolicy.scheduler === "single-context" &&
    preparation.executionPolicy.separateActivationRequired === true,
  "Debate 195 correction transport successor is not prepared"
);
assertV4(
  preparation.model.label === "5.6 Sol" &&
    preparation.model.slug === "gpt-5.6-sol" &&
    preparation.model.reasoningEffort === "low" &&
    preparation.model.authentication === "ChatGPT subscription" &&
    preparation.model.scoreBlind === true &&
    preparation.model.roundedIntegerScoreTiesPermitted === true &&
    preparation.model.meteredApiCostUsdMaximum === 0,
  "Debate 195 correction transport-successor model boundary changed"
);
assertV4(
  preparation.preservedInputs.packetReusedByteForByte === true &&
    preparation.preservedInputs.packetCopiedOrRewritten === false &&
    preparation.preservedOriginal.moveDecisionCount === 18 &&
    preparation.preservedOriginal.immutable === true &&
    preparation.preservedOriginal.mutationAuthorized === false &&
    preparation.deterministicValidation.deterministicMergeAuthorized ===
      false,
  "Debate 195 preserved-input boundary changed"
);
assertV4(
  Object.values(preparation.authorization).every((value) => value === false),
  "transport-successor preparation authorization boundary changed"
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(
    sha256(await readFile(file)) === digest,
    `source hash mismatch: ${file}`
  );
}
for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(future)), `future output exists: ${future}`);
}

const sourceHashes = structuredClone(preparation.sourceHashes);
const executionToolHashes = {};
for (const file of executionTools) {
  const digest = sha256(await readFile(file));
  executionToolHashes[file] = digest;
  sourceHashes[file] = digest;
}
const activation = {
  ...preparation,
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-debate-195-burden-adjustment-correction-transport-successor-execution-activation",
  status:
    "frozen-one-score-blind-debate-195-burden-adjustment-transport-successor-context-authorized",
  authorizedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  preparationManifest: {
    path: preparationPath,
    sha256: sha256(preparationBytes)
  },
  userExecutionAuthorization: {
    instruction: "I approve.",
    scopeReference:
      "the immediately preceding request to activate and execute exactly the one frozen correction-2 score-blind context once, then stop after deterministic validation, analysis, commit, and push",
    contexts: 1,
    debateNumber: "195",
    correctionNumber: 2,
    burdenAdjustmentDecisions: 2,
    preservedMoveDecisions: 18,
    model: "5.6 Sol",
    modelSlug: "gpt-5.6-sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    directIncrementalCostUsdMaximum: 0,
    scheduler: "single-context",
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
    recursiveCorrectionContextsMaximum: 0,
    deterministicMergeAuthorized: false,
    judgmentModelsAuthorized: false,
    paidServicesAuthorized: false,
    finalLedgerAssemblyAuthorized: false,
    scoreDerivationAuthorized: false,
    publicationReconstructionAuthorized: false,
    productionMutationAuthorized: false,
    nextBatchSelectionAuthorized: false
  },
  executionToolHashes,
  sourceHashes,
  authorization: {
    ...preparation.authorization,
    correctionModelContext: true,
    deterministicCorrectionValidation: true
  },
  futureOutputPathsExcludedFromSourceHashes:
    preparation.futureOutputPathsExcludedFromSourceHashes.filter(
      (file) => file !== activationPath
    ),
  nextAuthorizedAction:
    "execute-exactly-one-score-blind-debate-195-correction-transport-successor-context-once"
};
assertV4(
  activation.authorization.executionActivation === false &&
    activation.authorization.correctionModelContext === true &&
    activation.authorization.adjudicationModelContext === false &&
    activation.authorization.judgmentModelContexts === false &&
    activation.authorization.deterministicCorrectionValidation === true &&
    activation.authorization.deterministicMerge === false &&
    activation.authorization.retry === false &&
    activation.authorization.timeoutExtension === false &&
    activation.authorization.recursiveCorrection === false &&
    activation.authorization.paidServices === false &&
    activation.authorization.finalLedgerAssembly === false &&
    activation.authorization.scoreDerivation === false &&
    activation.authorization.publicationReconstruction === false &&
    activation.authorization.productionMutation === false &&
    activation.authorization.nextBatchSelection === false,
  "transport-successor execution authorization expanded beyond approval"
);

await writeFile(activationPath, `${JSON.stringify(activation, null, 2)}\n`);

const originalOutputBytesBefore = await readFile(
  activation.preservedOriginal.output
);
const originalOutputBefore = JSON.parse(originalOutputBytesBefore);
assertV4(
  sha256(originalOutputBytesBefore) === activation.preservedOriginal.outputSha256 &&
    originalOutputBefore.moveDecisions.length === 18 &&
    sha256(Buffer.from(canonicalJson(originalOutputBefore.moveDecisions))) ===
      activation.preservedOriginal.moveDecisionsSha256,
  "preserved Debate 195 output changed before transport-successor execution"
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

const context = activation.contexts[0];
const temporary = await mkdtemp(
  path.join(os.tmpdir(), "slugfester-debate-195-correction-2-")
);
const codexHome = await mkdtemp(
  path.join(os.tmpdir(), "slugfester-debate-195-correction-2-home-")
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
    "Debate 195 correction-2 copied-input accounting changed"
  );
  await copyFile(authSource, path.join(codexHome, "auth.json"));
  const environment = { ...process.env, CODEX_HOME: codexHome };
  for (const key of activation.executionPolicy.removedEnvironmentVariables) {
    delete environment[key];
  }
  const prompt =
    "Read manual.md, packet.json, and schema.json; read nothing else. Act only as the isolated, score-blind burden-adjustment correction adjudicator for post-canary Batch 1 Debate 195. Decide exactly the two anonymous candidate pairs in the required pro-then-con order. Select only candidate 1 or candidate 2 as a complete object. Never mix, average, interpolate, repair, rewrite, or invent a candidate. The eighteen preserved move decisions and the prior output are unavailable and immutable. Never request or produce move decisions, pass identities, initial rationales, provenance, calculated scores, winner labels, legacy assessments, other debates, Overall Commentary, AI Extension, or publication prose. Return exactly one schema-conforming JSON object.";
  process.stdout.write(
    `[debate-195-correction-2] starting ${activation.model.label}/${activation.model.reasoningEffort} one-shot context\n`
  );
  const invocation = await invoke(
    [
      "exec",
      "--ephemeral",
      "--skip-git-repo-check",
      "--ignore-user-config",
      "--ignore-rules",
      "--model",
      activation.model.slug,
      "-c",
      `model_reasoning_effort="${activation.model.reasoningEffort}"`,
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
    activation.executionPolicy.timeoutMsPerContext
  );
  const resultPath = path.join(temporary, "result.json");
  const resultExists = await exists(resultPath);
  const base = {
    contextIndex: 0,
    debateNumber: "195",
    debateId: context.debateId,
    correctionType: context.correctionType,
    correctionNumber: 2,
    transportSuccessorId: activation.transportSuccessorId,
    model: activation.model.label,
    modelSlug: activation.model.slug,
    reasoningEffort: activation.model.reasoningEffort,
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
        "1.0-assessment-production-post-canary-batch-01-debate-195-burden-adjustment-correction-transport-successor-validation",
      protocolId: activation.protocolId,
      transportSuccessorId: activation.transportSuccessorId,
      status: "correction-output-unavailable-transport-failure",
      validatedAt: new Date().toISOString(),
      debateNumber: "195",
      correctionNumber: 2,
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
        "1.0-assessment-production-post-canary-batch-01-debate-195-burden-adjustment-correction-transport-successor-validation",
      protocolId: activation.protocolId,
      transportSuccessorId: activation.transportSuccessorId,
      status:
        validation?.status === "passed"
          ? "debate-195-burden-adjustment-correction-transport-successor-output-valid"
          : "debate-195-burden-adjustment-correction-transport-successor-output-invalid",
      validatedAt: new Date().toISOString(),
      debateNumber: "195",
      correctionNumber: 2,
      outputAvailable: true,
      outputSha256: sha256(outputBytes),
      packetSha256: sha256(await readFile(context.packet)),
      schemaSha256: sha256(await readFile(context.schema)),
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
    correctionNumber: 2,
    transportSuccessorId: activation.transportSuccessorId,
    model: activation.model.label,
    modelSlug: activation.model.slug,
    reasoningEffort: activation.model.reasoningEffort,
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
      "1.0-assessment-production-post-canary-batch-01-debate-195-burden-adjustment-correction-transport-successor-validation",
    protocolId: activation.protocolId,
    transportSuccessorId: activation.transportSuccessorId,
    status: "correction-runner-error",
    validatedAt: new Date().toISOString(),
    debateNumber: "195",
    correctionNumber: 2,
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
  activation.preservedOriginal.output
);
const originalOutputAfter = JSON.parse(originalOutputBytesAfter);
assertV4(
  sha256(originalOutputBytesAfter) === activation.preservedOriginal.outputSha256 &&
    sha256(Buffer.from(canonicalJson(originalOutputAfter.moveDecisions))) ===
      activation.preservedOriginal.moveDecisionsSha256,
  "preserved Debate 195 output changed during transport-successor execution"
);
validationRecord.originalOutputUnchanged = true;
validationRecord.originalOutputSha256 = sha256(originalOutputBytesAfter);
validationRecord.preservedMoveDecisionsSha256 = sha256(
  Buffer.from(canonicalJson(originalOutputAfter.moveDecisions))
);
await writeFile(validationPath, `${JSON.stringify(validationRecord, null, 2)}\n`);

const passed = result.gateAcceptancePassed === true;
const execution = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-debate-195-burden-adjustment-correction-transport-successor-model-execution",
  protocolId: activation.protocolId,
  transportSuccessorId: activation.transportSuccessorId,
  status: passed
    ? "one-score-blind-debate-195-burden-adjustment-correction-transport-successor-context-passed"
    : "debate-195-burden-adjustment-correction-transport-successor-gate-complete-with-failure",
  productionCanary: false,
  batchNumber: 1,
  correctionNumber: 2,
  predecessorCorrectionNumber: 1,
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
    "run-deterministic-debate-195-correction-transport-successor-analysis-without-merging"
};
await writeFile(executionPath, `${JSON.stringify(execution, null, 2)}\n`);

let replay = null;
let replayMessage = null;
if (result.outputWritten) {
  const outputBytes = await readFile(context.output);
  try {
    replay = validatePostCanaryBatch01Debate195CorrectionOutput(
      JSON.parse(outputBytes),
      JSON.parse(await readFile(context.packet, "utf8"))
    );
  } catch (error) {
    replayMessage = error.message;
  }
  assertV4(
    sha256(outputBytes) === result.outputSha256,
    "correction-2 output hash changed before analysis"
  );
}
const semanticPass =
  result.gateAcceptancePassed === true &&
  validationRecord.gateAcceptancePassed === true &&
  replay?.status === "passed" &&
  replay.burdenAdjustmentDecisions === 2 &&
  replay.candidateSelections === 2 &&
  replay.preservedMoveDecisions === 18;
const timingPass =
  semanticPass &&
  result.elapsedMs <= activation.executionPolicy.timeoutMsPerContext &&
  result.elapsedMs / 60000 <= activation.executionPolicy.maximumMinutesPerContext;
const scoreBlindPass = semanticPass && replay.calculatedScores === 0;
const isolationPass =
  semanticPass &&
  result.model === "5.6 Sol" &&
  result.modelSlug === "gpt-5.6-sol" &&
  result.reasoningEffort === "low" &&
  result.authentication === "ChatGPT subscription" &&
  result.apiKeysRemoved === true &&
  result.scoreBlind === true &&
  result.attemptCount === 1 &&
  result.retryCount === 0 &&
  result.timeoutExtensionCount === 0 &&
  result.recursiveCorrectionCount === 0;
const preservationPass =
  validationRecord.originalOutputUnchanged === true &&
  sha256(originalOutputBytesAfter) === activation.preservedOriginal.outputSha256 &&
  sha256(Buffer.from(canonicalJson(originalOutputAfter.moveDecisions))) ===
    activation.preservedOriginal.moveDecisionsSha256 &&
  validationRecord.deterministicMergeAuthorized === false &&
  execution.deterministicMerges === 0;
const gatePassed =
  semanticPass &&
  timingPass &&
  scoreBlindPass &&
  isolationPass &&
  preservationPass;
const failureClass = gatePassed
  ? null
  : !result.outputWritten
    ? "transport-or-output-availability"
    : !semanticPass
      ? "correction-output-validation"
      : !timingPass
        ? "timing"
        : !scoreBlindPass
          ? "score-blindness"
          : !isolationPass
            ? "isolation"
            : "preservation";
const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-debate-195-burden-adjustment-correction-transport-successor-analysis",
  protocolId: activation.protocolId,
  transportSuccessorId: activation.transportSuccessorId,
  status: gatePassed
    ? "debate-195-burden-adjustment-correction-transport-successor-gate-passed-awaiting-separate-deterministic-merge-approval"
    : "debate-195-burden-adjustment-correction-transport-successor-gate-failed",
  analyzedAt: new Date().toISOString(),
  productionCanary: false,
  batchNumber: 1,
  correctionNumber: 2,
  predecessorCorrectionNumber: 1,
  stagingOnly: true,
  developmentValidationOnly: false,
  AIOnly: true,
  context: {
    contextIndex: 0,
    debateNumber: "195",
    debateId: context.debateId,
    status: result.status,
    accepted: result.gateAcceptancePassed,
    elapsedMinutes: Number((result.elapsedMs / 60000).toFixed(2)),
    validationReplayed: replay?.status === "passed",
    validationReplayMessage: replayMessage,
    burdenAdjustmentDecisions: replay?.burdenAdjustmentDecisions ?? null,
    candidateSelections: replay?.candidateSelections ?? null,
    preservedMoveDecisions: 18,
    calculatedScores: replay?.calculatedScores ?? null,
    model: result.model,
    modelSlug: result.modelSlug,
    reasoningEffort: result.reasoningEffort,
    authentication: result.authentication,
    apiKeysRemoved: result.apiKeysRemoved,
    attemptCount: result.attemptCount,
    retryCount: result.retryCount,
    timeoutExtensionCount: result.timeoutExtensionCount,
    recursiveCorrectionCount: result.recursiveCorrectionCount
  },
  gate: {
    passed: gatePassed,
    semanticPass,
    timingPass,
    scoreBlindPass,
    isolationPass,
    preservationPass,
    failureClass,
    requiredContexts: 1,
    validContexts: gatePassed ? 1 : 0,
    requiredBurdenAdjustmentDecisions: 2,
    burdenAdjustmentDecisions: replay?.burdenAdjustmentDecisions ?? 0,
    requiredCandidateSelections: 2,
    candidateSelections: replay?.candidateSelections ?? 0,
    preservedMoveDecisions: 18,
    originalOutputUnchanged: true,
    preservedMoveDecisionsUnchanged: true,
    attempts: 1,
    retries: 0,
    timeoutExtensions: 0,
    recursiveCorrections: 0,
    deterministicMerges: 0,
    scoresDerived: 0
  },
  evidenceBoundary: {
    burdenAdjustmentDisputesOnly: true,
    anonymousCandidatePairsOnly: true,
    provenanceUnavailableToModel: true,
    passIdentitiesUnavailable: true,
    initialRationalesUnavailable: true,
    preservedMoveDecisionsUnavailableToModel: true,
    fullInitialOutputUnavailableToModel: true,
    calculatedScoresUnavailable: true,
    winnerLabelsUnavailable: true,
    legacyAssessmentsUnavailable: true,
    otherDebatesUnavailable: true,
    publicationProseUnavailable: true,
    candidateValuesInvented: 0,
    calculatedScores: 0,
    judgmentModelContexts: 0
  },
  preservation: {
    originalOutputPath: activation.preservedOriginal.output,
    originalOutputSha256: sha256(originalOutputBytesAfter),
    preservedMoveDecisionsSha256: sha256(
      Buffer.from(canonicalJson(originalOutputAfter.moveDecisions))
    ),
    originalOutputUnchanged: true,
    preservedMoveDecisionsUnchanged: true,
    correctionMerged: false,
    finalLedgerAssembled: false
  },
  totals: {
    correctionModelContexts: 1,
    adjudicationModelContexts: 0,
    judgmentModelContexts: 0,
    paidServiceCalls: 0,
    retries: 0,
    timeoutExtensions: 0,
    recursiveCorrections: 0,
    deterministicMerges: 0,
    finalLedgersAssembled: 0,
    scoresDerived: 0,
    publicationReconstructions: 0,
    productionMutations: 0,
    nextBatchSelections: 0,
    directIncrementalCostUsd: 0
  },
  authorization: {
    correctionModelExecution: false,
    adjudicationModelExecution: false,
    judgmentModelExecution: false,
    retry: false,
    timeoutExtension: false,
    recursiveCorrection: false,
    deterministicMerge: false,
    paidServices: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    publicationModelExecution: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: gatePassed
    ? "user-approval-required-before-deterministic-debate-195-correction-merge-and-complete-adjudication-revalidation"
    : "user-approval-required-before-any-debate-195-correction-transport-successor-failure-diagnosis-or-downstream-work"
};
await writeFile(analysisPath, `${JSON.stringify(analysis, null, 2)}\n`);

process.stdout.write(
  `[debate-195-correction-2] ${result.status} in ${(result.elapsedMs / 60000).toFixed(2)}m\n`
);
console.log(
  JSON.stringify(
    {
      status: analysis.status,
      contextsAttempted: 1,
      validContexts: analysis.gate.validContexts,
      burdenAdjustmentDecisions: analysis.gate.burdenAdjustmentDecisions,
      candidateSelections: analysis.gate.candidateSelections,
      preservedMoveDecisions: 18,
      wallElapsedMinutes: Number((execution.wallElapsedMs / 60000).toFixed(2)),
      retries: 0,
      timeoutExtensions: 0,
      recursiveCorrections: 0,
      deterministicMerges: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0,
      scoresDerived: 0,
      nextAuthorizedAction: analysis.nextAuthorizedAction
    },
    null,
    2
  )
);
