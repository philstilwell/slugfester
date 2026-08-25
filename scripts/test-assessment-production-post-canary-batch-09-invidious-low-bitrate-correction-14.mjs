#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const base = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-invidious-low-bitrate-correction-14";
const read = (path) => readFile(new URL(path, root));
const readJson = async (path) => JSON.parse(await read(path));
const hash = async (path) => createHash("sha256").update(await read(path)).digest("hex");

const plan = await readJson(`${base}/correction-plan.json`);
assert.equal(plan.status, "frozen-one-shot-batch-09-debate-183-low-bitrate-invidious-transport-correction-ready");
assert.equal(plan.batchNumber, 9);
assert.equal(plan.source.videoId, "2WrywAaDvvw");
assert.equal(plan.browserRoute.selectedOptionLabel, "audio/webm @ 59.142k - audio only");
assert.equal(plan.browserRoute.selectedOptionValue, "{\"itag\":249,\"ext\":\"webm\"}");
assert.equal(plan.browserRoute.playerMustRemainPaused, true);
assert.equal(plan.executionPolicy.downloadAttemptsMaximum, 1);
assert.equal(plan.executionPolicy.retriesMaximum, 0);
assert.equal(plan.executionPolicy.browserDownloadEventTimeoutMs, 120000);
assert.equal(plan.executionPolicy.audioPlaybackObservedSecondsMaximum, 0);
assert.equal(plan.executionPolicy.paidServiceCallsMaximum, 0);
for (const [path, expected] of Object.entries(plan.authenticatedInputs)) assert.equal(await hash(path), expected, `${path} hash mismatch`);
for (const [path, expected] of Object.entries(plan.sourceHashes)) assert.equal(await hash(path), expected, `${path} source hash mismatch`);

if (process.argv.includes("--activation") || process.argv.includes("--execution")) {
  const activation = await readJson(`${base}/execution-activation.json`);
  assert.equal(activation.status, "active-for-exactly-one-batch-09-debate-183-low-bitrate-invidious-transport-correction");
  assert.equal(activation.plan.sha256, await hash(`${base}/correction-plan.json`));
  for (const [path, expected] of Object.entries(activation.sourceHashes)) assert.equal(await hash(path), expected, `${path} activation source hash mismatch`);
}

if (process.argv.includes("--execution")) {
  const execution = await readJson(`${base}/execution.json`);
  const analysis = await readJson(`${base}/analysis.json`);
  assert.equal(execution.status, "completed-one-shot-batch-09-debate-183-low-bitrate-invidious-source-and-two-clip-recovery");
  assert.equal(analysis.status, "batch-09-debate-183-public-invidious-source-and-two-frozen-clips-recovered-after-bounded-transport-correction");
  assert.equal(execution.state.correctionAttempts, 1);
  assert.equal(execution.state.downloadAttempts, 1);
  assert.equal(execution.state.sourcesInstalled, 1);
  assert.equal(execution.state.clipsCreated, 2);
  assert.equal(execution.state.retries, 0);
  assert.equal(execution.state.audioPlaybackObservedSeconds, 0);
  assert.equal((await stat(new URL(execution.result.sourcePath, root))).size, execution.result.sourceBytes);
  assert.equal(await hash(execution.result.sourcePath), execution.result.sourceSha256);
  for (const clip of execution.result.clips) {
    assert.equal((await stat(new URL(clip.path, root))).size, clip.bytes);
    assert.equal(await hash(clip.path), clip.sha256);
  }
}

console.log(process.argv.includes("--execution") ? "invidious-low-bitrate-correction-execution-ok" : process.argv.includes("--activation") ? "invidious-low-bitrate-correction-activation-ok" : "invidious-low-bitrate-correction-plan-ok");
