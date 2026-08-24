#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const path = "docs/assessment-production/post-canary-continuation-v1/batch-08/audio-verification/resolution-execution-activation.json";
const shouldWrite = process.argv.includes("--write");
const activatedAtIndex = process.argv.indexOf("--activated-at");
const activatedAt = activatedAtIndex >= 0 ? process.argv[activatedAtIndex + 1] : null;
assert(activatedAt && !Number.isNaN(Date.parse(activatedAt)), "--activated-at requires an ISO timestamp");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const activation = JSON.parse(await readFile(path, "utf8"));

assert.equal(activation.status, "frozen-batch-08-audio-resolution-execution-prepared-not-active");
assert.equal(activation.activatedAt, null);
assert.equal(activation.referenceOverlays.length, 3);
assert.equal(activation.transcriptLocks.length, 6);
assert.equal(activation.executionPolicy.deterministicPassesMaximum, 1);
assert.equal(activation.executionPolicy.retriesMaximum, 0);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash changed`);
}

const active = {
  ...activation,
  status: "frozen-batch-08-audio-resolution-deterministic-replay-authorized",
  activatedAt,
  userExecutionAuthorization: {
    source: activation.continuationAuthorization,
    deterministicCorrectionPasses: 1,
    completeSixTranscriptCohortReplays: 1,
    attempts: 1,
    retries: 0,
    audioAccess: false,
    modelOrApiCalls: false,
    paidServiceUse: false,
    directIncrementalCostUsdMaximum: 0,
  },
  authorization: {
    correctionExecution: true,
    completeCohortReplay: true,
    audioAccess: false,
    modelOrApiCalls: false,
    paidServiceUse: false,
    downstreamAdjudicationPreparation: false,
  },
  nextAuthorizedAction: "execute-one-frozen-batch-08-deterministic-audio-resolution-pass-and-complete-six-transcript-replay",
};
const bytes = `${JSON.stringify(active, null, 2)}\n`;
if (shouldWrite) await writeFile(path, bytes);
console.log(JSON.stringify({
  status: shouldWrite ? active.status : "passed-batch-08-audio-resolution-activation-preview",
  referenceOverlays: 3,
  completeCohortSize: 6,
  attempts: 1,
  retries: 0,
  audioAccesses: 0,
  modelOrApiCalls: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0,
  sha256: sha256(bytes),
  nextAuthorizedAction: active.nextAuthorizedAction,
}, null, 2));
