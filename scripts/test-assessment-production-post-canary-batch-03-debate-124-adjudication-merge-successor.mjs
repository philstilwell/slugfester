#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { validatePostCanaryBatch03DisputeAdjudicationOutput } from
  "./lib/assessment-production-post-canary-batch-03-dispute-adjudication.mjs";
const root = "docs/assessment-production/post-canary-continuation-v1/batch-03/dispute-only-adjudication";
const recovery = `${root}/failure-recovery`;
const manifest = JSON.parse(await readFile(`${recovery}/merge-successor-manifest.json`));
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assert.equal(manifest.status, "frozen-debate-124-correction-merge-successor-prepared");
assert.equal(manifest.diagnosis.acceptedShardOutputs, 2);
assert.equal(manifest.diagnosis.modelContextsAdded, 0);
assert.equal(manifest.correction.validation.candidateSelections, 67);
for (const [file, digest] of Object.entries(manifest.sourceHashes))
  assert.equal(sha256(await readFile(file)), digest, `source drift: ${file}`);
if (!(await exists(manifest.correction.analysis))) {
  assert.equal(await exists(manifest.correction.mergedOutput), false);
  console.log(JSON.stringify({ status: "passed-merge-successor-prepared",
    candidateSelections: 67, directIncrementalCostUsd: 0 }, null, 2));
  process.exit(0);
}
const [analysis, mergedBytes, packet] = await Promise.all([
  readFile(manifest.correction.analysis).then(JSON.parse),
  readFile(manifest.correction.mergedOutput),
  readFile(`${root}/packets/debate-124.json`).then(JSON.parse)
]);
assert.equal(analysis.status,
  "passed-batch-03-debate-124-field-disjoint-adjudication-correction-and-merge-successor");
assert.equal(analysis.mergeSuccessor.deterministicPasses, 1);
assert.equal(sha256(mergedBytes), manifest.correction.mergedOutputSha256);
const validation = validatePostCanaryBatch03DisputeAdjudicationOutput(JSON.parse(mergedBytes), packet);
assert.equal(validation.status, "passed");
assert.equal(validation.candidateSelections, 67);
console.log(JSON.stringify({ status: "passed-merge-successor-executed",
  candidateSelections: 67, deterministicPasses: 1,
  directIncrementalCostUsd: 0 }, null, 2));
