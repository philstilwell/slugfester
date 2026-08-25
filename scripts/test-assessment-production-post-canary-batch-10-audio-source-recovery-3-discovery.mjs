#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const path =
  "docs/assessment-production/post-canary-continuation-v1/batch-10/disagreement-extraction/audio-source-range-recovery-3/equivalent-source-discovery.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const discovery = JSON.parse(await readFile(path, "utf8"));

assert.equal(
  discovery.status,
  "completed-batch-10-equivalent-source-discovery-range-verified-original-source-fallback-required"
);
assert.equal(discovery.batchNumber, 10);
assert.equal(discovery.userAuthorization.rangeVerifiedDownloadsAuthorized, 3);
assert.equal(discovery.userAuthorization.directIncrementalCostUsdMaximum, 0);
assert.equal(discovery.userAuthorization.audioPlaybackAuthorized, false);
assert.equal(discovery.userAuthorization.semanticAudioEvaluationAuthorized, false);
assert.equal(discovery.userAuthorization.automaticRetriesAuthorized, false);
assert.equal(discovery.userAuthorization.sequentialTranscriptionEstimateUsd, 0.1308768);
assert.equal(discovery.equivalentSourceCandidates.length, 3);
assert(discovery.equivalentSourceCandidates.every((item) => item.disposition.startsWith("rejected-")));
assert.deepEqual(
  discovery.originalSourceFallbacks.map((item) => item.sourceVideoId),
  ["8k9A7d2Wnjk", "h-I_9e5qxnc", "0IpKHdVLZb4"]
);
assert(discovery.originalSourceFallbacks.every((item) => item.formatId === "139"));
assert(discovery.originalSourceFallbacks.every((item) => item.declaredBytes > 20_000_000));
assert(discovery.originalSourceFallbacks.every(
  (item) => item.declaredDurationSeconds * 1000 >= item.maximumRequiredEndMs
));
assert.equal(discovery.diagnosis.failedFormatId, "18");
assert.equal(discovery.diagnosis.mismatchProvesMalformedCombinedTransport, true);
assert.equal(discovery.discoveryAudit.publicMediaDownloads, 0);
assert.equal(discovery.discoveryAudit.audioPlaybackCalls, 0);
assert.equal(discovery.discoveryAudit.semanticAudioEvaluations, 0);
assert.equal(discovery.discoveryAudit.paidServiceCalls, 0);
assert.equal(discovery.discoveryAudit.retries, 0);
assert.equal(discovery.discoveryAudit.directIncrementalCostUsd, 0);
for (const [file, digest] of Object.entries(discovery.authenticatedInputs)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: input changed`);
}
for (const [file, digest] of Object.entries(discovery.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source changed`);
}

console.log(JSON.stringify({
  status: "passed",
  equivalentCandidates: 3,
  usableEquivalentSources: 0,
  rangeVerifiedFallbacks: 3,
  authenticatedInputs: Object.keys(discovery.authenticatedInputs).length,
  sourceHashes: Object.keys(discovery.sourceHashes).length,
  publicMediaDownloads: 0,
  audioPlaybackCalls: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0
}, null, 2));
