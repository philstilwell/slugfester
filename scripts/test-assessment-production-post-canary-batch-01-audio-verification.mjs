#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const stageRoot =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/audio-verification";
const prepPath = `${stageRoot}/execution-preparation-manifest.json`;
const activationPath = `${stageRoot}/execution-manifest.json`;
const executionPath = `${stageRoot}/model-execution.json`;
const auditPath = `${stageRoot}/audio-verification.json`;
const analysisPath = `${stageRoot}/analysis.json`;
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const preparation = JSON.parse(await readFile(prepPath, "utf8"));
assert.equal(preparation.calls.length, 3);
assert.equal(preparation.costEstimate.expectedFutureExecutionCostUsd, 0.0351);
assert.equal(preparation.executionPolicy.attemptsPerCall, 1);
assert.equal(preparation.executionPolicy.retriesMaximum, 0);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `source hash mismatch: ${file}`);
}
if (!(await exists(activationPath))) {
  console.log(JSON.stringify({ status: "passed-preactivation", calls: 3, paidCalls: 0 }, null, 2));
  process.exit(0);
}

const activation = JSON.parse(await readFile(activationPath, "utf8"));
assert.equal(
  activation.status,
  "frozen-three-post-canary-batch-01-paid-known-speaker-diarizations-authorized"
);
assert.equal(activation.calls.length, 3);
assert.equal(activation.model, "gpt-4o-transcribe-diarize");
assert.equal(activation.costEstimate.maximumAuthorizedCostUsd, 0.1);
assert.equal(activation.costEstimate.explicitPaidExecutionApprovalRecorded, true);
assert.equal(activation.authorization.paidTranscriptionExecution, true);
assert.equal(activation.authorization.audioVerificationExecution, true);
assert.equal(activation.authorization.adjudicationModelExecution, false);
assert.equal(activation.authorization.scoreDerivation, false);
for (const [file, digest] of Object.entries(activation.executionToolHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `execution tool hash mismatch: ${file}`);
}
if (!(await exists(executionPath))) {
  for (const future of activation.futureOutputPathsExcludedFromSourceHashes) {
    assert.equal(await exists(future), false, `future output exists: ${future}`);
  }
  console.log(JSON.stringify({ status: "passed-activated", calls: 3, retries: 0 }, null, 2));
  process.exit(0);
}

const execution = JSON.parse(await readFile(executionPath, "utf8"));
assert.equal(execution.callsPlanned, 3);
assert.equal(execution.callsAttempted, execution.attempts);
assert.equal(execution.retries, 0);
assert.equal(execution.correctionCalls, 0);
assert.equal(execution.judgmentModelContexts, 0);
assert.equal(execution.adjudicationModelContexts, 0);
assert.equal(execution.scoresDerived, 0);
assert.equal(execution.audioPlaybackCalls, 0);
assert(execution.estimatedProcessingExposureUsd <= execution.maximumAuthorizedCostUsd);
for (const result of execution.results) {
  assert(result.attemptCount === 0 || result.attemptCount === 1);
  assert.equal(result.retryCount, 0);
  if (result.status === "completed") {
    const call = activation.calls.find(
      (item) => item.debateNumber === result.debateNumber && item.moveId === result.moveId
    );
    assert(call);
    assert.equal(sha256(await readFile(call.transcriptPath)), result.transcriptSha256);
    assert.equal(result.transcriptJsonValid, true);
  }
}
if (execution.commonRequestFailure) {
  const firstFailure = execution.results.findIndex((result) => result.status === "request-failed");
  assert(firstFailure >= 0);
  assert(
    execution.results.slice(firstFailure + 1).every(
      (result) => result.status === "skipped-after-request-failure"
    )
  );
}
if (!(await exists(analysisPath))) {
  console.log(JSON.stringify({
    status: "passed-executed",
    executionStatus: execution.status,
    callsAttempted: execution.callsAttempted,
    callsCompleted: execution.callsCompleted,
    retries: 0,
    estimatedProcessingExposureUsd: execution.estimatedProcessingExposureUsd
  }, null, 2));
  process.exit(0);
}

const [audit, analysis] = await Promise.all(
  [auditPath, analysisPath].map((file) => readFile(file, "utf8").then(JSON.parse))
);
assert.equal(audit.totals.requiredMoves, 3);
assert.equal(audit.totals.retries, 0);
assert.equal(audit.totals.judgmentModelContexts, 0);
assert.equal(audit.totals.adjudicationModelContexts, 0);
assert.equal(audit.totals.scoresDerived, 0);
assert.equal(audit.totals.audioPlaybackCalls, 0);
assert.equal(analysis.gate.requiredMoves, 3);
assert.equal(analysis.costs.retries, 0);
assert.equal(analysis.authorization.adjudicationPacketPreparation, false);
assert.equal(analysis.authorization.adjudicationModelExecution, false);
assert.equal(analysis.authorization.scoreDerivation, false);
assert.equal(analysis.authorization.productionMutation, false);
assert.equal(analysis.authorization.nextBatchSelection, false);
if (analysis.gate.passed) {
  assert.equal(
    analysis.status,
    "passed-all-three-post-canary-batch-01-confidence-moves-audio-verified"
  );
  assert.equal(analysis.gate.verified, 3);
  assert.equal(analysis.gate.unresolved, 0);
  assert.equal(
    analysis.nextAuthorizedAction,
    "user-approval-required-before-batch-01-dispute-only-adjudication-packet-preparation"
  );
} else {
  assert.equal(analysis.status, "post-canary-batch-01-audio-verification-unresolved");
  assert(analysis.gate.unresolved > 0);
}
console.log(JSON.stringify({
  status: "passed-analyzed",
  audioStatus: analysis.status,
  verified: analysis.gate.verified,
  unresolved: analysis.gate.unresolved,
  callsAttempted: execution.callsAttempted,
  callsCompleted: execution.callsCompleted,
  retries: 0,
  estimatedProcessingExposureUsd: execution.estimatedProcessingExposureUsd,
  scoresDerived: 0
}, null, 2));
