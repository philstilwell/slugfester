#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V42211726_PROTOCOL_ID, V42211726_ROOT, buildV42211726AudioWorkItems, extractV42211726Disagreements } from "./lib/v42211726-hard-route-disagreement.mjs";

const shouldWrite = process.argv.includes("--write");
const JUDGMENT_ROOT = "docs/calibration/v4.2.21.17.25/hard-route-independent-judgments";
const preparation = JSON.parse(await readFile(`${JUDGMENT_ROOT}/preparation-manifest.json`, "utf8"));
const judgmentAnalysis = JSON.parse(await readFile(`${JUDGMENT_ROOT}/analysis.json`, "utf8"));
assertV4(judgmentAnalysis.status === "ten-hard-route-independent-judgments-passed-disagreement-extraction-authorized" && judgmentAnalysis.authorization.disagreementExtraction, "hard-route disagreement extraction is not authorized");

const debates = [];
const audioWorkItems = [];
const fieldKeys = ["importancePair", "attributionPair", "responsePair", "charityPair", "assessmentConfidencePair", "logicalCoherence", "evidenceWarrant", "relevanceBurden", "representationalCharity", "precisionClarity", "epistemicCalibration"];
const triggerKeys = ["importanceMismatch", "responseStructureMismatch", "materialWithinClassResponsiveness", "burdenContactMismatch", "precisionFindingsMismatch", "calibrationFindingsMismatch", "attributionConfidenceMismatch", "charityTestedMismatch", "assessmentConfidenceMismatch", "assessmentBelowHighAudioRequired", "attributionAudioRequired"];
const fieldCounts = Object.fromEntries(fieldKeys.map((key) => [key, 0]));
const triggerCounts = Object.fromEntries(triggerKeys.map((key) => [key, 0]));

for (const debateNumber of ["51", "63", "90", "153", "165"]) {
  const context = preparation.contexts.find((item) => item.debateNumber === debateNumber && item.reviewerPass === "A");
  const judgmentPair = judgmentAnalysis.pairs.find((item) => item.debateNumber === debateNumber);
  assertV4(context && judgmentPair?.bothAccepted && judgmentPair.sameLockedInventory, `Debate ${debateNumber}: accepted A/B pair unavailable`);
  const [primaryA, primaryB, lockedInventory, sourcePacket, events] = await Promise.all([
    readFile(`${JUDGMENT_ROOT}/raw-outputs/pass-a/debate-${debateNumber}.json`, "utf8").then(JSON.parse),
    readFile(`${JUDGMENT_ROOT}/raw-outputs/pass-b/debate-${debateNumber}.json`, "utf8").then(JSON.parse),
    readFile(context.lockedInventory, "utf8").then(JSON.parse),
    readFile(context.sourcePacket, "utf8").then(JSON.parse),
    readFile(context.originalEvents, "utf8").then(JSON.parse),
  ]);
  const disagreements = extractV42211726Disagreements(primaryA, primaryB, lockedInventory);
  const audio = buildV42211726AudioWorkItems(primaryA, primaryB, lockedInventory, events, sourcePacket);
  const expectedAudioIds = judgmentPair.audioVerificationMoveIds;
  assertV4(JSON.stringify(disagreements.audioVerificationMoveIds) === JSON.stringify(audio.map((item) => item.moveId)), `Debate ${debateNumber}: extracted audio population mismatch`);
  assertV4(JSON.stringify([...audio.map((item) => item.moveId)].sort()) === JSON.stringify([...expectedAudioIds].sort()), `Debate ${debateNumber}: independent-gate audio queue was not reproduced`);
  for (const dispute of disagreements.moveDisputes) {
    for (const key of ["importancePair", "attributionPair", "responsePair", "charityPair", "assessmentConfidencePair"]) fieldCounts[key] += Number(dispute.candidates[key] !== null);
    for (const key of Object.keys(dispute.candidates.scoringFields)) fieldCounts[key] += 1;
    triggerCounts.importanceMismatch += Number(dispute.triggers.importanceMismatch);
    triggerCounts.responseStructureMismatch += Number(dispute.triggers.responseStructureMismatch);
    triggerCounts.materialWithinClassResponsiveness += Number(dispute.triggers.responsivenessWithinClassDelta > 5);
    triggerCounts.burdenContactMismatch += Number(dispute.triggers.burdenContactMismatch);
    triggerCounts.precisionFindingsMismatch += Number(dispute.triggers.precisionFindingsMismatch);
    triggerCounts.calibrationFindingsMismatch += Number(dispute.triggers.calibrationFindingsMismatch);
    triggerCounts.attributionConfidenceMismatch += Number(dispute.triggers.attributionConfidenceMismatch);
    triggerCounts.charityTestedMismatch += Number(dispute.triggers.charityTestedMismatch);
    triggerCounts.assessmentConfidenceMismatch += Number(dispute.triggers.assessmentConfidenceMismatch);
  }
  for (const item of audio) {
    triggerCounts.assessmentBelowHighAudioRequired += Number(item.trigger.eitherPassAssessmentBelowHigh);
    triggerCounts.attributionAudioRequired += Number(item.trigger.eitherPassAttributionBelowHigh);
  }
  audioWorkItems.push(...audio);
  const disagreementPath = `${V42211726_ROOT}/disagreements/debate-${debateNumber}.json`;
  if (shouldWrite) {
    await mkdir(path.dirname(disagreementPath), { recursive: true });
    await writeFile(disagreementPath, `${JSON.stringify(disagreements, null, 2)}\n`);
  }
  debates.push({ debateNumber, debateId: primaryA.debateId, moveCount: primaryA.moves.length, disputedMoves: disagreements.moveDisputes.length, nondisputedScalarMerges: disagreements.nondisputedScalarMerges.length, burdenAdjustmentDisputes: disagreements.burdenAdjustmentDisputes.length, audioVerificationMoves: audio.map((item) => item.moveId), disagreementPath });
}

