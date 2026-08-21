#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const file =
  "docs/assessment-production/post-canary-continuation-v1/batch-04/publication-reconstruction/failure-diagnosis.json";
const diagnosis = JSON.parse(await readFile(file));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(diagnosis.status,
  "diagnosed-batch-04-operational-canary-three-critique-word-overruns");
assert.equal(diagnosis.failureBoundary.failedFieldCount, 3);
assert.equal(diagnosis.failureBoundary.excessWordsTotal, 4);
assert.deepEqual(diagnosis.failureBoundary.failedFields.map((row) => row.words),
  [131, 131, 132]);
assert.deepEqual(diagnosis.prospectiveRecoveryOnly.proposedRepairPartition.map((x) => x.length),
  [2, 1]);
assert.equal(diagnosis.diagnosticReplay.result.status, "passed");
assert.equal(diagnosis.diagnosticReplay.persistedCorrectedOutput, false);
assert.equal(diagnosis.preservedControls.modelContextsExecutedForDiagnosis, 0);
assert.equal(diagnosis.preservedControls.scoresChanged, false);
assert.equal(diagnosis.directIncrementalCostUsd, 0);
for (const artifact of Object.values(diagnosis.artifacts)) {
  assert.equal(sha256(await readFile(artifact.path)), artifact.sha256,
    `${artifact.path}: artifact drift`);
}
console.log(JSON.stringify({status: "passed", failedFields: 3,
  proposedRepairPackets: 2, diagnosticReplay: "passed",
  modelContexts: 0, directIncrementalCostUsd: 0}, null, 2));
