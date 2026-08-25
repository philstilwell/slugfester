#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const planPath = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-archive-mirror-recovery-12/recovery-plan.json";
const activationPath = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-archive-mirror-recovery-12/execution-activation.json";
const executionPath = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-archive-mirror-recovery-12/execution.json";
const analysisPath = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-archive-mirror-recovery-12/analysis.json";
const read = (path) => readFile(new URL(path, root));
const readJson = async (path) => JSON.parse(await read(path));
const hash = async (path, algorithm = "sha256") => createHash(algorithm).update(await read(path)).digest("hex");

const plan = await readJson(planPath);
assert.equal(plan.status, "frozen-one-shot-batch-09-debate-170-canonical-archive-mirror-recovery-ready");
assert.equal(plan.batchNumber, 9);
assert.equal(plan.archiveMirror.identifier, "youtube-HoTILnpd3q8");
assert.equal(plan.archiveMirror.fileName, "HoTILnpd3q8.mp4");
assert.equal(plan.archiveMirror.fileBytes, 1220045661);
assert.equal(plan.archiveMirror.md5, "1dc9c00ced2cb28375c06457222d8f0a");
assert.equal(plan.archiveMirror.sha1, "18edc94dab97a981806b343c1a54044ff84e82bf");
assert.equal(plan.executionPolicy.downloadAttemptsMaximum, 1);
assert.equal(plan.executionPolicy.retriesMaximum, 0);
assert.equal(plan.executionPolicy.audioPlaybackObservedSecondsMaximum, 0);
assert.equal(plan.executionPolicy.paidServiceCallsMaximum, 0);
assert.equal(plan.executionPolicy.directIncrementalCostUsdMaximum, 0);
for (const [path, expected] of Object.entries(plan.authenticatedInputs)) assert.equal(await hash(path), expected, `${path} hash mismatch`);
for (const [path, expected] of Object.entries(plan.sourceHashes)) assert.equal(await hash(path), expected, `${path} source hash mismatch`);

if (process.argv.includes("--activation") || process.argv.includes("--execution")) {
  const activation = await readJson(activationPath);
  assert.equal(activation.status, "active-for-exactly-one-batch-09-debate-170-canonical-archive-mirror-recovery");
  assert.equal(activation.plan.path, planPath);
  assert.equal(activation.plan.sha256, await hash(planPath));
  for (const [path, expected] of Object.entries(activation.sourceHashes)) assert.equal(await hash(path), expected, `${path} activation hash mismatch`);
  assert.equal(activation.downloadAttemptsMaximum, 1);
  assert.equal(activation.retriesMaximum, 0);
}

if (process.argv.includes("--execution")) {
  const execution = await readJson(executionPath);
  const analysis = await readJson(analysisPath);
  assert.equal(execution.status, "completed-one-shot-batch-09-debate-170-canonical-archive-mirror-source-and-clip-recovery");
  assert.equal(analysis.status, "batch-09-debate-170-canonical-archive-mirror-source-and-frozen-clip-recovered");
  assert.equal(execution.state.archiveMediaDownloadAttempts, 1);
  assert.equal(execution.state.sourceBytesAccepted, 1220045661);
  assert.equal(execution.state.sourcesInstalled, 1);
  assert.equal(execution.state.clipsCreated, 1);
  assert.equal(execution.state.audioPlaybackObservedSeconds, 0);
  assert.equal(execution.state.paidServiceCalls, 0);
  assert.equal(execution.result.archiveFile.md5, plan.archiveMirror.md5);
  assert.equal(execution.result.archiveFile.sha1, plan.archiveMirror.sha1);
  assert.equal((await stat(new URL(execution.result.sourcePath, root))).size, execution.result.sourceBytes);
  assert.equal(await hash(execution.result.sourcePath), execution.result.sourceSha256);
  assert.equal((await stat(new URL(execution.result.clipPath, root))).size, execution.result.clipBytes);
  assert.equal(await hash(execution.result.clipPath), execution.result.clipSha256);
  assert(Math.abs(execution.result.sourceDurationSeconds - 6365) <= 12);
  assert(Math.abs(execution.result.clipDurationSeconds - 213.87) <= 0.25);
}

console.log(process.argv.includes("--execution") ? "archive-mirror-recovery-execution-ok" : process.argv.includes("--activation") ? "archive-mirror-recovery-activation-ok" : "archive-mirror-recovery-plan-ok");
