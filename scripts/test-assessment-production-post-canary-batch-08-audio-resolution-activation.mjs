#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const path = "docs/assessment-production/post-canary-continuation-v1/batch-08/audio-verification/resolution-execution-activation.json";
const activation = JSON.parse(await readFile(path, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

assert([
  "frozen-batch-08-audio-resolution-execution-prepared-not-active",
  "frozen-batch-08-audio-resolution-deterministic-replay-authorized",
].includes(activation.status));
assert.equal(activation.referenceOverlays.length, 3);
assert.equal(activation.transcriptLocks.length, 6);
assert.equal(activation.executionPolicy.deterministicPassesMaximum, 1);
assert.equal(activation.executionPolicy.completeSixTranscriptCohortReplaysMaximum, 1);
assert.equal(activation.executionPolicy.retriesMaximum, 0);
assert.equal(activation.executionPolicy.audioAccessAllowed, false);
assert.equal(activation.executionPolicy.modelOrApiCallsAllowed, false);
assert.equal(activation.executionPolicy.paidServiceUseAllowed, false);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash changed`);
}
for (const lock of activation.transcriptLocks) {
  assert.equal(sha256(await readFile(lock.path)), lock.sha256, `${lock.moveId}: transcript changed`);
}
for (const output of Object.values(activation.outputs)) assert.equal(await exists(output), false, `${output}: future output exists`);

console.log(JSON.stringify({
  status: activation.status === "frozen-batch-08-audio-resolution-deterministic-replay-authorized"
    ? "passed-active-batch-08-audio-resolution-activation"
    : "passed-inactive-batch-08-audio-resolution-activation",
  referenceOverlays: 3,
  completeCohortSize: 6,
  attempts: 1,
  retries: 0,
  audioAccesses: 0,
  modelOrApiCalls: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: activation.nextAuthorizedAction,
}, null, 2));
