#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const ROOT = "docs/assessment-production/post-canary-continuation-v1/source-normalization-repair";
const PLAN = `${ROOT}/repair-plan.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/execution.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const [planBytes, analysisBytes] = await Promise.all([
  readFile(PLAN),
  readFile(ANALYSIS)
]);
const plan = JSON.parse(planBytes);
const analysis = JSON.parse(analysisBytes);

assert.equal(
  plan.status,
  "two-debate-zero-duration-derived-event-repair-plan-frozen-awaiting-execution-activation-decision"
);
assert.equal(
  analysis.status,
  "two-debate-zero-duration-source-repair-plan-analysis-passed-awaiting-activation-decision"
);
assert.equal(analysis.repairPlan.path, PLAN);
assert.equal(analysis.repairPlan.bytes, planBytes.byteLength);
assert.equal(analysis.repairPlan.sha256, sha256(planBytes));
for (const [file, expected] of Object.entries(plan.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), expected, `${file}: frozen plan source drifted`);
}
assert.deepEqual(plan.targets.map((target) => target.debateNumber), ["88", "127"]);
assert.deepEqual(plan.targets.map((target) => target.diagnosis.normalizedEventIndex), [807, 2017]);
assert.deepEqual(plan.targets.map((target) => target.diagnosis.transcriptLineNumber), [808, 2018]);
for (const target of plan.targets) {
  assert.equal(target.diagnosis.zeroDurationDerivedEvents, 1);
  assert.equal(target.diagnosis.otherStructuralEventDefects, 0);
  assert.equal(target.diagnosis.removedDerivedEvent.durationMs, 0);
  assert.equal(target.diagnosis.rawCaptionParagraph.durationAttributePresent, false);
  assert.equal(target.diagnosis.rawNonemptyParagraphsMissingDuration, 1);
  assert.equal(target.diagnosis.neighboringDuplicateEvidence.exactSubstringPresent, true);
  assert.equal(target.diagnosis.neighboringDuplicateEvidence.lexicalRecall, 1);
  assert.equal(target.diagnosis.neighboringDuplicateEvidence.orderedTokenCoverage, 1);
  assert.equal(target.diagnosis.neighboringDuplicateEvidence.uniqueSemanticContentRemoved, false);
  assert.equal(target.repair.preserveEveryOtherEventValueAndOrder, true);
  assert.equal(target.repair.preserveEveryOtherTranscriptLineValueAndOrder, true);
  assert.deepEqual(target.repair.updateLocalManifestFieldsOnly, [
    "normalizedEventsSha256",
    "transcriptSha256",
    "eventCount",
    "wordCount"
  ]);
  assert.equal(target.repair.rawCaptionMutationAllowed, false);
  assert.equal(target.repair.frozenProductionManifestMutationAllowed, false);
  assert.equal(sha256(await readFile(target.projected.events.path)), target.projected.events.beforeSha256);
  assert.equal(sha256(await readFile(target.projected.transcript.path)), target.projected.transcript.beforeSha256);
  assert.equal(sha256(await readFile(target.projected.localManifest.path)), target.projected.localManifest.beforeSha256);
  assert.equal(sha256(await readFile(target.projected.rawCaption.path)), target.projected.rawCaption.beforeAndAfterSha256);
}
assert.equal(plan.atomicExecutionContract.targets, 2);
assert.equal(plan.atomicExecutionContract.attemptsMaximumAfterSeparateActivation, 1);
assert.equal(plan.atomicExecutionContract.automaticRetryAllowed, false);
assert.equal(plan.atomicExecutionContract.allOrNothing, true);
assert.equal(plan.atomicExecutionContract.exactMutableIgnoredPathCount, 6);
assert.equal(new Set(plan.atomicExecutionContract.exactMutableIgnoredPaths).size, 6);
assert.equal(plan.atomicExecutionContract.rawCaptionPathsMutable, false);
assert.equal(plan.atomicExecutionContract.rollbackBothTargetsOnAnyMismatch, true);
assert.equal(plan.modelBoundary.preservedAssessmentModel, "5.6 Sol");
assert.equal(plan.modelBoundary.preservedReasoningEffort, "low");
assert.equal(plan.modelBoundary.preservedAuthentication, "ChatGPT subscription");
assert.equal(plan.modelBoundary.participantJudgmentMustRemainScoreBlind, true);
assert.equal(plan.modelBoundary.roundedIntegerScoreTiesPermitted, true);
assert.equal(plan.modelBoundary.modelContexts, 0);
assert(Object.values(plan.stopRules).every(Boolean));
assert.equal(plan.totals.zeroDurationEvents, 2);
assert.equal(plan.totals.otherStructuralEventDefects, 0);
assert.equal(plan.totals.uniqueSemanticContentRowsRemoved, 0);
assert.equal(plan.totals.executedIgnoredPathMutations, 0);
assert.equal(plan.totals.modelContexts, 0);
assert.equal(plan.totals.productionMutations, 0);
assert.equal(plan.totals.meteredApiCostUsd, 0);
assert(Object.values(plan.authorization).every((value) => value === false));
assert.equal(await exists(ACTIVATION), false);
assert.equal(await exists(EXECUTION), false);
assert.equal(analysis.decision.diagnosisPassed, true);
assert.equal(analysis.decision.exactProjectionPassed, true);
assert.equal(analysis.decision.sourceRepairExecutionAuthorized, false);
assert.equal(
  plan.nextAuthorizedAction,
  "user-decision-on-two-debate-source-normalization-repair-execution-activation-preparation"
);

console.log(JSON.stringify({
  status: "passed",
  targets: ["88", "127"],
  zeroDurationEvents: 2,
  projectedIgnoredPathMutations: 6,
  uniqueSemanticContentLoss: false,
  executionAuthorized: false,
  modelContexts: 0,
  directCostUsd: 0,
  nextAuthorizedAction: plan.nextAuthorizedAction
}, null, 2));
