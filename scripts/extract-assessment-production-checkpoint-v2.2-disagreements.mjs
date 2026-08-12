#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  ASSESSMENT_PRODUCTION_CHECKPOINT_V22_DISAGREEMENT_PROTOCOL_ID,
  ASSESSMENT_PRODUCTION_CHECKPOINT_V22_DISAGREEMENT_ROOT,
  extractAssessmentProductionCheckpointV22Disagreements
} from "./lib/assessment-production-checkpoint-v2.2-disagreement.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const COHORT_ROOT =
  "docs/assessment-production/production-checkpoint-v2.2-1";
const JUDGMENT_ROOT = `${COHORT_ROOT}/independent-judgments`;
const EXPECTED_DEBATES = [
  "50",
  "192",
  "129",
  "40",
  "25",
  "104",
  "22",
  "10",
  "167",
  "122"
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
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
const executionPreparationPath =
  `${JUDGMENT_ROOT}/execution-preparation-manifest.json`;
const executionActivationPath = `${JUDGMENT_ROOT}/execution-activation.json`;
const judgmentAnalysisPath = `${JUDGMENT_ROOT}/analysis.json`;

const [executionPreparationBytes, executionActivationBytes, judgmentAnalysisBytes] =
  await Promise.all([
    readFile(executionPreparationPath),
    readFile(executionActivationPath),
    readFile(judgmentAnalysisPath)
  ]);
const executionPreparation = JSON.parse(executionPreparationBytes);
const executionActivation = JSON.parse(executionActivationBytes);
const judgmentAnalysis = JSON.parse(judgmentAnalysisBytes);

assertV4(
  judgmentAnalysis.status ===
    "twenty-production-checkpoint-v2.2-independent-judgments-passed-disagreement-extraction-authorized" &&
    judgmentAnalysis.authorization.disagreementExtraction &&
    judgmentAnalysis.nextAuthorizedAction ===
      "extract-production-checkpoint-v2.2-independent-judgment-disagreements-deterministically-only",
  "production checkpoint v2.2 disagreement extraction is not authorized"
);
assertV4(
  JSON.stringify(judgmentAnalysis.pairs.map((pair) => pair.debateNumber)) ===
    JSON.stringify(EXPECTED_DEBATES),
  "production checkpoint v2.2 independent-judgment population changed"
);
assertV4(
  executionPreparation.contexts.length === 20 &&
    executionActivation.executionPolicy.contexts === 20,
  "production checkpoint v2.2 twenty-context execution contract changed"
);
assertV4(
  executionActivation.model.slug === "gpt-5.6-sol" &&
    executionActivation.model.reasoningEffort === "low" &&
    executionActivation.model.authentication === "ChatGPT subscription" &&
    executionActivation.model.scoreBlind === true,
  "production checkpoint v2.2 model, authentication, or score-blindness contract changed"
);
assertV4(
  executionActivation.executionPolicy.retriesMaximum === 0 &&
    executionActivation.executionPolicy.timeoutExtensionsMaximum === 0,
  "production checkpoint v2.2 retry or timeout-extension stop rule changed"
);
assertV4(
  executionActivation.activePolicy.version === "v2.2" &&
    executionActivation.activePolicy
      .agreedWinningSideMayCollapseToIntegerRoundedTie === true &&
    executionActivation.activePolicy.scorePassesMaximum === 1 &&
    executionActivation.validatedInventoryContract.scoreFieldsAvailable ===
      false,
  "the active score-blind v2.2 policy changed"
);
assertV4(
  sha256(await readFile(executionActivation.activePolicy.promotion)) ===
    executionActivation.activePolicy.promotionSha256,
  "the active v2.2 promotion record hash changed"
);

const debates = [];
const fieldCounts = Object.fromEntries(FIELD_KEYS.map((key) => [key, 0]));
const triggerCounts = Object.fromEntries(TRIGGER_KEYS.map((key) => [key, 0]));
const sourceHashes = {
  [executionPreparationPath]: sha256(executionPreparationBytes),
  [executionActivationPath]: sha256(executionActivationBytes),
  [judgmentAnalysisPath]: sha256(judgmentAnalysisBytes),
  "docs/assessment-production/score-stability-policy-v2.2-promotion.json":
    executionActivation.activePolicy.promotionSha256,
  "scripts/lib/assessment-production-checkpoint-v2.2-disagreement.mjs":
    sha256(
      await readFile(
        "scripts/lib/assessment-production-checkpoint-v2.2-disagreement.mjs"
      )
    ),
  "scripts/extract-assessment-production-checkpoint-v2.2-disagreements.mjs":
    sha256(
      await readFile(
        "scripts/extract-assessment-production-checkpoint-v2.2-disagreements.mjs"
      )
    ),
  "scripts/test-assessment-production-checkpoint-v2.2-disagreements.mjs":
    sha256(
      await readFile(
        "scripts/test-assessment-production-checkpoint-v2.2-disagreements.mjs"
      )
    )
};

for (const debateNumber of EXPECTED_DEBATES) {
  const context = executionPreparation.contexts.find(
    (item) => item.debateNumber === debateNumber && item.reviewerPass === "A"
  );
  const judgmentPair = judgmentAnalysis.pairs.find(
    (item) => item.debateNumber === debateNumber
  );
  assertV4(
    context && judgmentPair?.bothAccepted && judgmentPair.sameLockedInventory,
    `Debate ${debateNumber}: accepted A/B pair unavailable`
  );
  const paths = {
    primaryA: `${JUDGMENT_ROOT}/raw-outputs/pass-a/debate-${debateNumber}.json`,
    primaryB: `${JUDGMENT_ROOT}/raw-outputs/pass-b/debate-${debateNumber}.json`,
    lockedInventory: context.lockedInventory
  };
  const entries = await Promise.all(
    Object.entries(paths).map(async ([key, file]) => [
      key,
      file,
      await readFile(file)
    ])
  );
  const inputs = Object.fromEntries(
    entries.map(([key, , bytes]) => [key, JSON.parse(bytes)])
  );
  for (const [, file, bytes] of entries) sourceHashes[file] = sha256(bytes);

  const disagreements =
    extractAssessmentProductionCheckpointV22Disagreements(
      inputs.primaryA,
      inputs.primaryB,
      inputs.lockedInventory
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

  const movesA = new Map(inputs.primaryA.moves.map((move) => [move.moveId, move]));
  const movesB = new Map(inputs.primaryB.moves.map((move) => [move.moveId, move]));
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
    `${ASSESSMENT_PRODUCTION_CHECKPOINT_V22_DISAGREEMENT_ROOT}/disagreements/debate-${debateNumber}.json`;
  if (shouldWrite) {
    await mkdir(path.dirname(disagreementPath), { recursive: true });
    await writeFile(
      disagreementPath,
      `${JSON.stringify(disagreements, null, 2)}\n`
    );
  }
  debates.push({
    debateNumber,
    debateId: inputs.primaryA.debateId,
    moveCount: inputs.primaryA.moves.length,
    disputedMoves: disagreements.moveDisputes.length,
    nondisputedScalarMerges: disagreements.nondisputedScalarMerges.length,
    burdenAdjustmentDisputes:
      disagreements.burdenAdjustmentDisputes.length,
    audioVerificationMoves: disagreements.audioVerificationMoveIds,
    disagreementPath
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

assertV4(
  totalMoves === 188,
  "production checkpoint v2.2 extraction must compare 188 moves"
);
assertV4(
  JSON.stringify(extractedAudioQueue.map(queueKey).sort()) ===
    JSON.stringify(independentGateQueue.map(queueKey).sort()),
  "production checkpoint v2.2 two-move audio queue was not reproduced"
);

const analysis = {
  schemaVersion: "1.0-production-checkpoint-v2.2-disagreement-extraction",
  protocolId:
    ASSESSMENT_PRODUCTION_CHECKPOINT_V22_DISAGREEMENT_PROTOCOL_ID,
  status:
    "production-checkpoint-v2.2-deterministic-disagreements-extracted-audio-source-preparation-authorized",
  productionCanary: true,
  stagingOnly: true,
  AIOnly: true,
  developmentValidationOnly: false,
  sourceJudgmentAnalysis: judgmentAnalysisPath,
  sourceJudgmentConfiguration: {
    model: executionActivation.model.slug,
    modelLabel: executionActivation.model.label,
    reasoningEffort: executionActivation.model.reasoningEffort,
    authentication: executionActivation.model.authentication,
    scoreBlind: executionActivation.model.scoreBlind,
    retriesMaximum: executionActivation.executionPolicy.retriesMaximum,
    timeoutExtensionsMaximum:
      executionActivation.executionPolicy.timeoutExtensionsMaximum
  },
  sourceHashes,
  debates,
  fieldCounts,
  triggerCounts,
  adjudicationWorkload: {
    disputedMoves,
    totalMoves,
    disputedMoveRate: Number((disputedMoves / totalMoves).toFixed(4)),
    candidateSelections,
    burdenAdjustmentDisputes,
    oneAdjudicationContextPerDebateSufficient: true
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
  gateDisposition: structuredClone(judgmentAnalysis.gateDisposition),
  activePolicy: structuredClone(judgmentAnalysis.activePolicy),
  validatedInventoryContract: structuredClone(
    judgmentAnalysis.validatedInventoryContract
  ),
  totals: {
    modelContexts: 0,
    audioCalls: 0,
    retries: 0,
    timeoutExtensions: 0,
    semanticRepairs: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0
  },
  authorization: {
    audioSourcePreparation: true,
    paidTranscription: false,
    audioVerificationExecution: false,
    adjudicationPacketPreparation: false,
    adjudicationModelExecution: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    policyPromotion: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  nextAuthorizedAction:
    "prepare-two-production-checkpoint-v2.2-local-audio-source-work-items-model-free-only"
};

if (shouldWrite) {
  await mkdir(ASSESSMENT_PRODUCTION_CHECKPOINT_V22_DISAGREEMENT_ROOT, {
    recursive: true
  });
  await writeFile(
    `${ASSESSMENT_PRODUCTION_CHECKPOINT_V22_DISAGREEMENT_ROOT}/analysis.json`,
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
      nextAuthorized: analysis.nextAuthorizedAction
    },
    null,
    2
  )
);
