#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const stage = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-debate-183-speaker-reference-range-20";
const planPath = `${stage}/recovery-plan.json`;
const activationPath = `${stage}/execution-activation.json`;
const executionPath = `${stage}/execution.json`;
const analysisPath = `${stage}/analysis.json`;
const read = (path) => readFile(new URL(path, root));
const readJson = async (path) => JSON.parse(await read(path));
const hash = async (path) => createHash("sha256").update(await read(path)).digest("hex");

const plan = await readJson(planPath);
assert.equal(plan.status, "frozen-one-shot-batch-09-debate-183-high-attribution-speaker-reference-range-ready");
assert.equal(plan.byteRange.rangeHeader, "bytes=46217270-46378836");
assert.equal(plan.byteRange.expectedBytes, 161567);
assert.equal(plan.byteRange.segmentIndex, 286);
assert.equal(plan.executionPolicy.mediaRangeAttemptsMaximum, 1);
assert.equal(plan.executionPolicy.retriesMaximum, 0);
assert.equal(plan.executionPolicy.paidServiceCallsMaximum, 0);
assert.equal(plan.executionPolicy.directIncrementalCostUsdMaximum, 0);
for (const [path, expected] of Object.entries(plan.authenticatedInputs)) assert.equal(await hash(path), expected, `${path}: hash mismatch`);
for (const [path, expected] of Object.entries(plan.sourceHashes)) assert.equal(await hash(path), expected, `${path}: source hash mismatch`);

if (process.argv.includes("--activation") || process.argv.includes("--execution")) {
  const activation = await readJson(activationPath);
  assert.equal(activation.status, "active-for-exactly-one-batch-09-debate-183-speaker-reference-range");
  assert.equal(activation.plan.sha256, await hash(planPath));
  for (const [path, expected] of Object.entries(activation.sourceHashes)) assert.equal(await hash(path), expected, `${path}: activation source hash mismatch`);
}

if (process.argv.includes("--execution")) {
  const execution = await readJson(executionPath);
  const analysis = await readJson(analysisPath);
  assert.equal(execution.status, "completed-one-shot-batch-09-debate-183-high-attribution-speaker-references");
  assert.equal(analysis.status, "batch-09-debate-183-two-high-attribution-same-debate-speaker-references-ready");
  assert.equal(execution.state.mediaRangeAttempts, 1);
  assert.equal(execution.state.responseBytesAccepted, plan.byteRange.expectedBytes);
  assert.equal(execution.state.referencesCreated, 2);
  assert.equal(execution.state.retries, 0);
  assert.equal(execution.state.paidServiceCalls, 0);
  assert.equal((await stat(new URL(execution.result.rangePath, root))).size, execution.result.rangeBytes);
  assert.equal(await hash(execution.result.rangePath), execution.result.rangeSha256);
  assert.equal(execution.result.references.length, 2);
  assert.deepEqual(execution.result.references.map((item) => item.speaker), ["David Enoch", "Justin Clarke-Doane"]);
  for (const reference of execution.result.references) {
    assert.equal((await stat(new URL(reference.path, root))).size, reference.bytes);
    assert.equal(await hash(reference.path), reference.sha256);
    assert(reference.durationSeconds >= 7.9 && reference.durationSeconds <= 8.1);
  }
}

console.log(process.argv.includes("--execution") ? "debate-183-speaker-reference-range-execution-ok" : process.argv.includes("--activation") ? "debate-183-speaker-reference-range-activation-ok" : "debate-183-speaker-reference-range-plan-ok");
