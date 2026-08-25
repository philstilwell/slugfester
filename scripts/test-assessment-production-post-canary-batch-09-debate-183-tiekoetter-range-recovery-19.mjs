#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const stage = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-debate-183-tiekoetter-range-recovery-19";
const planPath = `${stage}/recovery-plan.json`;
const activationPath = `${stage}/execution-activation.json`;
const executionPath = `${stage}/execution.json`;
const analysisPath = `${stage}/analysis.json`;
const read = (path) => readFile(new URL(path, root));
const readJson = async (path) => JSON.parse(await read(path));
const hash = async (path) => createHash("sha256").update(await read(path)).digest("hex");

const plan = await readJson(planPath);
assert.equal(plan.status, "frozen-one-shot-batch-09-debate-183-tiekoetter-indexed-range-recovery-ready");
assert.equal(plan.batchNumber, 9);
assert.equal(plan.source.videoId, "2WrywAaDvvw");
assert.equal(plan.proxyRepresentation.representationId, "140");
assert.equal(plan.preservedPrefix.bytes, 257390);
assert.equal(plan.preservedPrefix.sha256, "40b4a8717f25ff49611084b8bae82d7f9335e07d2eb1b2e134ac78eac8055186");
assert.equal(plan.preservedPrefix.initializationBytes, 723);
assert.equal(plan.byteRange.rangeHeader, "bytes=52033693-59143476");
assert.equal(plan.byteRange.expectedBytes, 7109784);
assert.equal(plan.byteRange.expectedContentRange, "bytes 52033693-59143476/67979525");
assert.equal(plan.byteRange.firstSegmentIndex, 322);
assert.equal(plan.byteRange.lastSegmentIndex, 365);
assert.equal(plan.byteRange.segmentCount, 44);
assert.equal(plan.executionPolicy.mediaRangeAttemptsMaximum, 1);
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
  assert.equal(activation.status, "active-for-exactly-one-batch-09-debate-183-tiekoetter-indexed-range-recovery");
  assert.equal(activation.plan.path, planPath);
  assert.equal(activation.plan.sha256, await hash(planPath));
  for (const [path, expected] of Object.entries(activation.sourceHashes)) assert.equal(await hash(path), expected, `${path} activation hash mismatch`);
  assert.equal(activation.mediaRangeAttemptsMaximum, 1);
  assert.equal(activation.retriesMaximum, 0);
}

if (process.argv.includes("--execution")) {
  const execution = await readJson(executionPath);
  const analysis = await readJson(analysisPath);
  assert.equal(execution.status, "completed-one-shot-batch-09-debate-183-tiekoetter-range-source-and-two-clips");
  assert.equal(analysis.status, "batch-09-debate-183-exact-public-proxy-range-and-two-frozen-clips-recovered");
  assert.equal(execution.state.proxyMediaRangeAttempts, 1);
  assert.equal(execution.state.responseBytesAccepted, plan.byteRange.expectedBytes);
  assert.equal(execution.state.rangeFilesAccepted, 1);
  assert.equal(execution.state.fragmentFilesCreated, 1);
  assert.equal(execution.state.boundedSourcesInstalled, 1);
  assert.equal(execution.state.clipsCreated, 2);
  assert.equal(execution.state.retries, 0);
  assert.equal(execution.state.redirectFollows, 0);
  assert.equal(execution.state.cookiesSent, 0);
  assert.equal(execution.state.accountDataUses, 0);
  assert.equal(execution.state.audioPlaybackObservedSeconds, 0);
  assert.equal(execution.state.paidServiceCalls, 0);
  assert.equal((await stat(new URL(execution.result.rangePath, root))).size, execution.result.rangeBytes);
  assert.equal(await hash(execution.result.rangePath), execution.result.rangeSha256);
  assert.equal((await stat(new URL(execution.result.fragmentPath, root))).size, execution.result.fragmentBytes);
  assert.equal(await hash(execution.result.fragmentPath), execution.result.fragmentSha256);
  assert.equal((await stat(new URL(execution.result.boundedSourcePath, root))).size, execution.result.boundedSourceBytes);
  assert.equal(await hash(execution.result.boundedSourcePath), execution.result.boundedSourceSha256);
  assert(Math.abs(execution.result.boundedSourceDurationSeconds - plan.byteRange.indexedDurationSeconds) <= plan.localProcessing.rangeDurationToleranceSeconds);
  assert.equal(execution.result.clips.length, 2);
  for (const clip of execution.result.clips) {
    assert.equal((await stat(new URL(clip.path, root))).size, clip.bytes);
    assert.equal(await hash(clip.path), clip.sha256);
  }
  assert(Math.abs(execution.result.clips[0].durationSeconds - 62.120) <= 0.25);
  assert(Math.abs(execution.result.clips[1].durationSeconds - 316.760) <= 0.25);
}

console.log(process.argv.includes("--execution") ? "tiekoetter-range-recovery-execution-ok" : process.argv.includes("--activation") ? "tiekoetter-range-recovery-activation-ok" : "tiekoetter-range-recovery-plan-ok");
