#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";

import {
  validatePostCanaryBatch01Debate195CorrectionOutput
} from "./lib/assessment-production-post-canary-batch-01-debate-195-adjudication-correction.mjs";
import {
  POST_CANARY_BATCH_01_DISPUTE_ADJ_ROOT,
  validatePostCanaryBatch01DisputeAdjudicationOutput
} from "./lib/assessment-production-post-canary-batch-01-dispute-adjudication.mjs";
import { canonicalJson } from "./lib/v4-lean-production.mjs";

const CORRECTION_ROOT =
  `${POST_CANARY_BATCH_01_DISPUTE_ADJ_ROOT}/correction-2`;
const mergedOutputPath = `${CORRECTION_ROOT}/merged-adjudication-output.json`;
const validationPath = `${CORRECTION_ROOT}/complete-adjudication-validation.json`;
const auditPath = `${CORRECTION_ROOT}/merge-audit.json`;
const analysisPath = `${CORRECTION_ROOT}/post-merge-analysis.json`;
const generatedPaths = [
  mergedOutputPath,
  validationPath,
  auditPath,
  analysisPath
];
const shouldWrite = process.argv.includes("--write");
const mergedAtIndex = process.argv.indexOf("--merged-at");
const mergedAt =
  mergedAtIndex >= 0 ? process.argv[mergedAtIndex + 1] : new Date().toISOString();
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

assert(mergedAt, "--merged-at requires an ISO timestamp");
assert.equal(Number.isNaN(Date.parse(mergedAt)), false, "mergedAt must be ISO");
if (shouldWrite) {
  for (const file of generatedPaths) {
    assert.equal(await exists(file), false, `refusing to overwrite frozen output: ${file}`);
  }
}

const activationPath = `${POST_CANARY_BATCH_01_DISPUTE_ADJ_ROOT}/execution-activation.json`;
const executionPath = `${POST_CANARY_BATCH_01_DISPUTE_ADJ_ROOT}/model-execution.json`;
const priorAnalysisPath = `${POST_CANARY_BATCH_01_DISPUTE_ADJ_ROOT}/analysis.json`;
const originalOutputPath = `${POST_CANARY_BATCH_01_DISPUTE_ADJ_ROOT}/outputs/debate-195.json`;
const originalPacketPath = `${POST_CANARY_BATCH_01_DISPUTE_ADJ_ROOT}/packets/debate-195.json`;
const correctionPacketPath =
  `${POST_CANARY_BATCH_01_DISPUTE_ADJ_ROOT}/correction-1/packet.json`;
const correctionOutputPath = `${CORRECTION_ROOT}/correction-output.json`;
const correctionActivationPath = `${CORRECTION_ROOT}/execution-activation.json`;
const correctionExecutionPath = `${CORRECTION_ROOT}/model-execution.json`;
const correctionValidationPath = `${CORRECTION_ROOT}/correction-validation.json`;
const correctionAnalysisPath = `${CORRECTION_ROOT}/analysis.json`;
const correctionOneDiagnosisPath =
  `${POST_CANARY_BATCH_01_DISPUTE_ADJ_ROOT}/correction-1/transport-failure-diagnosis.json`;
const generatorPath =
  "scripts/merge-assessment-production-post-canary-batch-01-debate-195-adjudication-correction.mjs";
const testPath =
  "scripts/test-assessment-production-post-canary-batch-01-debate-195-adjudication-correction-merge.mjs";

const [activation, execution, priorAnalysis, correctionActivation, correctionExecution,
  correctionValidation, correctionAnalysis] = await Promise.all(
  [
    activationPath,
    executionPath,
    priorAnalysisPath,
    correctionActivationPath,
    correctionExecutionPath,
    correctionValidationPath,
    correctionAnalysisPath
  ].map((file) => readFile(file, "utf8").then(JSON.parse))
);

