#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const stageRoot = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-debate-19-official-podcast-recovery-17";
const planPath = `${stageRoot}/recovery-plan.json`;
const activationPath = `${stageRoot}/execution-activation.json`;
const executionPath = `${stageRoot}/execution.json`;
const analysisPath = `${stageRoot}/analysis.json`;
const read = (path) => readFile(new URL(path, root));
const readJson = async (path) => JSON.parse(await read(path));
const hash = async (path) => createHash("sha256").update(await read(path)).digest("hex");

const plan = await readJson(planPath);
assert.equal(plan.status, "frozen-one-shot-batch-09-debate-19-official-podcast-source-recovery-ready");
assert.equal(plan.batchNumber, 9);
assert.equal(plan.officialPodcast.guid, "02951d10-5549-4366-9c34-7e3e7df781e6");
assert.equal(plan.officialPodcast.enclosureBytes, 211766593);
assert.equal(plan.officialPodcast.expectedDurationSeconds, 10556);
assert.equal(plan.deterministicAlignment.uniqueCaptionAnchors, 20);
assert.equal(plan.deterministicAlignment.medianFullMinusExcerptOffsetMs, 3249960);
assert.equal(plan.deterministicAlignment.youtubeOnlySponsorDurationMs, 81919);
assert.equal(plan.deterministicAlignment.paddedPodcastClipStartMs, 3658401);
assert.equal(plan.deterministicAlignment.paddedPodcastClipEndMs, 3714560);
assert.equal(plan.deterministicAlignment.paddedPodcastClipDurationMs, 56159);
assert.equal(plan.executionPolicy.downloadAttemptsMaximum, 1);
assert.equal(plan.executionPolicy.retriesMaximum, 0);
assert.equal(plan.executionPolicy.audioPlaybackObservedSecondsMaximum, 0);
assert.equal(plan.executionPolicy.paidServiceCallsMaximum, 0);
assert.equal(plan.executionPolicy.directIncrementalCostUsdMaximum, 0);
for (const [path, expected] of Object.entries(plan.authenticatedInputs)) assert.equal(await hash(path), expected, `${path} hash mismatch`);
for (const [path, expected] of Object.entries(plan.sourceHashes)) assert.equal(await hash(path), expected, `${path} source hash mismatch`);

if (process.argv.includes("--activation") || process.argv.includes("--execution")) {
  const activation = await readJson(activationPath);
  assert.equal(activation.status, "active-for-exactly-one-batch-09-debate-19-official-podcast-source-recovery");
  assert.equal(activation.plan.path, planPath);
  assert.equal(activation.plan.sha256, await hash(planPath));
  for (const [path, expected] of Object.entries(activation.sourceHashes)) assert.equal(await hash(path), expected, `${path} activation hash mismatch`);
  assert.equal(activation.downloadAttemptsMaximum, 1);
  assert.equal(activation.retriesMaximum, 0);
}

if (process.argv.includes("--execution")) {
  const execution = await readJson(executionPath);
  const analysis = await readJson(analysisPath);
  assert.equal(execution.status, "completed-one-shot-batch-09-debate-19-official-podcast-source-and-frozen-aligned-clip");
  assert.equal(analysis.status, "batch-09-debate-19-official-podcast-source-and-caption-aligned-frozen-clip-recovered");
  assert.equal(execution.state.officialPodcastMediaDownloadAttempts, 1);
  assert.equal(execution.state.sourceBytesAccepted, plan.officialPodcast.enclosureBytes);
  assert.equal(execution.state.sourcesInstalled, 1);
  assert.equal(execution.state.clipsCreated, 1);
  assert.equal(execution.state.retries, 0);
  assert.equal(execution.state.audioPlaybackObservedSeconds, 0);
  assert.equal(execution.state.paidServiceCalls, 0);
  assert.equal((await stat(new URL(execution.result.rawCachePath, root))).size, execution.result.rawBytes);
  assert.equal(await hash(execution.result.rawCachePath), execution.result.rawSha256);
  assert.equal((await stat(new URL(execution.result.sourcePath, root))).size, execution.result.sourceBytes);
  assert.equal(await hash(execution.result.sourcePath), execution.result.sourceSha256);
  assert.equal((await stat(new URL(execution.result.clip.path, root))).size, execution.result.clip.bytes);
  assert.equal(await hash(execution.result.clip.path), execution.result.clip.sha256);
  assert(Math.abs(execution.result.sourceDurationSeconds - plan.officialPodcast.expectedDurationSeconds) <= plan.officialPodcast.durationToleranceSeconds);
  assert(Math.abs(execution.result.clip.durationSeconds - plan.deterministicAlignment.paddedPodcastClipDurationMs / 1000) <= 0.25);
  assert.equal(analysis.result.debate183SourceFailurePreservedAndDeferred, true);
}

console.log(process.argv.includes("--execution") ? "debate-19-official-podcast-source-execution-ok" : process.argv.includes("--activation") ? "debate-19-official-podcast-source-activation-ok" : "debate-19-official-podcast-source-plan-ok");
