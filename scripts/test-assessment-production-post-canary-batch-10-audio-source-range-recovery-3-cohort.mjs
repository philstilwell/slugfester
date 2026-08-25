#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";

const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-10/disagreement-extraction";
const recoveryRoot = `${root}/audio-source-range-recovery-3`;
const planPath = `${recoveryRoot}/correction-plan.json`;
const activationPath = `${recoveryRoot}/execution-activation.json`;
const executionPath = `${recoveryRoot}/execution.json`;
const preparationPath = `${root}/audio-source-preparation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const [planBytes, activationBytes, executionBytes, preparationBytes] =
  await Promise.all([
    readFile(planPath),
    readFile(activationPath),
    readFile(executionPath),
    readFile(preparationPath)
  ]);
const plan = JSON.parse(planBytes);
const execution = JSON.parse(executionBytes);
const preparation = JSON.parse(preparationBytes);

assert.equal(
  execution.status,
  "completed-one-shot-batch-10-audio-source-range-recovery-3-and-cohort"
);
assert.equal(execution.planSha256, sha256(planBytes));
assert.equal(execution.activationSha256, sha256(activationBytes));
assert.equal(execution.failure, null);
assert.equal(execution.state.attempts, 1);
assert.equal(execution.state.directUrlResolutionCliInvocations, 3);
assert.equal(execution.state.rangeHttpGetInvocations, 15);
assert.equal(execution.state.publicSourceDownloads, 3);
assert.equal(execution.state.localNormalizations, 3);
assert.equal(execution.state.acceptedExistingSourcesRevalidated, 2);
assert.equal(execution.state.sourcesInstalled, 5);
assert.equal(execution.state.clipsCreated, 9);
assert.equal(execution.state.completeCohortValidated, true);
assert.equal(execution.state.failedPartialOutputsReused, 0);
assert.equal(execution.state.retries, 0);
assert.equal(execution.state.reruns, 0);
assert.equal(execution.state.timeoutExtensions, 0);
assert.equal(execution.state.audioPlaybackCalls, 0);
assert.equal(execution.state.semanticAudioEvaluations, 0);
assert.equal(execution.state.modelContexts, 0);
assert.equal(execution.state.transcriptionCalls, 0);
assert.equal(execution.state.paidServiceCalls, 0);
assert.equal(execution.state.directIncrementalCostUsd, 0);
assert.equal(execution.protectedEvidencePreserved, true);

for (const evidence of plan.protectedInvalidEvidence) {
  const bytes = await readFile(evidence.path);
  assert.equal(sha256(bytes), evidence.sha256);
  assert.equal((await stat(evidence.path)).size, evidence.bytes);
}
assert.equal(preparation.recovery.failedPartialOutputsReused, 0);
assert.equal(preparation.recovery.acceptedPrefixOutputsRevalidated, 2);
assert.equal(preparation.recovery.additionalUserAuthorizedRecoveryUsed, true);
assert.equal(preparation.recovery.rangeVerifiedFormat139Downloads, 3);
assert.equal(preparation.recovery.planSha256, sha256(planBytes));
assert.equal(preparation.recovery.activationSha256, sha256(activationBytes));
const downloaded = preparation.sources.filter(
  (source) => source.acquisitionMode ===
    "downloaded-public-source-format139-full-range-verified"
);
assert.equal(downloaded.length, 3);
assert.deepEqual(
  downloaded.map((source) => source.downloadedSourceBytes),
  [37050541, 24192081, 54678961]
);
assert(downloaded.every((source) => source.sourceFormatId === "139"));
assert.deepEqual(downloaded.map((source) => source.rangeRequests.length), [5, 3, 7]);

const baseValidation = execFileSync(
  "node",
  ["scripts/test-assessment-production-post-canary-batch-10-audio-sources.mjs"],
  { encoding: "utf8" }
);
const baseResult = JSON.parse(baseValidation);
assert.equal(baseResult.status, "passed");
assert.equal(baseResult.sources, 5);
assert.equal(baseResult.clips, 9);

console.log(JSON.stringify({
  status: "passed",
  sources: preparation.sources.length,
  clips: preparation.clips.length,
  clipMinutes: preparation.totals.clipMinutes,
  rangeVerifiedDownloads: downloaded.length,
  retries: 0,
  audioPlaybackCalls: 0,
  semanticAudioEvaluations: 0,
  transcriptionCalls: 0,
  modelContexts: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0
}, null, 2));
