#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root =
  "docs/assessment-production/production-checkpoint-v2.2-1/rendering-verification-remedy-v7";
const analysisPath = `${root}/preparation-analysis.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const analysis = JSON.parse(await readFile(path.resolve(analysisPath), "utf8"));

assert.equal(
  analysis.status,
  "seventh-replacement-rendering-verification-plan-not-frozen-after-synthetic-browser-control-deadline"
);
assert.equal(analysis.scope.productionCandidatePagesLoaded, 0);
assert.equal(analysis.scope.productionDebatesAttempted, 0);
assert.equal(analysis.scope.judgmentModelsExecuted, 0);
assert.equal(analysis.scope.scorePassesExecuted, 0);
assert.equal(analysis.scope.directCostUsd, 0);
assert.equal(analysis.priorFailure.candidateRenderingDefectEstablished, false);

for (const source of analysis.prototypeSources) {
  assert.equal(
    sha256(await readFile(path.resolve(source.path))),
    source.sha256,
    source.path
  );
  assert.equal(
    source.status,
    "experimental-not-frozen-not-authorized-for-production-candidates"
  );
}
assert.equal(
  sha256(await readFile(path.resolve(analysis.syntheticFixture.path))),
  analysis.syntheticFixture.sha256
);
assert.equal(
  sha256(await readFile(path.resolve(analysis.priorFailure.analysis))),
  analysis.priorFailure.analysisSha256
);
assert.equal(
  sha256(await readFile(path.resolve(analysis.priorFailure.execution))),
  analysis.priorFailure.executionSha256
);

assert.equal(analysis.developmentChronology.length, 7);
const terminal = analysis.developmentChronology.at(-1);
assert.equal(terminal.result, "terminal-stress-rejected");
assert.equal(terminal.completedViewportCycles, 1);
assert.equal(terminal.failedViewportCycle, 2);
assert.equal(terminal.completedCycle.requiredBooleanChecksPassed, 16);
assert.equal(terminal.completedCycle.pageNavigateCalls, 1);
assert.equal(terminal.completedCycle.runtimeLocationAssignCalls, 3);
assert.equal(terminal.failure.browserControlCallDeadlineMs, 30000);
assert.equal(terminal.sameDesignRetryPerformed, false);
assert.equal(terminal.timeoutExtended, false);

assert.equal(analysis.decision.failedClosed, true);
assert.equal(analysis.decision.v7PlanFrozen, false);
assert.equal(analysis.decision.v7PacketsCreated, 0);
assert.equal(analysis.decision.v7ActivationCreated, false);
assert.equal(analysis.decision.v7ExecutionAuthorized, false);
assert.equal(analysis.decision.productionCandidateRenderingAttempted, false);
assert.equal(analysis.decision.productionMutationRemainsBlocked, true);
assert.equal(analysis.preservedControls.judgmentModel, "gpt-5.6-sol");
assert.equal(analysis.preservedControls.reasoningEffort, "low");
assert.equal(analysis.preservedControls.authentication, "chatgpt-subscription");
assert.equal(analysis.preservedControls.scoreBlindness, true);
assert.equal(analysis.preservedControls.roundedIntegerScoreTiesPermitted, true);
assert.equal(analysis.preservedControls.judgmentExecutionPerformed, false);
assert.equal(analysis.preservedControls.scoresReadOrChanged, false);
assert.equal(analysis.cleanup.browserTabsFinalizedWithoutKeep, true);
assert.equal(analysis.cleanup.viewportOverrideReset, true);
assert.equal(analysis.cleanup.localServerStopped, true);
assert.equal(analysis.cleanup.localServerPortClosed, true);

for (const absent of analysis.absentFrozenOutputs) {
  assert.equal(await exists(absent), false, absent);
}
assert.equal(analysis.authorization.retry, false);
assert.equal(analysis.authorization.timeoutExtension, false);
assert.equal(analysis.authorization.productionCandidateNavigation, false);
assert.equal(analysis.authorization.productionMutation, false);
assert.equal(
  analysis.nextAuthorizedAction,
  "user-decision-on-rendering-verification-remedy-v8-plan-preparation"
);

console.log(JSON.stringify({
  status: "remedy-v7-plan-preparation-failure-audit-passed",
  prototypeDesignsAudited: analysis.developmentChronology.length,
  productionCandidatePagesLoaded: analysis.scope.productionCandidatePagesLoaded,
  frozenPacketsCreated: analysis.decision.v7PacketsCreated,
  modelContexts: analysis.scope.judgmentModelsExecuted,
  directCostUsd: analysis.scope.directCostUsd,
  productionMutationPerformed: false
}, null, 2));
