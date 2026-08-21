#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
const root = "docs/assessment-production/post-canary-continuation-v1/batch-03/dispute-only-adjudication/failure-recovery/debate-27-correction";
const manifest = JSON.parse(await readFile(`${root}/execution-preparation-manifest.json`));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assert.equal(manifest.status,
  "frozen-one-batch-03-debate-27-full-packet-adjudication-correction-context-prepared");
assert.equal(manifest.contexts.length, 1);
assert.equal(manifest.contexts[0].candidateSelections, 70);
assert.equal(manifest.requiredOutputShape.burdenAdjustmentDecisions, 2);
assert.equal(manifest.failedOutput.reusable, false);
assert.equal(sha256(await readFile(manifest.failedOutput.preservedCopy)), manifest.failedOutput.sha256);
for (const [file, digest] of Object.entries(manifest.sourceHashes))
  assert.equal(sha256(await readFile(file)), digest, `source drift: ${file}`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes
  .filter((file) => file !== manifest.failedOutput.preservedCopy))
  await assert.rejects(access(future));
console.log(JSON.stringify({ status: "passed-debate-27-correction-preparation",
  contexts: 1, candidateSelections: 70, directIncrementalCostUsdMaximum: 0 }, null, 2));