assert.equal(activation.contexts.length, 10);
assert.deepEqual(
  activation.contexts.map((context) => context.debateNumber),
  ["31", "94", "52", "146", "91", "175", "75", "72", "13", "195"]
);
assert.equal(execution.contextsAttempted, 10);
assert.equal(execution.attempts, 10);
assert.equal(execution.retries, 0);
assert.equal(execution.timeoutExtensions, 0);
assert.equal(execution.corrections, 0);
assert.equal(execution.scoresDerived, 0);
assert.equal(execution.paidServiceCalls, 0);
assert.equal(priorAnalysis.gate.validContexts, 9);
assert.equal(priorAnalysis.gate.requiredValidContexts, 10);
assert.equal(
  correctionActivation.userExecutionAuthorization.deterministicMergeAuthorized,
  false
);
assert.equal(correctionExecution.contextsAttempted, 1);
assert.equal(correctionExecution.attempts, 1);
assert.equal(correctionExecution.retries, 0);
assert.equal(correctionExecution.timeoutExtensions, 0);
assert.equal(correctionExecution.recursiveCorrections, 0);
assert.equal(correctionExecution.deterministicMerges, 0);
assert.equal(correctionExecution.scoresDerived, 0);
assert.equal(correctionExecution.paidServiceCalls, 0);
assert.equal(correctionValidation.gateAcceptancePassed, true);
assert.equal(correctionValidation.deterministicMergeAuthorized, false);
assert.equal(correctionAnalysis.gate.passed, true);
assert.equal(
  correctionAnalysis.nextAuthorizedAction,
  "user-approval-required-before-deterministic-debate-195-correction-merge-and-complete-adjudication-revalidation"
);

const [originalOutputBytes, originalPacket, correctionPacket, correctionOutputBytes] =
  await Promise.all([
    readFile(originalOutputPath),
    readFile(originalPacketPath, "utf8").then(JSON.parse),
    readFile(correctionPacketPath, "utf8").then(JSON.parse),
    readFile(correctionOutputPath)
  ]);
const originalOutput = JSON.parse(originalOutputBytes);
const correctionOutput = JSON.parse(correctionOutputBytes);
const correctionReplay = validatePostCanaryBatch01Debate195CorrectionOutput(
  correctionOutput,
  correctionPacket
);
assert.equal(correctionReplay.status, "passed");
assert.equal(correctionReplay.burdenAdjustmentDecisions, 2);
assert.equal(correctionReplay.candidateSelections, 2);
assert.equal(correctionReplay.calculatedScores, 0);
assert.equal(originalOutput.moveDecisions.length, 18);
assert.equal(originalOutput.burdenAdjustmentDecisions.length, 0);
assert.equal(sha256(originalOutputBytes), correctionAnalysis.preservation.originalOutputSha256);
assert.equal(sha256(correctionOutputBytes), correctionExecution.results[0].outputSha256);

const originalMoveDecisionsSha256 = sha256(
  Buffer.from(canonicalJson(originalOutput.moveDecisions))
);
assert.equal(
  originalMoveDecisionsSha256,
  correctionAnalysis.preservation.preservedMoveDecisionsSha256
);
const mergedOutput = structuredClone(originalOutput);
mergedOutput.burdenAdjustmentDecisions = structuredClone(
  correctionOutput.burdenAdjustmentDecisions
);
const mergedReplay = validatePostCanaryBatch01DisputeAdjudicationOutput(
  mergedOutput,
  originalPacket
);
assert.equal(mergedReplay.status, "passed");
assert.equal(mergedReplay.disputedMoves, 18);
assert.equal(mergedOutput.burdenAdjustmentDecisions.length, 2);
assert.equal(mergedReplay.candidateSelections, 43);
assert.equal(mergedReplay.calculatedScores, 0);

const rootKeys = Object.keys(originalOutput).sort();
assert.deepEqual(Object.keys(mergedOutput).sort(), rootKeys);
const changedRootFields = rootKeys.filter(
  (key) => canonicalJson(originalOutput[key]) !== canonicalJson(mergedOutput[key])
);
assert.deepEqual(changedRootFields, ["burdenAdjustmentDecisions"]);
assert.equal(
  sha256(Buffer.from(canonicalJson(mergedOutput.moveDecisions))),
  originalMoveDecisionsSha256
);
const mergedOutputBytes = Buffer.from(`${JSON.stringify(mergedOutput, null, 2)}\n`);
const mergedOutputSha256 = sha256(mergedOutputBytes);

