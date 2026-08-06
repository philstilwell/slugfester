#!/usr/bin/env node
import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";

const root = "docs/calibration/v4.2.21.2/disagreement-audio-prep";
const [analysis, audio] = await Promise.all([readFile(`${root}/analysis.json`, "utf8").then(JSON.parse), readFile(`${root}/audio-work-items.json`, "utf8").then(JSON.parse)]);
assert.equal(analysis.status, "deterministic-disagreements-and-audio-work-prepared"); assert.equal(analysis.debates.length, 3); assert.equal(analysis.adjudicationWorkload.totalMoves, 34); assert.equal(analysis.adjudicationWorkload.disputedMoves, 34); assert.equal(analysis.scoreBlindness.diagnosticMoveScoresComputed, 0); assert.equal(analysis.scoreBlindness.debateScoresComputed, 0); assert.equal(analysis.authorization.audioVerificationExecution, false); assert.equal(audio.moves.length, 5); assert.equal(audio.modelOrApiCallsMade, 0); assert(audio.moves.every((move) => move.trigger.eitherPassBelowHigh && move.evidenceOwnership === "repository-rendered-from-locked-span-and-proposition" && move.clipWindow.startMs < move.clipWindow.endMs));
for (const debate of analysis.debates) { const disagreement = JSON.parse(await readFile(debate.disagreementPath, "utf8")); assert.equal(disagreement.audit.aggregateOrDiagnosticScoresComputed, 0); assert.equal(disagreement.audit.scoreBasedDisputeTriggers, 0); assert.equal(disagreement.scoreDerivationAuthorized, false); }
console.log(JSON.stringify({ status: "passed", debates: 3, moves: 34, disputedMoves: 34, candidateSelections: analysis.adjudicationWorkload.candidateSelections, audioMoves: 5, diagnosticOrAggregateScores: 0, modelContexts: 0, audioCalls: 0, scoresDerived: 0 }, null, 2));
