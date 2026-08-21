#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { validatePostCanaryBatch03DisputeAdjudicationOutput } from
  "./lib/assessment-production-post-canary-batch-03-dispute-adjudication.mjs";

const root = "docs/assessment-production/post-canary-continuation-v1/batch-03/dispute-only-adjudication/failure-recovery";
const manifest = JSON.parse(await readFile(`${root}/correction-preparation-manifest.json`));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assert.equal(manifest.status,
  "frozen-two-batch-03-debate-124-field-disjoint-adjudication-correction-contexts-prepared");
assert.equal(manifest.contexts.length, 2);
assert.deepEqual(manifest.contexts.map((item) => item.candidateSelections), [35, 32]);
assert.equal(manifest.contexts.reduce((sum, item) => sum + item.disputedMoves, 0), 23);
assert.equal(manifest.contexts.reduce((sum, item) => sum + item.burdenAdjustmentDisputes, 0), 2);
assert.equal(manifest.contexts.reduce((sum, item) => sum + item.audioTranscriptInputs.length, 0), 2);
assert.deepEqual(manifest.executionPolicy.schedulerRamp, [1, 2]);
assert.equal(manifest.executionPolicy.attemptsPerContext, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(manifest.executionPolicy.terminateIsolatedProcessGroupAtFrozenTimeout, true);
assert.equal(manifest.originalFailure.acceptedOutputs, 0);
assert.equal(manifest.originalFailure.failedPartialOutputReusable, false);
assert.equal(manifest.mergePlan.requiredCandidateSelections, 67);
assert.equal(manifest.mergePlan.everyOriginalFieldAcceptedExactlyOnce, true);
for (const context of manifest.contexts) {
  const bytes = await readFile(context.packet);
  assert.equal(sha256(bytes), context.packetSha256);
}
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `source drift: ${file}`);
}
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) {
  await assert.rejects(access(future));
}
assert.equal(typeof validatePostCanaryBatch03DisputeAdjudicationOutput, "function");
console.log(JSON.stringify({ status: "passed-batch-03-debate-124-correction-preparation",
  contexts: 2, candidateSelections: 67, retriesMaximum: 0,
  directIncrementalCostUsdMaximum: 0 }, null, 2));
