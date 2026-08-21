#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
const root = "docs/assessment-production/post-canary-continuation-v1/batch-03/dispute-only-adjudication/failure-recovery";
const file = `${root}/correction-execution-activation-1.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const record = JSON.parse(await readFile(file));
assert.equal(record.status,
  "frozen-two-batch-03-debate-124-field-disjoint-adjudication-correction-contexts-authorized");
assert.equal(record.contexts.length, 2);
assert.equal(record.executionPolicy.attemptsPerContext, 1);
assert.equal(record.executionPolicy.retriesMaximum, 0);
assert.equal(record.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(record.authorization.adjudicationModelContexts, true);
for (const [source, digest] of Object.entries(record.sourceHashes))
  assert.equal(sha256(await readFile(source)), digest, `source drift: ${source}`);
console.log(JSON.stringify({ status: "passed-debate-124-correction-activation-successor",
  contexts: 2, modelContextsPreviouslyAttempted: 0,
  directIncrementalCostUsd: 0 }, null, 2));
