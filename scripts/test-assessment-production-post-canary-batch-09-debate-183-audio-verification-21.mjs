#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const manifestPath = "docs/assessment-production/post-canary-continuation-v1/batch-09/audio-verification-debate-183-21/execution-preparation-manifest.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const manifest = JSON.parse(await readFile(manifestPath));
assert.equal(manifest.status, "prepared-exactly-two-batch-09-debate-183-paid-known-speaker-diarizations-conditional-activation-ready");
assert.equal(manifest.batchNumber, 9);
assert.deepEqual(manifest.calls.map((call) => `${call.debateNumber}:${call.moveId}`), ["183:con-informed-deliberator-method", "183:con-foundational-anomaly-significance"]);
assert.equal(manifest.calls.length, 2);
assert(manifest.calls.every((call) => call.knownSpeakers.length === 2));
assert.deepEqual(manifest.calls[0].knownSpeakers.map((item) => item.speaker), ["David Enoch", "Justin Clarke-Doane"]);
assert.equal(manifest.referenceContract.highAttributionRequired, true);
assert.equal(manifest.model, "gpt-4o-transcribe-diarize");
assert.equal(manifest.executionPolicy.sequential, true);
assert.equal(manifest.executionPolicy.attemptsPerCall, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.costEstimate.priorBatch9UsageDerivedCostUsd, 0.0907725);
assert.equal(manifest.costEstimate.primaryExpectedFutureIncrementalExecutionCostUsd, 0.13776);
assert.equal(manifest.costEstimate.projectedCumulativeBatch9CostUsd, 0.2285325);
assert(manifest.costEstimate.projectedCumulativeBatch9CostUsd <= 1);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert.equal(sha256(await readFile(file)), digest, `${file}: hash mismatch`);
for (const call of manifest.calls) {
  assert.equal(sha256(await readFile(call.clipPath)), call.clipSha256);
  for (const reference of call.knownSpeakers) assert.equal(sha256(await readFile(reference.localPath)), reference.sha256);
}
console.log("batch-09-debate-183-audio-verification-preparation-ok");
