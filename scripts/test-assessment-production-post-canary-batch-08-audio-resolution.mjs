#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const path = "docs/assessment-production/post-canary-continuation-v1/batch-08/audio-verification/resolution-plan.json";
const plan = JSON.parse(await readFile(path, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(plan.status, "frozen-three-debate-156-transient-verification-reference-overlays-prepared-not-executed");
assert.equal(plan.checkpointCommit, "3ab62925d5ef94149fe3069227a4783a52731f7f");
assert.equal(plan.batchNumber, 8);
assert.equal(plan.diagnosedScope.preservedVerifiedMoves, 3);
assert.equal(plan.diagnosedScope.preservedUnresolvedMoves, 3);
assert.equal(plan.diagnosedScope.soleFailedCheck, "expectedSpeakerExcerptRecovered");
assert.equal(plan.transcriptLocks.length, 6);
assert.equal(plan.proposedReferenceOverlays.length, 3);
assert.deepEqual(plan.proposedReferenceOverlays.map((item) => item.targetMoveId), [
  "con-conscious-capacity-grounds-moral-distinctions",
  "con-conception-dogma-obstructs-abortion-inquiry",
  "pro-scripture-character-historical-progress",
]);
for (const overlay of plan.proposedReferenceOverlays) {
  assert.equal(overlay.targetDebateNumber, "156");
  assert.equal(overlay.operation, "replace-only-transient-verification-reference");
  assert(overlay.replacementLexicalTokenCount >= 1 && overlay.replacementLexicalTokenCount <= 18);
  assert.equal(overlay.replacementIsExactSubstringOfOriginal, true);
  assert.equal(overlay.nonauthoritativePlanningProjection.expectedSpeakerExcerptRecall, 1);
  assert(overlay.nonauthoritativePlanningProjection.expectedSpeakerRecallMargin >= 0.15);
  assert.equal(overlay.nonauthoritativePlanningProjection.semanticSpeakerIdentityProved, false);
  assert.equal(overlay.originalRequestWrite, false);
  assert.equal(overlay.originalTranscriptWrite, false);
  assert.equal(overlay.referenceAudioWrite, false);
  assert.equal(overlay.validatorWrite, false);
  assert.equal(overlay.thresholdWrite, false);
  assert.equal(overlay.correctionExecutedThisStage, false);
}
assert.equal(plan.preservedStructuralValidationOverlay.targetMoveId, "con-conscious-capacity-grounds-moral-distinctions");
assert.deepEqual(plan.preservedStructuralValidationOverlay.originalSegmentIndices, [33, 52]);
assert.equal(plan.futureExecutionContract.deterministicCorrectionPassesMaximum, 1);
assert.equal(plan.futureExecutionContract.completeSixTranscriptCohortReplaysMaximum, 1);
assert.equal(plan.futureExecutionContract.retriesMaximum, 0);
assert.equal(plan.futureExecutionContract.noAudioAccess, true);
assert.equal(plan.futureExecutionContract.noModelOrPaidServiceCall, true);
assert.equal(plan.preservedPaidExecution.newPaidCallsThisStage, 0);
for (const [key, value] of Object.entries(plan.executionBoundary)) {
  if (key === "correctionPlansPrepared") assert.equal(value, 1);
  else assert.equal(value, 0, `execution boundary ${key}`);
}
for (const [file, digest] of Object.entries({ ...plan.sourceLocks, ...plan.sourceHashes })) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash changed`);
}
assert.equal(
  plan.nextAuthorizedAction,
  "prepare-hash-lock-and-activate-one-batch-08-deterministic-audio-resolution-pass-under-continuation-standing-authorization",
);

console.log(JSON.stringify({
  status: "passed-frozen-batch-08-audio-resolution-plan",
  overlays: 3,
  completeCohortSize: 6,
  audioAccesses: 0,
  modelOrApiCalls: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: plan.nextAuthorizedAction,
}, null, 2));
