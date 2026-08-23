#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

import {
  POST_CANARY_BATCH_07_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch07StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-07-standing-authorization.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const { record, bytes } =
  await loadAndValidatePostCanaryBatch07StandingAuthorization();
const SOURCE_PACKET_COMMIT = "eee5afef2d581ba14ff883591579292651ae606a";
assert.equal(record.sourcePacketCommit, SOURCE_PACKET_COMMIT);
execFileSync("git", ["merge-base", "--is-ancestor", SOURCE_PACKET_COMMIT, "HEAD"]);
execFileSync("git", ["merge-base", "--is-ancestor", record.checkpointCommit, "HEAD"]);
assert.equal(record.authorizedSequence.length, 11);
assert.equal(record.selectedDebates.length, 10);
assert.equal(record.userAuthorization.supersedesPerStageUserApprovalPausesWithinFrozenScope, true);
assert.equal(record.userAuthorization.preservesAllContentValidationCostAndFailureStops, true);
assert.equal(record.executionControls.automaticContinuationOnlyAfterPassingGate, true);
assert.equal(record.executionControls.separateFrozenActivationArtifactRequired, true);
assert.equal(record.authorization.commitAndPushPassingCheckpoints, true);
assert.equal(record.authorization.productionMutation, true);
assert.equal(record.authorization.conditionalPaidAudioVerification, true);
assert.equal(record.authorization.nextBatchSelection, false);
assert.equal(record.costBoundary.conditionalPaidAudioMaximumUsd, 1);
assert.equal(record.sourcePreparation.frozenDiscoveryContexts, 35);
assert.equal(record.recoveryControls.boundedFirstRecoveryAuthorized, true);
assert.equal(record.recoveryControls.recoveryAttemptsPerFailedContextMaximum, 2);
assert.equal(record.recoveryControls.recursiveCorrectionsMaximum, 1);
assert.equal(record.recoveryControls.failedPartialOutputReusable, false);
assert.equal(record.recoveryControls.eachOriginalFieldAcceptedExactlyOnce, true);
assert.equal(
  sha256(await readFile(POST_CANARY_BATCH_07_STANDING_AUTHORIZATION)),
  sha256(bytes)
);

console.log(
  JSON.stringify(
    {
      status: "passed-active-batch-07-standing-authorization",
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