const contexts = [];
for (const context of activation.contexts) {
  const result = execution.results.find(
    (candidate) => candidate.contextIndex === context.contextIndex
  );
  assert(result, `${context.debateNumber}: missing original execution result`);
  const packet = JSON.parse(await readFile(context.packet, "utf8"));
  const outputPath = context.debateNumber === "195" ? mergedOutputPath : context.output;
  const output =
    context.debateNumber === "195"
      ? mergedOutput
      : JSON.parse(await readFile(context.output, "utf8"));
  const replay = validatePostCanaryBatch01DisputeAdjudicationOutput(output, packet);
  assert.equal(replay.status, "passed", `${context.debateNumber}: replay failed`);
  assert.equal(replay.calculatedScores, 0);
  contexts.push({
    contextIndex: context.contextIndex,
    debateNumber: context.debateNumber,
    debateId: context.debateId,
    status:
      context.debateNumber === "195"
        ? "completed-valid-after-deterministic-correction-merge"
        : result.status,
    accepted: true,
    output: outputPath,
    outputSha256:
      context.debateNumber === "195"
        ? mergedOutputSha256
        : sha256(await readFile(context.output)),
    outputKind:
      context.debateNumber === "195"
        ? "separate-deterministically-merged-output"
        : "preserved-raw-adjudication-output",
    validationReplayed: true,
    disputedMoves: replay.disputedMoves,
    burdenAdjustmentDecisions: output.burdenAdjustmentDecisions.length,
    candidateSelections: replay.candidateSelections,
    audioTranscriptInputs: result.audioTranscriptInputs.length,
    calculatedScores: replay.calculatedScores,
    elapsedMinutes: Number((result.elapsedMs / 60000).toFixed(2)),
    model: result.model,
    modelSlug: result.modelSlug,
    reasoningEffort: result.reasoningEffort,
    authentication: result.authentication,
    apiKeysRemoved: result.apiKeysRemoved,
    scoreBlind: result.scoreBlind,
    attemptCount: result.attemptCount,
    retryCount: result.retryCount
  });
}

const disputedMovesDecided = contexts.reduce(
  (sum, context) => sum + context.disputedMoves,
  0
);
const candidateSelections = contexts.reduce(
  (sum, context) => sum + context.candidateSelections,
  0
);
const maximumElapsedMinutes = Math.max(
  ...contexts.map((context) => context.elapsedMinutes)
);
const meanElapsedMinutes = Number(
  (
    contexts.reduce((sum, context) => sum + context.elapsedMinutes, 0) /
    contexts.length
  ).toFixed(2)
);
assert.equal(disputedMovesDecided, 169);
assert.equal(candidateSelections, 461);
assert(maximumElapsedMinutes <= activation.executionPolicy.maximumMinutesPerContext);
assert(meanElapsedMinutes <= activation.executionPolicy.maximumMeanMinutes);
assert(
  contexts.every(
    (context) =>
      context.model === "5.6 Sol" &&
      context.modelSlug === "gpt-5.6-sol" &&
      context.reasoningEffort === "low" &&
      context.authentication === "ChatGPT subscription" &&
      context.apiKeysRemoved === true &&
      context.scoreBlind === true &&
      context.attemptCount === 1 &&
      context.retryCount === 0 &&
      context.calculatedScores === 0
  )
);

const staticSourcePaths = [
  "docs/assessment-production-workflow.md",
  "docs/reassessment-rubric-v2.1.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/assessment-production/manifest-v1.json",
  activationPath,
  executionPath,
  priorAnalysisPath,
  correctionOneDiagnosisPath,
  correctionPacketPath,
  `${CORRECTION_ROOT}/execution-preparation-manifest.json`,
  `${CORRECTION_ROOT}/schema.json`,
  correctionActivationPath,
  correctionOutputPath,
  correctionExecutionPath,
  correctionValidationPath,
  correctionAnalysisPath,
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v4221175-decomposed-adjudication.mjs",
  "scripts/lib/v42211728-hard-route-adjudication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-01-dispute-adjudication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-01-debate-195-adjudication-correction.mjs",
  generatorPath,
  testPath
];
const sourcePaths = [
  ...new Set([
    ...staticSourcePaths,
    ...activation.contexts.flatMap((context) => [context.packet, context.output])
  ])
];
const sourceHashes = Object.fromEntries(
  await Promise.all(
    sourcePaths.map(async (file) => [file, sha256(await readFile(file))])
  )
);

