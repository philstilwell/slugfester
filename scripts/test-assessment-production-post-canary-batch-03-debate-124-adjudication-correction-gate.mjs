#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { validatePostCanaryBatch03DisputeAdjudicationOutput } from
  "./lib/assessment-production-post-canary-batch-03-dispute-adjudication.mjs";

const root = "docs/assessment-production/post-canary-continuation-v1/batch-03/dispute-only-adjudication";
const recovery = `${root}/failure-recovery`;
const prepBytes = await readFile(`${recovery}/correction-preparation-manifest.json`);
const prep = JSON.parse(prepBytes);
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assert.equal(prep.contexts.length, 2);
assert.equal(prep.contexts.reduce((sum, item) => sum + item.candidateSelections, 0), 67);
if (!(await exists(prep.artifacts.activation))) {
  console.log(JSON.stringify({ status: "passed-correction-prepared", contexts: 2,
    modelExecutionAuthorized: false, directIncrementalCostUsd: 0 }, null, 2));
  process.exit(0);
}
const activation = JSON.parse(await readFile(prep.artifacts.activation));
assert.equal(activation.status,
  "frozen-two-batch-03-debate-124-field-disjoint-adjudication-correction-contexts-authorized");
assert.equal(activation.preparationManifest.sha256, sha256(prepBytes));
assert.equal(activation.authorization.adjudicationModelContexts, true);
assert.equal(activation.executionPolicy.attemptsPerContext, 1);
assert.equal(activation.executionPolicy.retriesMaximum, 0);
if (!(await exists(prep.artifacts.execution))) {
  console.log(JSON.stringify({ status: "passed-correction-activated", contexts: 2,
    modelExecutionAuthorized: true, directIncrementalCostUsd: 0 }, null, 2));
  process.exit(0);
}
const execution = JSON.parse(await readFile(prep.artifacts.execution));
assert.equal(execution.contextsPlanned, 2);
assert.equal(execution.retries, 0);
assert.equal(execution.timeoutExtensions, 0);
assert.equal(execution.directIncrementalCostUsd, 0);
if (execution.status !==
  "two-batch-03-debate-124-field-disjoint-adjudication-correction-contexts-passed") {
  assert.equal(execution.status,
    "batch-03-debate-124-adjudication-correction-gate-complete-with-failure");
  console.log(JSON.stringify({ status: "passed-preserved-correction-failure",
    contextsAttempted: execution.contextsAttempted, validContexts: execution.validContexts,
    directIncrementalCostUsd: 0 }, null, 2));
  process.exit(0);
}
assert.equal(execution.contextsAttempted, 2);
assert.equal(execution.validContexts, 2);
if (!(await exists(prep.artifacts.analysis))) {
  console.log(JSON.stringify({ status: "passed-correction-executed", validContexts: 2,
    retries: 0, directIncrementalCostUsd: 0 }, null, 2));
  process.exit(0);
}
const analysis = JSON.parse(await readFile(prep.artifacts.analysis));
assert.equal(analysis.status,
  "passed-batch-03-debate-124-field-disjoint-adjudication-correction-and-merge");
assert.equal(analysis.correction.candidateSelections, 67);
const [mergedBytes, packet] = await Promise.all([
  readFile(prep.artifacts.mergedOutput), readFile(prep.mergePlan.originalPacket).then(JSON.parse)
]);
assert.equal(sha256(mergedBytes), analysis.correction.mergedOutputSha256);
const validation = validatePostCanaryBatch03DisputeAdjudicationOutput(JSON.parse(mergedBytes), packet);
assert.equal(validation.status, "passed");
assert.equal(validation.candidateSelections, 67);
console.log(JSON.stringify({ status: "passed-correction-merged", validContexts: 2,
  candidateSelections: 67, retries: 0, scoresDerived: 0,
  directIncrementalCostUsd: 0 }, null, 2));
