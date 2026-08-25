#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const base = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-youtube-format139-recovery-15";
const read = (path) => readFile(new URL(path, root));
const readJson = async (path) => JSON.parse(await read(path));
const hash = async (path) => createHash("sha256").update(await read(path)).digest("hex");

const execution = await readJson(`${base}/execution.json`);
const analysis = await readJson(`${base}/analysis.json`);
const diagnosis = await readJson(`${base}/failure-diagnosis.json`);
assert.equal(execution.status, "preserved-one-shot-batch-09-debate-183-youtube-format139-download-failure");
assert.equal(execution.planSha256, await hash(`${base}/recovery-plan.json`));
assert.equal(execution.activationSha256, await hash(`${base}/execution-activation.json`));
assert.equal(execution.state.attempts, 1);
assert.equal(execution.state.ytDlpCliInvocations, 1);
assert.equal(execution.state.downloadAttempts, 1);
assert.equal(execution.state.downloadsCompleted, 0);
assert.equal(execution.state.retries, 0);
assert.match(execution.failure.stderr, /HTTP Error 403: Forbidden/);
assert.equal(analysis.status, "batch-09-debate-183-youtube-format139-download-failed-preserved");
assert.equal(diagnosis.status, "frozen-batch-09-debate-183-exact-youtube-direct-source-http-403-failure-diagnosed-stop-required");
assert.equal(diagnosis.authenticatedRecords.recoveryPlanSha256, execution.planSha256);
assert.equal(diagnosis.authenticatedRecords.executionActivationSha256, execution.activationSha256);
assert.equal(diagnosis.diagnosis.httpStatus, 403);
assert.equal(diagnosis.diagnosis.downloadedBytesAccepted, 0);
assert.equal(diagnosis.stopRule.newUserApprovalRequired, true);
assert.deepEqual(await readdir(new URL(".assessment-cache/audio-source-mirrors/youtube-direct/2WrywAaDvvw", root)), []);

console.log("debate-183-youtube-format139-failure-preserved-ok");
