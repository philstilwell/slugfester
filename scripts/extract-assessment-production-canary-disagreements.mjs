#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  ASSESSMENT_PRODUCTION_CANARY_DISAGREEMENT_PROTOCOL_ID,
  ASSESSMENT_PRODUCTION_CANARY_DISAGREEMENT_ROOT,
  buildAssessmentProductionCanaryAudioWorkItems,
  extractAssessmentProductionCanaryDisagreements
} from "./lib/assessment-production-canary-disagreement.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const JUDGMENT_ROOT = "docs/assessment-production/canary-v1-independent-judgments";
const EXPECTED_DEBATES = ["05", "13", "37", "64", "65", "81", "130", "138", "152", "188"];
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
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const preparationPath = `${JUDGMENT_ROOT}/preparation-manifest.json`;
const judgmentAnalysisPath = `${JUDGMENT_ROOT}/analysis.json`;
const [preparationBytes, judgmentAnalysisBytes] = await Promise.all([
  readFile(preparationPath),
  readFile(judgmentAnalysisPath)
]);
const preparation = JSON.parse(preparationBytes);
const judgmentAnalysis = JSON.parse(judgmentAnalysisBytes);
assertV4(
  judgmentAnalysis.status ===
    "twenty-production-canary-independent-judgments-passed-disagreement-extraction-authorized" &&
    judgmentAnalysis.authorization.disagreementExtraction,
  "production-canary disagreement extraction is not authorized"
);
assertV4(
  JSON.stringify(judgmentAnalysis.pairs.map((pair) => pair.debateNumber)) ===
    JSON.stringify(EXPECTED_DEBATES),
  "production-canary judgment population changed"
);

const debates = [];
const audioWorkItems = [];
const fieldCounts = Object.fromEntries(FIELD_KEYS.map((key) => [key, 0]));
const triggerCounts = Object.fromEntries(TRIGGER_KEYS.map((key) => [key, 0]));
const sourceHashes = {
  [preparationPath]: sha256(preparationBytes),
  [judgmentAnalysisPath]: sha256(judgmentAnalysisBytes)
};

for (const debateNumber of EXPECTED_DEBATES) {
  const context = preparation.contexts.find(
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
    lockedInventory: context.lockedInventory,
    sourcePacket: context.sourcePacket,
    events: context.originalEvents
  };
  const entries = await Promise.all(
    Object.entries(paths).map(async ([key, file]) => [key, file, await readFile(file)])
  );
  const inputs = Object.fromEntries(
    entries.map(([key, , bytes]) => [key, JSON.parse(bytes)])
  );
  for (const [, file, bytes] of entries) sourceHashes[file] = sha256(bytes);

  const disagreements = extractAssessmentProductionCanaryDisagreements(
    inputs.primaryA,
    inputs.primaryB,
    inputs.lockedInventory
  );
  const audio = buildAssessmentProductionCanaryAudioWorkItems(
    inputs.primaryA,
    inputs.primaryB,
    inputs.lockedInventory,
    inputs.events,
    inputs.sourcePacket
  );
  const extractedAudioIds = audio.map((item) => item.moveId);
  assertV4(
    JSON.stringify(disagreements.audioVerificationMoveIds) ===
      JSON.stringify(extractedAudioIds),
    `Debate ${debateNumber}: extracted audio population mismatch`
  );
  assertV4(
    JSON.stringify([...extractedAudioIds].sort()) ===
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
    ]) fieldCounts[key] += Number(dispute.candidates[key] !== null);
    for (const key of Object.keys(dispute.candidates.scoringFields)) {
      fieldCounts[key] += 1;
    }
    triggerCounts.importanceMismatch += Number(dispute.triggers.importanceMismatch);
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
  for (const item of audio) {
    triggerCounts.assessmentBelowHighAudioRequired += Number(
      item.trigger.eitherPassAssessmentBelowHigh
    );
    triggerCounts.attributionAudioRequired += Number(
      item.trigger.eitherPassAttributionBelowHigh
    );
  }
  audioWorkItems.push(...audio);

  const disagreementPath =
    `${ASSESSMENT_PRODUCTION_CANARY_DISAGREEMENT_ROOT}/disagreements/debate-${debateNumber}.json`;
  if (shouldWrite) {
    await mkdir(path.dirname(disagreementPath), { recursive: true });
    await writeFile(disagreementPath, `${JSON.stringify(disagreements, null, 2)}\n`);
  }
  debates.push({
    debateNumber,
    debateId: inputs.primaryA.debateId,
    moveCount: inputs.primaryA.moves.length,
    disputedMoves: disagreements.moveDisputes.length,
    nondisputedScalarMerges: disagreements.nondisputedScalarMerges.length,
    burdenAdjustmentDisputes: disagreements.burdenAdjustmentDisputes.length,
    audioVerificationMoves: extractedAudioIds,
    disagreementPath
  });
}

