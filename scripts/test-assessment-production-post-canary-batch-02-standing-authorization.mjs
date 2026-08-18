#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  POST_CANARY_BATCH_02_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch02StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-02-standing-authorization.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const { record, bytes } =
  await loadAndValidatePostCanaryBatch02StandingAuthorization();
assert.equal(record.checkpointCommit.length, 40);
assert.equal(record.authorizedSequence.length, 9);
assert.equal(record.userAuthorization.supersedesPerStageUserApprovalPausesWithinFrozenScope, true);
assert.equal(record.userAuthorization.preservesAllContentValidationCostAndFailureStops, true);
assert.equal(record.executionControls.automaticContinuationOnlyAfterPassingGate, true);
assert.equal(record.executionControls.separateFrozenActivationArtifactStillRequired, true);
assert.equal(record.authorization.commitAndPushPassingOrPreservedFailureCheckpoints, true);
assert.equal(record.authorization.productionMutation, false);
assert.equal(record.authorization.nextBatchSelection, false);
assert.equal(
  sha256(await readFile(POST_CANARY_BATCH_02_STANDING_AUTHORIZATION)),
  sha256(bytes)
);

console.log(
  JSON.stringify(
    {
      status: "passed-active-standing-authorization",
      authorizedStages: record.authorizedSequence.length,
      sourceHashes: Object.keys(record.sourceHashes).length,
      model: record.model,
      attemptsPerContext: 1,
      retriesMaximum: 0,
      timeoutExtensionsMaximum: 0,
      recursiveRepairsMaximum: 0,
      directIncrementalCostUsdMaximum: 0,
      productionMutationAuthorized: false
    },
    null,
    2
  )
);
