#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const path = "docs/assessment-production/post-canary-continuation-v1/batch-09/audio-verification-partial-18/execution-preparation-manifest.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const manifest = JSON.parse(await readFile(path));
assert.equal(manifest.status, "prepared-two-available-batch-09-paid-known-speaker-diarizations-with-two-debate-183-blockers-conditional-activation-ready");
assert.equal(manifest.batchNumber, 9);
assert.deepEqual(manifest.scope.availableDebates, ["170", "19"]);
assert.deepEqual(manifest.calls.map((call) => `${call.debateNumber}:${call.moveId}`), [
  "170:pro-suffering-christian-hope-response",
  "19:pro-c009-phenomenal-value-reality"
]);
assert.equal(manifest.calls.length, 2);
assert(manifest.calls.every((call) => call.knownSpeakers.length === 2));
assert.equal(manifest.referenceContract.references.length, 4);
assert.equal(manifest.scope.blockedDebate, "183");
assert.equal(manifest.scope.blockedMoveIds.length, 2);
assert.equal(manifest.scope.partialResultsCannotAuthorizeAdjudication, true);
assert.equal(manifest.model, "gpt-4o-transcribe-diarize");
assert.equal(manifest.executionPolicy.sequential, true);
assert.equal(manifest.executionPolicy.attemptsPerCall, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.costEstimate.maximumConditionallyAuthorizedCostUsd, 1);
assert(manifest.costEstimate.primaryExpectedFutureExecutionCostUsd > 0);
assert(manifest.costEstimate.primaryExpectedFutureExecutionCostUsd <= 1);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert.equal(sha256(await readFile(file)), digest, `${file}: hash mismatch`);
for (const call of manifest.calls) {
  assert.equal(sha256(await readFile(call.clipPath)), call.clipSha256);
  for (const reference of call.knownSpeakers) assert.equal(sha256(await readFile(reference.localPath)), reference.sha256);
}
console.log("batch-09-partial-audio-verification-preparation-ok");
