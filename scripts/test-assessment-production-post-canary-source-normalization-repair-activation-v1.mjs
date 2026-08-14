#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const ROOT = "docs/assessment-production/post-canary-continuation-v1/source-normalization-repair";
const ACTIVATION = `${ROOT}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const activationBytes = await readFile(ACTIVATION);
const activation = JSON.parse(activationBytes);
const planBytes = await readFile(activation.planLocks.repairPlan.path);
const analysisBytes = await readFile(activation.planLocks.analysis.path);
const plan = JSON.parse(planBytes);

assert.equal(activation.status, "two-debate-source-normalization-repair-execution-activation-frozen-awaiting-separate-execution-authorization");
assert.equal(activation.activationOnly, true);
assert.equal(activation.userAuthorization.repairExecutionActivationPreparationAuthorized, true);
assert.equal(activation.userAuthorization.repairExecutionAuthorized, false);
assert.equal(activation.planLocks.repairPlan.sha256, sha256(planBytes));
assert.equal(activation.planLocks.analysis.sha256, sha256(analysisBytes));
assert.deepEqual(activation.targetProjections.map((target) => target.debateNumber), ["88", "127"]);
assert.equal(activation.targetProjections.every((target) => target.uniqueSemanticContentRemoved === false), true);
for (const target of activation.targetProjections) {
  assert.equal(target.ignoredPaths.length, 3);
  for (const item of target.ignoredPaths) assert.equal(sha256(await readFile(item.path)), item.beforeSha256, `${item.path}: baseline drifted`);
  assert.deepEqual(target.corpusAuditEntry.changedFieldsOnly, ["normalizedEventsSha256", "transcriptSha256", "eventCount", "wordCount"]);
}
assert.equal(sha256(await readFile(activation.corpusAuditProjection.path)), activation.corpusAuditProjection.beforeSha256);
assert.deepEqual(activation.corpusAuditProjection.changedEntriesOnly, ["88", "127"]);
assert.equal(activation.executionContract.executionMayNotStartFromThisArtifactAlone, true);
assert.equal(activation.executionContract.separateUserAuthorizationRequiredAfterActivation, true);
assert.equal(activation.executionContract.attemptsMaximumUnderThisActivation, 1);
assert.equal(activation.executionContract.retriesWithinThisActivationMaximum, 0);
assert.equal(activation.executionContract.automaticRetryAllowed, false);
assert.equal(activation.executionContract.allOrNothing, true);
assert.equal(activation.executionContract.exactExistingMutablePathCount, 7);
assert.equal(new Set(activation.executionContract.exactExistingMutablePaths).size, 7);
assert.deepEqual(activation.executionContract.exactIgnoredSourcePaths, plan.atomicExecutionContract.exactMutableIgnoredPaths);
assert.deepEqual(activation.executionContract.exactTrackedIndexPaths, [activation.corpusAuditProjection.path]);
assert.equal(activation.executionContract.futureCommittedArtifactsAfterSuccessfulValidation.length, 3);
assert.equal(activation.executionContract.repairRecordsMayBeWrittenOnlyAfterAllPostwriteValidatorsPass, true);
assert.equal(activation.executionContract.rollbackAllSevenExistingPathsOnAnyMismatch, true);
assert.equal(activation.rollbackBoundary.restoreExistingPaths, 7);
assert.equal(activation.rollbackBoundary.removeAnyPartiallyWrittenRepairRecords, true);
assert.equal(activation.rollbackBoundary.automaticRetryAfterRollbackAllowed, false);
assert.equal(activation.modelBoundary.preservedAssessmentModel, "5.6 Sol");
assert.equal(activation.modelBoundary.preservedReasoningEffort, "low");
assert.equal(activation.modelBoundary.preservedAuthentication, "ChatGPT subscription");
assert.equal(activation.modelBoundary.participantJudgmentMustRemainScoreBlind, true);
assert.equal(activation.modelBoundary.roundedIntegerScoreTiesPermitted, true);
assert.equal(activation.modelBoundary.modelContexts, 0);
assert.equal(activation.modelBoundary.judgmentExecution, false);
assert.equal(activation.modelBoundary.scoreDerivation, false);
assert.equal(activation.modelBoundary.publicationReconstruction, false);
assert.equal(Object.values(activation.stopRules).every(Boolean), true);
assert.equal(activation.authorization.repairExecutionActivationPreparation, true);
for (const key of ["repairExecution", "sourceMutation", "corpusAuditMutation", "repairRecordWrite", "continuationSelectionPolicyPreparation", "batchSelection", "modelExecution", "scoreDerivation", "publicationReconstruction", "productionMutation", "remainingProductionBatches"]) {
  assert.equal(activation.authorization[key], false, `${key}: must remain unauthorized`);
}
for (const [file, expected] of Object.entries(activation.sourceHashes)) assert.equal(sha256(await readFile(file)), expected, `${file}: activation source drifted`);
for (const future of activation.futureOutputPathsExcludedFromSourceHashes) assert.equal(await exists(future), false, `${future}: future output exists`);
assert.equal(activation.activationPreflight.sourceMutations, 0);
assert.equal(activation.activationPreflight.corpusAuditMutations, 0);
assert.equal(activation.activationPreflight.modelContexts, 0);
assert.equal(activation.activationPreflight.meteredApiCostUsd, 0);
assert.equal(activation.nextAuthorizedAction, "user-decision-on-two-debate-source-normalization-repair-execution");

console.log(JSON.stringify({
  status: "passed-activation",
  targetDebates: ["88", "127"],
  frozenExistingMutablePaths: 7,
  repairExecuted: false,
  modelContexts: 0,
  directCostUsd: 0,
  nextAuthorizedAction: activation.nextAuthorizedAction
}, null, 2));
