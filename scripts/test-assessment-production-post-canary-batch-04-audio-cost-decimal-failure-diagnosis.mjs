#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const path =
  "docs/assessment-production/post-canary-continuation-v1/batch-04/audio-verification/cost-decimal-failure-diagnosis.json";
const diagnosis = JSON.parse(await readFile(path, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(
  diagnosis.status,
  "frozen-batch-04-audio-cost-binary-decimal-mismatch-diagnosed"
);
assert.equal(diagnosis.batchNumber, 4);
assert.equal(diagnosis.preservedResults.callsCompleted, 4);
assert.equal(diagnosis.preservedResults.retries, 0);
assert.equal(diagnosis.preservedResults.verifiedMoves, 4);
assert.equal(diagnosis.preservedResults.unresolvedMoves, 0);
assert.equal(diagnosis.failure.strictEqualityEqual, false);
assert.equal(diagnosis.failure.sevenDecimalNormalizationEqual, true);
assert.equal(diagnosis.failure.mathematicalCostChanged, false);
assert.equal(diagnosis.failure.capDispositionChanged, false);
assert.equal(diagnosis.exactCostRepresentation.exactIntegerUnits, 1144125);
assert.equal(diagnosis.exactCostRepresentation.exactCostUsd, 0.1144125);
assert.equal(diagnosis.boundaries.audioFilesAccessed, 0);
assert.equal(diagnosis.boundaries.paidCallsAdded, 0);
assert.equal(diagnosis.boundaries.modelsExecuted, 0);
assert.equal(diagnosis.boundaries.directIncrementalCostUsd, 0);
for (const [file, digest] of Object.entries(diagnosis.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `source hash mismatch: ${file}`);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      callsPreserved: 4,
      verifiedMovesPreserved: 4,
      exactCostUsd: 0.1144125,
      approvedCapExceeded: false,
      audioFilesAccessed: 0,
      paidCallsAdded: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
