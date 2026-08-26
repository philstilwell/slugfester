#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEBATES, ORIGINAL_CONTEXT_INDEXES, PROTOCOL_ID, ROOT } from
  "./lib/assessment-production-post-canary-batch-10-publication-resumption-1.mjs";
import { validatePostCanaryBatch10PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-10-publication-validation.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const atIndex = process.argv.indexOf("--frozen-at");
const frozenAt = atIndex >= 0 ? process.argv[atIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const PUBLICATION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-10/publication-reconstruction";
const ORIGINAL_PREPARATION = `${PUBLICATION_ROOT}/execution-preparation-manifest.json`;
const ORIGINAL_ACTIVATION = `${PUBLICATION_ROOT}/execution-activation.json`;
const ORIGINAL_EXECUTION = `${PUBLICATION_ROOT}/model-execution.json`;
const ORIGINAL_ANALYSIS = `${PUBLICATION_ROOT}/analysis.json`;
const DEBATE_21_ANALYSIS =
  `${PUBLICATION_ROOT}/failure-recovery/debate-21-timeout-recovery-1/recursive-correction-1/analysis.json`;
const DEBATE_21_OUTPUT = `${PUBLICATION_ROOT}/outputs/debate-21.json`;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const CAFFEINATE = "/usr/bin/caffeinate";

const [originalPreparationBytes, originalActivationBytes, originalExecutionBytes,
  originalAnalysisBytes, debate21AnalysisBytes, debate21OutputBytes] =
  await Promise.all([
    ORIGINAL_PREPARATION, ORIGINAL_ACTIVATION, ORIGINAL_EXECUTION,
    ORIGINAL_ANALYSIS, DEBATE_21_ANALYSIS, DEBATE_21_OUTPUT
  ].map((file) => readFile(path.resolve(file))));
const originalPreparation = JSON.parse(originalPreparationBytes);
const originalActivation = JSON.parse(originalActivationBytes);
const originalExecution = JSON.parse(originalExecutionBytes);
const originalAnalysis = JSON.parse(originalAnalysisBytes);
const debate21Analysis = JSON.parse(debate21AnalysisBytes);
const debate21Output = JSON.parse(debate21OutputBytes);

assertV4(
  originalPreparation.contexts?.length === 10 &&
    originalActivation.contexts?.length === 10 &&
    originalExecution.status === "post-canary-batch-10-publication-gate-complete-with-failure" &&
    originalExecution.contextsAttempted === 1 &&
    originalExecution.results?.length === 1 &&
    originalExecution.results[0].contextIndex === 0 &&
    originalExecution.results[0].debateNumber === "21" &&
    originalExecution.results[0].status === "timed-out" &&
    originalExecution.results[0].outputWritten === false &&
    canonicalJson(originalExecution.unattemptedContextIndexes) ===
      canonicalJson(ORIGINAL_CONTEXT_INDEXES) &&
    originalAnalysis.status === "post-canary-batch-10-publication-output-gate-failed",
  "original nine-context unattempted boundary changed"
);
for (const [file, digest] of Object.entries(originalActivation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `original frozen source drifted: ${file}`);
}
assertV4(
  debate21Analysis.status ===
    "batch-10-debate-21-one-field-publication-correction-passed-awaiting-nine-context-resumption" &&
    debate21Analysis.gate?.completeDebate21Validated === true &&
    debate21Analysis.gate?.attempts === 1 &&
    debate21Analysis.gate?.retries === 0 &&
    debate21Analysis.gate?.timeoutExtensions === 0 &&
    debate21Analysis.gate?.furtherRecursiveCorrections === 0,
  "accepted Debate 21 recovery changed"
);
const debate21Packet = JSON.parse(await readFile(path.resolve(
  `${PUBLICATION_ROOT}/packets/debate-21.json`)));
const debate21Validation = validatePostCanaryBatch10PublicationOutput(
  debate21Output,
  debate21Packet
);
assertV4(debate21Validation.status === "passed" && debate21Validation.moves === 19,
  "accepted Debate 21 output no longer validates");

const contexts = ORIGINAL_CONTEXT_INDEXES.map((originalContextIndex, resumptionIndex) => {
  const original = originalPreparation.contexts[originalContextIndex];
  assertV4(
    original.contextIndex === originalContextIndex &&
      original.debateNumber === DEBATES[resumptionIndex],
    `original context ${originalContextIndex} identity changed`
  );
  return {
    ...structuredClone(original),
    resumptionIndex,
    originalContextIndex,
    priorAttemptCount: 0,
    thisIsOriginalFirstAttempt: true
  };
});
assertV4(
  contexts.reduce((sum, context) => sum + context.moves, 0) === 163 &&
    contexts.reduce((sum, context) => sum + context.sections, 0) === 46 &&
    contexts.reduce((sum, context) => sum + context.audioVerifiedMoves, 0) === 7,
  "nine-context publication coverage changed"
);
for (const context of contexts) {
  assertV4(!(await exists(context.rawOutput)),
    `original unattempted context now has output: Debate ${context.debateNumber}`);
  assertV4(!(await exists(context.validation)),
    `original unattempted context now has validation: Debate ${context.debateNumber}`);
  assertV4(!(await exists(context.provenance)),
    `original unattempted context now has provenance: Debate ${context.debateNumber}`);
}

const sourceScripts = [
  "scripts/lib/assessment-production-post-canary-batch-10-publication-resumption-1.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-10-publication-resumption-1.mjs",
  "scripts/activate-assessment-production-post-canary-batch-10-publication-resumption-1.mjs",
  "scripts/run-assessment-production-post-canary-batch-10-publication-resumption-1.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-10-publication-resumption-1.mjs",
  "scripts/lib/assessment-production-post-canary-batch-10-publication-validation.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "src/data/references.js"
];
const sourceFiles = [
  ORIGINAL_PREPARATION, ORIGINAL_ACTIVATION, ORIGINAL_EXECUTION, ORIGINAL_ANALYSIS,
  DEBATE_21_ANALYSIS, DEBATE_21_OUTPUT,
  originalPreparation.modelInputs.productionWorkflow,
  originalPreparation.modelInputs.readinessWorkflow,
  originalPreparation.modelInputs.outputContract,
  originalPreparation.modelInputs.manual,
  originalPreparation.modelInputs.referenceCatalog,
  ...contexts.flatMap((context) => [context.packet, context.schema]),
  ...sourceScripts
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}
sourceHashes[CAFFEINATE] = sha256(await readFile(CAFFEINATE));
const futureOutputs = [
  `${ROOT}/execution-activation.json`, `${ROOT}/model-execution.json`,
  `${ROOT}/analysis.json`, `${ROOT}/complete-cohort-analysis.json`,
  ...contexts.flatMap((context) => [context.rawOutput, context.validation, context.provenance])
];
for (const file of [MANIFEST, ...futureOutputs]) {
  assertV4(!(await exists(file)), `future output exists: ${file}`);
}

const rampPhases = [
  { phase: "operational-one", maximumParallelContexts: 1,
    originalContextIndexes: [1], expansionRequiresAllValid: true },
  { phase: "ramp-two", maximumParallelContexts: 2,
    originalContextIndexes: [2, 3], expansionRequiresAllValid: true },
  { phase: "steady-two", maximumParallelContexts: 2,
    originalContextIndexes: [4, 5, 6, 7, 8, 9], expansionRequiresAllValid: false }
];
const manifest = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-10-publication-original-unattempted-context-resumption-preparation",
  protocolId: PROTOCOL_ID,
  status: "frozen-nine-original-unattempted-batch-10-publication-contexts-prepared-not-activated",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false,
  batchNumber: 10,
  stagingOnly: true,
  userAuthorization: {
    source: "user authorization to continue after Debate 21 correction",
    resolvedScope: "resume only the nine original publication contexts that were unattempted after Debate 21 timed out",
    originalContextIndexes: ORIGINAL_CONTEXT_INDEXES,
    debates: DEBATES,
    directIncrementalCostUsdMaximum: 0
  },
  acceptedDebate21: {
    output: DEBATE_21_OUTPUT,
    outputSha256: sha256(debate21OutputBytes),
    analysis: DEBATE_21_ANALYSIS,
    analysisSha256: sha256(debate21AnalysisBytes),
    validation: debate21Validation
  },
  originalFailureBoundary: {
    preparation: ORIGINAL_PREPARATION,
    preparationSha256: sha256(originalPreparationBytes),
    activation: ORIGINAL_ACTIVATION,
    activationSha256: sha256(originalActivationBytes),
    execution: ORIGINAL_EXECUTION,
    executionSha256: sha256(originalExecutionBytes),
    analysis: ORIGINAL_ANALYSIS,
    analysisSha256: sha256(originalAnalysisBytes),
    attemptedOriginalContextIndexes: [0],
    unattemptedOriginalContextIndexes: ORIGINAL_CONTEXT_INDEXES
  },
  model: structuredClone(originalPreparation.model),
  modelInputs: structuredClone(originalPreparation.modelInputs),
  contexts,
  isolation: {
    oneDebatePerContext: true,
    separateFreshModelContextPerDebateRequired: true,
    onlyFrozenModelInputsAvailable: true,
    priorDebate21OutputsUnavailable: true,
    otherDebateOutputsUnavailable: true,
    legacyAssessmentsUnavailable: true,
    rankingsAndWinnerComparisonsUnavailable: true,
    participantJudgmentClosed: true,
    participantJudgmentWasScoreBlind: true,
    scoresAvailableOnlyAsImmutablePacketFields: true,
    thisStageContainsOnlyOriginalFirstAttempts: true
  },
  executionEnvironment: {
    codexPath: originalPreparation.executionEnvironment.codexPath,
    codexCliVersion: originalPreparation.executionEnvironment.codexCliVersion,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    isolatedTemporaryCodexHomes: true,
    isolatedTemporaryWorkingDirectories: true,
    hostAwakeGuard: { path: CAFFEINATE, sha256: sourceHashes[CAFFEINATE], args: ["-dimsu"] }
  },
  executionPolicy: {
    contexts: 9,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutMsPerContext: 600000,
    timeoutExtensionsMaximum: 0,
    correctionContextsMaximum: 0,
    maximumParallelContexts: 2,
    schedulerRamp: [1, 2],
    rampPhases,
    stopBeforeExpansionOnRampFailure: true,
    continueIndependentContextsWithinStartedSteadyPhaseAfterFailure: true,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    removedEnvironmentVariables: originalPreparation.executionPolicy.removedEnvironmentVariables,
    directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0,
    separateActivationRequired: true
  },
  stopRules: {
    stopOnSourceHashMismatch: true,
    stopOnTransportFailureAtRampBoundary: true,
    stopOnTimeoutAtRampBoundary: true,
    stopOnValidationFailureAtRampBoundary: true,
    noAutomaticRetry: true,
    noTimeoutExtension: true,
    noAutomaticCorrection: true,
    noPaidServices: true,
    stopBeforeBatch11: true
  },
  sourceHashes,
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  artifacts: {
    activation: `${ROOT}/execution-activation.json`,
    execution: `${ROOT}/model-execution.json`,
    analysis: `${ROOT}/analysis.json`,
    completeCohortAnalysis: `${ROOT}/complete-cohort-analysis.json`
  },
  totals: {
    debates: 9,
    contexts: 9,
    moves: 163,
    sections: 46,
    quoteEligibleMoves: 163,
    audioVerifiedMoves: 7,
    maximumCopiedInputBytes: Math.max(...contexts.map((context) => context.copiedInputBytes)),
    priorAttemptedContextsIncluded: 0,
    modelContextsExecuted: 0,
    modelAuthoredScores: 0,
    paidServiceCallsThisStage: 0,
    directIncrementalCostUsd: 0
  },
  authorization: {
    preparation: true,
    activation: true,
    modelExecution: true,
    deterministicValidationAndCompleteCohortReplay: true,
    retries: false,
    timeoutExtensions: false,
    correctionContexts: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: "commit-and-push-frozen-nine-context-resumption-then-activate"
};
if (shouldWrite) {
  await mkdir(path.resolve(ROOT), { recursive: true });
  await writeFile(path.resolve(MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: shouldWrite ? manifest.status : "preview",
  originalContextIndexes: ORIGINAL_CONTEXT_INDEXES,
  debates: DEBATES,
  moves: 163,
  schedulerRamp: [1, 2],
  attemptsPerContext: 1,
  retriesMaximum: 0,
  timeoutExtensionsMaximum: 0,
  correctionContextsMaximum: 0,
  directIncrementalCostUsdMaximum: 0
}, null, 2));
