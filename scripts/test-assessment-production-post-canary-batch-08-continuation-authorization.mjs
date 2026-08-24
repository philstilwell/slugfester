#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const path = "docs/assessment-production/post-canary-continuation-v1/batch-08/continuation-standing-authorization.json";
const record = JSON.parse(await readFile(path, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(record.status, "frozen-active-batch-08-continuation-and-failure-recovery-standing-authorization");
assert.equal(record.checkpointCommit, "f238095b23e38d58fae65c1f36476a85f91cc6f8");
assert.equal(record.batchNumber, 8);
assert.deepEqual(record.selectedDebates, ["88", "194", "137", "08", "65", "140", "156", "120", "118", "145"]);
assert.equal(record.model.label, "5.6 Sol");
assert.equal(record.model.reasoningEffort, "low");
assert.equal(record.model.authentication, "ChatGPT subscription");
assert.deepEqual(record.currentFailure.moveIds, [
  "con-conscious-capacity-grounds-moral-distinctions",
  "con-conception-dogma-obstructs-abortion-inquiry",
  "pro-scripture-character-historical-progress",
]);
assert.equal(record.currentFailure.failedCheck, "expectedSpeakerExcerptRecovered");
assert.equal(record.currentFailure.deterministicTextOnlyRecoveryMustBeAttemptedFirst, true);
assert.equal(record.recoveryControls.boundedCorrectionLevelsPerUnderlyingProblemMaximum, 2);
assert.equal(record.recoveryControls.attemptsPerNewCorrection, 1);
assert.equal(record.recoveryControls.ordinaryRetriesMaximum, 0);
assert.equal(record.recoveryControls.publicationWritableFieldsPerPacketMaximum, 2);
assert.equal(record.executionControls.scorePassesMaximum, 1);
assert.equal(record.executionControls.modelAuthoredScoresAllowed, false);
assert.equal(record.executionControls.integerRoundedTiesPermitted, true);
assert.equal(record.costControls.priorUsageDerivedAudioCostUsd, 0.156225);
assert.equal(record.costControls.aggregateBatchEightPaidAudioMaximumUsd, 1);
assert.equal(record.costControls.maximumRemainingUsageDerivedAudioCostUsd, 0.843775);
assert.equal(record.costControls.otherPaidServicesAuthorized, false);
assert.equal(record.productionControls.mutableDebateNumbers.length, 10);
assert.equal(record.productionControls.referencesMustRemainByteIdentical, true);
assert.equal(record.automaticContinuation.whileEveryFrozenGatePasses, true);
assert.equal(record.stopRules.thirdCorrectionLevelOrThirdFailureSameUnderlyingProblemBlocks, true);
assert.equal(record.stopRules.batchNineSelectionBlocks, true);
assert.equal(sha256(record.authorizationSource.instruction), record.authorizationSource.instructionSha256);
assert.equal(record.authorizationSource.originalAttachmentSha256, "4d7cb5fa15a362d2953e93e2542c95e61b4afe0c631cb380a8ddd49e089064d3");
for (const [file, digest] of Object.entries(record.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash changed`);
}
assert.equal(
  record.nextAuthorizedAction,
  "prepare-freeze-validate-and-push-minimum-bounded-deterministic-debate-156-audio-resolution-plan",
);

console.log(JSON.stringify({
  status: "passed-active-batch-08-continuation-standing-authorization",
  selectedDebates: 10,
  unresolvedAudioMoves: 3,
  boundedCorrectionLevelsPerProblem: 2,
  aggregatePaidAudioMaximumUsd: 1,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: record.nextAuthorizedAction,
}, null, 2));
