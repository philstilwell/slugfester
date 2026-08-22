#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const stageRoot = "docs/assessment-production/post-canary-continuation-v1/batch-05/audio-verification";
const preparationPath = `${stageRoot}/execution-preparation-manifest.json`;
const expectedMoves = [
  "158:pro-case-specific-extraordinary-testimony-standard",
  "158:con-unverified-resurrection-prior",
  "158:con-no-presented-extrabiblical-support",
  "189:con-simple-laws-beneath-cell-complexity",
  "05:con-logical-grounding-burden",
  "05:pro-logic-reflects-gods-thinking"
];
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const preparation = JSON.parse(await readFile(preparationPath, "utf8"));

assert.equal(
  preparation.status,
  "prepared-six-post-canary-batch-05-paid-known-speaker-diarizations-standing-authorization-conditional-activation-ready"
);
assert.equal(preparation.productionCanary, false);
assert.equal(preparation.batchNumber, 5);
assert.equal(preparation.stagingOnly, true);
assert.equal(preparation.model, "gpt-4o-transcribe-diarize");
assert.equal(preparation.calls.length, 6);
assert.deepEqual(preparation.calls.map((call) => `${call.debateNumber}:${call.moveId}`), expectedMoves);
assert.deepEqual(preparation.scope.debates, ["158", "189", "05"]);
assert.equal(preparation.scope.frozenTargetClips, 6);
assert.equal(preparation.scope.verificationCalls, 6);
assert.equal(preparation.scope.sameDebateSpeakerSupportReferences, 6);
assert.deepEqual(preparation.scope.sourceCompatibility.occurrences, []);
assert.equal(preparation.referenceContract.references.length, 6);
assert.equal(preparation.referenceContract.referencesPerDebate, 2);
assert.equal(preparation.referenceContract.measuredBeforeExecution, true);
assert.deepEqual(preparation.referenceContract.enforcedAcceptedRangeSeconds, [2, 10]);
for (const call of preparation.calls) {
  assert.equal(call.knownSpeakers.length, 2);
  assert.equal(new Set(call.knownSpeakers.map((reference) => reference.speaker)).size, 2);
  assert.equal(sha256(await readFile(call.clipPath)), call.clipSha256);
  for (const reference of call.knownSpeakers) {
    assert(reference.actualDurationSeconds >= 2 && reference.actualDurationSeconds <= 10);
    assert.equal(sha256(await readFile(reference.localPath)), reference.sha256);
    assert(preparation.referenceContract.references.some((item) =>
      item.debateNumber === call.debateNumber && item.speaker === reference.speaker &&
      item.localPath === reference.localPath && item.sha256 === reference.sha256
    ));
  }
}
assert.equal(preparation.costEstimate.clipSeconds, 487.049);
assert.equal(preparation.costEstimate.clipMinutes, 8.1175);
assert.equal(preparation.costEstimate.primaryExpectedFutureExecutionCostUsd, 0.1780675);
assert.equal(preparation.costEstimate.maximumConditionallyAuthorizedCostUsd, 1);
assert.deepEqual(preparation.costEstimate.projectedUsage, {
  audioInputTokens: 9075,
  textInputTokens: 684,
  outputTokens: 15367,
  totalInputTokens: 9759
});
assert.deepEqual(preparation.costEstimate.officialPricePerMillionTokensUsd, { input: 2.5, output: 10 });
assert.equal(preparation.costEstimate.ChatGPTSubscriptionApplicable, false);
assert.equal(preparation.costEstimate.OpenAIApiBillingRequired, true);
assert.equal(preparation.costEstimate.conditionalAdvanceApprovalRecorded, true);
assert.equal(preparation.costEstimate.estimateWithinConditionalApproval, true);
assert.equal(preparation.executionPolicy.callsMaximum, 6);
assert.equal(preparation.executionPolicy.attemptsPerCall, 1);
assert.equal(preparation.executionPolicy.retriesMaximum, 0);
assert.equal(preparation.executionPolicy.sequentialExecution, true);
assert.equal(preparation.executionPolicy.stopRemainingAfterRequestLevelFailure, true);
assert.equal(preparation.executionPolicy.stopRemainingAfterUsageDerivedCapExceedance, true);
assert.equal(preparation.judgmentModelBoundary.judgmentModel, "5.6 Sol");
assert.equal(preparation.judgmentModelBoundary.reasoningEffort, "low");
assert.equal(preparation.judgmentModelBoundary.authentication, "ChatGPT subscription");
assert.equal(preparation.judgmentModelBoundary.scoreBlind, true);
assert.equal(preparation.judgmentModelBoundary.roundedIntegerScoreTiesPermitted, true);
assert.equal(preparation.activePolicy.version, "v2.2");
assert.equal(preparation.activePolicy.scorePassesMaximum, 1);
assert.equal(preparation.validatedInventoryContract.scoreFieldsAvailable, false);
assert.equal(preparation.authorization.paidTranscriptionActivation, true);
assert.equal(preparation.authorization.paidTranscriptionExecution, false);
assert.equal(preparation.authorization.adjudicationModelExecution, false);
assert.equal(preparation.authorization.scoreDerivation, false);
assert.equal(preparation.authorization.productionMutation, false);
assert.equal(preparation.authorization.nextBatchSelection, false);
assert.equal(preparation.stopRules.retryAuthorized, false);
assert.equal(preparation.stopRules.correctionAuthorized, false);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `source hash mismatch: ${file}`);
}
for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
  assert.equal(await exists(future), false, `future output exists: ${future}`);
}
assert.equal(
  preparation.nextAuthorizedAction,
  "activate-and-execute-six-batch-05-paid-audio-verification-calls-under-standing-authorization"
);

console.log(JSON.stringify({
  status: "passed-preactivation",
  debates: 3,
  calls: 6,
  references: 6,
  clipMinutes: preparation.costEstimate.clipMinutes,
  projectedUsage: preparation.costEstimate.projectedUsage,
  usageDerivedEstimateUsd: preparation.costEstimate.primaryExpectedFutureExecutionCostUsd,
  conditionalMaximumUsd: preparation.costEstimate.maximumConditionallyAuthorizedCostUsd,
  estimateWithinConditionalApproval: true,
  paidCalls: 0,
  retries: 0,
  scoresDerived: 0
}, null, 2));