const completeValidation = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-debate-195-complete-adjudication-validation",
  protocolId: activation.protocolId,
  status: "passed",
  validatedAt: mergedAt,
  productionCanary: false,
  batchNumber: 1,
  debateNumber: "195",
  debateId: originalOutput.debateId,
  stagingOnly: true,
  developmentValidationOnly: false,
  output: mergedOutputPath,
  outputSha256: mergedOutputSha256,
  validationSummary: mergedReplay,
  requiredMoveDecisions: 18,
  moveDecisions: 18,
  requiredBurdenAdjustmentDecisions: 2,
  burdenAdjustmentDecisions: 2,
  requiredCandidateSelections: 43,
  candidateSelections: 43,
  calculatedScores: 0,
  authorizedRootFieldsChanged: ["burdenAdjustmentDecisions"],
  immutableRootFieldsChanged: [],
  originalRawOutputPreserved: true,
  correctionRawOutputPreserved: true,
  moveDecisionsPreservedByteForByteAfterCanonicalization: true,
  finalLedgerAssembled: false,
  scoresDerived: 0
};

const mergeAudit = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-debate-195-adjudication-correction-merge-audit",
  protocolId:
    "assessment-production-post-canary-batch-01-debate-195-deterministic-correction-merge",
  status: "passed-frozen",
  mergedAt,
  productionCanary: false,
  batchNumber: 1,
  debateNumber: "195",
  stagingOnly: true,
  developmentValidationOnly: false,
  userAuthorization: {
    instruction: "You have approval.",
    scopeReference:
      "the immediately preceding request for deterministic merging of the two accepted correction-2 burden-adjustment decisions, complete Debate 195 adjudication revalidation, analysis, commit, and push",
    directIncrementalCostUsdMaximum: 0,
    deterministicMerge: true,
    completeAdjudicationRevalidation: true,
    modelExecution: false,
    paidServices: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  inputs: {
    originalRawAdjudicationOutput: {
      path: originalOutputPath,
      sha256: sha256(originalOutputBytes),
      moveDecisions: 18,
      burdenAdjustmentDecisions: 0,
      preserved: true
    },
    acceptedCorrectionOutput: {
      path: correctionOutputPath,
      sha256: sha256(correctionOutputBytes),
      burdenAdjustmentDecisions: 2,
      candidateSelections: 2,
      preserved: true
    }
  },
  output: {
    path: mergedOutputPath,
    sha256: mergedOutputSha256,
    separateFromBothRawInputs: true,
    completeAdjudicationValidation: validationPath
  },
  transformation: {
    deterministic: true,
    authorizedRootFieldsChanged: ["burdenAdjustmentDecisions"],
    authorizedRootFieldCount: 1,
    burdenAdjustmentDecisionCountBefore: 0,
    burdenAdjustmentDecisionCountAfter: 2,
    immutableRootFieldsChanged: [],
    immutableRootFieldChangeCount: 0,
    moveDecisionsBefore: 18,
    moveDecisionsAfter: 18,
    moveDecisionsSha256Before: originalMoveDecisionsSha256,
    moveDecisionsSha256After: sha256(
      Buffer.from(canonicalJson(mergedOutput.moveDecisions))
    ),
    correctionDecisionsCopiedWithoutSemanticModification: true,
    originalRawOutputBytesModified: false,
    correctionRawOutputBytesModified: false
  },
  sourceHashes,
  totals: {
    modelContextsThisStage: 0,
    adjudicationModelContextsThisStage: 0,
    correctionModelContextsThisStage: 0,
    historicalAdjudicationModelContexts: 10,
    historicalCorrectionModelContexts: 2,
    paidServiceCallsThisStage: 0,
    deterministicMergesThisStage: 1,
    finalLedgersAssembledThisStage: 0,
    scoresDerivedThisStage: 0,
    publicationReconstructionsThisStage: 0,
    productionMutationsThisStage: 0,
    nextBatchSelectionsThisStage: 0,
    directIncrementalCostUsd: 0
  },
  downstreamAuthorization: {
    modelExecution: false,
    paidServices: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    productionMutation: false,
    nextBatchSelection: false
  }
};

const postMergeAnalysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-dispute-only-adjudication-post-merge-analysis",
  protocolId: activation.protocolId,
  status:
    "post-canary-batch-01-dispute-only-adjudication-gate-passed-after-debate-195-deterministic-correction-awaiting-separate-final-ledger-assembly-approval",
  analyzedAt: mergedAt,
  productionCanary: false,
  batchNumber: 1,
  stagingOnly: true,
  developmentValidationOnly: false,
  AIOnly: true,
  contexts,
  gate: {
    passed: true,
    semanticPass: true,
    timingPass: true,
    scoreBlindPass: true,
    isolationPass: true,
    preservationPass: true,
    requiredValidContexts: 10,
    validContexts: 10,
    requiredDisputedMoves: 169,
    disputedMovesDecided,
    requiredCandidateSelections: 461,
    candidateSelections,
    maximumElapsedMinutes,
    maximumAllowedMinutesPerContext:
      activation.executionPolicy.maximumMinutesPerContext,
    meanElapsedMinutes,
    maximumAllowedMeanMinutes: activation.executionPolicy.maximumMeanMinutes,
    originalAdjudicationAttempts: 10,
    correctionAttempts: 2,
    retries: 0,
    timeoutExtensions: 0,
    recursiveCorrections: 0,
    deterministicMerges: 1,
    finalLedgersAssembled: 0,
    scoresDerived: 0
  },
  debate195: {
    status: "completed-valid-after-deterministic-correction-merge",
    completeValidation: validationPath,
    mergedOutput: mergedOutputPath,
    mergedOutputSha256,
    moveDecisions: 18,
    burdenAdjustmentDecisions: 2,
    candidateSelections: 43,
    originalRawOutputUnchanged: true,
    correctionRawOutputUnchanged: true,
    calculatedScores: 0
  },
  evidenceBoundary: {
    originalAdjudicationScoreBlind: true,
    correctionScoreBlind: true,
    correctionBurdenAdjustmentDisputesOnly: true,
    correctionAnonymousCandidatePairsOnly: true,
    correctionPreservedMoveDecisionsUnavailableToModel: true,
    correctionFullInitialOutputUnavailableToModel: true,
    provenanceUnavailableToModels: true,
    passIdentitiesUnavailable: true,
    initialRationalesUnavailable: true,
    calculatedScoresUnavailable: true,
    winnerLabelsUnavailable: true,
    legacyAssessmentsUnavailable: true,
    otherDebatesUnavailable: true,
    publicationProseUnavailable: true,
    candidateValuesInvented: 0,
    calculatedScores: 0,
    modelContextsThisStage: 0
  },
  preservation: {
    mergeAudit: auditPath,
    originalRawOutputPath: originalOutputPath,
    originalRawOutputSha256: sha256(originalOutputBytes),
    acceptedCorrectionOutputPath: correctionOutputPath,
    acceptedCorrectionOutputSha256: sha256(correctionOutputBytes),
    mergedOutputPath,
    mergedOutputSha256,
    originalMoveDecisionsSha256,
    mergedMoveDecisionsSha256: originalMoveDecisionsSha256,
    originalRawOutputsModified: 0,
    correctionRawOutputsModified: 0,
    finalLedgerAssembled: false
  },
  totals: {
    modelContextsThisStage: 0,
    historicalAdjudicationModelContexts: 10,
    historicalCorrectionModelContexts: 2,
    judgmentModelContextsThisStage: 0,
    paidServiceCallsThisStage: 0,
    deterministicMergesThisStage: 1,
    finalLedgersAssembledThisStage: 0,
    scoresDerivedThisStage: 0,
    publicationReconstructionsThisStage: 0,
    productionMutationsThisStage: 0,
    nextBatchSelectionsThisStage: 0,
    directIncrementalCostUsd: 0
  },
  authorization: {
    modelExecution: false,
    judgmentModelExecution: false,
    adjudicationModelExecution: false,
    correctionModelExecution: false,
    retry: false,
    paidServices: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    publicationModelExecution: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction:
    "user-approval-required-before-batch-01-deterministic-final-ledger-assembly"
};

if (shouldWrite) {
  await writeFile(mergedOutputPath, mergedOutputBytes);
  await writeFile(validationPath, `${JSON.stringify(completeValidation, null, 2)}\n`);
  await writeFile(auditPath, `${JSON.stringify(mergeAudit, null, 2)}\n`);
  await writeFile(analysisPath, `${JSON.stringify(postMergeAnalysis, null, 2)}\n`);
}

console.log(
  JSON.stringify(
    {
      status: postMergeAnalysis.status,
      debate195Validation: completeValidation.status,
      validContexts: 10,
      disputedMovesDecided,
      candidateSelections,
      originalMoveDecisionsPreserved: 18,
      burdenAdjustmentDecisionsMerged: 2,
      modelContextsThisStage: 0,
      paidServiceCallsThisStage: 0,
      finalLedgersAssembled: 0,
      scoresDerived: 0,
      directIncrementalCostUsd: 0,
      nextAuthorizedAction: postMergeAnalysis.nextAuthorizedAction
    },
    null,
    2
  )
);
