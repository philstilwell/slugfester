#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
const file = "docs/assessment-production/post-canary-continuation-v1/batch-03/dispute-only-adjudication/failure-recovery/correction-harness-diagnosis.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const record = JSON.parse(await readFile(file));
assert.equal(record.status,
  "frozen-diagnosed-debate-124-correction-pre-model-activation-path-mismatch");
assert.equal(record.failure.errorCode, "ENOENT");
assert.equal(record.failure.modelContextsAttempted, 0);
assert.equal(record.failure.outputsWritten, 0);
assert.equal(record.correction.attemptsConsumed, 0);
assert.equal(record.correction.originalPacketsPreserved, true);
for (const [source, digest] of Object.entries(record.sourceHashes))
  assert.equal(sha256(await readFile(source)), digest, `source drift: ${source}`);
console.log(JSON.stringify({ status: "passed-debate-124-correction-harness-diagnosis",
  modelContextsAttempted: 0, directIncrementalCostUsd: 0 }, null, 2));