const totalMoves = debates.reduce((sum, debate) => sum + debate.moveCount, 0);
const disputedMoves = debates.reduce((sum, debate) => sum + debate.disputedMoves, 0);
const burdenAdjustmentDisputes = debates.reduce(
  (sum, debate) => sum + debate.burdenAdjustmentDisputes,
  0
);
const candidateSelections =
  Object.values(fieldCounts).reduce((sum, count) => sum + count, 0) +
  burdenAdjustmentDisputes;
const expectedAudioQueue = judgmentAnalysis.audioPolicy.queue.map(
  ({ debateNumber, moveId }) => `${debateNumber}:${moveId}`
);
const extractedAudioQueue = audioWorkItems.map(
  ({ debateNumber, moveId }) => `${debateNumber}:${moveId}`
);
assertV4(totalMoves === 186, "production-canary extraction must compare 186 moves");
assertV4(
  JSON.stringify([...extractedAudioQueue].sort()) ===
    JSON.stringify([...expectedAudioQueue].sort()),
  "production-canary four-move audio queue was not reproduced"
);

const analysis = {
  schemaVersion: "1.0-production-canary-disagreement-audio-preparation",
  protocolId: ASSESSMENT_PRODUCTION_CANARY_DISAGREEMENT_PROTOCOL_ID,
  status:
    "production-canary-deterministic-disagreements-extracted-audio-source-preparation-authorized",
  productionCanary: true,
  stagingOnly: true,
  AIOnly: true,
  sourceJudgmentAnalysis: judgmentAnalysisPath,
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
    moves: audioWorkItems.length,
    debates: [...new Set(audioWorkItems.map((item) => item.debateNumber))],
    independentGateQueueReproducedExactly: true,
    allEitherPassBelowHighAssessmentMovesIncluded: true,
    allRepositoryBelowHighAttributionMovesIncluded: true,
    modelOrApiCallsMade: 0,
    sourceAudioPrepared: false,
    verificationCompleted: false
  },
  scoreBlindness: {
    diagnosticMoveScoresComputed: 0,
    weightedMoveScoresComputed: 0,
    sectionScoresComputed: 0,
    sideScoresComputed: 0,
    debateScoresComputed: 0,
    scoreBasedTriggers: 0
  },
  totals: {
    modelContexts: 0,
    audioCalls: 0,
    retries: 0,
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
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false
  }
};

if (shouldWrite) {
  await mkdir(ASSESSMENT_PRODUCTION_CANARY_DISAGREEMENT_ROOT, {
    recursive: true
  });
  await writeFile(
    `${ASSESSMENT_PRODUCTION_CANARY_DISAGREEMENT_ROOT}/audio-work-items.json`,
    `${JSON.stringify(
      {
        schemaVersion: "1.0-production-canary-audio-work-items",
        protocolId: ASSESSMENT_PRODUCTION_CANARY_DISAGREEMENT_PROTOCOL_ID,
        status: "prepared-four-local-audio-work-items",
        moves: audioWorkItems,
        modelOrApiCallsMade: 0,
        authorization: {
          sourceAudioPreparation: true,
          paidTranscription: false,
          audioVerification: false,
          adjudication: false,
          scoreDerivation: false
        }
      },
      null,
      2
    )}\n`
  );
  await writeFile(
    `${ASSESSMENT_PRODUCTION_CANARY_DISAGREEMENT_ROOT}/analysis.json`,
    `${JSON.stringify(analysis, null, 2)}\n`
  );
}

console.log(
  JSON.stringify(
    {
      status: analysis.status,
      debates,
      fieldCounts,
      triggerCounts,
      adjudicationWorkload: analysis.adjudicationWorkload,
      audioWorkload: analysis.audioWorkload,
      scoreBlindness: analysis.scoreBlindness,
      nextAuthorized: "local-audio-source-preparation"
    },
    null,
    2
  )
);
