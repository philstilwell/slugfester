#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const ROOT =
  "docs/assessment-production/production-checkpoint-v2.2-1/inventory-chronology-fallback";
const MANIFEST = `${ROOT}/plan-execution-preparation-manifest.json`;
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const [manifestBytes, preparationBytes] = await Promise.all([
  readFile(MANIFEST),
  readFile(PREPARATION),
]);
const manifest = JSON.parse(manifestBytes);
const preparation = JSON.parse(preparationBytes);

assert.equal(
  manifest.schemaVersion,
  "1.0-production-checkpoint-v2.2-candidate-census-plan-execution-preparation-manifest"
);
assert.equal(manifest.protocolId, preparation.protocolId);
assert.equal(
  manifest.status,
  "frozen-ten-production-checkpoint-v2.2-candidate-census-plan-contexts-prepared-not-authorized"
);
assert.equal(Number.isNaN(Date.parse(manifest.frozenAt)), false);
assert.match(manifest.checkpointCommit, /^[0-9a-f]{40}$/);
assert.equal(manifest.productionCanary, true);
assert.equal(manifest.developmentValidationOnly, false);
assert.equal(manifest.stagingOnly, true);
assert.equal(manifest.AIOnly, true);
assert.equal(manifest.preparation, PREPARATION);
assert.equal(manifest.preparationSha256, sha256(preparationBytes));

assert.deepEqual(manifest.model, {
  label: "5.6 Sol",
  slug: "gpt-5.6-sol",
  reasoningEffort: "low",
  authentication: "ChatGPT subscription",
  scoreBlind: true,
});
assert.equal(
  manifest.gateDisposition.failedProductionCanaryV1PreservedFailed,
  true
);
assert.equal(
  manifest.gateDisposition.failedProductionCanaryV1OutputsUsedAsModelInput,
  false
);
assert.equal(manifest.gateDisposition.priorValidationCohortsReclassified, false);
assert.equal(
  manifest.gateDisposition.priorValidationCohortOutputsUsedAsModelInput,
  false
);
assert.equal(manifest.gateDisposition.checkpointDiscoveryPassed, true);
assert.equal(manifest.gateDisposition.checkpointDiscoveryRetried, false);
assert.equal(manifest.activePolicy.version, "v2.2");
assert.equal(
  manifest.activePolicy.agreedWinningSideMayCollapseToIntegerRoundedTie,
  true
);
assert.equal(
  manifest.activePolicy.agreedInitialTieImposesNoDirectionConstraint,
  true
);
assert.equal(manifest.activePolicy.numericalThresholdsChanged, false);
assert.equal(manifest.activePolicy.scorePassesMaximum, 1);
assert.equal(
  manifest.validatedInventoryContract.planAndSideIsolationPreserved,
  true
);
assert.equal(
  manifest.validatedInventoryContract.fallbackAppliedOnlyToRetainedOrphanReply,
  true
);
assert.equal(manifest.validatedInventoryContract.scoreFieldsAvailable, false);

assert.deepEqual(manifest.costEstimate.expectedParallelWallMinutes, [5, 15]);
assert.deepEqual(manifest.costEstimate.expectedAggregateModelMinutes, [9, 25]);
assert.equal(manifest.costEstimate.directIncrementalCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.meteredApiCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.transcriptionCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.contexts, 10);
assert.equal(manifest.costEstimate.absoluteStageTimeoutMinutes, 60);
assert.equal(
  manifest.executionEnvironment.codexPath,
  "/Applications/ChatGPT.app/Contents/Resources/codex"
);
assert.match(manifest.executionEnvironment.codexCliVersion, /^codex-cli /);
assert.equal(
  manifest.executionEnvironment.authentication,
  "ChatGPT subscription"
);
assert.equal(manifest.executionEnvironment.APIKeysRemoved, true);
assert.equal(manifest.executionEnvironment.isolatedTemporaryCodexHomes, true);

assert.deepEqual(manifest.executionPolicy, {
  stage: "candidate-census-plan",
  contexts: 10,
  attemptsPerContext: 1,
  retriesMaximum: 0,
  timeoutMsPerContext: 600000,
  timeoutExtensionsMaximum: 0,
  absoluteStageTimeoutMs: 3600000,
  copiedInputBytesMaximum: 115000,
  observedMaximumCopiedInputBytes: 53118,
  maximumParallelContexts: 2,
  schedulerRamp: [1, 2],
  rampOneServesAsOperationalCanary: true,
  eachRampPhaseMustPassBeforeExpansion: true,
  abortBeforeStartingAdditionalContextOnAnyFailure: true,
  allowAlreadyRunningIndependentContextToFinish: true,
  allTenPlansMustPassBeforeSidePacketPreparation: true,
  deterministicInputOrder: true,
  authentication: "ChatGPT subscription",
  APIKeysRemoved: true,
  removedEnvironmentVariables: [
    "OPENAI_API_KEY",
    "OPENAI_ORG_ID",
    "OPENAI_PROJECT_ID",
    "OPENAI_BASE_URL",
    "AZURE_OPENAI_API_KEY",
    "CODEX_API_KEY",
  ],
  directIncrementalCostUsdMaximum: 0,
  meteredApiCostUsdMaximum: 0,
  transcriptionCostUsdMaximum: 0,
  separateActivationRequired: true,
});
assert.deepEqual(manifest.acceptancePolicy, {
  exactContextCountRequired: 10,
  everyContextMustCompleteOnItsSingleAttempt: true,
  everyOutputMustValidateAgainstFrozenStrictSchema: true,
  everyOutputMustPassDeterministicSemanticValidation: true,
  writableDomainsLimitedToRoutesAndSections: true,
  immutablePlanCanonicalHashRequired: true,
  partialPlanGateAcceptance: false,
  automaticSemanticCorrection: false,
  exactSidePacketPreparationDeferredUntilAllPlansAccepted: true,
  scoresDerived: false,
});

