#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  POST_CANARY_BATCH_05_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch05StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-05-standing-authorization.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const { record, bytes } =
  await loadAndValidatePostCanaryBatch05StandingAuthorization();
assert.equal(record.checkpointCommit, "c8fa77873bbd4bae8fd2b0c3310c23f2a6da9206");
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
assert.equal(record.sourcePreparation.frozenDiscoveryContexts, 41);
assert.equal(record.recoveryControls.boundedFirstRecoveryAuthorized, true);
assert.equal(record.recoveryControls.recoveryAttemptsPerFailedContextMaximum, 1);
assert.equal(record.recoveryControls.failedPartialOutputReusable, false);
assert.equal(record.recoveryControls.eachOriginalFieldAcceptedExactlyOnce, true);
assert.equal(
  sha256(await readFile(POST_CANARY_BATCH_05_STANDING_AUTHORIZATION)),
  sha256(bytes)
);

console.log(
  JSON.stringify(
    {
      status: "passed-active-batch-05-standing-authorization",
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
