#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  RECOVERY_AUTHORIZATION,
  loadAndValidateRecoveryAuthorization
} from "./lib/assessment-production-post-canary-batch-03-failure-recovery-standing-authorization.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const { record, bytes } = await loadAndValidateRecoveryAuthorization();
assert.equal(record.checkpointCommit, "5b4b0064192949c30ad1d5daef551d54e7645a0d");
assert.equal(record.selectedDebates.length, 10);
assert.equal(record.preservedFailure.debateNumber, "124");
assert.equal(record.preservedFailure.originalAttemptCount, 1);
assert.equal(record.preservedFailure.originalAcceptedOutputs, 0);
assert.deepEqual(record.preservedFailure.unattemptedContextIndexes, [1,2,3,4,5,6,7,8,9]);
assert.equal(record.recoveryControls.recoveryAttemptsPerFailedContextMaximum, 1);
assert.equal(record.recoveryControls.fieldDisjointShardingPermitted, true);
assert.equal(record.authorization.paidServices, false);
assert.equal(record.authorization.nextBatchSelection, false);
assert.equal(sha256(await readFile(RECOVERY_AUTHORIZATION)), sha256(bytes));
console.log(JSON.stringify({ status: "passed-active-batch-03-failure-recovery-standing-authorization",
  debateNumber: "124", recoveryAttemptsMaximum: 1, directIncrementalCostUsdMaximum: 0 }, null, 2));
