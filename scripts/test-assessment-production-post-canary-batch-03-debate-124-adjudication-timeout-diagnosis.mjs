#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const file = "docs/assessment-production/post-canary-continuation-v1/batch-03/dispute-only-adjudication/failure-recovery/debate-124-timeout-diagnosis.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const diagnosis = JSON.parse(await readFile(file));
assert.equal(diagnosis.status,
  "frozen-diagnosed-batch-03-debate-124-timeout-before-schema-result");
assert.equal(diagnosis.preservedFailure.acceptedOutputs, 0);
assert.equal(diagnosis.preservedFailure.outputWritten, false);
assert.equal(diagnosis.preservedFailure.timeoutExtensionCount, 0);
assert.equal(diagnosis.workload.candidateSelections, 67);
assert.equal(diagnosis.minimumBoundedCorrection.shardCount, 2);
assert.equal(diagnosis.minimumBoundedCorrection.shard01.candidateSelections, 35);
assert.equal(diagnosis.minimumBoundedCorrection.shard02.candidateSelections, 32);
assert.equal(diagnosis.minimumBoundedCorrection.combinedCandidateSelections, 67);
assert.equal(diagnosis.minimumBoundedCorrection.originalPacketPreserved, true);
assert.equal(diagnosis.minimumBoundedCorrection.originalSchemaPreserved, true);
assert.equal(diagnosis.minimumBoundedCorrection.originalFailedPartialOutputIgnored, true);
assert.equal(diagnosis.minimumBoundedCorrection.recoveryAttemptsPerShard, 1);
assert.equal(diagnosis.directIncrementalCostUsd, 0);
for (const [source, digest] of Object.entries(diagnosis.sourceHashes)) {
  assert.equal(sha256(await readFile(source)), digest, `source drift: ${source}`);
}
assert.equal(new Set([
  ...diagnosis.minimumBoundedCorrection.shard01.moveIds,
  ...diagnosis.minimumBoundedCorrection.shard02.moveIds
]).size, 23);
console.log(JSON.stringify({ status: "passed-batch-03-debate-124-timeout-diagnosis",
  classification: diagnosis.finding.classification, shardCount: 2,
  candidateSelections: 67, directIncrementalCostUsd: 0 }, null, 2));
