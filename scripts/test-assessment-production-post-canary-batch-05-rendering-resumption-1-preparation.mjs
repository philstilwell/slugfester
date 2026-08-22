#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_DOCUMENTATION,
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_FAILURE,
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_PREPARATION,
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_PROTOCOL_ID,
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_VIEWPORT_PLAN,
  loadPostCanaryBatch05RenderingResumption1Packets,
  sha256Batch05RenderingResumption1,
  validatePostCanaryBatch05RenderingResumption1Plan
} from "./lib/assessment-production-post-canary-batch-05-rendering-resumption-1.mjs";
import {
  POST_CANARY_BATCH_05_STANDING_AUTHORIZATION_INSTRUCTION
} from "./lib/assessment-production-post-canary-batch-05-standing-authorization.mjs";
import { canonicalJson } from "./lib/v4-lean-production.mjs";

const exists = (file) =>
  access(path.resolve(file)).then(
    () => true,
    () => false
  );
const sha256 = sha256Batch05RenderingResumption1;
const preparationBytes = await readFile(
  path.resolve(POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_PREPARATION)
);
const preparation = JSON.parse(preparationBytes);
const failureBytes = await readFile(
  path.resolve(POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_FAILURE)
);
const failure = JSON.parse(failureBytes);

assert.equal(
  preparation.protocolId,
  POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_PROTOCOL_ID
);
assert.equal(
  preparation.status,
  "frozen-batch-05-rendering-resumption-1-prepared-under-continuation-authorization"
);
assert.equal(preparation.productionCanary, false);
assert.equal(preparation.batchNumber, 5);
assert.equal(preparation.stagingOnly, true);
assert.equal(
  preparation.userAuthorization.instruction,
  POST_CANARY_BATCH_05_STANDING_AUTHORIZATION_INSTRUCTION
);
assert.equal(preparation.userAuthorization.directIncrementalCostUsdMaximum, 0);
assert.equal(preparation.failureDiagnosis.sha256, sha256(failureBytes));
assert.equal(
  failure.status,
  "preserved-batch-05-bootstrap-only-transport-readiness-failure"
);
assert.equal(failure.affectedViewport.debateNumber, "158");
assert.equal(failure.affectedViewport.viewportName, "desktop");
assert.equal(failure.observedFailure.bootstrapHttpStatus, 200);
assert.equal(failure.observedFailure.candidatePagesLoaded, 0);
assert.equal(failure.observedFailure.screenshotsCaptured, 0);
assert.equal(failure.observedFailure.evidenceFilesPersisted, 0);
assert.equal(failure.materiality.candidateChanged, false);
assert.equal(failure.materiality.participantScoresChanged, false);
assert.equal(failure.materiality.productionChanged, false);
assert.equal(
  canonicalJson(preparation.requiredDocumentationBeforeAnyBrowserTab),
  canonicalJson(POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_DOCUMENTATION)
);
validatePostCanaryBatch05RenderingResumption1Plan(preparation.viewportPlan);
assert.equal(
  canonicalJson(preparation.viewportPlan),
  canonicalJson(POST_CANARY_BATCH_05_RENDERING_RESUMPTION_1_VIEWPORT_PLAN)
);
assert.equal(preparation.packets.length, 10);
assert.equal((await loadPostCanaryBatch05RenderingResumption1Packets(preparation)).size, 10);
assert.equal(preparation.gateExpectations.debates, 10);
assert.equal(preparation.gateExpectations.sections, 49);
assert.equal(preparation.gateExpectations.moves, 187);
assert.equal(preparation.gateExpectations.viewportResults, 20);
assert.equal(preparation.gateExpectations.screenshots, 40);
assert.equal(preparation.gateExpectations.requiredBooleanChecks, 760);
assert.equal(preparation.executionPolicy.replacementAttemptsMaximum, 1);
assert.equal(preparation.executionPolicy.firstAttempts, 19);
assert.equal(preparation.executionPolicy.totalViewportAttemptsMaximum, 20);
assert.equal(preparation.executionPolicy.retriesAfterResumptionMaximum, 0);
assert.equal(preparation.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(preparation.executionPolicy.modelContexts, 0);
assert.equal(preparation.executionPolicy.paidServiceCalls, 0);
assert.equal(Object.values(preparation.stopRules).every(Boolean), true);
assert.equal(preparation.compatibilityBoundary.productionMutationBlocked, true);
assert.equal(preparation.authorization.executionActivation, false);
assert.equal(preparation.authorization.replacementViewportAttempt, false);
assert.equal(preparation.authorization.remainingViewportAttempts, false);
assert.equal(preparation.authorization.modelExecution, false);
assert.equal(preparation.authorization.paidServices, false);
assert.equal(preparation.authorization.productionMutation, false);
assert.equal(preparation.authorization.nextBatchSelection, false);

for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assert.equal(sha256(await readFile(path.resolve(file))), digest, file);
}
for (const [file, digest] of Object.entries(preparation.inheritedSourceHashes)) {
  assert.equal(sha256(await readFile(path.resolve(file))), digest, file);
}
for (const [file, digest] of Object.entries(preparation.toolHashes)) {
  assert.equal(sha256(await readFile(path.resolve(file))), digest, file);
}
for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
  assert.equal(await exists(future), false, future);
}
assert.equal(preparation.totals.candidatePagesLoaded, 0);
assert.equal(preparation.totals.screenshotsCaptured, 0);
assert.equal(preparation.totals.evidenceFilesPersisted, 0);
assert.equal(preparation.totals.directIncrementalCostUsd, 0);
assert.equal(
  preparation.nextAuthorizedAction,
  "activate-and-execute-one-frozen-batch-05-rendering-resumption-1-under-continuation-authorization"
);

console.log(
  JSON.stringify(
    {
      status: "post-canary-batch-05-rendering-resumption-1-preparation-passed",
      failureCategory: failure.observedFailure.category,
      candidatePagesLoadedBeforeResumption: 0,
      replacementAttemptsPrepared: 1,
      firstAttemptsPrepared: 19,
      viewportResultsPrepared: 20,
      modelContexts: 0,
      paidServiceCalls: 0,
      directCostUsd: 0
    },
    null,
    2
  )
);
