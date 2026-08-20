#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const ROOT = process.cwd();
const PLAN_PATH =
  "docs/assessment-production/post-canary-continuation-v1/batch-03/audio-verification/correction-plan.json";

const sha256File = (path) =>
  crypto.createHash("sha256").update(fs.readFileSync(`${ROOT}/${path}`)).digest("hex");
const plan = JSON.parse(fs.readFileSync(`${ROOT}/${PLAN_PATH}`, "utf8"));

assert.equal(
  plan.status,
  "frozen-three-reference-and-cost-decimal-validation-overlay-plan-prepared",
);
assert.equal(plan.checkpointCommit, "681ee428214d2c413e11d470d85f800ef5004e2e");
assert.equal(plan.batchNumber, 3);
assert.equal(plan.diagnosedScope.preservedVerifiedMoves, 5);
assert.equal(plan.diagnosedScope.preservedUnresolvedMoves, 3);
assert.equal(plan.diagnosedScope.exactUsageDerivedEstimatedCostUsd, 0.2452325);
assert.equal(plan.diagnosedScope.approvedCapExceeded, false);

for (const [path, digest] of Object.entries(plan.sourceLocks)) {
  assert.equal(sha256File(path), digest, `source hash: ${path}`);
}
for (const item of plan.transcriptLocks) {
  assert.equal(sha256File(item.path), item.sha256, `transcript hash: ${item.moveId}`);
}

assert.equal(plan.proposedReferenceOverlays.length, 3);
assert.deepEqual(
  plan.proposedReferenceOverlays.map((item) => item.targetMoveId),
  [
    "pro-rational-instruction-behavioral-limit",
    "pro-logic-presupposition-suffices",
    "con-reason-incarnation-access-gap",
  ],
);
assert.deepEqual(
  plan.proposedReferenceOverlays.map((item) => item.replacementLexicalTokenCount),
  [13, 16, 15],
);
for (const item of plan.proposedReferenceOverlays) {
  assert.equal(item.field, "verificationExcerpt");
  assert.equal(item.replacementIsExactSubstringOfOriginal, true);
  assert.equal(item.nonauthoritativePlanningProjection.calculationPerformed, true);
  assert.equal(item.nonauthoritativePlanningProjection.acceptedAttributionStatusChanged, false);
  assert.equal(item.nonauthoritativePlanningProjection.validatorFunctionInvocations, 0);
  assert.equal(item.nonauthoritativePlanningProjection.expectedSpeakerExcerptRecall, 1);
  assert.equal(item.nonauthoritativePlanningProjection.frozenThresholdsSatisfiedNumerically, true);
  assert.equal(item.nonauthoritativePlanningProjection.semanticSpeakerIdentityProved, false);
  assert.equal(item.originalRequestWrite, false);
  assert.equal(item.originalTranscriptWrite, false);
  assert.equal(item.validatorWrite, false);
  assert.equal(item.thresholdWrite, false);
  assert.equal(item.correctionExecutedThisStage, false);
}

assert.equal(
  plan.referenceDeltaInventoryDigest,
  "6bcbbc896cf586ca3fc2200da3619551170857a463b1d5c8245b8170f0c645c8",
);
assert.equal(
  plan.proposedCostValidationOverlay.deltaSha256,
  "49296f458e54c51db80382b7d426db0f13e9d3133c14683744fd5b0aba3adf95",
);
assert.equal(
  plan.completeCorrectionDigest,
  "bcfe5e3bbd1807acb67f6199cb138c3cf637b079c0754ed6efc0974cbcbbba06",
);
assert.equal(plan.proposedCostValidationOverlay.exactIntegerUnits, 2452325);
assert.equal(plan.proposedCostValidationOverlay.exactCostUsd, 0.2452325);
assert.equal(plan.proposedCostValidationOverlay.preservedSerializedCostUsd, 0.24523250000000002);
assert.equal(plan.proposedCostValidationOverlay.normalizedValuesEqual, true);
assert.equal(plan.proposedCostValidationOverlay.mathematicalCostChanged, false);
assert.equal(plan.proposedCostValidationOverlay.capDispositionChanged, false);
assert.equal(plan.proposedCostValidationOverlay.originalCostRecordWrite, false);
assert.equal(plan.proposedCostValidationOverlay.overlayExecutedThisStage, false);

assert.equal(plan.planningConclusion.semanticSpeakerIdentityIndependentlyProved, false);
assert.equal(plan.planningConclusion.providerLabelCorrectnessEstablished, false);
assert.equal(plan.planningConclusion.acceptedResultChanged, false);
assert.equal(plan.futureExecutionContract.separateExplicitUserApprovalRequired, true);
assert.equal(plan.futureExecutionContract.deterministicCorrectionPassesMaximum, 1);
assert.equal(plan.futureExecutionContract.retriesMaximum, 0);
assert.equal(plan.futureExecutionContract.rerunsMaximum, 0);
assert.equal(plan.futureExecutionContract.exactEightTranscriptCohortReplayRequired, true);
assert.equal(plan.futureExecutionContract.allOriginalTranscriptsMustRemainByteIdentical, true);
assert.equal(plan.futureExecutionContract.originalExecutionAuditAnalysisAndCostRecordsMustRemainByteIdentical, true);
assert.equal(plan.futureExecutionContract.audioAccessAllowed, false);
assert.equal(plan.futureExecutionContract.transcriptionOrOtherModelExecutionAllowed, false);
assert.equal(plan.futureExecutionContract.paidServiceUseAllowed, false);

assert.equal(plan.executionBoundary.correctionPlansPrepared, 1);
assert.equal(plan.executionBoundary.executionHarnessesPrepared, 0);
assert.equal(plan.executionBoundary.correctionPassesExecuted, 0);
assert.equal(plan.executionBoundary.cohortValidationPassesExecuted, 0);
for (const [key, value] of Object.entries(plan.executionBoundary)) {
  if (key === "correctionPlansPrepared") continue;
  assert.equal(value, 0, `execution boundary ${key}`);
}
for (const [key, value] of Object.entries(plan.authorization)) {
  assert.equal(value, false, `authorization ${key}`);
}
for (const [path, digest] of Object.entries(plan.preparationToolLocks)) {
  assert.equal(sha256File(path), digest, `preparation tool hash: ${path}`);
}
assert.equal(
  plan.nextAuthorizedAction,
  "user-approval-required-before-preparing-the-exact-batch-03-audio-verification-correction-execution-harness-and-activation-manifest",
);

console.log(
  JSON.stringify(
    {
      status: "passed-frozen-correction-plan",
      referenceOverlaysPrepared: 3,
      costValidationOverlaysPrepared: 1,
      correctionsExecuted: 0,
      cohortReplays: 0,
      models: 0,
      paidServices: 0,
      directIncrementalCostUsd: 0,
      nextAuthorizedAction: plan.nextAuthorizedAction,
    },
    null,
    2,
  ),
);
