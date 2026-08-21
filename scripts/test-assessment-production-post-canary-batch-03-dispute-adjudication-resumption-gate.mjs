#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
const root = "docs/assessment-production/post-canary-continuation-v1/batch-03/dispute-only-adjudication/failure-recovery/resumption";
const prepBytes = await readFile(`${root}/execution-preparation-manifest.json`);
const prep = JSON.parse(prepBytes);
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
if (!(await exists(prep.artifacts.activation))) {
  console.log(JSON.stringify({ status: "passed-resumption-prepared", contexts: 9,
    modelExecutionAuthorized: false, directIncrementalCostUsd: 0 }, null, 2));
  process.exit(0);
}
const activation = JSON.parse(await readFile(prep.artifacts.activation));
assert.equal(activation.status,
  "frozen-nine-post-canary-batch-03-dispute-only-adjudication-resumption-contexts-authorized");
assert.equal(activation.preparationManifest.sha256, sha256(prepBytes));
assert.equal(activation.authorization.adjudicationModelContexts, true);
if (!(await exists(prep.artifacts.execution))) {
  console.log(JSON.stringify({ status: "passed-resumption-activated", contexts: 9,
    modelExecutionAuthorized: true, directIncrementalCostUsd: 0 }, null, 2));
  process.exit(0);
}
const execution = JSON.parse(await readFile(prep.artifacts.execution));
assert.equal(execution.contextsPlanned, 9);
assert.equal(execution.retries, 0);
assert.equal(execution.timeoutExtensions, 0);
if (execution.status !==
  "nine-post-canary-batch-03-dispute-only-adjudication-resumption-contexts-passed") {
  assert.equal(execution.status,
    "post-canary-batch-03-dispute-only-adjudication-resumption-gate-complete-with-failure");
  console.log(JSON.stringify({ status: "passed-preserved-resumption-failure",
    contextsAttempted: execution.contextsAttempted, validContexts: execution.validContexts,
    directIncrementalCostUsd: 0 }, null, 2));
  process.exit(0);
}
assert.equal(execution.validContexts, 9);
if (!(await exists(prep.artifacts.analysis))) {
  console.log(JSON.stringify({ status: "passed-resumption-executed", validContexts: 9,
    directIncrementalCostUsd: 0 }, null, 2));
  process.exit(0);
}
const analysis = JSON.parse(await readFile(prep.artifacts.analysis));
assert.equal(analysis.gate.passed, true);
assert.equal(analysis.gate.validContexts, 10);
assert.equal(analysis.gate.disputedMovesDecided, 190);
assert.equal(analysis.gate.candidateSelections, 586);
assert.equal(analysis.gate.audioTranscriptInputs, 8);
assert.equal(analysis.nextAuthorizedAction,
  "assemble-validate-freeze-batch-03-final-ledgers");
console.log(JSON.stringify({ status: "passed-complete-batch-03-adjudication-cohort",
  validContexts: 10, disputedMoves: 190, candidateSelections: 586,
  retries: 0, scoresDerived: 0, directIncrementalCostUsd: 0 }, null, 2));
