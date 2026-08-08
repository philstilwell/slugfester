#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = "docs/calibration/v4.2.21.17.26/hard-route-disagreement-audio-prep";
const JUDGMENT_ANALYSIS = "docs/calibration/v4.2.21.17.25/hard-route-independent-judgments/analysis.json";
const analysis = JSON.parse(await readFile(`${ROOT}/analysis.json`, "utf8"));
const audio = JSON.parse(await readFile(`${ROOT}/audio-work-items.json`, "utf8"));
const judgment = JSON.parse(await readFile(JUDGMENT_ANALYSIS, "utf8"));

assert.equal(analysis.status, "hard-route-deterministic-disagreements-extracted-audio-source-preparation-authorized");
assert.deepEqual(analysis.debates.map((debate) => debate.debateNumber), ["51", "63", "90", "153", "165"]);
assert.equal(analysis.debates.reduce((sum, debate) => sum + debate.moveCount, 0), 100);
assert.equal(analysis.audioWorkload.moves, audio.moves.length);
assert.deepEqual(audio.moves.map((item) => `${item.debateNumber}:${item.moveId}`), [
  "153:move-con-04-undeliberated-voluntary-action",
  "153:move-con-05-reflexive-first-person-perspective",
  "153:move-pro-06-introspective-mechanism-gap",
]);
assert(audio.moves.every((item) => item.debateNumber === "153" && (item.trigger.eitherPassAssessmentBelowHigh || item.trigger.eitherPassAttributionBelowHigh) && item.audioVerificationRequiredBeforeAdjudication));
assert.deepEqual(audio.moves.map((item) => item.moveId).sort(), judgment.audioVerificationQueue.map((item) => item.moveId).sort());
assert.equal(analysis.triggerCounts.assessmentBelowHighAudioRequired, 3);
assert.equal(analysis.triggerCounts.attributionAudioRequired, 1);
assert.equal(analysis.audioWorkload.independentGateQueueReproducedExactly, true);
assert.equal(analysis.adjudicationWorkload.totalMoves, 100);
assert.equal(analysis.adjudicationWorkload.candidateSelections, Object.values(analysis.fieldCounts).reduce((sum, count) => sum + count, 0) + analysis.adjudicationWorkload.burdenAdjustmentDisputes);
assert.equal(analysis.scoreBlindness.debateScoresComputed, 0);
assert.equal(analysis.totals.scoresDerived, 0);
assert.equal(analysis.totals.modelContexts, 0);
assert.equal(analysis.authorization.audioSourcePreparation, true);
assert.equal(analysis.authorization.audioVerificationExecution, false);
assert.equal(analysis.authorization.adjudicationPacketPreparation, false);
assert.equal(analysis.authorization.scoreDerivation, false);
assert.equal(analysis.authorization.all195Debates, false);
for (const debate of analysis.debates) {
  const disagreements = JSON.parse(await readFile(debate.disagreementPath, "utf8"));
  assert.equal(disagreements.audit.uniqueMovesCompared, debate.moveCount);
  assert.equal(disagreements.audit.importanceComparedAsJudgmentField, true);
  assert.equal(disagreements.audit.eitherPassAssessmentBelowHighTriggersAudio, true);
  assert.equal(disagreements.audit.repositoryAttributionBelowHighTriggersAudio, true);
  assert.equal(disagreements.audit.aggregateOrDiagnosticScoresComputed, 0);
  assert.equal(disagreements.scoreDerivationAuthorized, false);
}

console.log(JSON.stringify({ status: "passed", debates: 5, movesCompared: 100, disputedMoves: analysis.adjudicationWorkload.disputedMoves, candidateSelections: analysis.adjudicationWorkload.candidateSelections, audioVerificationMoves: audio.moves.map((item) => `${item.debateNumber}:${item.moveId}`), scoresDerived: 0, modelContexts: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, null, 2));
