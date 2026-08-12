#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";

const ROOT =
  "docs/assessment-production/production-checkpoint-v2.2-1/inventory-chronology-fallback";
const PREPARATION = `${ROOT}/side-execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/side-execution-activation.json`;
const RUNNER =
  "scripts/run-assessment-production-checkpoint-v2.2-inventory-chronology-fallback-side-selectors.mjs";
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
  "1.0-production-checkpoint-v2.2-side-selector-execution-activation"
);
assert.equal(activation.protocolId, preparation.protocolId);
assert.equal(
  activation.sideSelectionProtocolId,
  preparation.sideSelectionProtocolId
);
assert.equal(
  activation.status,
  "frozen-twenty-production-checkpoint-v2.2-side-selector-contexts-authorized"
);
assert.equal(Number.isNaN(Date.parse(activation.activatedAt)), false);
assert.match(activation.checkpointCommit, /^[0-9a-f]{40}$/);
assert.equal(activation.developmentValidationOnly, false);
assert.equal(activation.productionCanary, true);
assert.equal(activation.stagingOnly, true);
assert.deepEqual(activation.userAuthorization, {
  instruction: "Proceed at your discretion.",
  directIncrementalCostEstimateUsd: 0,
  expectedParallelWallMinutes: [10, 25],
  judgmentModelsAuthorized: false,
  sideSelectorModelsAuthorized: true,
});
assert.equal(activation.preparationManifest, PREPARATION);
assert.equal(activation.preparationManifestSha256, sha256(preparationBytes));
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
  activation.gateDisposition.failedProductionCanaryV1PreservedFailed,
  true
);
assert.equal(
  activation.gateDisposition.failedProductionCanaryV1OutputsUsedAsModelInput,
  false
);
assert.equal(activation.gateDisposition.priorValidationCohortsReclassified, false);
assert.equal(activation.activePolicy.version, "v2.2");
assert.equal(
  activation.activePolicy.agreedWinningSideMayCollapseToIntegerRoundedTie,
  true
);
assert.equal(activation.activePolicy.scorePassesMaximum, 1);
assert.equal(
  activation.validatedInventoryContract.planAndSideIsolationPreserved,
  true
);
assert.equal(
  activation.validatedInventoryContract.fallbackAppliedOnlyToRetainedOrphanReply,
  true
);
assert.equal(activation.validatedInventoryContract.scoreFieldsAvailable, false);
assert.equal(activation.costBoundary.directIncrementalCostUsdMaximum, 0);
assert.deepEqual(activation.costBoundary.expectedParallelWallMinutes, [10, 25]);
assert.equal(activation.executionPolicy.contexts, 20);
assert.equal(activation.executionPolicy.attemptsPerContext, 1);
assert.equal(activation.executionPolicy.retriesMaximum, 0);
assert.equal(activation.executionPolicy.timeoutMsPerContext, 600000);
assert.equal(activation.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(activation.executionPolicy.absoluteStageTimeoutMs, 7200000);
assert.equal(activation.executionPolicy.maximumParallelContexts, 2);
assert.deepEqual(activation.executionPolicy.schedulerRamp, [1, 2]);
assert.equal(
  activation.executionPolicy.abortBeforeStartingAdditionalContextOnAnyFailure,
  true
);
assert.equal(
  activation.executionPolicy.allTwentySelectorsMustPassBeforeInventoryCompilation,
  true
);
assert.equal(activation.executionPolicy.APIKeysRemoved, true);
assert.equal(activation.acceptancePolicy.partialSideSelectorGateAcceptance, false);
assert.equal(activation.acceptancePolicy.automaticSemanticCorrection, false);
assert.equal(activation.stopRules.invalidSelectorOutputBlocksEntireInventoryGate, true);
assert.equal(activation.stopRules.selectorTimeoutBlocksEntireInventoryGate, true);
assert.equal(activation.stopRules.selectorContextFailureBlocksEntireInventoryGate, true);
assert.equal(activation.stopRules.retryBlocks, true);
assert.equal(activation.stopRules.timeoutExtensionBlocks, true);
assert.deepEqual(activation.authorization, {
  sideSelectorModelContexts: true,
  deterministicSideValidation: true,
  inventoryCompilation: true,
  inventoryAnalysis: true,
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
  contexts: 20,
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
  "execute-frozen-production-checkpoint-v2.2-side-selector-gate-once"
);

console.log(
  JSON.stringify(
    {
      status: "passed-model-free-activation",
      contexts: 20,
      model: activation.model,
      maximumParallelContexts:
        activation.executionPolicy.maximumParallelContexts,
      sideSelectorModelContextsAuthorized:
        activation.authorization.sideSelectorModelContexts,
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
