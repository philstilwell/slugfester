#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const stageRoot = "docs/assessment-production/post-canary-continuation-v1/batch-04/audio-verification";
const paths = {
  preparation: `${stageRoot}/execution-preparation-manifest.json`,
  activation: `${stageRoot}/execution-manifest.json`,
  execution: `${stageRoot}/model-execution.json`,
  audit: `${stageRoot}/audio-verification.json`,
  analysis: `${stageRoot}/analysis.json`,
  cost: `${stageRoot}/cost-control-analysis.json`
};
const expectedMoves = [
  "con-secular-moral-reasoning",
  "con-concepts-prior-causes-not-randomness",
  "con-necessary-physical-continuity",
  "con-necessity-stopping-point"
];
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const preparation = JSON.parse(await readFile(paths.preparation, "utf8"));

assert.equal(preparation.calls.length, 4);
assert.deepEqual(preparation.calls.map((call) => call.moveId), expectedMoves);
assert.equal(preparation.costEstimate.primaryExpectedFutureExecutionCostUsd, 0.12208);
assert.equal(preparation.costEstimate.maximumConditionallyAuthorizedCostUsd, 1);
assert.equal(preparation.executionPolicy.attemptsPerCall, 1);
assert.equal(preparation.executionPolicy.retriesMaximum, 0);
assert.equal(preparation.executionPolicy.sequentialExecution, true);
assert.equal(preparation.executionPolicy.stopRemainingAfterRequestLevelFailure, true);
assert.equal(preparation.executionPolicy.stopRemainingAfterUsageDerivedCapExceedance, true);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `source hash mismatch: ${file}`);
}
if (!(await exists(paths.activation))) {
  console.log(JSON.stringify({ status: "passed-preactivation", calls: 4, paidCalls: 0 }, null, 2));
  process.exit(0);
}

const activation = JSON.parse(await readFile(paths.activation, "utf8"));
assert.equal(activation.status, "frozen-four-post-canary-batch-04-paid-known-speaker-diarizations-authorized-under-standing-authorization");
assert.equal(activation.calls.length, 4);
assert.equal(activation.model, "gpt-4o-transcribe-diarize");
assert.equal(activation.costEstimate.maximumAuthorizedCostUsd, 1);
assert.equal(activation.costEstimate.conditionalAdvanceApprovalRecorded, true);
assert.equal(activation.authorization.paidTranscriptionExecution, true);
assert.equal(activation.authorization.audioVerificationExecution, true);
assert.equal(activation.authorization.adjudicationModelExecution, false);
assert.equal(activation.authorization.scoreDerivation, false);
assert.equal(activation.userExecutionAuthorization.returnedTokenUsageCostControlRequired, true);
assert.equal(activation.canonicalSourceGate.transcriptHashesVerified, 3);
assert.equal(activation.canonicalSourceGate.eventHashesVerified, 3);
assert.equal(activation.canonicalSourceGate.manifestHashesVerified, 3);
assert.equal(activation.canonicalSourceGate.dyadicDebatesVerified, 3);
for (const [file, digest] of Object.entries(activation.executionToolHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `execution tool hash mismatch: ${file}`);
}
if (!(await exists(paths.execution))) {
  for (const future of activation.futureOutputPathsExcludedFromSourceHashes) {
    assert.equal(await exists(future), false, `future output exists: ${future}`);
  }
  console.log(JSON.stringify({ status: "passed-activated", calls: 4, retries: 0, maximumAuthorizedCostUsd: 1 }, null, 2));
  process.exit(0);
}

const execution = JSON.parse(await readFile(paths.execution, "utf8"));
assert.equal(execution.callsPlanned, 4);
assert.equal(execution.results.length, 4);
assert.deepEqual(execution.results.map((result) => result.moveId), expectedMoves);
assert.equal(execution.callsAttempted, execution.attempts);
assert.ok(execution.callsAttempted <= 4);
assert.equal(execution.callsCompleted + execution.callsSkipped + execution.results.filter((result) => result.status === "request-failed").length, 4);
assert.equal(execution.retries, 0);
assert.equal(execution.correctionCalls, 0);
assert.equal(execution.judgmentModelContexts, 0);
assert.equal(execution.adjudicationModelContexts, 0);
assert.equal(execution.scoresDerived, 0);
assert.equal(execution.audioPlaybackCalls, 0);
assert.equal(execution.semanticAudioEvaluations, 0);
assert.equal(execution.maximumAuthorizedCostUsd, 1);
for (const result of execution.results) {
  assert.ok(result.attemptCount === 0 || result.attemptCount === 1);
  assert.equal(result.retryCount, 0);
  if (result.status === "completed") {
    const call = activation.calls.find((item) => item.debateNumber === result.debateNumber && item.moveId === result.moveId);
    assert.ok(call);
    assert.equal(sha256(await readFile(call.transcriptPath)), result.transcriptSha256);
    assert.equal(result.transcriptJsonValid, true);
    assert.equal(result.usageValid, true);
    assert.ok(result.usage.inputTokens > 0);
    assert.ok(result.usage.outputTokens > 0);
    assert.equal(result.usage.totalTokens, result.usage.inputTokens + result.usage.outputTokens);
  }
}
if (!execution.requestFailure && !execution.costCapReachedOrExceeded) {
  assert.equal(execution.callsAttempted, 4);
  assert.equal(execution.callsCompleted, 4);
  assert.equal(execution.callsSkipped, 0);
}
if (execution.requestFailure || execution.costCapReachedOrExceeded) {
  const stoppingIndex = execution.results.findIndex((result) => result.status === "request-failed" || result.costCapReachedOrExceededAfterCall);
  assert.ok(stoppingIndex >= 0);
  assert.ok(execution.results.slice(stoppingIndex + 1).every((result) => result.attemptCount === 0));
}
assert.equal(execution.directIncrementalCostCapControlPassed, execution.usageDerivedEstimatedCostUsd <= execution.maximumAuthorizedCostUsd);