assert.equal(manifest.contexts.length, 10);
assert.deepEqual(
  manifest.contexts.map((context) => context.debateNumber),
  ["50", "192", "129", "40", "25", "104", "22", "10", "167", "122"]
);
for (const [index, context] of manifest.contexts.entries()) {
  const prepared = preparation.contexts[index];
  assert.equal(context.contextIndex, index);
  assert.equal(context.stage, "candidate-census-plan");
  assert.equal(context.debateNumber, prepared.debateNumber);
  assert.equal(context.debateId, prepared.debateId);
  assert.equal(context.packet, prepared.planPacket);
  assert.equal(context.packetSha256, prepared.planPacketSha256);
  assert.equal(context.packetBytes, prepared.planPacketBytes);
  assert.equal(context.strictOutputSchema, prepared.planSchema);
  assert.equal(context.strictOutputSchemaSha256, prepared.planSchemaSha256);
  assert.equal(context.output, prepared.planOutput);
  assert.deepEqual(context.writableDomains, ["routes", "sections"]);
  assert.equal(context.attemptsMaximum, 1);
  assert.equal(context.retries, 0);
  assert.equal(context.timeoutExtensions, 0);
  assert.equal(context.modelExecutionAuthorized, false);
  assert.equal(context.copiedInputs.length, 5);
  assert.equal(context.copiedInputBytes, prepared.planCopiedInputBytes);
  assert.equal(context.maximumCopiedInputBytes, 115000);

  const packetBytes = await readFile(context.packet);
  assert.equal(sha256(packetBytes), context.packetSha256);
  assert.equal(packetBytes.length, context.packetBytes);
  const packet = JSON.parse(packetBytes);
  assert.equal(packet.modelExecutionAuthorized, false);
  assert.equal(packet.isolation.scoreBlind, true);
  assert.equal(
    packet.isolation.failedProductionCanaryOutputsUnavailable,
    true
  );
  assert.equal(packet.isolation.validationCohortOutputsUnavailable, true);
  assert.equal(packet.model.label, "5.6 Sol");
  assert.equal(packet.model.slug, "gpt-5.6-sol");
  assert.equal(packet.model.reasoningEffort, "low");
  assert.equal(packet.model.authentication, "ChatGPT subscription");
  assert.deepEqual(context.copiedInputs, packet.copiedInputs);

  let copiedInputBytes = 0;
  for (const input of context.copiedInputs) {
    const bytes = await readFile(input.path);
    assert.equal(sha256(bytes), input.sha256);
    assert.equal(bytes.length, input.bytes);
    copiedInputBytes += bytes.length;
  }
  assert.equal(copiedInputBytes, context.copiedInputBytes);
  assert.equal(context.copiedInputBytes <= 115000, true);
  assert.equal(await exists(context.output), false);
}

assert.deepEqual(manifest.totals, {
  debates: 10,
  planContextsPrepared: 10,
  planContextsAuthorized: 0,
  planContextsExecuted: 0,
  acceptedPlans: 0,
  exactSidePacketsFrozen: 0,
  audioCalls: 0,
  transcriptionCalls: 0,
  retries: 0,
  timeoutExtensions: 0,
  semanticCorrections: 0,
  scoresDerived: 0,
  meteredApiCostUsd: 0,
  transcriptionCostUsd: 0,
});
assert.equal(
  manifest.stopRules.invalidPlannerOutputBlocksEntireInventoryGate,
  true
);
assert.equal(manifest.stopRules.planTimeoutBlocksEntireInventoryGate, true);
assert.equal(manifest.stopRules.planContextFailureBlocksEntireInventoryGate, true);
assert.equal(
  manifest.stopRules.sidePacketFreezeBeforeTenAcceptedPlansBlocks,
  true
);
assert.equal(manifest.stopRules.retryBlocks, true);
assert.equal(manifest.stopRules.timeoutExtensionBlocks, true);
assert.deepEqual(manifest.authorization, {
  executionActivationPreparation: true,
  planModelContexts: false,
  deterministicPlanValidation: false,
  planAnalysis: false,
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
  publicationPreparation: false,
  productionMutation: false,
  remainingProductionBatches: false,
});

assert.deepEqual(
  manifest.artifacts.plans,
  manifest.contexts.map((context) => context.output)
);
assert.equal(
  (
    await Promise.all(
      manifest.futureOutputPathsExcludedFromSourceHashes.map(exists)
    )
  ).every((present) => present === false),
  true
);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash drifted`);
}
assert.equal(
  manifest.nextAuthorizedAction,
  "prepare-separate-production-checkpoint-v2.2-candidate-census-plan-execution-activation-only"
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: manifest.contexts.map((context) => context.debateNumber),
      contexts: manifest.totals.planContextsPrepared,
      maximumCopiedInputBytes:
        manifest.executionPolicy.observedMaximumCopiedInputBytes,
      planModelContextsAuthorized:
        manifest.authorization.planModelContexts,
      modelContextsExecuted: manifest.totals.planContextsExecuted,
      exactSidePacketsFrozen: manifest.totals.exactSidePacketsFrozen,
      scoresDerived: manifest.totals.scoresDerived,
      productionMutationAuthorized:
        manifest.authorization.productionMutation,
      nextAuthorizedAction: manifest.nextAuthorizedAction,
    },
    null,
    2
  )
);
