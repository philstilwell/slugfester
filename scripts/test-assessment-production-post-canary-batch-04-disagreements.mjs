#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";

import { extractAssessmentProductionPostCanaryBatch04Disagreements } from "./lib/assessment-production-post-canary-batch-04-disagreement.mjs";

const COHORT_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-04";
const JUDGMENT_ROOT = `${COHORT_ROOT}/independent-judgments`;
const ROOT = `${COHORT_ROOT}/disagreement-extraction`;
const EXPECTED_DEBATES = [
  "127",
  "67",
  "85",
  "49",
  "186",
  "81",
  "148",
  "47",
  "03",
  "185"
];
const EXPECTED_AUDIO = [
  "49:con-secular-moral-reasoning",
  "186:con-concepts-prior-causes-not-randomness",
  "81:con-necessary-physical-continuity",
  "81:con-necessity-stopping-point"
];
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
const analysis = JSON.parse(await readFile(`${ROOT}/analysis.json`, "utf8"));
const executionPreparation = JSON.parse(
  await readFile(`${JUDGMENT_ROOT}/execution-preparation-manifest.json`, "utf8")
);

assert.equal(
  analysis.status,
  "post-canary-batch-04-deterministic-disagreements-extracted-standing-authorization-active-for-audio-work"
);
assert.equal(analysis.developmentValidationOnly, false);
assert.equal(analysis.productionCanary, false);
assert.equal(analysis.batchNumber, 4);
assert.equal(analysis.stagingOnly, true);
assert.equal(analysis.userAuthorization.directIncrementalCostUsdMaximum, 0);
assert.equal(
  analysis.userAuthorization.acceptedIndependentJudgmentOutputsOnly,
  true
);
assert.equal(analysis.userAuthorization.disagreementExtractionAuthorized, true);
assert.equal(analysis.userAuthorization.localAudioWorkAuthorized, true);
assert.equal(analysis.standingAuthorization.disagreementExtractionAuthorized, true);
assert.equal(analysis.standingAuthorization.localAudioPreparationAuthorized, true);
assert.equal(
  analysis.inputBoundary.substantiveInputs,
  "twenty-accepted-independent-judgment-raw-outputs-only"
);
assert.equal(analysis.inputBoundary.lockedInventoriesUsedForPairValidationOnly, true);
assert.equal(analysis.inputBoundary.transcriptAccessed, false);
assert.equal(analysis.inputBoundary.eventsAccessed, false);
assert.equal(analysis.inputBoundary.manifestAccessed, false);
assert.deepEqual(
  analysis.debates.map((debate) => debate.debateNumber),
  EXPECTED_DEBATES
);
assert.equal(
  analysis.debates.reduce((sum, debate) => sum + debate.moveCount, 0),
  203
);
assert.equal(analysis.adjudicationWorkload.totalMoves, 203);
assert.equal(
  analysis.adjudicationWorkload.candidateSelections,
  Object.values(analysis.fieldCounts).reduce((sum, count) => sum + count, 0) +
    analysis.adjudicationWorkload.burdenAdjustmentDisputes
);
assert.equal(analysis.adjudicationWorkload.packetsPrepared, false);
assert.equal(analysis.adjudicationWorkload.modelContextsExecuted, 0);
assert.deepEqual(
  analysis.audioWorkload.queue
    .map((item) => `${item.debateNumber}:${item.moveId}`)
    .sort(),
  [...EXPECTED_AUDIO].sort()
);
assert.equal(analysis.audioWorkload.moves, EXPECTED_AUDIO.length);
assert.equal(analysis.audioWorkload.independentGateQueueReproducedExactly, true);
assert.equal(analysis.audioWorkload.workItemsPrepared, false);
assert.equal(analysis.audioWorkload.sourceAudioPrepared, false);
assert.equal(analysis.audioWorkload.audioAccessed, false);
assert.equal(analysis.audioWorkload.verificationCompleted, false);
assert.equal(analysis.audioWorkload.modelOrApiCallsMade, 0);
assert.equal(analysis.sourceJudgmentConfiguration.model, "gpt-5.6-sol");
assert.equal(analysis.sourceJudgmentConfiguration.reasoningEffort, "low");
assert.equal(
  analysis.sourceJudgmentConfiguration.authentication,
  "ChatGPT subscription"
);
assert.equal(analysis.sourceJudgmentConfiguration.scoreBlind, true);
assert.equal(
  analysis.sourceJudgmentConfiguration.roundedIntegerScoreTiesPermitted,
  true
);
assert.deepEqual(analysis.sourceJudgmentConfiguration.schedulerRamp, [1, 2]);
assert.equal(analysis.sourceJudgmentConfiguration.attemptsPerContext, 1);
assert.equal(analysis.sourceJudgmentConfiguration.retriesMaximum, 0);
assert.equal(analysis.sourceJudgmentConfiguration.timeoutExtensionsMaximum, 0);
assert.equal(analysis.sourceAcceptance.acceptedContexts, 20);
assert.equal(analysis.sourceAcceptance.rejectedContexts, 0);
assert.equal(analysis.sourceAcceptance.acceptedOutputHashReplays, 20);
assert.equal(analysis.sourceAcceptance.unchangedV4220ValidatorPasses, 20);
assert.equal(analysis.sourceAcceptance.sourceCompatibilityPreserved, true);
assert.equal(analysis.sourceAcceptance.semanticRepairs, 0);
assert.equal(
  analysis.sourceCompatibility.status,
  "all-source-rows-have-positive-repository-lexical-token-count"
);
assert.equal(analysis.sourceCompatibility.sourceRowsInjected, 0);
assert.equal(analysis.sourceCompatibility.sourceRowsOmitted, 0);
assert.equal(analysis.sourceCompatibility.sourceRowsRewritten, 0);
assert.equal(
  analysis.sourceCompatibility.minimumCandidateLexicalTokensChanged,
  false
);
assert.deepEqual(analysis.sourceCompatibility.occurrences, []);
assert.equal(analysis.scoreBlindness.debateScoresComputed, 0);
assert.equal(analysis.totals.scoresDerived, 0);
assert.equal(analysis.totals.modelContexts, 0);
assert.equal(analysis.totals.paidServiceCalls, 0);
assert.equal(analysis.totals.audioCalls, 0);
assert.equal(analysis.totals.adjudicationContexts, 0);
assert.equal(analysis.totals.publicationReconstructions, 0);
assert.equal(analysis.totals.productionMutations, 0);
assert.equal(analysis.totals.nextBatchSelections, 0);
assert.equal(analysis.totals.directIncrementalCostUsd, 0);
assert.equal(analysis.activePolicy.version, "v2.2");
assert.equal(
  analysis.activePolicy.agreedWinningSideMayCollapseToIntegerRoundedTie,
  true
);
assert.equal(analysis.activePolicy.scorePassesMaximum, 1);
assert.equal(analysis.validatedInventoryContract.scoreFieldsAvailable, false);
assert.equal(analysis.authorization.audioWorkPreparation, true);
assert.equal(
  Object.entries(analysis.authorization)
    .filter(([key]) => key !== "audioWorkPreparation")
    .every(([, value]) => value === false),
  true
);
assert.equal(
  analysis.nextAuthorizedAction,
  "prepare-freeze-and-analyze-batch-04-local-audio-source-work-items-under-standing-authorization"
);

