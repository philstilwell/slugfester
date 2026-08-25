#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const base = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-youtube-format139-recovery-15";
const read = (path) => readFile(new URL(path, root));
const readJson = async (path) => JSON.parse(await read(path));
const hash = async (path) => createHash("sha256").update(await read(path)).digest("hex");

const plan = await readJson(`${base}/recovery-plan.json`);
assert.equal(plan.status, "frozen-one-shot-batch-09-debate-183-youtube-format139-public-source-recovery-ready");
assert.equal(plan.source.videoId, "2WrywAaDvvw");
assert.equal(plan.transport.formatId, "139");
assert.equal(plan.executionPolicy.downloadAttemptsMaximum, 1);
assert.equal(plan.executionPolicy.retriesMaximum, 0);
assert.equal(plan.executionPolicy.audioPlaybackCallsMaximum, 0);
assert.equal(plan.executionPolicy.paidServiceCallsMaximum, 0);
for (const [path, expected] of Object.entries(plan.authenticatedInputs)) assert.equal(await hash(path), expected, `${path} hash mismatch`);
for (const [path, expected] of Object.entries(plan.sourceHashes)) assert.equal(await hash(path), expected, `${path} source hash mismatch`);

if (process.argv.includes("--activation") || process.argv.includes("--execution")) {
  const activation = await readJson(`${base}/execution-activation.json`);
  assert.equal(activation.status, "active-for-exactly-one-batch-09-debate-183-youtube-format139-public-source-recovery");
  assert.equal(activation.plan.sha256, await hash(`${base}/recovery-plan.json`));
  for (const [path, expected] of Object.entries(activation.sourceHashes)) assert.equal(await hash(path), expected, `${path} activation source hash mismatch`);
}

if (process.argv.includes("--execution")) {
  const execution = await readJson(`${base}/execution.json`);
  const analysis = await readJson(`${base}/analysis.json`);
  assert.equal(execution.status, "completed-one-shot-batch-09-debate-183-youtube-format139-public-source-download");
  assert.equal(analysis.status, "batch-09-debate-183-exact-youtube-format139-source-downloaded-for-local-finalization");
  assert.equal(execution.state.ytDlpCliInvocations, 1);
  assert.equal(execution.state.downloadAttempts, 1);
  assert.equal(execution.state.downloadsCompleted, 1);
  assert.equal(execution.state.retries, 0);
  assert.equal((await stat(new URL(execution.result.rawPath, root))).size, execution.result.rawBytes);
  assert.equal(await hash(execution.result.rawPath), execution.result.rawSha256);
}

console.log(process.argv.includes("--execution") ? "debate-183-youtube-format139-execution-ok" : process.argv.includes("--activation") ? "debate-183-youtube-format139-activation-ok" : "debate-183-youtube-format139-plan-ok");
