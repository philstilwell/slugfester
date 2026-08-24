#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const root = "docs/assessment-production/post-canary-continuation-v1/batch-08/audio-verification";
const activation = JSON.parse(await readFile(`${root}/resolution-execution-activation.json`, "utf8"));
const execution = JSON.parse(await readFile(activation.outputs.execution, "utf8"));
const audit = JSON.parse(await readFile(activation.outputs.audit, "utf8"));
const analysis = JSON.parse(await readFile(activation.outputs.analysis, "utf8"));
const cost = JSON.parse(await readFile(activation.outputs.cost, "utf8"));
const originalAudit = JSON.parse(await readFile(`${root}/audio-verification.json`, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(execution.status, "passed-all-six-batch-08-audio-attributions-after-transient-reference-overlays");
assert.equal(execution.deterministicPassesAttempted, 1);
assert.equal(execution.deterministicPassesCompleted, 1);
assert.equal(execution.completeCohortReplaysAttempted, 1);
assert.equal(execution.completeCohortReplaysCompleted, 1);
assert.equal(execution.retries, 0);
assert.equal(execution.reruns, 0);
assert.equal(execution.referenceOverlayApplications, 3);
assert.equal(execution.structuralOverlayApplications, 1);
assert.equal(execution.verified, 6);
assert.equal(execution.unresolved, 0);
assert.equal(execution.originalTranscriptsUnchanged, true);
assert.equal(execution.persistentProtectedWrites, 0);
assert.equal(execution.validationFailure, null);
assert.equal(execution.gateAcceptancePassed, true);

assert.equal(audit.status, execution.status);
assert.equal(audit.corrections.referenceOverlays.length, 3);
assert.equal(audit.totals.requiredMoves, 6);
assert.equal(audit.totals.verified, 6);
assert.equal(audit.totals.unresolved, 0);
assert.equal(audit.totals.newPaidCalls, 0);
const moves = audit.debates.flatMap((debate) => debate.moves);
assert.equal(moves.length, 6);
assert.equal(moves.filter((move) => move.status === "verified").length, 6);
assert.equal(moves.filter((move) => move.transientReferenceOverlay).length, 3);
assert.equal(moves.filter((move) => move.structuralValidationOverlay).length, 1);
for (const move of moves) {
  assert.equal(move.resolvedSpeaker, move.expectedSpeaker);
  assert.equal(move.deterministicEvidence.checks.fullClipExcerptRecovered, true);
  assert.equal(move.deterministicEvidence.checks.expectedSpeakerExcerptRecovered, true);
  assert.equal(move.deterministicEvidence.checks.expectedSpeakerRecallDistinct, true);
  assert.equal(move.deterministicEvidence.checks.expectedSpeakerDurationSufficient, true);
  assert.equal(move.transcript.persistentMutation, false);
}

assert.equal(analysis.gate.passed, true);
assert.equal(analysis.gate.deterministicReplayComplete, true);
assert.equal(analysis.gate.verified, 6);
assert.equal(analysis.gate.unresolved, 0);
assert.equal(analysis.gate.exactValidatorPreserved, true);
assert.equal(analysis.gate.exactThresholdsPreserved, true);
assert.equal(analysis.gate.originalTranscriptsPreserved, true);
assert.equal(analysis.gate.originalReferencesPreserved, true);
assert.equal(analysis.gate.persistentProtectedWrites, 0);

assert.equal(cost.costControl.priorUsageDerivedEstimatedCostUsd, 0.156225);
assert.equal(cost.costControl.newUsageDerivedEstimatedCostUsd, 0);
assert.equal(cost.costControl.aggregateUsageDerivedEstimatedCostUsd, 0.156225);
assert.equal(cost.costControl.approvedMaximumCostUsd, 1);
assert.equal(cost.costControl.approvedCapExceeded, false);
assert.equal(cost.executionBoundary.paidCallsAddedByCorrection, 0);
assert.equal(cost.executionBoundary.modelCallsAddedByCorrection, 0);
assert.equal(cost.workflowDisposition.downstreamWorkflowBlocked, false);

assert.equal(originalAudit.totals.verified, 3);
assert.equal(originalAudit.totals.unresolved, 3);
for (const lock of activation.transcriptLocks) {
  assert.equal(sha256(await readFile(lock.path)), lock.sha256, `${lock.moveId}: transcript changed`);
}
for (const [file, digest] of Object.entries(cost.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: correction source changed`);
}
for (const key of ["audioAccesses", "modelOrApiCalls", "paidServiceCalls", "directIncrementalCostUsd", "scoresDerived", "productionMutations", "nextBatchSelections"]) {
  assert.equal(execution[key], 0, `execution ${key}`);
}
assert.equal(
  execution.nextAuthorizedAction,
  "prepare-freeze-and-activate-batch-08-dispute-only-adjudication-packets-under-continuation-standing-authorization",
);

console.log(JSON.stringify({
  status: "passed-complete-batch-08-audio-resolution-cohort",
  requiredMoves: 6,
  verified: 6,
  unresolved: 0,
  referenceOverlays: 3,
  structuralOverlays: 1,
  aggregateUsageDerivedEstimatedCostUsd: 0.156225,
  newPaidCalls: 0,
  audioAccesses: 0,
  modelOrApiCalls: 0,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: execution.nextAuthorizedAction,
}, null, 2));