const totalMoves = debates.reduce((sum, debate) => sum + debate.moveCount, 0);
const disputedMoves = debates.reduce((sum, debate) => sum + debate.disputedMoves, 0);
const burdenAdjustmentDisputes = debates.reduce((sum, debate) => sum + debate.burdenAdjustmentDisputes, 0);
const candidateSelections = Object.values(fieldCounts).reduce((sum, count) => sum + count, 0) + burdenAdjustmentDisputes;
const analysis = {
  schemaVersion: "4.2.21.17.26-hard-route-disagreement-audio-preparation",
  protocolId: V42211726_PROTOCOL_ID,
  status: "hard-route-deterministic-disagreements-extracted-audio-source-preparation-authorized",
  calibrationOnly: true,
  AIOnly: true,
  sourceJudgmentAnalysis: `${JUDGMENT_ROOT}/analysis.json`,
  debates,
  fieldCounts,
  triggerCounts,
  adjudicationWorkload: { disputedMoves, totalMoves, disputedMoveRate: Number((disputedMoves / totalMoves).toFixed(4)), candidateSelections, burdenAdjustmentDisputes, oneAdjudicationContextPerDebateSufficient: true },
  audioWorkload: { moves: audioWorkItems.length, debates: [...new Set(audioWorkItems.map((item) => item.debateNumber))], independentGateQueueReproducedExactly: true, allEitherPassBelowHighAssessmentMovesIncluded: true, allRepositoryBelowHighAttributionMovesIncluded: true, modelOrApiCallsMade: 0, sourceAudioPrepared: false, verificationCompleted: false },
  scoreBlindness: { diagnosticMoveScoresComputed: 0, weightedMoveScoresComputed: 0, sectionScoresComputed: 0, sideScoresComputed: 0, debateScoresComputed: 0, scoreBasedTriggers: 0 },
  totals: { modelContexts: 0, audioCalls: 0, retries: 0, semanticRepairs: 0, scoresDerived: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  authorization: { audioSourcePreparation: true, audioVerificationExecution: false, adjudicationPacketPreparation: false, adjudicationModelExecution: false, finalLedgerAssembly: false, scoreDerivation: false, productionMutation: false, all195Debates: false },
};

if (shouldWrite) {
  await mkdir(V42211726_ROOT, { recursive: true });
  await writeFile(`${V42211726_ROOT}/audio-work-items.json`, `${JSON.stringify({ schemaVersion: "4.2.21.17.26-hard-route-audio-work-items", protocolId: V42211726_PROTOCOL_ID, status: "prepared-local-audio-work-items", moves: audioWorkItems, modelOrApiCallsMade: 0, authorization: { sourceAudioPreparation: true, audioVerification: false, adjudication: false, scoreDerivation: false } }, null, 2)}\n`);
  await writeFile(`${V42211726_ROOT}/analysis.json`, `${JSON.stringify(analysis, null, 2)}\n`);
}

console.log(JSON.stringify({ status: analysis.status, debates, fieldCounts, triggerCounts, adjudicationWorkload: analysis.adjudicationWorkload, audioWorkload: analysis.audioWorkload, scoreBlindness: analysis.scoreBlindness, nextAuthorized: "local-audio-source-preparation" }, null, 2));
