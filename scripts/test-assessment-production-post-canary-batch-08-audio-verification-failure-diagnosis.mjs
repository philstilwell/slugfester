#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const diagnosisPath = "docs/assessment-production/post-canary-continuation-v1/batch-08/audio-verification/failure-diagnosis.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const diagnosis = JSON.parse(await readFile(diagnosisPath, "utf8"));

assert.equal(diagnosis.schemaVersion, "1.0-assessment-production-post-canary-batch-08-audio-verification-failure-diagnosis");
assert.equal(diagnosis.status, "frozen-three-batch-08-debate-156-audio-unresolved-diagnosed");
assert.equal(diagnosis.checkpointCommit, "c04289a3a043ff0d03b2623448f5d8bc988bd556");
assert.equal(diagnosis.batchNumber, 8);

assert.equal(diagnosis.executionRecord.callsPlanned, 6);
assert.equal(diagnosis.executionRecord.callsAttempted, 6);
assert.equal(diagnosis.executionRecord.callsCompleted, 6);
assert.equal(diagnosis.executionRecord.callsSkipped, 0);
assert.equal(diagnosis.executionRecord.retries, 0);
assert.equal(diagnosis.executionRecord.requestFailure, false);
assert.equal(diagnosis.executionRecord.costCapReachedOrExceeded, false);

assert.equal(diagnosis.correctionRecord.firstStructuralReplayPassed, false);
assert.equal(diagnosis.correctionRecord.finalStructuralReplayPassed, true);
assert.equal(diagnosis.correctionRecord.transcriptsValidated, 6);
assert.equal(diagnosis.correctionRecord.exactInMemoryOmissions, 2);
assert.equal(diagnosis.correctionRecord.transcriptsPreservedByteIdentically, true);
assert.equal(diagnosis.correctionRecord.validatorThresholdsChanged, false);
assert.equal(diagnosis.correctionRecord.structuralFailureRemaining, false);

assert.equal(diagnosis.attributionDiagnosis.requiredMoves, 6);
assert.equal(diagnosis.attributionDiagnosis.verifiedMoves, 3);
assert.equal(diagnosis.attributionDiagnosis.unresolvedMoves, 3);
assert.deepEqual(
  diagnosis.attributionDiagnosis.unresolved.map((item) => item.moveId),
  [
    "con-conscious-capacity-grounds-moral-distinctions",
    "con-conception-dogma-obstructs-abortion-inquiry",
    "pro-scripture-character-historical-progress",
  ],
);
assert.deepEqual(
  diagnosis.attributionDiagnosis.unresolved.map((item) => item.deterministicEvidence.expectedSpeakerExcerptRecallShortfall),
  [0.022222222222222, 0.091139240506329, 0.005128205128205],
);
for (const item of diagnosis.attributionDiagnosis.unresolved) {
  assert.equal(item.debateNumber, "156");
  assert.equal(item.executionCompleted, true);
  assert.equal(item.attemptCount, 1);
  assert.equal(item.retryCount, 0);
  assert.equal(item.statusPreserved, "unresolved");
  assert.equal(item.resolvedSpeakerPreserved, null);
  assert.deepEqual(item.deterministicEvidence.failedChecks, ["expectedSpeakerExcerptRecovered"]);
  assert.equal(item.deterministicEvidence.checks.fullClipExcerptRecovered, true);
  assert.equal(item.deterministicEvidence.checks.expectedSpeakerExcerptRecovered, false);
  assert.equal(item.deterministicEvidence.checks.expectedSpeakerRecallDistinct, true);
  assert.equal(item.deterministicEvidence.checks.expectedSpeakerDurationSufficient, true);
}
assert.equal(diagnosis.attributionDiagnosis.expectedSpeakerExcerptRecallFailures, 3);
assert.equal(diagnosis.attributionDiagnosis.transportFailures, 0);
assert.equal(diagnosis.attributionDiagnosis.responseSchemaFailures, 0);
assert.equal(diagnosis.attributionDiagnosis.requestFailures, 0);
assert.equal(diagnosis.attributionDiagnosis.costCapFailures, 0);
assert.equal(diagnosis.attributionDiagnosis.remainingTranscriptStructureFailures, 0);
assert.equal(diagnosis.attributionDiagnosis.transcriptOrSpeakerSemanticAccuracyDetermined, false);
assert.equal(diagnosis.attributionDiagnosis.providerCauseDetermined, false);
assert.equal(diagnosis.attributionDiagnosis.correctionApproachDetermined, false);

assert.equal(diagnosis.costControlDiagnosis.exactIntegerUnits, 1562250);
assert.equal(diagnosis.costControlDiagnosis.exactCostUsd, 0.156225);
assert.equal(diagnosis.costControlDiagnosis.approvedMaximumCostUsd, 1);
assert.equal(diagnosis.costControlDiagnosis.approvedCapExceeded, false);
assert.equal(diagnosis.costControlDiagnosis.requestFailure, false);
assert.equal(diagnosis.costControlDiagnosis.correctionRequired, false);

assert.equal(diagnosis.evidenceBoundary.transcriptHashesVerified, 3);
assert.equal(diagnosis.evidenceBoundary.transcriptStructureInspectedOnly, true);
assert.equal(diagnosis.evidenceBoundary.transcriptTextIncludedInDiagnosis, false);
assert.equal(diagnosis.evidenceBoundary.transcriptTextSemanticallyEvaluated, false);
assert.equal(diagnosis.preservedStopDisposition.audioVerificationGatePassed, false);
assert.equal(diagnosis.preservedStopDisposition.downstreamWorkflowBlocked, true);
assert.equal(diagnosis.preservedStopDisposition.repairPerformed, false);
assert.equal(diagnosis.preservedStopDisposition.mergePerformed, false);

for (const [key, value] of Object.entries(diagnosis.executionBoundary)) {
  assert.equal(value, 0, `execution boundary ${key}`);
}
for (const [key, value] of Object.entries(diagnosis.authorization)) {
  assert.equal(value, false, `authorization ${key}`);
}

for (const source of [
  ...Object.values(diagnosis.evidenceBoundary.records),
  ...Object.values(diagnosis.evidenceBoundary.protectedControls),
  ...diagnosis.evidenceBoundary.transcripts,
]) {
  assert.equal(sha256(await readFile(source.path)), source.sha256, `${source.path}: frozen hash changed`);
}
assert.equal(
  sha256(await readFile(diagnosis.freezing.diagnosisToolPath)),
  diagnosis.freezing.diagnosisToolSha256,
);
assert.equal(
  sha256(await readFile(diagnosis.freezing.validationToolPath)),
  diagnosis.freezing.validationToolSha256,
);
assert.equal(
  diagnosis.nextAuthorizedAction,
  "user-approval-required-before-any-batch-08-audio-verification-correction-preparation-result-merge-or-downstream-adjudication-work",
);

console.log(JSON.stringify({
  status: "passed-frozen-batch-08-audio-unresolved-diagnosis",
  unresolvedMoves: 3,
  soleFailedCheck: "expectedSpeakerExcerptRecovered",
  usageDerivedEstimatedCostUsd: 0.156225,
  approvedCapExceeded: false,
  transcriptsChanged: 0,
  validatorsChanged: 0,
  repairs: 0,
  models: 0,
  paidServices: 0,
  nextAuthorizedAction: diagnosis.nextAuthorizedAction,
}, null, 2));
