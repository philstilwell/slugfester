#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { extractAssessmentProductionScoreStabilityV213Disagreements } from "./lib/assessment-production-score-stability-v2.1.3-disagreement.mjs";

const COHORT_ROOT =
  "docs/assessment-production/score-stability-v2.1.3-validation-cohort";
const JUDGMENT_ROOT = `${COHORT_ROOT}/independent-judgments`;
const ROOT = `${COHORT_ROOT}/disagreement-extraction`;
const EXPECTED_DEBATES = [
  "142",
  "181",
  "92",
  "172",
  "78",
  "20",
  "108",
  "29",
  "119",
  "28"
];
const EXPECTED_AUDIO = [
  "181:con-miracle-judgment-depends-on-priors",
  "181:pro-paul-bodily-transformation",
  "92:con-grim-reaper-temporal-mirror",
  "78:con-reformation-had-reform-precursors",
  "78:con-uncertain-single-catholic-lineage"
];
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
const analysis = JSON.parse(await readFile(`${ROOT}/analysis.json`, "utf8"));

assert.equal(
  analysis.status,
  "v2.1.3-deterministic-disagreements-extracted-audio-source-preparation-authorized"
);
assert.equal(analysis.productionCanary, false);
assert.equal(analysis.stagingOnly, true);
assert.equal(analysis.developmentValidationOnly, true);
assert.deepEqual(
  analysis.debates.map((debate) => debate.debateNumber),
  EXPECTED_DEBATES
);
assert.equal(
  analysis.debates.reduce((sum, debate) => sum + debate.moveCount, 0),
  189
);
assert.equal(analysis.adjudicationWorkload.totalMoves, 189);
assert.equal(
  analysis.adjudicationWorkload.candidateSelections,
  Object.values(analysis.fieldCounts).reduce((sum, count) => sum + count, 0) +
    analysis.adjudicationWorkload.burdenAdjustmentDisputes
);
assert.deepEqual(
  analysis.audioWorkload.queue.map(
    (item) => `${item.debateNumber}:${item.moveId}`
  ).sort(),
  [...EXPECTED_AUDIO].sort()
);
assert.equal(analysis.audioWorkload.moves, 5);
assert.equal(analysis.audioWorkload.independentGateQueueReproducedExactly, true);
assert.equal(analysis.audioWorkload.workItemsPrepared, false);
assert.equal(analysis.audioWorkload.sourceAudioPrepared, false);
assert.equal(analysis.audioWorkload.audioAccessed, false);
assert.equal(analysis.audioWorkload.verificationCompleted, false);
assert.equal(analysis.sourceJudgmentConfiguration.model, "gpt-5.6-sol");
assert.equal(analysis.sourceJudgmentConfiguration.reasoningEffort, "low");
assert.equal(
  analysis.sourceJudgmentConfiguration.authentication,
  "ChatGPT subscription"
);
assert.equal(analysis.sourceJudgmentConfiguration.scoreBlind, true);
assert.equal(analysis.sourceJudgmentConfiguration.retriesMaximum, 0);
assert.equal(analysis.sourceJudgmentConfiguration.timeoutExtensionsMaximum, 0);
assert.equal(analysis.scoreBlindness.debateScoresComputed, 0);
assert.equal(analysis.totals.scoresDerived, 0);
assert.equal(analysis.totals.modelContexts, 0);
assert.equal(analysis.totals.audioCalls, 0);
assert.equal(analysis.proposedPolicy.everyIntegerRoundedTieAccepted, true);
assert.equal(analysis.proposedPolicy.promoted, false);
assert.equal(analysis.authorization.audioSourcePreparation, true);
assert.equal(analysis.authorization.paidTranscription, false);
assert.equal(analysis.authorization.audioVerificationExecution, false);
assert.equal(analysis.authorization.adjudicationPacketPreparation, false);
assert.equal(analysis.authorization.scoreDerivation, false);
assert.equal(analysis.authorization.policyPromotion, false);
assert.equal(analysis.authorization.publicationFinalization, false);
assert.equal(analysis.authorization.productionMutation, false);
assert.equal(analysis.authorization.remainingProductionBatches, false);
assert.equal(
  analysis.nextAuthorizedAction,
  "prepare-five-v2.1.3-local-audio-source-work-items-model-free-only"
);

for (const [file, digest] of Object.entries(analysis.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `source hash mismatch: ${file}`);
}

for (const debate of analysis.debates) {
  const stored = JSON.parse(await readFile(debate.disagreementPath, "utf8"));
  const [primaryA, primaryB, lockedInventory] = await Promise.all([
    readFile(
      `${JUDGMENT_ROOT}/raw-outputs/pass-a/debate-${debate.debateNumber}.json`,
      "utf8"
    ).then(JSON.parse),
    readFile(
      `${JUDGMENT_ROOT}/raw-outputs/pass-b/debate-${debate.debateNumber}.json`,
      "utf8"
    ).then(JSON.parse),
    readFile(
      `${COHORT_ROOT}/inventory-chronology-fallback/locked-inventories/debate-${debate.debateNumber}.json`,
      "utf8"
    ).then(JSON.parse)
  ]);
  const replayed =
    extractAssessmentProductionScoreStabilityV213Disagreements(
      primaryA,
      primaryB,
      lockedInventory
    );
  assert.deepEqual(stored, replayed, `${debate.debateNumber}: replay mismatch`);
  assert.equal(stored.audit.uniqueMovesCompared, debate.moveCount);
  assert.equal(stored.audit.importanceComparedAsJudgmentField, true);
  assert.equal(stored.audit.eitherPassAssessmentBelowHighTriggersAudio, true);
  assert.equal(stored.audit.repositoryAttributionBelowHighTriggersAudio, true);
  assert.equal(stored.audit.audioWorkItemsPrepared, false);
  assert.equal(stored.audit.audioAccessed, false);
  assert.equal(stored.audit.aggregateOrDiagnosticScoresComputed, 0);
  assert.equal(stored.scoreDerivationAuthorized, false);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: 10,
      movesCompared: 189,
      disputedMoves: analysis.adjudicationWorkload.disputedMoves,
      candidateSelections: analysis.adjudicationWorkload.candidateSelections,
      audioVerificationMoves: EXPECTED_AUDIO,
      sourceHashesVerified: Object.keys(analysis.sourceHashes).length,
      deterministicDisagreementReplays: 10,
      audioWorkItemsPrepared: false,
      scoresDerived: 0,
      modelContexts: 0,
      meteredApiCostUsd: 0,
      transcriptionCostUsd: 0
    },
    null,
    2
  )
);