if (!(await exists(paths.analysis))) {
  console.log(JSON.stringify({
    status: "passed-executed",
    executionStatus: execution.status,
    callsAttempted: execution.callsAttempted,
    callsCompleted: execution.callsCompleted,
    callsSkipped: execution.callsSkipped,
    retries: 0,
    usageDerivedEstimatedCostUsd: execution.usageDerivedEstimatedCostUsd,
    maximumAuthorizedCostUsd: execution.maximumAuthorizedCostUsd
  }, null, 2));
  process.exit(0);
}

const [audit, analysis] = await Promise.all([paths.audit, paths.analysis].map((file) => readFile(file, "utf8").then(JSON.parse)));
assert.equal(audit.totals.requiredMoves, 4);
assert.equal(audit.totals.verified + audit.totals.unresolved, 4);
assert.equal(audit.totals.retries, 0);
assert.equal(audit.totals.judgmentModelContexts, 0);
assert.equal(audit.totals.adjudicationModelContexts, 0);
assert.equal(audit.totals.scoresDerived, 0);
assert.equal(audit.totals.audioPlaybackCalls, 0);
assert.equal(audit.totals.semanticAudioEvaluations, 0);
assert.equal(analysis.gate.requiredMoves, 4);
assert.equal(analysis.gate.verified + analysis.gate.unresolved, 4);
assert.equal(analysis.costs.retries, 0);
assert.equal(analysis.authorization.adjudicationPacketPreparation, analysis.gate.passed);
assert.equal(analysis.authorization.adjudicationModelExecution, false);
assert.equal(analysis.authorization.scoreDerivation, false);
assert.equal(analysis.authorization.productionMutation, false);
assert.equal(analysis.authorization.nextBatchSelection, false);
if (analysis.gate.passed) {
  assert.equal(analysis.status, "passed-all-four-post-canary-batch-04-confidence-moves-audio-verified");
  assert.equal(analysis.gate.verified, 4);
  assert.equal(analysis.gate.unresolved, 0);
} else {
  assert.ok(["post-canary-batch-04-audio-verification-unresolved", "post-canary-batch-04-audio-verification-incomplete"].includes(analysis.status));
  assert.ok(analysis.gate.unresolved > 0);
}

if (!(await exists(paths.cost))) {
  console.log(JSON.stringify({
    status: "passed-analyzed",
    audioStatus: analysis.status,
    verified: analysis.gate.verified,
    unresolved: analysis.gate.unresolved,
    callsAttempted: execution.callsAttempted,
    callsCompleted: execution.callsCompleted,
    retries: 0,
    usageDerivedEstimatedCostUsd: execution.usageDerivedEstimatedCostUsd,
    scoresDerived: 0
  }, null, 2));
  process.exit(0);
}

const cost = JSON.parse(await readFile(paths.cost, "utf8"));
assert.equal(cost.costControl.approvedMaximumCostUsd, 1);
assert.equal(cost.costControl.usageDerivedPlanningEstimateUsd, 0.12208);
assert.equal(cost.costControl.usageDerivedEstimatedCostUsd, execution.usageDerivedEstimatedCostUsd);
assert.equal(cost.costControl.approvedCapExceeded, execution.usageDerivedEstimatedCostUsd > 1);
assert.equal(cost.costControl.directIncrementalCostCapControlPassed, execution.usageDerivedEstimatedCostUsd <= 1);
assert.equal(cost.calls.length, execution.callsCompleted);
assert.equal(cost.executionBoundary.paidCallsAddedByCostAnalysis, 0);
assert.equal(cost.executionBoundary.modelCallsAddedByCostAnalysis, 0);
assert.equal(cost.executionBoundary.audioPlaybackCalls, 0);
assert.equal(cost.executionBoundary.semanticAudioEvaluations, 0);
assert.equal(cost.executionBoundary.retries, 0);
assert.equal(cost.executionBoundary.judgmentModelContexts, 0);
assert.equal(cost.executionBoundary.adjudicationModelContexts, 0);
assert.equal(cost.executionBoundary.scoresDerived, 0);
assert.equal(
  cost.authorization.adjudicationPacketPreparation,
  analysis.gate.passed && !cost.costControl.approvedCapExceeded
);
assert.equal(
  Object.entries(cost.authorization)
    .filter(([key]) => key !== "adjudicationPacketPreparation")
    .every(([, value]) => value === false),
  true
);
for (const [file, digest] of Object.entries(cost.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `cost-control source hash mismatch: ${file}`);
}
assert.equal(cost.nextAuthorizedAction, analysis.nextAuthorizedAction);

console.log(JSON.stringify({
  status: "passed-complete",
  audioStatus: analysis.status,
  verified: analysis.gate.verified,
  unresolved: analysis.gate.unresolved,
  callsAttempted: execution.callsAttempted,
  callsCompleted: execution.callsCompleted,
  callsSkipped: execution.callsSkipped,
  retries: 0,
  usageDerivedPlanningEstimateUsd: cost.costControl.usageDerivedPlanningEstimateUsd,
  usageDerivedEstimatedCostUsd: cost.costControl.usageDerivedEstimatedCostUsd,
  approvedMaximumCostUsd: cost.costControl.approvedMaximumCostUsd,
  approvedCapExceeded: cost.costControl.approvedCapExceeded,
  judgmentModelContexts: 0,
  adjudicationModelContexts: 0,
  scoresDerived: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction
}, null, 2));
