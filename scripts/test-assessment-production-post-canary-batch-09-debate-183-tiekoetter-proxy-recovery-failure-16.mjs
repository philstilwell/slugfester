#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const dir = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-tiekoetter-proxy-recovery-16";
const diagnosisPath = `${dir}/failure-diagnosis.json`;
const read = (path) => readFile(new URL(path, root));
const readJson = async (path) => JSON.parse(await read(path));
const hash = async (path) => createHash("sha256").update(await read(path)).digest("hex");

const diagnosis = await readJson(diagnosisPath);
assert.equal(diagnosis.status, "frozen-batch-09-debate-183-final-public-proxy-transfer-termination-diagnosed-stop-required");
assert.equal(diagnosis.batchNumber, 9);
for (const [path, expected] of Object.entries(diagnosis.authenticatedRecords)) assert.equal(await hash(path), expected, `${path} hash mismatch`);
const execution = await readJson(diagnosis.records.executionPath);
const analysis = await readJson(diagnosis.records.analysisPath);
assert.equal(execution.status, "preserved-final-batch-09-debate-183-tiekoetter-proxy-source-recovery-failure");
assert.equal(analysis.status, "batch-09-debate-183-final-authorized-public-proxy-recovery-failed-stop-required");
assert.equal(execution.state.attempts, 1);
assert.equal(execution.state.proxyMediaDownloadAttempts, 1);
assert.equal(execution.state.sourceBytesAccepted, 257390);
assert.equal(execution.state.sourcesInstalled, 0);
assert.equal(execution.state.clipsCreated, 0);
assert.equal(execution.state.retries, 0);
assert.equal(execution.state.redirectFollows, 0);
assert.equal(execution.state.cookiesSent, 0);
assert.equal(execution.state.accountDataUses, 0);
assert.equal(execution.state.audioPlaybackObservedSeconds, 0);
assert.equal(execution.state.modelContexts, 0);
assert.equal(execution.state.paidServiceCalls, 0);
assert.equal(execution.failure.name, "TypeError");
assert.equal(execution.failure.message, "terminated");
assert.equal(analysis.result.debate19RemainsUnattempted, true);
assert.equal((await stat(new URL(diagnosis.partial.path, root))).size, diagnosis.partial.bytes);
assert.equal(await hash(diagnosis.partial.path), diagnosis.partial.sha256);
assert.equal(diagnosis.stopRule.furtherDebate183SourceRecoveryAuthorized, false);
assert.equal(diagnosis.stopRule.debate19ContinuationAuthorizedAfterFailure, false);
assert.equal(diagnosis.preservedControls.directIncrementalCostUsd, 0);

console.log("tiekoetter-proxy-recovery-failure-diagnosis-ok");
