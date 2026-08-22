#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  ASSESSMENT_PRODUCTION_POST_CANARY_BATCH_06_DISAGREEMENT_PROTOCOL_ID,
  ASSESSMENT_PRODUCTION_POST_CANARY_BATCH_06_DISAGREEMENT_ROOT,
  extractAssessmentProductionPostCanaryBatch06Disagreements
} from "./lib/assessment-production-post-canary-batch-06-disagreement.mjs";
import {
  POST_CANARY_BATCH_06_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch06StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-06-standing-authorization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const COHORT_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-06";
const JUDGMENT_ROOT = `${COHORT_ROOT}/independent-judgments`;
const EXPECTED_DEBATES = [
  "73",
  "36",
  "38",
  "97",
  "141",
  "06",
  "168",
  "135",
  "143",
  "169"
];
const FIELD_KEYS = [
  "importancePair",
  "attributionPair",
  "responsePair",
  "charityPair",
  "assessmentConfidencePair",
  "logicalCoherence",
  "evidenceWarrant",
  "relevanceBurden",
  "representationalCharity",
  "precisionClarity",
  "epistemicCalibration"
];
const TRIGGER_KEYS = [
  "importanceMismatch",
  "responseStructureMismatch",
  "materialWithinClassResponsiveness",
  "burdenContactMismatch",
  "precisionFindingsMismatch",
  "calibrationFindingsMismatch",
  "attributionConfidenceMismatch",
  "charityTestedMismatch",
  "assessmentConfidenceMismatch",
  "assessmentBelowHighAudioRequired",
  "attributionAudioRequired"
];
const standingAuthorization =
  await loadAndValidatePostCanaryBatch06StandingAuthorization();
const USER_AUTHORIZATION = Object.freeze({
  instruction: standingAuthorization.record.userAuthorization.instruction,
  standingAuthorizationPath: POST_CANARY_BATCH_06_STANDING_AUTHORIZATION,
  standingAuthorizationSha256: standingAuthorization.sha256,
  directIncrementalCostUsdMaximum: 0,
  conditionalPaidAudioMaximumUsd: 1,
  acceptedIndependentJudgmentOutputsOnly: true,
  disagreementExtractionAuthorized: true,
  localAudioWorkAuthorized: true,
  modelExecutionAuthorized: false,
  paidAudioVerificationConditionallyAuthorized: true,
  adjudicationAuthorized: false,
  scoreDerivationAuthorized: false,
  publicationReconstructionAuthorized: false,
  productionMutationAuthorized: false,
  nextBatchSelectionAuthorized: false
});
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
const executionPreparationPath =
  `${JUDGMENT_ROOT}/execution-preparation-manifest.json`;
const executionActivationPath = `${JUDGMENT_ROOT}/execution-activation.json`;
const modelExecutionPath = `${JUDGMENT_ROOT}/model-execution.json`;
const judgmentAnalysisPath = `${JUDGMENT_ROOT}/analysis.json`;
const activePolicyPath =
  "docs/assessment-production/score-stability-policy-v2.2-promotion.json";
const TOOL_SOURCES = [
  "scripts/extract-assessment-production-post-canary-batch-06-disagreements.mjs",
  "scripts/lib/assessment-production-post-canary-batch-06-disagreement.mjs",
  "scripts/lib/v42211726-hard-route-disagreement.mjs",
  "scripts/lib/v4221173-decomposed-disagreement.mjs",
  "scripts/lib/v4221-pass-b-consensus.mjs",
  "scripts/lib/assessment-production-post-canary-batch-06-standing-authorization.mjs",
  "scripts/test-assessment-production-post-canary-batch-06-disagreements.mjs"
];

const [
  executionPreparationBytes,
  executionActivationBytes,
  modelExecutionBytes,
  judgmentAnalysisBytes
] = await Promise.all([
  readFile(executionPreparationPath),
  readFile(executionActivationPath),
  readFile(modelExecutionPath),
  readFile(judgmentAnalysisPath)
]);
const executionPreparation = JSON.parse(executionPreparationBytes);
const executionActivation = JSON.parse(executionActivationBytes);
const modelExecution = JSON.parse(modelExecutionBytes);
const judgmentAnalysis = JSON.parse(judgmentAnalysisBytes);

assertV4(
  judgmentAnalysis.status ===
    "twenty-post-canary-batch-06-independent-judgments-passed-standing-authorization-active-for-disagreement-extraction" &&
    judgmentAnalysis.authorization.disagreementExtraction === false &&
    judgmentAnalysis.nextAuthorizedAction ===
      "extract-freeze-and-analyze-batch-06-disagreements-under-standing-authorization",
  "Batch 6 accepted-judgment gate or prior stop rule changed"
);
assertV4(
  JSON.stringify(judgmentAnalysis.pairs.map((pair) => pair.debateNumber)) ===
    JSON.stringify(EXPECTED_DEBATES),
  "Batch 6 independent-judgment population changed"
);
assertV4(
  judgmentAnalysis.pairs.every(
    (pair) =>
      pair.contexts === 2 &&
      pair.bothAccepted &&
      pair.separateOutputHashes &&
      pair.sameLockedInventory
  ),
  "Batch 6 does not contain ten accepted, independent A/B judgment pairs"
);
assertV4(
  executionPreparation.contexts.length === 20 &&
    executionActivation.executionPolicy.contexts === 20 &&
    modelExecution.contextsPlanned === 20 &&
    modelExecution.contextsAttempted === 20 &&
    modelExecution.validContexts === 20 &&
    modelExecution.invalidContexts === 0,
  "Batch 6 twenty-context accepted execution contract changed"
);
assertV4(
  executionActivation.model.slug === "gpt-5.6-sol" &&
    executionActivation.model.reasoningEffort === "low" &&
    executionActivation.model.authentication === "ChatGPT subscription" &&
    executionActivation.model.scoreBlind === true &&
    executionActivation.model.roundedIntegerScoreTiesPermitted === true,
  "Batch 6 model, authentication, score-blindness, or tie contract changed"
);
assertV4(
  executionActivation.executionPolicy.attemptsPerContext === 1 &&
    executionActivation.executionPolicy.retriesMaximum === 0 &&
    executionActivation.executionPolicy.timeoutExtensionsMaximum === 0 &&
    JSON.stringify(executionActivation.executionPolicy.schedulerRamp) ===
      JSON.stringify([1, 2]),
  "Batch 6 one-attempt or frozen 1-to-2 scheduler stop rule changed"
);
assertV4(
  executionActivation.activePolicy.version === "v2.2" &&
    executionActivation.activePolicy
      .agreedWinningSideMayCollapseToIntegerRoundedTie === true &&
    executionActivation.activePolicy.scorePassesMaximum === 1 &&
    executionActivation.validatedInventoryContract.scoreFieldsAvailable ===
      false,
  "active score-blind v2.2 policy changed"
);
assertV4(
  sha256(await readFile(activePolicyPath)) ===
    executionActivation.activePolicy.promotionSha256,
  "active v2.2 promotion record hash changed"
);
assertV4(
  judgmentAnalysis.sourceCompatibility?.status ===
      "exact-source-zero-lexical-token-rows-preserved-with-zero-count" &&
    judgmentAnalysis.sourceCompatibility.sourceRowsInjected === 0 &&
    judgmentAnalysis.sourceCompatibility.sourceRowsOmitted === 0 &&
    judgmentAnalysis.sourceCompatibility.sourceRowsRewritten === 0 &&
    judgmentAnalysis.sourceCompatibility.minimumCandidateLexicalTokensChanged ===
      false &&
    judgmentAnalysis.sourceCompatibility.occurrences?.length === 1 &&
    judgmentAnalysis.sourceCompatibility.occurrences[0].debateNumber === "141",
  "Batch 6 source-compatibility evidence changed"
);
assertV4(
  modelExecution.results.length === 20 &&
    modelExecution.results.every(
      (result) =>
        result.accepted === true &&
        result.status === "completed-valid" &&
        result.attemptCount === 1 &&
        result.retryCount === 0 &&
        result.timeoutExtensionCount === 0 &&
        result.semanticCorrectionCount === 0 &&
        result.authentication === "ChatGPT subscription" &&
        result.modelSlug === "gpt-5.6-sol" &&
        result.reasoningEffort === "low" &&
        result.scoreBlind === true
    ),
  "Batch 6 accepted execution evidence changed"
);

const debates = [];
const fieldCounts = Object.fromEntries(FIELD_KEYS.map((key) => [key, 0]));
const triggerCounts = Object.fromEntries(TRIGGER_KEYS.map((key) => [key, 0]));
const sourceHashes = {
  [executionPreparationPath]: sha256(executionPreparationBytes),
  [executionActivationPath]: sha256(executionActivationBytes),
  [modelExecutionPath]: sha256(modelExecutionBytes),
  [judgmentAnalysisPath]: sha256(judgmentAnalysisBytes),
  [activePolicyPath]: executionActivation.activePolicy.promotionSha256,
  [POST_CANARY_BATCH_06_STANDING_AUTHORIZATION]: standingAuthorization.sha256
};
for (const file of TOOL_SOURCES) sourceHashes[file] = sha256(await readFile(file));

for (const debateNumber of EXPECTED_DEBATES) {
  const contexts = executionPreparation.contexts.filter(
    (item) => item.debateNumber === debateNumber
  );
  const contextA = contexts.find((item) => item.reviewerPass === "A");
  const contextB = contexts.find((item) => item.reviewerPass === "B");
  const resultA = modelExecution.results.find(
    (item) => item.debateNumber === debateNumber && item.reviewerPass === "A"
  );
  const resultB = modelExecution.results.find(
    (item) => item.debateNumber === debateNumber && item.reviewerPass === "B"
  );
  const analysisA = judgmentAnalysis.contexts.find(
    (item) => item.debateNumber === debateNumber && item.reviewerPass === "A"
  );
  const analysisB = judgmentAnalysis.contexts.find(
    (item) => item.debateNumber === debateNumber && item.reviewerPass === "B"
  );
  const judgmentPair = judgmentAnalysis.pairs.find(
    (item) => item.debateNumber === debateNumber
  );
  assertV4(
    contexts.length === 2 &&
      contextA &&
      contextB &&
      resultA?.accepted &&
      resultB?.accepted &&
      analysisA?.accepted &&
      analysisB?.accepted &&
      judgmentPair?.bothAccepted &&
      judgmentPair.sameLockedInventory,
    `Debate ${debateNumber}: accepted A/B pair unavailable`
  );
  assertV4(
    contextA.lockedInventory === contextB.lockedInventory &&
      contextA.lockedInventoryCanonicalSha256 ===
        contextB.lockedInventoryCanonicalSha256,
    `Debate ${debateNumber}: locked inventory differs between passes`
  );

  const acceptedFiles = [
    contextA.judgmentOutput,
    contextA.rawOutput,
    contextA.validationOutput,
    contextA.provenanceOutput,
    contextB.judgmentOutput,
    contextB.rawOutput,
    contextB.validationOutput,
    contextB.provenanceOutput,
    contextA.lockedInventory
  ];
  const acceptedEntries = await Promise.all(
    acceptedFiles.map(async (file) => [file, await readFile(file)])
  );
  const acceptedBytes = Object.fromEntries(acceptedEntries);
  for (const [file, bytes] of acceptedEntries) sourceHashes[file] = sha256(bytes);

  for (const [context, result, acceptedAnalysis] of [
    [contextA, resultA, analysisA],
    [contextB, resultB, analysisB]
  ]) {
    assertV4(
      sha256(acceptedBytes[context.judgmentOutput]) === result.judgmentSha256 &&
        result.judgmentSha256 === acceptedAnalysis.judgmentSha256,
      `Debate ${debateNumber} Pass ${context.reviewerPass}: accepted judgment hash changed`
    );
    assertV4(
      sha256(acceptedBytes[context.rawOutput]) === result.rawOutputSha256 &&
        result.rawOutputSha256 === acceptedAnalysis.rawOutputSha256,
      `Debate ${debateNumber} Pass ${context.reviewerPass}: accepted raw-output hash changed`
    );
    assertV4(
      sha256(acceptedBytes[context.validationOutput]) === result.validationSha256 &&
        sha256(acceptedBytes[context.provenanceOutput]) ===
          result.provenanceSha256,
      `Debate ${debateNumber} Pass ${context.reviewerPass}: acceptance evidence hash changed`
    );
    const validation = JSON.parse(acceptedBytes[context.validationOutput]);
    assertV4(
      validation.status === "passed" &&
        validation.unchangedV4220ValidatorPassed === true &&
        validation.sourceCompatibilityPreserved === true &&
        validation.semanticRepairPerformed === false &&
        validation.modelAuthoredScores === 0 &&
        validation.scoresDerived === 0,
      `Debate ${debateNumber} Pass ${context.reviewerPass}: acceptance validation changed`
    );
  }
  assertV4(
    sha256(acceptedBytes[contextA.lockedInventory]) ===
      contextA.lockedInventorySha256,
    `Debate ${debateNumber}: locked inventory file hash changed`
  );

  const primaryA = JSON.parse(acceptedBytes[contextA.rawOutput]);
  const primaryB = JSON.parse(acceptedBytes[contextB.rawOutput]);
  const lockedInventory = JSON.parse(acceptedBytes[contextA.lockedInventory]);
  const disagreements =
    extractAssessmentProductionPostCanaryBatch06Disagreements(
      primaryA,
      primaryB,
      lockedInventory
    );
  assertV4(
    JSON.stringify([...disagreements.audioVerificationMoveIds].sort()) ===
      JSON.stringify([...judgmentPair.audioVerificationMoveIds].sort()),
    `Debate ${debateNumber}: independent-gate audio queue was not reproduced`
  );

  for (const dispute of disagreements.moveDisputes) {
    for (const key of [
      "importancePair",
      "attributionPair",
      "responsePair",
      "charityPair",
      "assessmentConfidencePair"
    ]) {
      fieldCounts[key] += Number(dispute.candidates[key] !== null);
    }
    for (const key of Object.keys(dispute.candidates.scoringFields)) {
      fieldCounts[key] += 1;
    }
    triggerCounts.importanceMismatch += Number(
      dispute.triggers.importanceMismatch
    );
    triggerCounts.responseStructureMismatch += Number(
      dispute.triggers.responseStructureMismatch
    );
    triggerCounts.materialWithinClassResponsiveness += Number(
      dispute.triggers.responsivenessWithinClassDelta > 5
    );
    triggerCounts.burdenContactMismatch += Number(
      dispute.triggers.burdenContactMismatch
    );
    triggerCounts.precisionFindingsMismatch += Number(
      dispute.triggers.precisionFindingsMismatch
    );
    triggerCounts.calibrationFindingsMismatch += Number(
      dispute.triggers.calibrationFindingsMismatch
    );
    triggerCounts.attributionConfidenceMismatch += Number(
      dispute.triggers.attributionConfidenceMismatch
    );
    triggerCounts.charityTestedMismatch += Number(
      dispute.triggers.charityTestedMismatch
    );
    triggerCounts.assessmentConfidenceMismatch += Number(
      dispute.triggers.assessmentConfidenceMismatch
    );
  }

  const movesA = new Map(primaryA.moves.map((move) => [move.moveId, move]));
  const movesB = new Map(primaryB.moves.map((move) => [move.moveId, move]));
  for (const moveId of disagreements.audioVerificationMoveIds) {
    const moveA = movesA.get(moveId);
    const moveB = movesB.get(moveId);
    triggerCounts.assessmentBelowHighAudioRequired += Number(
      moveA.assessmentConfidence !== "high" ||
        moveB.assessmentConfidence !== "high"
    );
    triggerCounts.attributionAudioRequired += Number(
      moveA.attributionConfidence !== "high" ||
        moveB.attributionConfidence !== "high"
    );
  }

  const disagreementPath =
    `${ASSESSMENT_PRODUCTION_POST_CANARY_BATCH_06_DISAGREEMENT_ROOT}/disagreements/debate-${debateNumber}.json`;
  const disagreementBytes = Buffer.from(
    `${JSON.stringify(disagreements, null, 2)}\n`
  );
  if (shouldWrite) {
    await mkdir(path.dirname(disagreementPath), { recursive: true });
    await writeFile(disagreementPath, disagreementBytes);
  }
  debates.push({
    debateNumber,
    debateId: primaryA.debateId,
    moveCount: primaryA.moves.length,
    disputedMoves: disagreements.moveDisputes.length,
    nondisputedScalarMerges: disagreements.nondisputedScalarMerges.length,
    burdenAdjustmentDisputes:
      disagreements.burdenAdjustmentDisputes.length,
    audioVerificationMoves: disagreements.audioVerificationMoveIds,
    disagreementPath,
    disagreementSha256: sha256(disagreementBytes)
  });
}

const totalMoves = debates.reduce((sum, debate) => sum + debate.moveCount, 0);
const disputedMoves = debates.reduce(
  (sum, debate) => sum + debate.disputedMoves,
  0
);
const burdenAdjustmentDisputes = debates.reduce(
  (sum, debate) => sum + debate.burdenAdjustmentDisputes,
  0
);
const candidateSelections =
  Object.values(fieldCounts).reduce((sum, count) => sum + count, 0) +
  burdenAdjustmentDisputes;
const independentGateQueue = judgmentAnalysis.audioPolicy.queue.map(
  ({ debateNumber, moveId, requiredBeforeAdjudication }) => ({
    debateNumber,
    moveId,
    requiredBeforeAdjudication
  })
);
const extractedAudioQueue = debates.flatMap((debate) =>
  debate.audioVerificationMoves.map((moveId) => ({
    debateNumber: debate.debateNumber,
    moveId,
    requiredBeforeAdjudication: true
  }))
);
const queueKey = ({ debateNumber, moveId }) => `${debateNumber}:${moveId}`;

assertV4(totalMoves === 200, "Batch 6 extraction must compare 200 moves");
assertV4(
  JSON.stringify(extractedAudioQueue.map(queueKey).sort()) ===
    JSON.stringify(independentGateQueue.map(queueKey).sort()),
  "Batch 6 frozen audio queue was not reproduced"
);

const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-06-disagreement-extraction",
  protocolId:
    ASSESSMENT_PRODUCTION_POST_CANARY_BATCH_06_DISAGREEMENT_PROTOCOL_ID,
  status:
    "post-canary-batch-06-deterministic-disagreements-extracted-standing-authorization-active-for-audio-work",
  developmentValidationOnly: false,
  productionCanary: false,
  batchNumber: 5,
  stagingOnly: true,
  AIOnly: true,
  userAuthorization: USER_AUTHORIZATION,
  standingAuthorization: {
    path: POST_CANARY_BATCH_06_STANDING_AUTHORIZATION,
    sha256: standingAuthorization.sha256,
    status: standingAuthorization.record.status,
    disagreementExtractionAuthorized: true,
    localAudioPreparationAuthorized: true,
    automaticContinuationWhileGatesPass: true
  },
  inputBoundary: {
    substantiveInputs:
      "twenty-accepted-independent-judgment-raw-outputs-only",
    lockedInventoriesUsedForPairValidationOnly: true,
    transcriptAccessed: false,
    eventsAccessed: false,
    manifestAccessed: false,
    legacyScoresAvailable: false,
    otherDebatesAvailable: false
  },
  sourceJudgmentAnalysis: judgmentAnalysisPath,
  sourceJudgmentConfiguration: {
    model: executionActivation.model.slug,
    modelLabel: executionActivation.model.label,
    reasoningEffort: executionActivation.model.reasoningEffort,
    authentication: executionActivation.model.authentication,
    scoreBlind: executionActivation.model.scoreBlind,
    roundedIntegerScoreTiesPermitted:
      executionActivation.model.roundedIntegerScoreTiesPermitted,
    schedulerRamp: executionActivation.executionPolicy.schedulerRamp,
    attemptsPerContext:
      executionActivation.executionPolicy.attemptsPerContext,
    retriesMaximum: executionActivation.executionPolicy.retriesMaximum,
    timeoutExtensionsMaximum:
      executionActivation.executionPolicy.timeoutExtensionsMaximum
  },
  sourceAcceptance: {
    contexts: 20,
    acceptedContexts: 20,
    rejectedContexts: 0,
    acceptedOutputHashReplays: 20,
    acceptedValidationHashReplays: 20,
    acceptedProvenanceHashReplays: 20,
    unchangedV4220ValidatorPasses: 20,
    sourceCompatibilityPreserved: true,
    semanticRepairs: 0
  },
  sourceCompatibility: structuredClone(judgmentAnalysis.sourceCompatibility),
  sourceHashes,
  debates,
  fieldCounts,
  triggerCounts,
  adjudicationWorkload: {
    disputedMoves,
    totalMoves,
    disputedMoveRate: Number((disputedMoves / totalMoves).toFixed(4)),
    debatesWithDisputes: debates.filter((debate) => debate.disputedMoves > 0)
      .length,
    candidateSelections,
    burdenAdjustmentDisputes,
    packetsPrepared: false,
    modelContextsExecuted: 0
  },
  audioWorkload: {
    moves: independentGateQueue.length,
    debates: [
      ...new Set(independentGateQueue.map((item) => item.debateNumber))
    ],
    queue: independentGateQueue,
    independentGateQueueReproducedExactly: true,
    allEitherPassBelowHighAssessmentMovesIncluded: true,
    allRepositoryBelowHighAttributionMovesIncluded: true,
    workItemsPrepared: false,
    sourceAudioPrepared: false,
    audioAccessed: false,
    verificationCompleted: false,
    modelOrApiCallsMade: 0
  },
  scoreBlindness: {
    diagnosticMoveScoresComputed: 0,
    weightedMoveScoresComputed: 0,
    sectionScoresComputed: 0,
    sideScoresComputed: 0,
    debateScoresComputed: 0,
    scoreBasedTriggers: 0
  },
  activePolicy: structuredClone(judgmentAnalysis.activePolicy),
  validatedInventoryContract: structuredClone(
    judgmentAnalysis.validatedInventoryContract
  ),
  totals: {
    modelContexts: 0,
    paidServiceCalls: 0,
    audioCalls: 0,
    retries: 0,
    timeoutExtensions: 0,
    semanticRepairs: 0,
    adjudicationContexts: 0,
    scoresDerived: 0,
    publicationContexts: 0,
    publicationReconstructions: 0,
    productionMutations: 0,
    nextBatchSelections: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
    directIncrementalCostUsd: 0
  },
  authorization: {
    independentJudgmentModelExecution: false,
    audioWorkPreparation: true,
    audioVerificationExecution: false,
    paidTranscription: false,
    unexpectedPaidService: false,
    adjudicationPacketPreparation: false,
    adjudicationModelExecution: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    publicationModelExecution: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction:
    "prepare-freeze-and-analyze-batch-06-local-audio-source-work-items-under-standing-authorization"
};

if (shouldWrite) {
  await mkdir(ASSESSMENT_PRODUCTION_POST_CANARY_BATCH_06_DISAGREEMENT_ROOT, {
    recursive: true
  });
  await writeFile(
    `${ASSESSMENT_PRODUCTION_POST_CANARY_BATCH_06_DISAGREEMENT_ROOT}/analysis.json`,
    `${JSON.stringify(analysis, null, 2)}\n`
  );
}

console.log(
  JSON.stringify(
    {
      status: analysis.status,
      wroteArtifacts: shouldWrite,
      debates,
      fieldCounts,
      triggerCounts,
      adjudicationWorkload: analysis.adjudicationWorkload,
      audioWorkload: analysis.audioWorkload,
      scoreBlindness: analysis.scoreBlindness,
      totals: analysis.totals,
      nextAuthorizedAction: analysis.nextAuthorizedAction
    },
    null,
    2
  )
);
