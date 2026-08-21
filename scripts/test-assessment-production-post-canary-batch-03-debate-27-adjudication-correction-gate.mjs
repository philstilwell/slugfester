#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
const root = "docs/assessment-production/post-canary-continuation-v1/batch-03/dispute-only-adjudication/failure-recovery/debate-27-correction";
const prepBytes = await readFile(`${root}/execution-preparation-manifest.json`);
const prep = JSON.parse(prepBytes);
const exists = (file) => access(file).then(() => true, () => false);
if (!(await exists(prep.artifacts.activation))) {
  console.log(JSON.stringify({ status: "passed-debate-27-correction-prepared",
    modelExecutionAuthorized: false, directIncrementalCostUsd: 0 }, null, 2)); process.exit(0);
}
const activation = JSON.parse(await readFile(prep.artifacts.activation));
assert.equal(activation.status,
  "frozen-one-batch-03-debate-27-full-packet-adjudication-correction-context-authorized");
if (!(await exists(prep.artifacts.execution))) {
  console.log(JSON.stringify({ status: "passed-debate-27-correction-activated",
    modelExecutionAuthorized: true, directIncrementalCostUsd: 0 }, null, 2)); process.exit(0);
}
const execution = JSON.parse(await readFile(prep.artifacts.execution));
assert.equal(execution.contextsPlanned, 1);
assert.equal(execution.retries, 0);
if (execution.status !==
  "one-batch-03-debate-27-full-packet-adjudication-correction-context-passed") {
  assert.equal(execution.status,
    "batch-03-debate-27-adjudication-correction-gate-complete-with-failure");
  console.log(JSON.stringify({ status: "passed-preserved-debate-27-correction-failure",
    validContexts: execution.validContexts, directIncrementalCostUsd: 0 }, null, 2)); process.exit(0);
}
if (!(await exists(prep.artifacts.analysis))) {
  console.log(JSON.stringify({ status: "passed-debate-27-correction-executed",
    validContexts: 1, directIncrementalCostUsd: 0 }, null, 2)); process.exit(0);
}
const analysis = JSON.parse(await readFile(prep.artifacts.analysis));
assert.equal(analysis.status,
  "passed-batch-03-debate-27-full-packet-adjudication-correction");
assert.equal(analysis.failedOutput.reused, false);
assert.equal(analysis.correction.candidateSelections, 70);
assert.equal(analysis.correction.burdenAdjustmentDecisions, 2);
console.log(JSON.stringify({ status: "passed-debate-27-correction-merged",
  candidateSelections: 70, failedOutputReused: false,
  directIncrementalCostUsd: 0 }, null, 2));
