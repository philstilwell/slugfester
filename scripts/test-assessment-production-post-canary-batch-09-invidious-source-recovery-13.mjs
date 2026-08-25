#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const planPath = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-invidious-recovery-13/recovery-plan.json";
const activationPath = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-invidious-recovery-13/execution-activation.json";
const executionPath = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-invidious-recovery-13/execution.json";
const analysisPath = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-invidious-recovery-13/analysis.json";
const read = (path) => readFile(new URL(path, root));
const readJson = async (path) => JSON.parse(await read(path));
const hash = async (path) => createHash("sha256").update(await read(path)).digest("hex");

const plan = await readJson(planPath);
assert.equal(plan.status, "frozen-one-shot-batch-09-debate-183-paused-invidious-download-recovery-ready");
assert.equal(plan.batchNumber, 9);
assert.equal(plan.source.videoId, "2WrywAaDvvw");
assert.equal(plan.browserRoute.selectedOptionLabel, "audio/webm @ 166.382k - audio only");
assert.equal(plan.browserRoute.playerMustRemainPaused, true);
assert.equal(plan.executionPolicy.downloadAttemptsMaximum, 1);
assert.equal(plan.executionPolicy.retriesMaximum, 0);
assert.equal(plan.executionPolicy.audioPlaybackObservedSecondsMaximum, 0);
assert.equal(plan.executionPolicy.paidServiceCallsMaximum, 0);
for (const [path, expected] of Object.entries(plan.authenticatedInputs)) assert.equal(await hash(path), expected, `${path} hash mismatch`);
for (const [path, expected] of Object.entries(plan.sourceHashes)) assert.equal(await hash(path), expected, `${path} source hash mismatch`);

if (process.argv.includes("--activation") || process.argv.includes("--execution")) {
  const activation = await readJson(activationPath);
  assert.equal(activation.status, "active-for-exactly-one-batch-09-debate-183-paused-invidious-download-recovery");
  assert.equal(activation.plan.path, planPath);
  assert.equal(activation.plan.sha256, await hash(planPath));
  for (const [path, expected] of Object.entries(activation.sourceHashes)) assert.equal(await hash(path), expected, `${path} activation source hash mismatch`);
}

if (process.argv.includes("--execution")) {
  const execution = await readJson(executionPath);
  const analysis = await readJson(analysisPath);
  assert.equal(execution.status, "completed-one-shot-batch-09-debate-183-paused-invidious-source-and-two-clip-recovery");
  assert.equal(analysis.status, "batch-09-debate-183-public-invidious-source-and-two-frozen-clips-recovered");
  assert.equal(execution.state.downloadAttempts, 1);
  assert.equal(execution.state.sourcesInstalled, 1);
  assert.equal(execution.state.clipsCreated, 2);
  assert.equal(execution.state.audioPlaybackObservedSeconds, 0);
  assert.equal((await stat(new URL(execution.result.sourcePath, root))).size, execution.result.sourceBytes);
  assert.equal(await hash(execution.result.sourcePath), execution.result.sourceSha256);
  for (const clip of execution.result.clips) {
    assert.equal((await stat(new URL(clip.path, root))).size, clip.bytes);
    assert.equal(await hash(clip.path), clip.sha256);
  }
}

console.log(process.argv.includes("--execution") ? "invidious-recovery-execution-ok" : process.argv.includes("--activation") ? "invidious-recovery-activation-ok" : "invidious-recovery-plan-ok");
