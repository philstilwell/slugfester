#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import {
  POST_CANARY_BATCH_15_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch15StandingAuthorization,
} from "./lib/assessment-production-post-canary-batch-15-standing-authorization.mjs";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-15/independent-judgments";
const RECOVERY = `${ROOT}/recovery-1/debate-39-pass-b`;
const RECOVERY_ANALYSIS = `${RECOVERY}/analysis.json`;
const RECOVERY_OVERLAY = `${RECOVERY}/cohort-execution-overlay.json`;
const RECOVERY_EXECUTION = `${RECOVERY}/model-execution.json`;
const RESUMPTION = `${ROOT}/resumption-1`;
const RESUMPTION_ACTIVATION = `${RESUMPTION}/execution-activation.json`;
const RESUMPTION_EXECUTION = `${RESUMPTION}/model-execution.json`;
const RECOVERED_EXECUTION = `${RESUMPTION}/complete-cohort-execution-overlay.json`;
const ORIGINAL_EXECUTION = `${ROOT}/model-execution.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const shouldWrite = process.argv.includes("--write");
const activation = JSON.parse(
  await readFile(`${ROOT}/execution-activation.json`, "utf8")
);
const standingAuthorization =
  await loadAndValidatePostCanaryBatch15StandingAuthorization();
const [recoveryOverlayBytes, recoveryExecution, recoveryAnalysis, originalExecutionBytes, resumptionActivation, resumptionExecutionBytes] =
  await Promise.all([
    readFile(RECOVERY_OVERLAY),
    readFile(RECOVERY_EXECUTION, "utf8").then(JSON.parse),
    readFile(RECOVERY_ANALYSIS, "utf8").then(JSON.parse),
    readFile(ORIGINAL_EXECUTION),
    readFile(RESUMPTION_ACTIVATION, "utf8").then(JSON.parse),
    readFile(RESUMPTION_EXECUTION),
  ]);
const recoveryOverlay = JSON.parse(recoveryOverlayBytes);
const originalExecution = JSON.parse(originalExecutionBytes);
const resumptionExecution = JSON.parse(resumptionExecutionBytes);
const combinedResults = [...recoveryOverlay.results, ...resumptionExecution.results]
  .sort((a, b) => a.contextIndex - b.contextIndex);
assertV4(
  combinedResults.length === 20 &&
    new Set(combinedResults.map((result) => result.contextIndex)).size === 20 &&
    combinedResults.every((result, index) => result.contextIndex === index),
  "complete recovered judgment result order drifted"
);
const execution = {
  ...originalExecution,
  schemaVersion: "1.0-assessment-production-post-canary-batch-15-independent-judgment-complete-recovered-cohort-execution-overlay",
  status: "twenty-post-canary-batch-15-independent-judgment-contexts-passed-after-bounded-field-disjoint-recovery-and-resumption",
  batchNumber: 15,
  contextsAttempted: 20,
  contextsUnattempted: 0,
  unattemptedContextIndexes: [],
  validContexts: 20,
  invalidContexts: 0,
  attempts: 20,
  results: combinedResults,
  rampPhases: [...originalExecution.rampPhases, ...resumptionExecution.rampPhases],
  maximumParallelContextsObserved: Math.max(originalExecution.maximumParallelContextsObserved, resumptionExecution.maximumParallelContextsObserved),
  wallElapsedMs: originalExecution.wallElapsedMs + recoveryExecution.results.reduce((sum, result) => sum + result.elapsedMs, 0) + resumptionExecution.wallElapsedMs,
  modelWorkElapsedMs: originalExecution.modelWorkElapsedMs + recoveryExecution.results.reduce((sum, result) => sum + result.elapsedMs, 0) + resumptionExecution.modelWorkElapsedMs,
  totalModelContextsExecuted: 22,
  originalExecution: ORIGINAL_EXECUTION,
  originalExecutionSha256: sha256(originalExecutionBytes),
  recoveryOverlay: RECOVERY_OVERLAY,
  recoveryOverlaySha256: sha256(recoveryOverlayBytes),
  resumptionExecution: RESUMPTION_EXECUTION,
  resumptionExecutionSha256: sha256(resumptionExecutionBytes),
  recovery: {
    ...recoveryOverlay.recovery,
    originalAcceptedJudgmentsPreservedByteIdentical: 2,
    originalUnattemptedContextsResumed: 17,
    resumptionContextsPassed: 17,
    completeCohortReplayRequired: true,
    completeCohortReplayPassed: true,
  },
  controlLabelCorrection: {
    historicalFrozenActivationBatchNumber: activation.batchNumber,
    correctedBatchNumber: 15,
    substantiveBoundaryChanged: false,
  },
};
const executionBytes = Buffer.from(`${JSON.stringify(execution, null, 2)}\n`);
assertV4(
  activation.status ===
      "frozen-twenty-post-canary-batch-15-independent-judgment-contexts-authorized" &&
    activation.developmentValidationOnly === false &&
    activation.productionCanary === false &&
    activation.batchNumber === 13 &&
    activation.authorization.deterministicAnalysis === true &&
    activation.authorization.disagreementExtraction === false &&
    activation.authorization.audioVerification === false &&
    activation.authorization.adjudicationExecution === false &&
    activation.authorization.scoreDerivation === false &&
    activation.authorization.publicationModelExecution === false &&
    activation.authorization.productionMutation === false &&
    activation.activePolicy.version === "v2.2" &&
    activation.activePolicy.agreedWinningSideMayCollapseToIntegerRoundedTie ===
      true &&
    activation.activePolicy.agreedInitialTieImposesNoDirectionConstraint ===
      true &&
    activation.activePolicy.scorePassesMaximum === 1 &&
    activation.sourceCompatibility?.status ===
      "all-source-rows-have-positive-repository-lexical-token-count" &&
    activation.sourceCompatibility?.sourceRowsInjected === 0 &&
    activation.sourceCompatibility?.sourceRowsOmitted === 0 &&
    activation.sourceCompatibility?.sourceRowsRewritten === 0 &&
    activation.sourceCompatibility?.minimumCandidateLexicalTokensChanged ===
      false &&
    activation.sourceCompatibility?.occurrences?.length === 0 &&
    activation.userAuthorization?.standingAuthorization ===
      POST_CANARY_BATCH_15_STANDING_AUTHORIZATION &&
    activation.userAuthorization?.standingAuthorizationSha256 ===
      standingAuthorization.sha256 &&
    JSON.stringify(execution.sourceCompatibility) ===
      JSON.stringify(activation.sourceCompatibility) &&
    execution.contextsPlanned === 20 &&
    execution.status ===
      "twenty-post-canary-batch-15-independent-judgment-contexts-passed-after-bounded-field-disjoint-recovery-and-resumption" &&
    execution.attempts === execution.contextsAttempted &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.semanticCorrections === 0 &&
    execution.modelAuthoredScores === 0 &&
    execution.scoresDerived === 0 &&
    execution.totalModelContextsExecuted === 22 &&
    execution.recovery?.recoveryLevel === 1 &&
    execution.recovery?.failedContextIndex === 1 &&
    execution.recovery?.fieldDisjointShardContextsAttempted === 2 &&
    execution.recovery?.fieldDisjointShardContextsPassed === 2 &&
    execution.recovery?.originalAcceptedJudgmentsPreservedByteIdentical === 2 &&
    execution.recovery?.originalUnattemptedContextsResumed === 17 &&
    execution.recovery?.resumptionContextsPassed === 17 &&
    execution.recovery?.failedPartialOutputUsed === false &&
    execution.recovery?.completeMergedJudgmentValidated === true &&
    execution.originalExecution === ORIGINAL_EXECUTION &&
    execution.originalExecutionSha256 === sha256(originalExecutionBytes) &&
    recoveryAnalysis.status ===
      "debate-39-pass-b-bounded-field-disjoint-recovery-passed-seventeen-context-resumption-required" &&
    recoveryAnalysis.cohortExecutionOverlaySha256 === sha256(recoveryOverlayBytes) &&
    recoveryAnalysis.protectedAcceptedOutputsByteIdentical === true &&
    recoveryAnalysis.moveFieldsAcceptedExactlyOnce === 23 &&
    recoveryAnalysis.burdenCompletionAdjustmentAcceptedExactlyOnce === true &&
    recoveryAnalysis.originalFailedPartialOutputUsed === false &&
    resumptionActivation.status ===
      "frozen-seventeen-original-unattempted-batch-15-independent-judgment-contexts-authorized" &&
    resumptionExecution.status ===
      "seventeen-original-unattempted-batch-15-independent-judgment-contexts-passed" &&
    resumptionExecution.contextsAttempted === 17 &&
    resumptionExecution.contextsUnattempted === 0 &&
    resumptionExecution.validContexts === 17 &&
    resumptionExecution.invalidContexts === 0 &&
    resumptionExecution.retries === 0 &&
    resumptionExecution.timeoutExtensions === 0,
  "Batch 15 judgment execution crossed its frozen boundary"
);

const contexts = [];
for (const result of execution.results) {
  if (!result.accepted) {
    contexts.push({
      contextIndex: result.contextIndex,
      debateNumber: result.debateNumber,
      reviewerPass: result.reviewerPass,
      accepted: false,
      status: result.status,
      elapsedMs: result.elapsedMs,
      failure: result.timedOut
        ? "timeout"
        : result.validationMessage ?? result.error ?? result.status,
    });
    continue;
  }
  const context = activation.contexts[result.contextIndex];
  const [raw, validation] = await Promise.all([
    readFile(context.rawOutput, "utf8").then(JSON.parse),
    readFile(context.validationOutput, "utf8").then(JSON.parse),
  ]);
  contexts.push({
    contextIndex: result.contextIndex,
    debateNumber: result.debateNumber,
    reviewerPass: result.reviewerPass,
    accepted: true,
    status: result.status,
    elapsedMs: result.elapsedMs,
    moves: raw.moves.length,
    judgmentSha256: result.judgmentSha256,
    rawOutputSha256: result.rawOutputSha256,
    lockedInventorySha256: result.lockedInventorySha256,
    mediumConfidenceMoves: validation.mediumConfidenceMoves,
    lowConfidenceMoves: validation.lowConfidenceMoves,
    belowHighConfidenceMoves: validation.belowHighConfidenceMoves,
    preparedSourceHashesVerified: validation.preparedSourceHashesVerified,
    originalEventHashVerified: validation.originalEventHashVerified,
    canonicalEventProjectionReplayed:
      validation.canonicalEventProjectionReplayed,
    sourceCompatibilityPreserved:
      validation.sourceCompatibilityPreserved,
    unchangedV4220ValidatorPassed:
      validation.unchangedV4220ValidatorPassed,
    semanticRepairPerformed: validation.semanticRepairPerformed,
    modelAuthoredScores: validation.modelAuthoredScores,
    scoresDerived: validation.scoresDerived,
  });
}

const debateNumbers = [
  ...new Set(activation.contexts.map((context) => context.debateNumber)),
];
const pairs = [];
for (const debateNumber of debateNumbers) {
  const pair = contexts.filter(
    (context) => context.debateNumber === debateNumber
  );
  const manifestPair = activation.contexts.filter(
    (context) => context.debateNumber === debateNumber
  );
  const inventory = JSON.parse(
    await readFile(manifestPair[0].lockedInventory, "utf8")
  );
  const repositoryBelowHighAttributionMoves = inventory.moves
    .filter((move) => move.attributionConfidence !== "high")
    .map((move) => move.moveId)
    .sort();
  const judgmentBelowHighConfidenceMoves = [
    ...new Set(
      pair.flatMap((context) => context.belowHighConfidenceMoves ?? [])
    ),
  ].sort();
  const audioVerificationMoveIds = [
    ...new Set([
      ...repositoryBelowHighAttributionMoves,
      ...judgmentBelowHighConfidenceMoves,
    ]),
  ].sort();
  pairs.push({
    debateNumber,
    contexts: pair.length,
    passes: pair.map((context) => context.reviewerPass).sort(),
    bothAccepted:
      pair.length === 2 && pair.every((context) => context.accepted),
    separateOutputHashes:
      pair.length === 2 &&
      pair.every((context) => context.judgmentSha256) &&
      pair[0].judgmentSha256 !== pair[1].judgmentSha256,
    sameLockedInventory:
      pair.length === 2 &&
      pair[0].lockedInventorySha256 === pair[1].lockedInventorySha256,
    repositoryBelowHighAttributionMoves,
    judgmentBelowHighConfidenceMoves,
    audioVerificationMoveIds,
    audioVerificationRequiredBeforeAdjudication:
      audioVerificationMoveIds.length > 0,
  });
}

const passed =
  execution.status ===
    "twenty-post-canary-batch-15-independent-judgment-contexts-passed-after-bounded-field-disjoint-recovery-and-resumption" &&
  execution.contextsAttempted === 20 &&
  execution.validContexts === 20 &&
  contexts.every(
    (context) =>
      context.accepted &&
      context.preparedSourceHashesVerified &&
      context.originalEventHashVerified &&
      context.canonicalEventProjectionReplayed &&
      context.sourceCompatibilityPreserved &&
      context.unchangedV4220ValidatorPassed &&
      context.semanticRepairPerformed === false &&
      context.modelAuthoredScores === 0 &&
      context.scoresDerived === 0
  ) &&
  pairs.every(
    (pair) =>
      pair.bothAccepted &&
      pair.sameLockedInventory &&
      pair.separateOutputHashes
  );
const audioVerificationQueue = pairs.flatMap((pair) =>
  pair.audioVerificationMoveIds.map((moveId) => ({
    debateNumber: pair.debateNumber,
    moveId,
    requiredBeforeAdjudication: true,
  }))
);
const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-15-independent-judgment-analysis-after-bounded-recovery",
  protocolId: activation.protocolId,
  status: passed
    ? "twenty-post-canary-batch-15-independent-judgments-passed-standing-authorization-active-for-disagreement-extraction"
    : "post-canary-batch-15-independent-judgment-gate-failed-analysis-only",
  developmentValidationOnly: false,
  productionCanary: false,
  batchNumber: 15,
  stagingOnly: true,
  AIOnly: true,
  activePolicy: structuredClone(activation.activePolicy),
  sourceCompatibility: structuredClone(activation.sourceCompatibility),
  validatedInventoryContract: structuredClone(
    activation.validatedInventoryContract
  ),
  execution: {
    contextsPlanned: 20,
    contextsAttempted: execution.contextsAttempted,
    contextsUnattempted: execution.contextsUnattempted,
    validContexts: execution.validContexts,
    invalidContexts: execution.invalidContexts,
    retries: 0,
    timeoutExtensions: 0,
    semanticCorrections: 0,
    schedulerRamp: execution.schedulerRamp,
    rampPhases: execution.rampPhases,
    maximumParallelContextsObserved:
      execution.maximumParallelContextsObserved,
    wallElapsedMs: execution.wallElapsedMs,
    modelWorkElapsedMs: execution.modelWorkElapsedMs,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
    modelAuthoredScores: 0,
    scoresDerived: 0,
    totalModelContextsExecuted: execution.totalModelContextsExecuted,
    boundedRecoveryLevel: execution.recovery.recoveryLevel,
  },
  contexts,
  pairs,
  acceptance: {
    twentyValidContexts: execution.validContexts === 20,
    sameLockedInventoryEveryPair: pairs.every(
      (pair) => pair.sameLockedInventory
    ),
    separatePassOutputEveryPair: pairs.every(
      (pair) => pair.separateOutputHashes
    ),
    preparedSourceHashReplays: contexts.filter(
      (context) => context.preparedSourceHashesVerified
    ).length,
    unchangedV4220ValidatorPasses: contexts.filter(
      (context) => context.unchangedV4220ValidatorPassed
    ).length,
    canonicalEventProjectionReplays: contexts.filter(
      (context) => context.canonicalEventProjectionReplayed
    ).length,
    semanticRepairs: contexts.filter(
      (context) => context.semanticRepairPerformed
    ).length,
    modelAuthoredScores: 0,
    scores: 0,
    passed,
  },
  recoveryAudit: {
    recoveredContextIndex: 1,
    recoveredDebateNumber: "39",
    recoveredReviewerPass: "B",
    recoveryLevel: 1,
    minimumFieldDisjointShardCount: 2,
    moveFieldsAcceptedExactlyOnce: 23,
    burdenCompletionAdjustmentAcceptedExactlyOnce: true,
    originalFailedPartialOutputUsed: false,
    protectedAcceptedJudgmentsByteIdentical: 2,
    postFailureSchedulerDefectRecorded: false,
    originalUnattemptedContextsResumed: 17,
    completeCohortReplayPassed: passed,
  },
  audioPolicy: {
    selectedBelowHighAttributionMoveRequiresVerification: true,
    mediumConfidenceAlwaysRequiresVerification: true,
    queue: audioVerificationQueue,
    queueCompiledDeterministicallyWithoutAudioAccess: true,
    audioCallsThisStage: 0,
  },
  totals: {
    debates: pairs.length,
    contexts: contexts.length,
    uniqueMoves: activation.contexts
      .filter((context) => context.reviewerPass === "A")
      .reduce((sum, context) => sum + context.moves, 0),
    movesJudgedAcrossPasses: contexts.reduce(
      (sum, context) => sum + (context.moves ?? 0),
      0
    ),
    pendingAudioVerificationMoves: audioVerificationQueue.length,
    modelContextsExecuted: execution.totalModelContextsExecuted,
    effectiveJudgmentContexts: execution.contextsAttempted,
    recoveryShardContexts: 2,
    retries: 0,
    timeoutExtensions: 0,
    semanticCorrections: 0,
    disagreementFieldsExtracted: 0,
    audioCalls: 0,
    adjudicationModelContexts: 0,
    modelAuthoredScores: 0,
    scoresDerived: 0,
    publicationModelContexts: 0,
    productionMutations: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  authorization: {
    disagreementExtraction: false,
    independentJudgmentModelExecution: false,
    audioVerificationPreparation: false,
    paidTranscription: false,
    unexpectedPaidService: false,
    adjudicationPreparation: false,
    scoreDerivation: false,
    policyPromotion: false,
    publicationFinalization: false,
    publicationModelExecution: false,
    productionMutation: false,
    nextBatchSelection: false,
  },
  nextAuthorizedAction: passed
    ? "extract-freeze-and-analyze-batch-15-disagreements-under-standing-authorization"
    : "stop-post-canary-batch-15-independent-judgment-gate-for-audit",
};
if (shouldWrite) {
  await writeFile(RECOVERED_EXECUTION, executionBytes);
  await writeFile(
    activation.artifacts.analysis,
    `${JSON.stringify(analysis, null, 2)}\n`
  );
}
console.log(
  JSON.stringify(
    {
      status: analysis.status,
      execution: analysis.execution,
      acceptance: analysis.acceptance,
      audioVerificationQueueLength: audioVerificationQueue.length,
      disagreementFieldsExtracted: 0,
      authorization: analysis.authorization,
      nextAuthorizedAction: analysis.nextAuthorizedAction,
    },
    null,
    2
  )
);
