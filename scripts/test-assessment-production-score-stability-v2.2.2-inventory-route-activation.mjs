#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";

const ROOT =
  "docs/assessment-production/score-stability-v2.2.2-validation-cohort/inventory-route-section-plan-successor";
const PREPARATION = `${ROOT}/route-execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/route-execution-activation.json`;
const RUNNER =
  "scripts/run-assessment-production-score-stability-v2.2.2-inventory-routes.mjs";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const [activationBytes, preparationBytes] = await Promise.all([
  readFile(ACTIVATION),
  readFile(PREPARATION),
]);
const activation = JSON.parse(activationBytes);
const preparation = JSON.parse(preparationBytes);

assert.equal(
  activation.schemaVersion,
  "1.0-score-stability-v2.2.2-route-execution-activation"
);
assert.equal(activation.protocolId, preparation.protocolId);
assert.equal(
  activation.status,
  "frozen-ten-v2.2.2-route-contexts-authorized"
);
assert.equal(Number.isNaN(Date.parse(activation.activatedAt)), false);
assert.match(activation.checkpointCommit, /^[0-9a-f]{40}$/);
assert.equal(activation.developmentValidationOnly, true);
assert.equal(activation.productionCanary, false);
assert.equal(activation.stagingOnly, true);
assert.deepEqual(activation.userAuthorization, {
  instruction: "Authorized. Continue.",
  directIncrementalCostEstimateUsd: 0,
  expectedParallelWallMinutes: [5, 15],
  judgmentModelsAuthorized: false,
  routeModelsAuthorized: true,
});
assert.equal(activation.preparationManifest, PREPARATION);
assert.equal(activation.preparationManifestSha256, sha256(preparationBytes));
assert.equal(
  activation.sourcePreparation,
  `${ROOT}/preparation-manifest.json`
);
assert.equal(
  activation.sourcePreparationSha256,
  sha256(await readFile(activation.sourcePreparation))
);
assert.deepEqual(activation.model, {
  label: "5.6 Sol",
  slug: "gpt-5.6-sol",
  reasoningEffort: "low",
  authentication: "ChatGPT subscription",
  scoreBlind: true,
});
assert.equal(
  activation.failedGateDisposition.v221PlanningGatePreservedFailed,
  true
);
assert.equal(
  activation.failedGateDisposition.v221ValidPartialPlansReusableForSuccessorAcceptance,
  false
);
assert.equal(
  activation.failedGateDisposition.v221Debate75Retried,
  false
);
assert.equal(
  activation.failedGateDisposition.v221TimeoutExtended,
  false
);
assert.equal(
  activation.failedGateDisposition.v221ExecutionReclassified,
  false
);
assert.equal(
  activation.failedGateDisposition.v22DiscoveryGatePreservedFailed,
  true
);
assert.equal(
  activation.failedGateDisposition.v213ScoreGatePreservedFailed,
  true
);
assert.equal(
  activation.proposedPolicy.agreedWinningSideMayCollapseToIntegerRoundedTie,
  true
);
assert.equal(
  activation.proposedPolicy.agreedInitialTieImposesNoDirectionConstraint,
  true
);
assert.equal(activation.proposedPolicy.numericalThresholdsChanged, false);
assert.equal(activation.proposedPolicy.promoted, false);
assert.equal(activation.costBoundary.directIncrementalCostUsdMaximum, 0);
assert.deepEqual(activation.costBoundary.expectedParallelWallMinutes, [5, 15]);

assert.equal(activation.executionPolicy.contexts, 10);
assert.equal(activation.executionPolicy.attemptsPerContext, 1);
assert.equal(activation.executionPolicy.retriesMaximum, 0);
assert.equal(activation.executionPolicy.timeoutMsPerContext, 600000);
assert.equal(activation.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(activation.executionPolicy.absoluteStageTimeoutMs, 3600000);
assert.equal(activation.executionPolicy.maximumParallelContexts, 2);
assert.deepEqual(activation.executionPolicy.schedulerRamp, [1, 2]);
assert.equal(
  activation.executionPolicy.abortBeforeStartingAdditionalContextOnAnyFailure,
  true
);
assert.equal(
  activation.executionPolicy.allTenRoutesMustPassBeforeSectionPacketPreparation,
  true
);
assert.equal(activation.executionPolicy.APIKeysRemoved, true);
assert.equal(activation.executionPolicy.separateActivationRequired, true);
assert.equal(activation.acceptancePolicy.partialRouteGateAcceptance, false);
assert.equal(activation.acceptancePolicy.automaticSemanticCorrection, false);
assert.equal(
  activation.acceptancePolicy.exactSectionPacketPreparationDeferredUntilAllRoutesAccepted,
  true
);
assert.equal(activation.stopRules.invalidRouteOutputBlocksEntireGate, true);
assert.equal(activation.stopRules.routeTimeoutBlocksEntireGate, true);
assert.equal(activation.stopRules.routeContextFailureBlocksEntireGate, true);
assert.equal(activation.stopRules.retryBlocks, true);
assert.equal(activation.stopRules.timeoutExtensionBlocks, true);

assert.deepEqual(activation.authorization, {
  routeModelContexts: true,
  deterministicRouteValidation: true,
  routeAnalysis: true,
  exactSectionPacketPreparation: false,
  sectionModelExecution: false,
  exactSidePacketPreparation: false,
  sideSelectorModelExecution: false,
  inventoryModelExecution: false,
  retry: false,
  timeoutExtension: false,
  semanticCorrection: false,
  independentJudgmentPacketPreparation: false,
  independentJudgmentModelExecution: false,
  paidTranscription: false,
  audioVerification: false,
  adjudicationModelExecution: false,
  scoreDerivation: false,
  policyPromotion: false,
  publicationPreparation: false,
  productionMutation: false,
  remainingProductionBatches: false,
});
assert.equal(
  activation.futureOutputPathsExcludedFromSourceHashes.includes(ACTIVATION),
  false
);
assert.equal(
  activation.futureOutputPathsExcludedFromSourceHashes.length,
  preparation.futureOutputPathsExcludedFromSourceHashes.length - 1
);
assert.equal(
  (
    await Promise.all(
      activation.futureOutputPathsExcludedFromSourceHashes.map(exists)
    )
  ).every((present) => present === false),
  true
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash drifted`);
}

const preflight = JSON.parse(
  execFileSync(process.execPath, [RUNNER, "--preflight-only"], {
    encoding: "utf8",
  })
);
assert.deepEqual(preflight, {
  status: "passed-model-free-preflight",
  contexts: 10,
  model: {
    label: "5.6 Sol",
    slug: "gpt-5.6-sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    scoreBlind: true,
  },
  maximumParallelContexts: 2,
  schedulerRamp: [1, 2],
  attemptsPerContext: 1,
  retriesMaximum: 0,
  timeoutExtensionsMaximum: 0,
  modelContextsExecuted: 0,
  scoresDerived: 0,
});
assert.equal(
  activation.nextRequiredAction,
  "execute-frozen-v2.2.2-route-gate-once"
);

console.log(
  JSON.stringify(
    {
      status: "passed-model-free-activation",
      contexts: 10,
      model: activation.model,
      maximumParallelContexts:
        activation.executionPolicy.maximumParallelContexts,
      schedulerRamp: activation.executionPolicy.schedulerRamp,
      routeModelContextsAuthorized:
        activation.authorization.routeModelContexts,
      judgmentModelContextsAuthorized:
        activation.authorization.independentJudgmentModelExecution,
      modelContextsExecuted: 0,
      scoresDerived: 0,
      nextRequiredAction: activation.nextRequiredAction,
    },
    null,
    2
  )
);
