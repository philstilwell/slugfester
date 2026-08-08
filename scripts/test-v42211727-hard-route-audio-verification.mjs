#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const stageRoot = "docs/calibration/v4.2.21.17.27/hard-route-audio-verification";
const manifestPath = `${stageRoot}/execution-manifest.json`;
const executionPath = `${stageRoot}/model-execution.json`;
const analysisPath = `${stageRoot}/analysis.json`;
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
if (!(await exists(manifestPath))) {
  const prep = JSON.parse(await readFile("docs/calibration/v4.2.21.17.26/hard-route-disagreement-audio-prep/audio-source-preparation.json", "utf8"));
  assert.equal(prep.status, "prepared-three-local-hard-route-audio-clips");
  assert.equal(prep.clips.length, 3);
  assert.equal(prep.authorization.paidTranscriptionManifest, true);
  console.log(JSON.stringify({ status: "passed-prefreeze", clips: 3, paidCalls: 0, scoresDerived: 0 }, null, 2));
  process.exit(0);
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
assert.equal(manifest.status, "frozen-three-paid-known-speaker-diarizations-authorized");
assert.equal(manifest.calls.length, 3);
assert.equal(manifest.executionPolicy.attemptsPerCall, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.knownSpeakerReferences, 2);
assert.equal(manifest.costEstimate.ChatGPTSubscriptionApplicable, false);
assert(manifest.costEstimate.expectedCostUsd <= 0.035);
assert.equal(manifest.costEstimate.maximumAuthorizedCostUsd, 0.1);
assert(manifest.referenceContract.references.every((reference) => reference.actualDurationSeconds >= 1.2 && reference.actualDurationSeconds <= 10));
assert.deepEqual(manifest.referenceContract.references.map((reference) => reference.speaker), ["Alex O'Connor", "Alex Carter"]);
assert.equal(manifest.authorization.adjudicationPacketPreparation, false);
assert.equal(manifest.authorization.scoreDerivation, false);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert.equal(sha256(await readFile(file)), digest, `source hash mismatch: ${file}`);
if (!(await exists(executionPath))) {
  for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assert.equal(await exists(future), false, `future output exists: ${future}`);
  console.log(JSON.stringify({ status: "passed-frozen", calls: 3, expectedCostUsd: manifest.costEstimate.expectedCostUsd, maximumAuthorizedCostUsd: 0.1, retries: 0, scoresDerived: 0 }, null, 2));
  process.exit(0);
}

const execution = JSON.parse(await readFile(executionPath, "utf8"));
assert.equal(execution.callsPlanned, 3);
assert.equal(execution.attempts, execution.callsAttempted);
assert.equal(execution.retries, 0);
assert.equal(execution.scoresDerived, 0);
assert(execution.estimatedProcessingExposureUsd <= execution.maximumAuthorizedCostUsd);
if (execution.commonRequestFailure) {
  const firstFailure = execution.results.findIndex((result) => result.status === "request-failed");
  assert(firstFailure >= 0);
  assert(execution.results.slice(firstFailure + 1).every((result) => result.status === "skipped-after-request-failure"));
}
if (!(await exists(analysisPath))) {
  console.log(JSON.stringify({ status: "passed-executed", executionStatus: execution.status, callsAttempted: execution.callsAttempted, callsCompleted: execution.callsCompleted, retries: 0, scoresDerived: 0 }, null, 2));
  process.exit(0);
}

const analysis = JSON.parse(await readFile(analysisPath, "utf8"));
const audit = JSON.parse(await readFile(`${stageRoot}/audio-verification.json`, "utf8"));
assert.equal(analysis.gate.requiredMoves, 3);
assert.equal(analysis.costs.retries, 0);
assert.equal(analysis.authorization.scoreDerivation, false);
assert.equal(analysis.authorization.all195Debates, false);
assert.equal(audit.totals.scoresDerived, 0);
if (analysis.gate.passed) {
  assert.equal(analysis.status, "passed-all-three-hard-route-confidence-moves-audio-verified");
  assert.equal(analysis.gate.verified, 3);
  assert.equal(analysis.gate.unresolved, 0);
  assert.equal(analysis.authorization.adjudicationPacketPreparation, true);
  for (const move of audit.debates[0].moves) {
    assert.equal(move.status, "verified");
    assert(Object.values(move.deterministicEvidence.checks).every(Boolean));
    assert.equal(sha256(await readFile(move.transcript.path)), move.transcript.sha256);
  }
} else {
  assert.equal(analysis.status, "hard-route-audio-verification-unresolved");
  assert.equal(analysis.authorization.adjudicationPacketPreparation, false);
}
console.log(JSON.stringify({ status: "passed-analyzed", audioStatus: analysis.status, verified: analysis.gate.verified, unresolved: analysis.gate.unresolved, estimatedProcessingExposureUsd: analysis.costs.estimatedProcessingExposureUsd, retries: 0, scoresDerived: 0 }, null, 2));
