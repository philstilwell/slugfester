#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V4220_ROOT } from "./lib/v4220-source-span-rendering.mjs";
import { V4221_ROOT, buildV4221AudioWorkItems, extractV4221Disagreements, reconstructV4221PassB } from "./lib/v4221-pass-b-consensus.mjs";
import { V42211_ROOT, reconstructV42211PassB } from "./lib/v42211-charity-closure.mjs";

const shouldWrite = process.argv.includes("--write");
const root = "docs/calibration/v4.2.21.2/disagreement-audio-prep";
const combined = JSON.parse(await readFile(`${V42211_ROOT}/combined-pass-b-index.json`, "utf8"));
assertV4(combined.status === "three-accepted-independent-pass-b-outputs-locked" && combined.authorization.disagreementExtraction, "v4.2.21.2 extraction unauthorized");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const debates = [], audioWorkItems = [];
const fieldCounts = Object.fromEntries(["attributionPair", "responsePair", "charityPair", "assessmentConfidencePair", "logicalCoherence", "evidenceWarrant", "relevanceBurden", "representationalCharity", "precisionClarity", "epistemicCalibration"].map((key) => [key, 0]));
const triggerCounts = { responseStructureMismatch: 0, materialWithinClassResponsiveness: 0, burdenContactMismatch: 0, precisionFindingsMismatch: 0, calibrationFindingsMismatch: 0, attributionConfidenceMismatch: 0, charityTestedMismatch: 0, assessmentConfidenceMismatch: 0 };
for (const debateNumber of ["27", "188", "195"]) {
  const primaryPath = `${V4220_ROOT}/primary-outputs/debate-${debateNumber}.json`, packetPath = `${V4221_ROOT}/packets/debate-${debateNumber}.json`, sourcePacketPath = `${V4220_ROOT}/packets/debate-${debateNumber}.json`, passBPath = debateNumber === "195" ? `${V42211_ROOT}/pass-b-output/debate-195.json` : `${V4221_ROOT}/pass-b-outputs/debate-${debateNumber}.json`;
  const [primary, packet, sourcePacket, passB, eventsBytes] = await Promise.all([readFile(primaryPath, "utf8").then(JSON.parse), readFile(packetPath, "utf8").then(JSON.parse), readFile(sourcePacketPath, "utf8").then(JSON.parse), readFile(passBPath, "utf8").then(JSON.parse), readFile(JSON.parse(await readFile(sourcePacketPath, "utf8")).sourceChain.eventsPath)]);
  const events = JSON.parse(eventsBytes), reconstructed = debateNumber === "195" ? reconstructV42211PassB(packet, passB) : reconstructV4221PassB(packet, passB), disagreements = extractV4221Disagreements(primary, reconstructed);
  for (const dispute of disagreements.moveDisputes) {
    for (const key of ["attributionPair", "responsePair", "charityPair", "assessmentConfidencePair"]) fieldCounts[key] += Number(dispute.candidates[key] !== null);
    for (const key of Object.keys(dispute.candidates.scoringFields)) fieldCounts[key] += 1;
    triggerCounts.responseStructureMismatch += Number(dispute.triggers.responseStructureMismatch);
    triggerCounts.materialWithinClassResponsiveness += Number(dispute.triggers.responsivenessWithinClassDelta > 5);
    triggerCounts.burdenContactMismatch += Number(dispute.triggers.burdenContactMismatch);
    triggerCounts.precisionFindingsMismatch += Number(dispute.triggers.precisionFindingsMismatch);
    triggerCounts.calibrationFindingsMismatch += Number(dispute.triggers.calibrationFindingsMismatch);
    triggerCounts.attributionConfidenceMismatch += Number(dispute.triggers.attributionConfidenceMismatch);
    triggerCounts.charityTestedMismatch += Number(dispute.triggers.charityTestedMismatch);
    triggerCounts.assessmentConfidenceMismatch += Number(dispute.triggers.assessmentConfidenceMismatch);
  }
  const audio = buildV4221AudioWorkItems(primary, reconstructed, packet, events).map((item) => {
    const start = events[item.sourceSpan.startEvent], end = events[item.sourceSpan.endEvent];
    return { debateNumber, debateId: primary.debateId, sourceVideoId: sourcePacket.sourceChain.localManifestPath.split("/").at(-2), ...item, clipWindow: { startMs: Math.max(0, start.startMs - 2500), endMs: end.startMs + end.durationMs + 2500, paddingMs: 2500 }, sourceChain: structuredClone(sourcePacket.sourceChain) };
  });
  audioWorkItems.push(...audio);
  const disputePath = `${root}/disagreements/debate-${debateNumber}.json`;
  if (shouldWrite) { await mkdir(path.dirname(path.resolve(disputePath)), { recursive: true }); await writeFile(path.resolve(disputePath), `${JSON.stringify(disagreements, null, 2)}\n`); }
  debates.push({ debateNumber, debateId: primary.debateId, moveCount: primary.moves.length, disputedMoves: disagreements.moveDisputes.length, nondisputedScalarMerges: disagreements.nondisputedScalarMerges.length, burdenAdjustmentDisputes: disagreements.burdenAdjustmentDisputes.length, audioVerificationMoves: audio.map((item) => item.moveId), disagreementPath: disputePath });
}
const candidateSelections = Object.values(fieldCounts).reduce((sum, count) => sum + count, 0) + debates.reduce((sum, debate) => sum + debate.burdenAdjustmentDisputes, 0);
const analysis = { schemaVersion: "4.2.21.2-disagreement-audio-preparation", protocolId: "v4.2.21-source-span-consensus", status: "deterministic-disagreements-and-audio-work-prepared", calibrationOnly: true, AIOnly: true, sourceCombinedPassBIndex: `${V42211_ROOT}/combined-pass-b-index.json`, debates, fieldCounts, triggerCounts, adjudicationWorkload: { disputedMoves: debates.reduce((sum, debate) => sum + debate.disputedMoves, 0), totalMoves: debates.reduce((sum, debate) => sum + debate.moveCount, 0), disputedMoveRate: Number((debates.reduce((sum, debate) => sum + debate.disputedMoves, 0) / debates.reduce((sum, debate) => sum + debate.moveCount, 0)).toFixed(4)), candidateSelections, burdenAdjustmentDisputes: debates.reduce((sum, debate) => sum + debate.burdenAdjustmentDisputes, 0), oneAdjudicationContextPerDebateSufficient: true }, audioWorkload: { moves: audioWorkItems.length, debates: [...new Set(audioWorkItems.map((item) => item.debateNumber))], modelOrApiCallsMade: 0, sourceAudioPrepared: false, diarizedVerificationCompleted: false }, scoreBlindness: { diagnosticMoveScoresComputed: 0, weightedMoveScoresComputed: 0, sectionScoresComputed: 0, sideScoresComputed: 0, debateScoresComputed: 0, scoreBasedTriggers: 0 }, totals: { modelContexts: 0, audioCalls: 0, retries: 0, corrections: 0, scoresDerived: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, authorization: { audioSourcePreparation: true, audioVerificationExecution: false, adjudicationPacketPreparation: false, adjudicationModelExecution: false, finalLedgerAssembly: false, scoreDerivation: false, productionMutation: false, all195Debates: false } };
if (shouldWrite) { await mkdir(path.resolve(root), { recursive: true }); await writeFile(path.resolve(root, "audio-work-items.json"), `${JSON.stringify({ schemaVersion: "4.2.21.2-audio-work-items", protocolId: analysis.protocolId, status: "prepared-repository-owned-audio-work-items", moves: audioWorkItems, modelOrApiCallsMade: 0, authorization: { sourceAudioPreparation: true, diarizedAudioVerification: false } }, null, 2)}\n`); await writeFile(path.resolve(root, "analysis.json"), `${JSON.stringify(analysis, null, 2)}\n`); }
console.log(JSON.stringify({ status: analysis.status, debates, fieldCounts, triggerCounts, adjudicationWorkload: analysis.adjudicationWorkload, audioWorkload: analysis.audioWorkload, scoreBlindness: analysis.scoreBlindness, meteredApiCostUsd: 0, nextAuthorized: "audio-source-preparation" }, null, 2));
