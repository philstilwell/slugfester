#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const ROOT = "docs/assessment-production/post-canary-continuation-v1";
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const SELECTION = "docs/assessment-production/production-checkpoint-v2.2-2/selection.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const [preparationBytes, analysisBytes] = await Promise.all([
  readFile(PREPARATION),
  readFile(ANALYSIS)
]);
const preparation = JSON.parse(preparationBytes);
const analysis = JSON.parse(analysisBytes);

assert.equal(
  preparation.status,
  "post-canary-continuation-plan-frozen-source-normalization-blockers-found"
);
assert.equal(
  analysis.status,
  "post-canary-continuation-analysis-passed-with-two-source-normalization-blockers"
);
assert.equal(analysis.preparation.path, PREPARATION);
assert.equal(analysis.preparation.bytes, preparationBytes.byteLength);
assert.equal(analysis.preparation.sha256, sha256(preparationBytes));
for (const [file, expected] of Object.entries(preparation.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), expected, `${file}: frozen source drifted`);
}
assert.deepEqual(preparation.corpusDisposition.counts, {
  publishedCanary: 10,
  acceptedCalibrationPendingPromotion: 5,
  excludedMultiSpeaker: 16,
  remainingPendingDyadic: 164,
  total: 195
});
assert.equal(preparation.completedCanary.acceptancePassed, true);
assert.equal(preparation.effectiveSourceAudit.sourceFilesExpected, 585);
assert.equal(preparation.effectiveSourceAudit.sourceFilesPresent, 585);
assert.equal(preparation.effectiveSourceAudit.originalManifestHashMatches, 582);
assert.equal(preparation.effectiveSourceAudit.approvedDebate167OverlayHashMatches, 3);
assert.equal(preparation.effectiveSourceAudit.effectiveHashMatches, 585);
assert.equal(preparation.effectiveSourceAudit.remainingPendingSourceFilesExact, 492);
assert.equal(preparation.remainingCanonicalEventAudit.debatesChecked, 164);
assert.equal(preparation.remainingCanonicalEventAudit.passed, 162);
assert.equal(preparation.remainingCanonicalEventAudit.failed, 2);
assert.deepEqual(
  preparation.remainingCanonicalEventAudit.failures.map((item) => item.debateNumber),
  ["88", "127"]
);
assert.equal(preparation.acceptedCalibrationLane.debates.length, 5);
assert.equal(preparation.acceptedCalibrationLane.artifactsHashMatched, 10);
assert.equal(preparation.continuationSelectionFinding.batchSelected, false);
assert.equal(preparation.continuationSelectionFinding.remainingPendingDyadic, 164);
assert.equal(preparation.continuationSelectionFinding.oldFreshOnlyEligible, 39);
assert.equal(preparation.continuationSelectionFinding.oldFreshOnlyStranded, 125);
assert.equal(preparation.continuationSelectionFinding.newFullCampaignSelectionPolicyRequired, true);
assert.equal(preparation.activeControls.assessmentModel, "5.6 Sol");
assert.equal(preparation.activeControls.reasoningEffort, "low");
assert.equal(preparation.activeControls.authentication, "ChatGPT subscription");
assert.equal(preparation.activeControls.scoreBlindnessRequired, true);
assert.equal(preparation.activeControls.roundedIntegerScoreTiesPermitted, true);
assert(Object.values(preparation.stopRules).every(Boolean));
assert.equal(preparation.totals.batchesSelected, 0);
assert.equal(preparation.totals.modelContexts, 0);
assert.equal(preparation.totals.scorePasses, 0);
assert.equal(preparation.totals.productionMutations, 0);
assert.equal(preparation.totals.meteredApiCostUsd, 0);
assert(Object.values(preparation.authorization).every((value) => value === false));
assert.equal(await exists(SELECTION), false);
assert.equal(analysis.decision.canonicalSourceGatePassed, false);
assert.equal(analysis.decision.batchSelectionAttempted, false);
assert.equal(analysis.decision.productionContinuationExecutionAuthorized, false);
assert.equal(
  preparation.nextAuthorizedAction,
  "user-decision-on-two-debate-source-normalization-repair-plan-preparation"
);

console.log(JSON.stringify({
  status: "passed",
  corpusDebates: 195,
  publishedCanary: 10,
  acceptedCalibrationPendingPromotion: 5,
  excludedMultiSpeaker: 16,
  remainingPendingDyadic: 164,
  effectiveSourceFiles: 585,
  canonicalSourceBlockers: ["88", "127"],
  batchesSelected: 0,
  modelContexts: 0,
  directCostUsd: 0,
  nextAuthorizedAction: preparation.nextAuthorizedAction
}, null, 2));
