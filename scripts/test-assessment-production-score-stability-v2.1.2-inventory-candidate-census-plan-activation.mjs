#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";

const ROOT =
  "docs/assessment-production/score-stability-v2.1.2-validation-cohort/inventory-candidate-sharded";
const PREPARATION = `${ROOT}/plan-execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/plan-execution-activation.json`;
const RUNNER =
  "scripts/run-assessment-production-score-stability-v2.1.2-inventory-candidate-census-plans.mjs";
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
  "1.0-score-stability-v2.1.2-candidate-census-plan-execution-activation"
);
assert.equal(activation.protocolId, preparation.protocolId);
assert.equal(
  activation.status,
  "frozen-ten-v2.1.2-candidate-census-plan-contexts-authorized"
);
assert.equal(Number.isNaN(Date.parse(activation.activatedAt)), false);
assert.match(activation.checkpointCommit, /^[0-9a-f]{40}$/);
assert.equal(activation.developmentValidationOnly, true);
assert.equal(activation.productionCanary, false);
assert.equal(activation.stagingOnly, true);
assert.deepEqual(activation.userAuthorization, {
  instruction: "Continue at your discretion.",
  directIncrementalCostEstimateUsd: 0,
  expectedParallelWallMinutes: [8, 20],
  judgmentModelsAuthorized: false,
  candidateCensusPlanModelsAuthorized: true,
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
assert.equal(activation.failedGateDisposition.v1CanaryPreservedFailed, true);
assert.equal(activation.failedGateDisposition.v2ValidationPreservedFailed, true);
assert.equal(activation.failedGateDisposition.v21DiscoveryPreservedFailed, true);
assert.equal(activation.failedGateDisposition.v211DiscoveryPreservedFailed, true);
assert.equal(activation.failedGateDisposition.currentCanaryReclassified, false);
assert.equal(activation.proposedPolicy.everyIntegerRoundedTieAccepted, true);
assert.equal(activation.proposedPolicy.promoted, false);
assert.equal(activation.costBoundary.directIncrementalCostUsdMaximum, 0);
assert.deepEqual(activation.costBoundary.expectedParallelWallMinutes, [8, 20]);

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
  activation.executionPolicy.allTenPlansMustPassBeforeSidePacketPreparation,
  true
);
assert.equal(activation.executionPolicy.APIKeysRemoved, true);
assert.equal(activation.executionPolicy.separateActivationRequired, true);
assert.equal(activation.acceptancePolicy.partialPlanGateAcceptance, false);
assert.equal(activation.acceptancePolicy.automaticSemanticCorrection, false);
assert.equal(
  activation.acceptancePolicy.exactSidePacketPreparationDeferredUntilAllPlansAccepted,
  true
);
assert.equal(activation.stopRules.invalidPlannerOutputBlocksEntireInventoryGate, true);
assert.equal(activation.stopRules.planTimeoutBlocksEntireInventoryGate, true);
assert.equal(activation.stopRules.planContextFailureBlocksEntireInventoryGate, true);
assert.equal(activation.stopRules.retryBlocks, true);
assert.equal(activation.stopRules.timeoutExtensionBlocks, true);

assert.deepEqual(activation.authorization, {
  planModelContexts: true,
  deterministicPlanValidation: true,
  planAnalysis: true,
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
  "execute-frozen-v2.1.2-candidate-census-plan-gate-once"
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
      candidateCensusPlanModelContextsAuthorized:
        activation.authorization.planModelContexts,
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
