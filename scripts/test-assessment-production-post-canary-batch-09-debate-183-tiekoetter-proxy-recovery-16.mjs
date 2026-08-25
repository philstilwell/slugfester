#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const planPath = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-tiekoetter-proxy-recovery-16/recovery-plan.json";
const activationPath = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-tiekoetter-proxy-recovery-16/execution-activation.json";
const executionPath = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-tiekoetter-proxy-recovery-16/execution.json";
const analysisPath = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-tiekoetter-proxy-recovery-16/analysis.json";
const read = (path) => readFile(new URL(path, root));
const readJson = async (path) => JSON.parse(await read(path));
const hash = async (path) => createHash("sha256").update(await read(path)).digest("hex");

const plan = await readJson(planPath);
assert.equal(plan.status, "frozen-final-one-shot-batch-09-debate-183-tiekoetter-public-proxy-recovery-ready");
assert.equal(plan.batchNumber, 9);
assert.equal(plan.source.videoId, "2WrywAaDvvw");
assert.equal(plan.proxyRepresentation.provider, "Invidious Tiekoetter companion");
assert.equal(plan.proxyRepresentation.representationId, "140");
assert.equal(plan.proxyRepresentation.expectedBytes, 67979525);
assert.equal(plan.proxyRepresentation.durationSeconds, 4200.396);
assert.equal(plan.proxyRepresentation.absoluteUrlSha256, "07d1636de022073968a80f7e594d5f3ce7f6530ed4c86237ac7f81814178f3cf");
assert.equal(plan.executionPolicy.downloadAttemptsMaximum, 1);
assert.equal(plan.executionPolicy.retriesMaximum, 0);
assert.equal(plan.executionPolicy.redirectFollowsMaximum, 0);
assert.equal(plan.executionPolicy.cookiesSentMaximum, 0);
assert.equal(plan.executionPolicy.accountDataUsesMaximum, 0);
assert.equal(plan.executionPolicy.audioPlaybackObservedSecondsMaximum, 0);
assert.equal(plan.executionPolicy.paidServiceCallsMaximum, 0);
assert.equal(plan.executionPolicy.directIncrementalCostUsdMaximum, 0);
for (const [path, expected] of Object.entries(plan.authenticatedInputs)) assert.equal(await hash(path), expected, `${path} hash mismatch`);
for (const [path, expected] of Object.entries(plan.sourceHashes)) assert.equal(await hash(path), expected, `${path} source hash mismatch`);

if (process.argv.includes("--activation") || process.argv.includes("--execution")) {
  const activation = await readJson(activationPath);
  assert.equal(activation.status, "active-for-exactly-one-final-batch-09-debate-183-tiekoetter-public-proxy-recovery");
  assert.equal(activation.plan.path, planPath);
  assert.equal(activation.plan.sha256, await hash(planPath));
  for (const [path, expected] of Object.entries(activation.sourceHashes)) assert.equal(await hash(path), expected, `${path} activation hash mismatch`);
  assert.equal(activation.downloadAttemptsMaximum, 1);
  assert.equal(activation.redirectFollowsMaximum, 0);
  assert.equal(activation.retriesMaximum, 0);
}

if (process.argv.includes("--execution")) {
  const execution = await readJson(executionPath);
  const analysis = await readJson(analysisPath);
  assert.equal(execution.status, "completed-one-shot-batch-09-debate-183-tiekoetter-proxy-source-and-two-clips");
  assert.equal(analysis.status, "batch-09-debate-183-exact-public-proxy-source-and-two-frozen-clips-recovered");
  assert.equal(execution.state.proxyMediaDownloadAttempts, 1);
  assert.equal(execution.state.redirectFollows, 0);
  assert.equal(execution.state.sourceBytesAccepted, plan.proxyRepresentation.expectedBytes);
  assert.equal(execution.state.sourcesInstalled, 1);
  assert.equal(execution.state.clipsCreated, 2);
  assert.equal(execution.state.retries, 0);
  assert.equal(execution.state.cookiesSent, 0);
  assert.equal(execution.state.accountDataUses, 0);
  assert.equal(execution.state.audioPlaybackObservedSeconds, 0);
  assert.equal(execution.state.paidServiceCalls, 0);
  assert.equal((await stat(new URL(execution.result.rawCachePath, root))).size, execution.result.rawBytes);
  assert.equal(await hash(execution.result.rawCachePath), execution.result.rawSha256);
  assert.equal((await stat(new URL(execution.result.sourcePath, root))).size, execution.result.sourceBytes);
  assert.equal(await hash(execution.result.sourcePath), execution.result.sourceSha256);
  assert(Math.abs(execution.result.sourceDurationSeconds - 4200.396) <= 0.5);
  assert.equal(execution.result.clips.length, 2);
  for (const clip of execution.result.clips) {
    assert.equal((await stat(new URL(clip.path, root))).size, clip.bytes);
    assert.equal(await hash(clip.path), clip.sha256);
  }
  assert(Math.abs(execution.result.clips[0].durationSeconds - 62.120) <= 0.25);
  assert(Math.abs(execution.result.clips[1].durationSeconds - 316.760) <= 0.25);
}

console.log(process.argv.includes("--execution") ? "tiekoetter-proxy-recovery-execution-ok" : process.argv.includes("--activation") ? "tiekoetter-proxy-recovery-activation-ok" : "tiekoetter-proxy-recovery-plan-ok");
