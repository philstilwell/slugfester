#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { containsScoreField } from "./lib/v37-retired-semantic.mjs";
import { V381_DEBATE_NUMBERS, V381_ROOT, V38_SOURCE_AUDIT, assert } from "./lib/v381-source-preparation.mjs";
import { buildResolvedSourceDebate, resolveSourceFields, selectFinalMoves, validateSourceAdjudicationOutput } from "./lib/v381-source-execution.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const exists = async (file) => { try { await access(path.resolve(root, file)); return true; } catch { return false; } };
const [audit, disagreements, maps] = await Promise.all([readJson(V38_SOURCE_AUDIT), readJson(`${V381_ROOT}/initial-disagreements.json`), readJson(`${V381_ROOT}/adjudication-option-map.json`)]);
const audioPath = `${V381_ROOT}/audio-verification.json`;
const audio = await exists(audioPath) ? await readJson(audioPath) : { schemaVersion: "3.8.1-source-audio-verification", debates: {} };
const reports = [], finalDebates = [];
let pendingAudio = 0;

for (const debateNumber of V381_DEBATE_NUMBERS) {
  const packet = await readJson(`${V381_ROOT}/proposal/packets/debate-${debateNumber}.json`);
  const proposal = await readJson(`${V381_ROOT}/proposal/enriched-outputs/debate-${debateNumber}.json`);
  const reviewPacket = await readJson(`${V381_ROOT}/review/packets/debate-${debateNumber}.json`);
  const review = await readJson(`${V381_ROOT}/review/outputs/debate-${debateNumber}.json`);
  const events = await readJson(audit.debateSources[debateNumber].eventsPath);
  const dispute = disagreements.debates[debateNumber];
  let adjudication = { fields: [] };
  if (dispute.disagreementCount > 0) {
    const [adjudicationPacket, adjudicationSchema, output] = await Promise.all([readJson(dispute.adjudicationPacket), readJson(dispute.adjudicationSchema), readJson(dispute.adjudicationOutput)]);
    validateSourceAdjudicationOutput(output, adjudicationPacket, adjudicationSchema);
    adjudication = output;
  }
  const resolvedFields = resolveSourceFields(dispute.comparisons, adjudication, maps.debates[debateNumber]);
  const resolved = buildResolvedSourceDebate(packet, proposal, review, reviewPacket, resolvedFields, events);
  let debatePendingAudio = 0;
  for (const move of resolved.moves.filter((item) => item.audioVerificationRequired)) {
    const record = audio.debates?.[debateNumber]?.[move.moveId];
    if (!record) { pendingAudio += 1; debatePendingAudio += 1; continue; }
    assert(["confirmed", "corrected", "unresolved"].includes(record.result), `${move.moveId}: audio result invalid`);
    move.audioVerification = record;
    move.audioVerificationRequired = false;
    if (record.result === "unresolved") move.accepted = false;
    else {
      assert(packet.sides[record.side].speakers.includes(record.speaker), `${move.moveId}: audio speaker-side invalid`);
      move.speaker = record.speaker;
      move.side = record.side;
      move.attributionConfidence = "high";
    }
  }
  const selection = debatePendingAudio === 0 ? selectFinalMoves(resolved) : { eligibleMoveCount: 0, selected: [], combinationCount: 0 };
  const selectedMoveIds = selection.selected.map((item) => item.moveId);
  if (shouldWrite) {
    const resolvedPath = `${V381_ROOT}/resolved/debate-${debateNumber}.json`;
    await mkdir(path.dirname(path.resolve(root, resolvedPath)), { recursive: true });
    await writeFile(path.resolve(root, resolvedPath), `${JSON.stringify({ ...resolved, selectedMoveIds }, null, 2)}\n`);
  }
  finalDebates.push({ debateNumber, debateId: proposal.debateId, routes: resolved.routes, moves: selection.selected });
  reports.push({ debateNumber, debateId: proposal.debateId, comparisonFields: resolvedFields.length, initialAgreements: resolvedFields.filter((item) => item.agreed).length, initialDisagreements: resolvedFields.filter((item) => !item.agreed).length, finalTwoVoteFields: resolvedFields.filter((item) => item.finalVotes >= 2).length, unresolvedFields: resolvedFields.filter((item) => item.finalVotes < 2).length, proposedMoves: resolved.moves.length, acceptedMovesBeforeSelection: resolved.moves.filter((item) => item.accepted).length, requiredAudio: resolved.moves.filter((item) => item.audioVerification !== null || item.audioVerificationRequired).length, pendingAudio: debatePendingAudio, eligibleMovesAfterAudio: selection.eligibleMoveCount, validSelectionCombinations: selection.combinationCount, selectedMoves: selectedMoveIds.length });
}

const selected = finalDebates.flatMap((item) => item.moves);
const sourcePreparationPassed = pendingAudio === 0 && reports.every((item) => item.unresolvedFields === 0 && item.selectedMoves === 4) && selected.length === 12 && !containsScoreField(finalDebates);
const inventory = { schemaVersion: "3.8.1-heldout-source-inventory", status: sourcePreparationPassed ? "locked-source-inventory" : "source-inventory-incomplete", warning: "Provisional burden-contact values are AI source-preparation aids hidden from classifiers; they are not truth keys.", debateCount: finalDebates.length, selectedMoveCount: selected.length, debates: finalDebates };
const analysis = {
  schemaVersion: "3.8.1-heldout-source-preparation-analysis",
  status: sourcePreparationPassed ? "source-preparation-passed" : pendingAudio > 0 ? "awaiting-required-audio-verification" : "source-preparation-failed",
  analyzedAt: new Date().toISOString(),
  sourcePreparationPassed,
  debateReports: reports,
  totals: { debateCount: reports.length, comparisonFields: reports.reduce((sum, item) => sum + item.comparisonFields, 0), initialAgreements: reports.reduce((sum, item) => sum + item.initialAgreements, 0), initialDisagreements: reports.reduce((sum, item) => sum + item.initialDisagreements, 0), finalTwoVoteFields: reports.reduce((sum, item) => sum + item.finalTwoVoteFields, 0), unresolvedFields: reports.reduce((sum, item) => sum + item.unresolvedFields, 0), requiredAudioVerifications: reports.reduce((sum, item) => sum + item.requiredAudio, 0), pendingAudioVerifications: pendingAudio, selectedMoves: selected.length, scoringFields: containsScoreField(finalDebates) ? 1 : 0, paidTranscriptionCalls: 0, meteredApiCostUsd: 0 },
  decision: { classificationPacketConstructionPreregistrationAuthorized: sourcePreparationPassed, burdenContactClassificationModelExecutionAuthorized: false, numericalParticipantScoringAuthorized: false, assessmentProseAuthorized: false, benchmarkMutationAuthorized: false, productionMutationAuthorized: false, all195DebatesAuthorized: false },
  artifacts: { finalInventory: `${V381_ROOT}/final-source-inventory.json`, audioVerification: audioPath }
};
if (shouldWrite) {
  await writeFile(path.resolve(root, analysis.artifacts.finalInventory), `${JSON.stringify(inventory, null, 2)}\n`);
  await writeFile(path.resolve(root, `${V381_ROOT}/source-preparation-analysis.json`), `${JSON.stringify(analysis, null, 2)}\n`);
}
console.log(JSON.stringify({ status: analysis.status, sourcePreparationPassed, pendingAudioVerifications: pendingAudio, selectedMoves: selected.length, decision: analysis.decision }, null, 2));
