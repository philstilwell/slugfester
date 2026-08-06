#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V4221173_ROOT, buildV4221173AudioWorkItems, extractV4221173Disagreements } from "./lib/v4221173-decomposed-disagreement.mjs";

const shouldWrite = process.argv.includes("--write");
const judgmentRoot = "docs/calibration/v4.2.21.17.2/independent-judgment-schema-recovery";
const inventoryRoot = "docs/calibration/v4.2.21.16/decomposed-consensus-contract/locked-inventories";
const preparation = JSON.parse(await readFile(`${judgmentRoot}/preparation-manifest.json`, "utf8"));
const execution = JSON.parse(await readFile(`${judgmentRoot}/analysis.json`, "utf8"));
assertV4(execution.status === "six-independent-judgments-passed-disagreement-extraction-authorized", "disagreement extraction is not authorized by the judgment gate");

const debates = [];
const audioWorkItems = [];
const fieldCounts = Object.fromEntries(["importancePair", "attributionPair", "responsePair", "charityPair", "assessmentConfidencePair", "logicalCoherence", "evidenceWarrant", "relevanceBurden", "representationalCharity", "precisionClarity", "epistemicCalibration"].map((key) => [key, 0]));
const triggerCounts = Object.fromEntries(["importanceMismatch", "responseStructureMismatch", "materialWithinClassResponsiveness", "burdenContactMismatch", "precisionFindingsMismatch", "calibrationFindingsMismatch", "attributionConfidenceMismatch", "charityTestedMismatch", "assessmentConfidenceMismatch", "mediumConfidenceAudioRequired", "attributionAudioRequired"].map((key) => [key, 0]));

for (const debateNumber of ["133", "178", "182"]) {
  const context = preparation.contexts.find((item) => item.debateNumber === debateNumber);
  assertV4(context, `Debate ${debateNumber}: preparation context missing`);
  const [primaryA, primaryB, lockedInventory, sourcePacket, events] = await Promise.all([
    readFile(`${judgmentRoot}/raw-outputs/pass-a/debate-${debateNumber}.json`, "utf8").then(JSON.parse),
    readFile(`${judgmentRoot}/raw-outputs/pass-b/debate-${debateNumber}.json`, "utf8").then(JSON.parse),
    readFile(`${inventoryRoot}/debate-${debateNumber}.json`, "utf8").then(JSON.parse),
    readFile(context.sourcePacket, "utf8").then(JSON.parse),
    readFile(context.originalEvents, "utf8").then(JSON.parse)
  ]);
  const disagreements = extractV4221173Disagreements(primaryA, primaryB, lockedInventory);
  const audio = buildV4221173AudioWorkItems(primaryA, primaryB, lockedInventory, events, sourcePacket);
  assertV4(JSON.stringify(disagreements.audioVerificationMoveIds) === JSON.stringify(audio.map((item) => item.moveId)), `Debate ${debateNumber}: audio work population mismatch`);
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
    triggerCounts.mediumConfidenceAudioRequired += Number(item.trigger.eitherPassAssessmentBelowHigh);
    triggerCounts.attributionAudioRequired += Number(item.trigger.eitherPassAttributionBelowHigh);
  }
  audioWorkItems.push(...audio);
  const disagreementPath = `${V4221173_ROOT}/disagreements/debate-${debateNumber}.json`;
  if (shouldWrite) {
    await mkdir(path.dirname(path.resolve(disagreementPath)), { recursive: true });
    await writeFile(path.resolve(disagreementPath), `${JSON.stringify(disagreements, null, 2)}\n`);
  }
  debates.push({
    debateNumber,
    debateId: primaryA.debateId,
    moveCount: primaryA.moves.length,
    disputedMoves: disagreements.moveDisputes.length,
    nondisputedScalarMerges: disagreements.nondisputedScalarMerges.length,
    burdenAdjustmentDisputes: disagreements.burdenAdjustmentDisputes.length,
    audioVerificationMoves: audio.map((item) => item.moveId),
    disagreementPath
  });
}

const totalMoves = debates.reduce((sum, debate) => sum + debate.moveCount, 0);
const disputedMoves = debates.reduce((sum, debate) => sum + debate.disputedMoves, 0);
const burdenAdjustmentDisputes = debates.reduce((sum, debate) => sum + debate.burdenAdjustmentDisputes, 0);
const candidateSelections = Object.values(fieldCounts).reduce((sum, count) => sum + count, 0) + burdenAdjustmentDisputes;
const analysis = {
  schemaVersion: "4.2.21.17.3-disagreement-audio-preparation",
  protocolId: "v4.2.21.17.3-decomposed-consensus",
  status: "deterministic-disagreements-extracted-audio-source-preparation-authorized",
  calibrationOnly: true,
  AIOnly: true,
  sourceJudgmentAnalysis: `${judgmentRoot}/analysis.json`,
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
    allEitherPassMediumAssessmentMovesIncluded: true,
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
  totals: { modelContexts: 0, audioCalls: 0, retries: 0, semanticRepairs: 0, scoresDerived: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  authorization: { audioSourcePreparation: true, audioVerificationExecution: false, adjudicationPacketPreparation: false, adjudicationModelExecution: false, finalLedgerAssembly: false, scoreDerivation: false, productionMutation: false, all195Debates: false }
};

if (shouldWrite) {
  await mkdir(path.resolve(V4221173_ROOT), { recursive: true });
  await writeFile(path.resolve(V4221173_ROOT, "audio-work-items.json"), `${JSON.stringify({ schemaVersion: "4.2.21.17.3-audio-work-items", protocolId: analysis.protocolId, status: "prepared-local-audio-work-items", moves: audioWorkItems, modelOrApiCallsMade: 0, authorization: { sourceAudioPreparation: true, audioVerification: false } }, null, 2)}\n`);
  await writeFile(path.resolve(V4221173_ROOT, "analysis.json"), `${JSON.stringify(analysis, null, 2)}\n`);
}

console.log(JSON.stringify({ status: analysis.status, debates, fieldCounts, triggerCounts, adjudicationWorkload: analysis.adjudicationWorkload, audioWorkload: analysis.audioWorkload, scoreBlindness: analysis.scoreBlindness, nextAuthorized: "audio-source-preparation" }, null, 2));
