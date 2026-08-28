#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

import {
  POST_CANARY_BATCH_17_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch17StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-17-standing-authorization.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const { record, bytes } =
  await loadAndValidatePostCanaryBatch17StandingAuthorization();
const SOURCE_PACKET_COMMIT = "ebcab73d49e4bf66813770266527d45acc0eaec4";
assert.equal(record.sourcePacketCommit, SOURCE_PACKET_COMMIT);
execFileSync("git", ["merge-base", "--is-ancestor", SOURCE_PACKET_COMMIT, "HEAD"]);
execFileSync("git", ["merge-base", "--is-ancestor", record.checkpointCommit, "HEAD"]);
assert.equal(record.authorizedSequence.length, 11);
assert.deepEqual(record.selectedDebates, ["77", "44", "171", "62"]);
assert.equal(record.userAuthorization.supersedesPerStageUserApprovalPausesWithinFrozenScope, true);
assert.equal(record.userAuthorization.preservesAllContentValidationCostAndFailureStops, true);
assert.equal(record.executionControls.automaticContinuationOnlyAfterPassingGate, true);
assert.equal(record.executionControls.separateFrozenActivationArtifactRequired, true);
assert.equal(record.authorization.commitAndPushPassingCheckpoints, true);
assert.equal(record.authorization.productionMutation, true);
assert.equal(record.authorization.conditionalPaidAudioVerification, true);
assert.equal(record.authorization.verifiedPublicSourceRecovery, true);
assert.equal(record.authorization.nextBatchSelection, false);
assert.equal(record.costBoundary.conditionalPaidAudioMaximumUsd, 1);
assert.equal(record.sourcePreparation.frozenDiscoveryContexts, 17);
assert.equal(record.audioRecoveryControls.primaryPaidAttemptPerRequiredFrozenClip, 1);
assert.equal(record.audioRecoveryControls.successfulCallsMayNotRepeat, true);
assert.equal(record.audioRecoveryControls.transportOrServiceInterruptionReplacementAttemptsMaximumPerClip, 1);
assert.equal(record.audioRecoveryControls.finalSplitSubclipsMaximum, 2);
assert.equal(record.audioRecoveryControls.otherPaidRetriesAllowed, false);
assert.equal(record.audioRecoveryControls.unresolvedAttributionFreshShardAttemptsMaximum, 2);
assert.equal(record.renderingControls.screenshotsRequiredForFinalShortBatch, 16);
assert.equal(record.recoveryControls.boundedFirstRecoveryAuthorized, true);
assert.equal(record.recoveryControls.recoveryAttemptsPerFailedContextMaximum, 2);
assert.equal(record.recoveryControls.recoveryLevelsMaximum, 2);
assert.equal(record.recoveryControls.recursiveCorrectionsMaximum, 1);
assert.equal(record.recoveryControls.failedPartialOutputReusable, false);
assert.equal(record.recoveryControls.eachOriginalFieldAcceptedExactlyOnce, true);
assert.equal(record.atomicShardPreservationGapStandingAuthorization.sameFailureMechanismRequired, true);
assert.equal(record.atomicShardPreservationGapStandingAuthorization.minimumFreshFieldDisjointShardsRequired, true);
assert.equal(record.atomicShardPreservationGapStandingAuthorization.attemptsPerShardMaximum, 1);
assert.equal(record.atomicShardPreservationGapStandingAuthorization.retriesMaximum, 0);
assert.equal(record.atomicShardPreservationGapStandingAuthorization.scorePassRerunAllowed, false);
assert.equal(record.atomicShardPreservationGapStandingAuthorization.ordinaryRecoveryLevelsMaximum, 2);
assert.equal(record.atomicShardPreservationGapStandingAuthorization.exceptionalRecoveryLevel, 3);
assert.equal(record.atomicShardPreservationGapStandingAuthorization.recoverOnlyUnavailableFields, true);
assert.equal(record.atomicShardPreservationGapStandingAuthorization.fourthRecoveryLevelAllowed, false);
assert.equal(record.deterministicCorrectionControls.exactCorrectionRequired, true);
assert.equal(record.deterministicCorrectionControls.scorePassRerunAllowed, false);
assert.equal(record.renderingControls.controllerOrServerStartupFailureBeforeAnyViewportDoesNotCountAsViewportRetry, true);
assert.equal(record.sourceRecoveryControls.redirectsMaximumPerNonOverlappingRange, 3);
assert.equal(record.sourceRecoveryControls.automaticTransportRetriesMaximum, 0);
assert.equal(record.sourceRecoveryControls.repeatedByteRangesAllowed, false);
assert.equal(record.gitControls.forcePushAllowed, false);
assert.equal(record.gitControls.localRemoteCommitEqualityVerificationRequired, true);
assert.equal(Object.values(record.cleanupControls).every(Boolean), true);
assert.equal(
  sha256(await readFile(POST_CANARY_BATCH_17_STANDING_AUTHORIZATION)),
  sha256(bytes)
);
console.log(
  JSON.stringify(
    {
      status: "passed-active-batch-17-standing-authorization",
      authorizedStages: record.authorizedSequence.length,
      selectedDebates: record.selectedDebates,
      sourceHashes: Object.keys(record.sourceHashes).length,
      model: record.model,
      attemptsPerContextOrPass: 1,
      retriesMaximum: 0,
      rerunsMaximum: 0,
      conditionalPaidAudioMaximumUsd: 1,
      productionMutationAuthorized: true,
      nextBatchSelectionAuthorized: false
    },
    null,
    2
  )
);
