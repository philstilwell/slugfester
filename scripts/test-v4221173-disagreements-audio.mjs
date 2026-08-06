#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = "docs/calibration/v4.2.21.17.3/deterministic-disagreement-audio-prep";
const analysis = JSON.parse(await readFile(`${root}/analysis.json`, "utf8"));
const audio = JSON.parse(await readFile(`${root}/audio-work-items.json`, "utf8"));

assert.equal(analysis.status, "deterministic-disagreements-extracted-audio-source-preparation-authorized");
assert.deepEqual(analysis.debates.map((debate) => debate.debateNumber), ["133", "178", "182"]);
assert.equal(analysis.debates.reduce((sum, debate) => sum + debate.moveCount, 0), 54);
assert.equal(analysis.audioWorkload.moves, audio.moves.length);
assert.deepEqual(audio.moves.map((item) => item.moveId), ["con-justin-gospel-of-peter", "con-matthew-financial-vocabulary"]);
assert(audio.moves.every((item) => item.debateNumber === "178" && item.trigger.eitherPassAssessmentBelowHigh && item.audioVerificationRequiredBeforeAdjudication));
assert.equal(analysis.triggerCounts.mediumConfidenceAudioRequired, 2);
assert.equal(analysis.triggerCounts.attributionAudioRequired, 0);
assert.equal(analysis.fieldCounts.importancePair, 2);
assert.equal(analysis.scoreBlindness.debateScoresComputed, 0);
assert.equal(analysis.totals.scoresDerived, 0);
assert.equal(analysis.totals.modelContexts, 0);
assert.equal(analysis.authorization.audioSourcePreparation, true);
assert.equal(analysis.authorization.audioVerificationExecution, false);
for (const debate of analysis.debates) {
  const disagreements = JSON.parse(await readFile(debate.disagreementPath, "utf8"));
  assert.equal(disagreements.audit.uniqueMovesCompared, debate.moveCount);
  assert.equal(disagreements.audit.importanceComparedAsJudgmentField, true);
  assert.equal(disagreements.audit.mediumConfidenceFromEitherPassTriggersAudio, true);
  assert.equal(disagreements.audit.aggregateOrDiagnosticScoresComputed, 0);
  assert.equal(disagreements.scoreDerivationAuthorized, false);
}

console.log(JSON.stringify({ status: "passed", debates: 3, movesCompared: 54, disputedMoves: analysis.adjudicationWorkload.disputedMoves, candidateSelections: analysis.adjudicationWorkload.candidateSelections, audioVerificationMoves: audio.moves.map((item) => `${item.debateNumber}:${item.moveId}`), scoresDerived: 0, modelContexts: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, null, 2));
