#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const stage = "docs/assessment-production/post-canary-continuation-v1/batch-09/audio-verification-debate-183-21";
const diagnosis = JSON.parse(await readFile(`${stage}/failure-diagnosis.json`));
const hash = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");
assert.equal(diagnosis.status, "frozen-batch-09-debate-183-informed-deliberator-audio-verification-threshold-failure-diagnosed-stop-required");
for (const [path, expected] of Object.entries(diagnosis.authenticatedRecords)) assert.equal(await hash(path), expected, `${path}: hash mismatch`);
assert.equal(diagnosis.execution.callsAttempted, 2);
assert.equal(diagnosis.execution.callsCompleted, 2);
assert.equal(diagnosis.execution.requestFailures, 0);
assert.equal(diagnosis.execution.retries, 0);
assert.equal(diagnosis.execution.cumulativeBatch9UsageDerivedCostUsd, 0.224845);
assert.equal(diagnosis.execution.withinAuthorizedCap, true);
assert.equal(diagnosis.acceptedResult.status, "verified");
assert.equal(diagnosis.unresolvedResult.moveId, "con-informed-deliberator-method");
assert.equal(diagnosis.unresolvedResult.status, "unresolved");
assert.equal(diagnosis.unresolvedResult.checks.fullClipExcerptRecovered, true);
assert.equal(diagnosis.unresolvedResult.checks.expectedSpeakerExcerptRecovered, false);
assert.equal(diagnosis.unresolvedResult.checks.expectedSpeakerRecallDistinct, true);
assert.equal(diagnosis.unresolvedResult.checks.expectedSpeakerDurationSufficient, true);
assert.equal(diagnosis.unresolvedResult.soleFailedCheck, "expectedSpeakerExcerptRecovered");
assert.equal(diagnosis.diagnosis.requestOrTransportFailure, false);
assert.equal(diagnosis.diagnosis.thresholdOrValidatorChanged, false);
assert.equal(diagnosis.preservedControls.transcriptionRetryAuthorized, false);
assert.equal(diagnosis.preservedControls.adjudicationAuthorized, false);
console.log("batch-09-debate-183-audio-verification-failure-diagnosis-ok");
