#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const ROOT =
  "docs/assessment-production/score-stability-v2.2.2-validation-cohort/inventory-route-section-plan-successor";
const MANIFEST = `${ROOT}/section-execution-preparation-manifest.json`;
const SECTION_PREPARATION = `${ROOT}/section-packet-preparation-manifest.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const [manifestBytes, preparationBytes] = await Promise.all([
  readFile(MANIFEST),
  readFile(SECTION_PREPARATION),
]);
const manifest = JSON.parse(manifestBytes);
const preparation = JSON.parse(preparationBytes);

assert.equal(
  manifest.schemaVersion,
  "1.0-score-stability-v2.2.2-section-execution-preparation-manifest"
);
assert.equal(
  manifest.status,
  "frozen-ten-v2.2.2-section-contexts-prepared-not-authorized"
);
assert.equal(manifest.sectionPacketPreparation, SECTION_PREPARATION);
assert.equal(manifest.sectionPacketPreparationSha256, sha256(preparationBytes));
assert.deepEqual(manifest.model, {
  label: "5.6 Sol",
  slug: "gpt-5.6-sol",
  reasoningEffort: "low",
  authentication: "ChatGPT subscription",
  scoreBlind: true,
});
assert.equal(manifest.failedGateDisposition.v221PlanningGatePreservedFailed, true);
assert.equal(
  manifest.failedGateDisposition.v221ValidPartialPlansReusableForSuccessorAcceptance,
  false
);
assert.equal(manifest.failedGateDisposition.v221Debate75Retried, false);
assert.equal(manifest.failedGateDisposition.v221TimeoutExtended, false);
assert.equal(manifest.proposedPolicy.promoted, false);
assert.deepEqual(manifest.costEstimate.expectedParallelWallMinutes, [5, 20]);
assert.deepEqual(manifest.costEstimate.expectedAggregateModelMinutes, [10, 30]);
assert.equal(manifest.costEstimate.directIncrementalCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.meteredApiCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.transcriptionCostUsdMaximum, 0);
assert.equal(manifest.executionEnvironment.authentication, "ChatGPT subscription");
assert.equal(manifest.executionEnvironment.APIKeysRemoved, true);
assert.match(manifest.executionEnvironment.codexCliVersion, /^codex-cli /);
assert.deepEqual(manifest.executionPolicy, {
  stage: "inventory-sections",
  contexts: 10,
  attemptsPerContext: 1,
  retriesMaximum: 0,
  timeoutMsPerContext: 600000,
  timeoutExtensionsMaximum: 0,
  absoluteStageTimeoutMs: 3600000,
  copiedInputBytesMaximum: 115000,
  observedMaximumCopiedInputBytes: 65543,
  maximumParallelContexts: 2,
  schedulerRamp: [1, 2],
  rampOneServesAsOperationalCanary: true,
  eachRampPhaseMustPassBeforeExpansion: true,
  abortBeforeStartingAdditionalContextOnAnyFailure: true,
  allowAlreadyRunningIndependentContextToFinish: true,
  allTenSectionsMustPassBeforePlanComposition: true,
  deterministicInputOrder: true,
  immutableRouteHashRequired: true,
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
  everyComposedPlanMustPassUnchangedDeterministicSemanticValidation: true,
  inventoryRoutesMustMatchFrozenCanonicalHash: true,
  writableDomainsLimitedToSections: true,
  partialSectionGateAcceptance: false,
  automaticSemanticCorrection: false,
  planCompositionDeferredUntilAllSectionsAccepted: true,
  scoresDerived: false,
});

assert.equal(manifest.contexts.length, 10);
assert.deepEqual(
  manifest.contexts.map((context) => context.debateNumber),
  ["17", "39", "121", "21", "75", "168", "177", "56", "49", "132"]
);
for (const [index, context] of manifest.contexts.entries()) {
  const prepared = preparation.contexts[index];
  assert.equal(context.contextIndex, index);
  assert.equal(context.stage, "inventory-sections");
  assert.equal(context.packet, prepared.sectionPacket);
  assert.equal(context.output, prepared.sectionOutput);
  assert.equal(context.composedPlanOutput, prepared.composedPlanOutput);
  assert.equal(context.inventoryRoutesSha256, prepared.inventoryRoutesSha256);
  assert.equal(context.immutableRouteOutput, prepared.routeOutput);
  assert.equal(context.immutableRouteOutputSha256, prepared.routeOutputSha256);
  assert.deepEqual(context.writableDomains, ["sections"]);
  assert.equal(context.attemptsMaximum, 1);
  assert.equal(context.retries, 0);
  assert.equal(context.timeoutExtensions, 0);
  assert.equal(context.modelExecutionAuthorized, false);
  assert.equal(context.copiedInputs.length, 7);
  const [packetBytes, schemaBytes, routeBytes] = await Promise.all([
    readFile(context.packet),
    readFile(context.strictOutputSchema),
    readFile(context.immutableRouteOutput),
  ]);
  assert.equal(sha256(packetBytes), context.packetSha256);
  assert.equal(sha256(schemaBytes), context.strictOutputSchemaSha256);
  assert.equal(sha256(routeBytes), context.immutableRouteOutputSha256);
  const packet = JSON.parse(packetBytes);
  const schema = JSON.parse(schemaBytes);
  assert.equal(packet.modelExecutionAuthorized, false);
  assert.equal(packet.isolation.scoreBlind, true);
  assert.equal(packet.isolation.inventoryRoutesImmutable, true);
  assert.equal(packet.isolation.failedV221PlanOutputsUnavailable, true);
  assert.equal(packet.inventoryRoutesSha256, context.inventoryRoutesSha256);
  assert.equal(
    schema.properties.inventoryRoutesSha256.const,
    context.inventoryRoutesSha256
  );
  assert.deepEqual(context.copiedInputs, packet.copiedInputs);
  assert.equal(await exists(context.output), false);
  assert.equal(await exists(context.composedPlanOutput), false);
}
assert.deepEqual(manifest.totals, {
  debates: 10,
  acceptedRoutes: 10,
  sectionContextsPrepared: 10,
  sectionContextsAuthorized: 0,
  sectionContextsExecuted: 0,
  acceptedSections: 0,
  composedPlans: 0,
  retries: 0,
  timeoutExtensions: 0,
  semanticCorrections: 0,
  audioCalls: 0,
  transcriptionCalls: 0,
  scoresDerived: 0,
  meteredApiCostUsd: 0,
  transcriptionCostUsd: 0,
});
assert.equal(manifest.stopRules.invalidSectionOutputBlocksEntireGate, true);
assert.equal(manifest.stopRules.sectionTimeoutBlocksEntireGate, true);
assert.equal(manifest.stopRules.routeHashMismatchBlocksEntireGate, true);
assert.equal(manifest.stopRules.retryBlocks, true);
assert.deepEqual(manifest.authorization, {
  executionActivationPreparation: true,
  sectionModelContexts: false,
  deterministicSectionValidation: false,
  planComposition: false,
  planAnalysis: false,
  exactSidePacketPreparation: false,
  sideSelectorModelExecution: false,
  retry: false,
  timeoutExtension: false,
  semanticCorrection: false,
  independentJudgmentPacketPreparation: false,
  independentJudgmentModelExecution: false,
  paidTranscription: false,
  audioVerification: false,
  scoreDerivation: false,
  policyPromotion: false,
  publicationPreparation: false,
  productionMutation: false,
  remainingProductionBatches: false,
});
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
  "prepare-separate-v2.2.2-section-execution-activation-only"
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      contexts: 10,
      maximumCopiedInputBytes:
        manifest.executionPolicy.observedMaximumCopiedInputBytes,
      sectionModelContextsAuthorized: false,
      modelContextsExecuted: 0,
      scoresDerived: 0,
      nextAuthorizedAction: manifest.nextAuthorizedAction,
    },
    null,
    2
  )
);
