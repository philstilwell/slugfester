#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const base = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-invidious-recovery-13";
const read = (path) => readFile(new URL(path, root));
const readJson = async (path) => JSON.parse(await read(path));
const hash = async (path) => createHash("sha256").update(await read(path)).digest("hex");
const exists = async (path) => stat(new URL(path, root)).then(() => true, () => false);

const execution = await readJson(`${base}/execution.json`);
const diagnosis = await readJson(`${base}/failure-diagnosis.json`);
const analysis = await readJson(`${base}/analysis.json`);
assert.equal(execution.status, "preserved-one-shot-batch-09-debate-183-invidious-download-event-timeout");
assert.equal(execution.planSha256, await hash(`${base}/recovery-plan.json`));
assert.equal(execution.activationSha256, await hash(`${base}/execution-activation.json`));
assert.equal(execution.state.attempts, 1);
assert.equal(execution.state.downloadAttempts, 1);
assert.equal(execution.state.downloadsCompleted, 0);
assert.equal(execution.state.retries, 0);
assert.equal(execution.state.timeoutExtensions, 0);
assert.equal(execution.state.audioPlaybackObservedSeconds, 0);
assert.equal(execution.failure.category, "browser-download-event-transport-timeout");
assert.equal(diagnosis.status, "frozen-batch-09-debate-183-high-bitrate-invidious-browser-download-timeout-diagnosed");
assert.equal(diagnosis.authenticatedRecords.recoveryPlanSha256, execution.planSha256);
assert.equal(diagnosis.authenticatedRecords.executionActivationSha256, execution.activationSha256);
assert.equal(diagnosis.boundedRecoveryFinding.minimumFormatValue, "{\"itag\":249,\"ext\":\"webm\"}");
assert.equal(diagnosis.boundedRecoveryFinding.attemptsMaximum, 1);
assert.equal(diagnosis.boundedRecoveryFinding.retriesMaximum, 0);
assert.equal(analysis.status, "batch-09-debate-183-invidious-download-timeout-preserved-and-diagnosed");
assert.equal(await exists(".assessment-cache/audio-source-mirrors/invidious-nerdvpn/2WrywAaDvvw/source.webm"), false);
assert.equal(await exists("output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-183/audio/source.mp3"), false);
assert.equal(await exists("output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-183/clips/con-informed-deliberator-method.mp3"), false);
assert.equal(await exists("output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-183/clips/con-foundational-anomaly-significance.mp3"), false);

console.log("invidious-recovery-failure-preserved-ok");
