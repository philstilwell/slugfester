#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const ROOT = "docs/assessment-production/canary-v1-disagreement-audio-prep";
const EXPECTED_DEBATES = ["05", "13", "37", "64", "65", "81", "130", "138", "152", "188"];
const EXPECTED_AUDIO = [
  "05:pro-move-07",
  "130:con-gospel-mythmaking-indicators",
  "130:pro-schizotypal-profile-mismatch",
  "152:move-pro-objective-moral-ground"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [analysis, audio] = await Promise.all([
  readFile(`${ROOT}/analysis.json`, "utf8").then(JSON.parse),
  readFile(`${ROOT}/audio-work-items.json`, "utf8").then(JSON.parse)
]);

assert.equal(
  analysis.status,
  "production-canary-deterministic-disagreements-extracted-audio-source-preparation-authorized"
);
assert.equal(analysis.productionCanary, true);
assert.equal(analysis.stagingOnly, true);
assert.deepEqual(
  analysis.debates.map((debate) => debate.debateNumber),
  EXPECTED_DEBATES
);
assert.equal(
  analysis.debates.reduce((sum, debate) => sum + debate.moveCount, 0),
  186
);
assert.equal(analysis.audioWorkload.moves, 4);
assert.equal(analysis.audioWorkload.moves, audio.moves.length);
assert.deepEqual(
  audio.moves.map((item) => `${item.debateNumber}:${item.moveId}`).sort(),
  [...EXPECTED_AUDIO].sort()
);
assert(
  audio.moves.every(
    (item) =>
      (item.trigger.eitherPassAssessmentBelowHigh ||
        item.trigger.eitherPassAttributionBelowHigh) &&
      item.audioVerificationRequiredBeforeAdjudication
  )
);
assert.equal(analysis.triggerCounts.assessmentBelowHighAudioRequired, 4);
assert.equal(analysis.triggerCounts.attributionAudioRequired, 0);
assert.equal(analysis.audioWorkload.independentGateQueueReproducedExactly, true);
assert.equal(analysis.adjudicationWorkload.totalMoves, 186);
assert.equal(
  analysis.adjudicationWorkload.candidateSelections,
  Object.values(analysis.fieldCounts).reduce((sum, count) => sum + count, 0) +
    analysis.adjudicationWorkload.burdenAdjustmentDisputes
);
assert.equal(analysis.scoreBlindness.debateScoresComputed, 0);
assert.equal(analysis.totals.scoresDerived, 0);
assert.equal(analysis.totals.modelContexts, 0);
assert.equal(analysis.totals.audioCalls, 0);
assert.equal(analysis.authorization.audioSourcePreparation, true);
assert.equal(analysis.authorization.paidTranscription, false);
assert.equal(analysis.authorization.audioVerificationExecution, false);
assert.equal(analysis.authorization.adjudicationPacketPreparation, false);
assert.equal(analysis.authorization.scoreDerivation, false);
assert.equal(analysis.authorization.publicationFinalization, false);
assert.equal(analysis.authorization.productionMutation, false);
assert.equal(analysis.authorization.remainingProductionBatches, false);

for (const [file, digest] of Object.entries(analysis.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `source hash mismatch: ${file}`);
}
for (const debate of analysis.debates) {
  const disagreements = JSON.parse(await readFile(debate.disagreementPath, "utf8"));
  assert.equal(disagreements.audit.uniqueMovesCompared, debate.moveCount);
  assert.equal(disagreements.audit.importanceComparedAsJudgmentField, true);
  assert.equal(disagreements.audit.eitherPassAssessmentBelowHighTriggersAudio, true);
  assert.equal(disagreements.audit.repositoryAttributionBelowHighTriggersAudio, true);
  assert.equal(disagreements.audit.aggregateOrDiagnosticScoresComputed, 0);
  assert.equal(disagreements.scoreDerivationAuthorized, false);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: 10,
      movesCompared: 186,
      disputedMoves: analysis.adjudicationWorkload.disputedMoves,
      candidateSelections: analysis.adjudicationWorkload.candidateSelections,
      audioVerificationMoves: audio.moves.map(
        (item) => `${item.debateNumber}:${item.moveId}`
      ),
      sourceHashesVerified: Object.keys(analysis.sourceHashes).length,
      scoresDerived: 0,
      modelContexts: 0,
      meteredApiCostUsd: 0,
      transcriptionCostUsd: 0
    },
    null,
    2
  )
);