for (const [file, digest] of Object.entries(analysis.sourceHashes)) {
  assert.equal(
    sha256(await readFile(file)),
    digest,
    `source hash mismatch: ${file}`
  );
}

for (const debate of analysis.debates) {
  const storedBytes = await readFile(debate.disagreementPath);
  assert.equal(
    sha256(storedBytes),
    debate.disagreementSha256,
    `${debate.debateNumber}: frozen disagreement hash mismatch`
  );
  const stored = JSON.parse(storedBytes);
  const context = executionPreparation.contexts.find(
    (item) =>
      item.debateNumber === debate.debateNumber && item.reviewerPass === "A"
  );
  const [primaryA, primaryB, lockedInventory] = await Promise.all([
    readFile(
      `${JUDGMENT_ROOT}/raw-outputs/pass-a/debate-${debate.debateNumber}.json`,
      "utf8"
    ).then(JSON.parse),
    readFile(
      `${JUDGMENT_ROOT}/raw-outputs/pass-b/debate-${debate.debateNumber}.json`,
      "utf8"
    ).then(JSON.parse),
    readFile(context.lockedInventory, "utf8").then(JSON.parse)
  ]);
  const replayed =
    extractAssessmentProductionPostCanaryBatch04Disagreements(
      primaryA,
      primaryB,
      lockedInventory
    );
  assert.deepEqual(stored, replayed, `${debate.debateNumber}: replay mismatch`);
  assert.equal(stored.audit.uniqueMovesCompared, debate.moveCount);
  assert.equal(stored.audit.importanceComparedAsJudgmentField, true);
  assert.equal(stored.audit.eitherPassAssessmentBelowHighTriggersAudio, true);
  assert.equal(stored.audit.repositoryAttributionBelowHighTriggersAudio, true);
  assert.equal(stored.audit.acceptedIndependentJudgmentOutputsOnly, true);
  assert.equal(stored.audit.audioWorkItemsPrepared, false);
  assert.equal(stored.audit.audioAccessed, false);
  assert.equal(stored.audit.adjudicationPrepared, false);
  assert.equal(stored.audit.adjudicationExecuted, false);
  assert.equal(stored.audit.aggregateOrDiagnosticScoresComputed, 0);
  assert.equal(stored.scoreDerivationAuthorized, false);
}

assert.deepEqual((await readdir(ROOT)).sort(), ["analysis.json", "disagreements"]);
assert.deepEqual(
  (await readdir(`${ROOT}/disagreements`)).sort(),
  EXPECTED_DEBATES.map((debate) => `debate-${debate}.json`).sort()
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: 10,
      acceptedContexts: 20,
      movesCompared: 203,
      disputedMoves: analysis.adjudicationWorkload.disputedMoves,
      candidateSelections: analysis.adjudicationWorkload.candidateSelections,
      audioVerificationMoves: EXPECTED_AUDIO,
      sourceHashesVerified: Object.keys(analysis.sourceHashes).length,
      frozenArtifactHashesVerified: 10,
      deterministicDisagreementReplays: 10,
      audioWorkItemsPrepared: false,
      adjudicationContexts: 0,
      scoresDerived: 0,
      modelContexts: 0,
      paidServiceCalls: 0,
      meteredApiCostUsd: 0,
      transcriptionCostUsd: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
