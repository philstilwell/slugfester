#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const ROOT = process.cwd();
const DIAGNOSIS_PATH =
  "docs/assessment-production/post-canary-continuation-v1/batch-03/audio-verification/failure-diagnosis.json";

function absolute(relativePath) {
  return `${ROOT}/${relativePath}`;
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), "utf8"));
}

function sha256File(relativePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(absolute(relativePath)))
    .digest("hex");
}

const diagnosis = readJson(DIAGNOSIS_PATH);

assert.equal(
  diagnosis.status,
  "frozen-three-batch-03-audio-unresolved-and-cost-decimal-mismatch-diagnosed",
);
assert.equal(diagnosis.checkpointCommit, "a84922345aa760f3a3c6f97f788fb8b02cc8a9c3");
assert.equal(diagnosis.batchNumber, 3);
assert.equal(diagnosis.evidenceBoundary.authorizedRecordCount, 5);
assert.equal(diagnosis.evidenceBoundary.validatorRecordCount, 4);
assert.equal(diagnosis.evidenceBoundary.transcriptRecordCount, 3);

for (const source of Object.values(diagnosis.evidenceBoundary.authorizedRecords)) {
  assert.equal(sha256File(source.path), source.sha256, `evidence hash: ${source.path}`);
}
for (const source of Object.values(diagnosis.evidenceBoundary.validatorRecords)) {
  assert.equal(sha256File(source.path), source.sha256, `validator hash: ${source.path}`);
}
for (const source of diagnosis.evidenceBoundary.transcriptRecords) {
  assert.equal(sha256File(source.path), source.sha256, `transcript hash: ${source.path}`);
}

assert.equal(diagnosis.executionRecord.callsPlanned, 8);
assert.equal(diagnosis.executionRecord.callsAttempted, 8);
assert.equal(diagnosis.executionRecord.callsCompleted, 8);
assert.equal(diagnosis.executionRecord.callsSkipped, 0);
assert.equal(diagnosis.executionRecord.retries, 0);
assert.equal(diagnosis.executionRecord.requestFailure, false);
assert.equal(diagnosis.executionRecord.costCapReachedOrExceeded, false);

assert.equal(diagnosis.attributionDiagnosis.requiredMoves, 8);
assert.equal(diagnosis.attributionDiagnosis.verifiedMoves, 5);
assert.equal(diagnosis.attributionDiagnosis.unresolvedMoves, 3);
assert.deepEqual(
  diagnosis.attributionDiagnosis.unresolved.map((item) => item.moveId),
  [
    "pro-rational-instruction-behavioral-limit",
    "pro-logic-presupposition-suffices",
    "con-reason-incarnation-access-gap",
  ],
);
assert.equal(diagnosis.attributionDiagnosis.allFullClipExcerptChecksPassed, true);
assert.equal(diagnosis.attributionDiagnosis.allExpectedSpeakerDurationChecksPassed, true);
assert.equal(diagnosis.attributionDiagnosis.expectedSpeakerExcerptRecallFailures, 3);
assert.equal(diagnosis.attributionDiagnosis.expectedSpeakerRecallDistinctnessFailures, 1);
assert.equal(diagnosis.attributionDiagnosis.transcriptOrSpeakerSemanticAccuracyDetermined, false);
assert.equal(diagnosis.attributionDiagnosis.providerCauseDetermined, false);
assert.equal(diagnosis.attributionDiagnosis.correctionApproachDetermined, false);

for (const item of diagnosis.attributionDiagnosis.unresolved) {
  assert.equal(item.executionCompleted, true);
  assert.equal(item.attemptCount, 1);
  assert.equal(item.retryCount, 0);
  assert.equal(item.statusPreserved, "unresolved");
  assert.equal(item.resolvedSpeakerPreserved, null);
  assert.equal(item.deterministicEvidence.checks.fullClipExcerptRecovered, true);
  assert.equal(item.deterministicEvidence.checks.expectedSpeakerExcerptRecovered, false);
  assert.equal(item.deterministicEvidence.checks.expectedSpeakerDurationSufficient, true);
}
assert.deepEqual(
  diagnosis.attributionDiagnosis.unresolved.map(
    (item) => item.deterministicEvidence.checks.expectedSpeakerRecallDistinct,
  ),
  [true, true, false],
);

assert.equal(
  diagnosis.costControlDiagnosis.classification,
  "binary-floating-point-serialization-mismatch-after-unrounded-per-call-aggregation",
);
assert.equal(diagnosis.costControlDiagnosis.exactCostRepresentation.integerUnits, 2452325);
assert.equal(diagnosis.costControlDiagnosis.exactCostRepresentation.exactDecimalUsd, 0.2452325);
assert.equal(diagnosis.costControlDiagnosis.executionRecordUsd, 0.2452325);
assert.equal(diagnosis.costControlDiagnosis.costRecordSerializedAggregateUsd, 0.24523250000000002);
assert.equal(diagnosis.costControlDiagnosis.sevenDecimalPlacesEqual, true);
assert.equal(diagnosis.costControlDiagnosis.strictEqualityEqual, false);
assert.equal(diagnosis.costControlDiagnosis.testMismatchEstablished, true);
assert.equal(diagnosis.costControlDiagnosis.mathematicalCostChanged, false);
assert.equal(diagnosis.costControlDiagnosis.approvedCapUsd, 1);
assert.equal(diagnosis.costControlDiagnosis.approvedCapExceeded, false);
assert.equal(diagnosis.costControlDiagnosis.capDispositionChanged, false);
assert.equal(diagnosis.costControlDiagnosis.repairOrNormalizationPerformed, false);

assert.equal(diagnosis.evidenceBoundary.transcriptBytesHashVerified, true);
assert.equal(diagnosis.evidenceBoundary.transcriptTextIncludedInDiagnosis, false);
assert.equal(diagnosis.evidenceBoundary.transcriptTextSemanticallyEvaluated, false);
assert.equal(diagnosis.preservedStopDisposition.audioVerificationGatePassed, false);
assert.equal(diagnosis.preservedStopDisposition.downstreamWorkflowBlocked, true);
assert.equal(diagnosis.preservedStopDisposition.repairPerformed, false);
assert.equal(diagnosis.preservedStopDisposition.validationResumed, false);

for (const [key, value] of Object.entries(diagnosis.executionBoundary)) {
  if (key === "directIncrementalCostUsdMaximum") continue;
  assert.equal(value, 0, `execution boundary ${key}`);
}
assert.equal(diagnosis.executionBoundary.directIncrementalCostUsdMaximum, 0);
for (const [key, value] of Object.entries(diagnosis.authorization)) {
  assert.equal(value, false, `authorization ${key}`);
}

assert.equal(
  sha256File(diagnosis.freezing.diagnosisToolPath),
  diagnosis.freezing.diagnosisToolSha256,
);
assert.equal(
  diagnosis.nextAuthorizedAction,
  "user-approval-required-before-any-batch-03-audio-verification-or-cost-control-correction-preparation-or-cohort-validation-resumption",
);

console.log(
  JSON.stringify(
    {
      status: "passed-frozen-diagnosis",
      unresolvedMoves: 3,
      verifiedMovesPreserved: 5,
      costMismatchClassification: diagnosis.costControlDiagnosis.classification,
      exactUsageDerivedEstimatedCostUsd:
        diagnosis.costControlDiagnosis.exactCostRepresentation.exactDecimalUsd,
      approvedCapExceeded: false,
      repairs: 0,
      models: 0,
      paidServices: 0,
      nextAuthorizedAction: diagnosis.nextAuthorizedAction,
    },
    null,
    2,
  ),
);
