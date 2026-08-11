#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const ROOT =
  "docs/assessment-production/score-stability-v2.2.2-validation-cohort/inventory-route-section-plan-successor";
const MANIFEST = `${ROOT}/route-execution-preparation-manifest.json`;
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
  "1.0-score-stability-v2.2.2-route-execution-preparation-manifest"
);
assert.equal(
  manifest.status,
  "frozen-ten-v2.2.2-route-contexts-prepared-not-authorized"
);
assert.equal(manifest.preparation, PREPARATION);
assert.equal(manifest.preparationSha256, sha256(preparationBytes));
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
assert.deepEqual(manifest.costEstimate.expectedParallelWallMinutes, [5, 15]);
assert.deepEqual(manifest.costEstimate.expectedAggregateModelMinutes, [8, 22]);
assert.equal(manifest.costEstimate.directIncrementalCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.meteredApiCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.transcriptionCostUsdMaximum, 0);
assert.equal(manifest.executionEnvironment.authentication, "ChatGPT subscription");
assert.equal(manifest.executionEnvironment.APIKeysRemoved, true);
assert.match(manifest.executionEnvironment.codexCliVersion, /^codex-cli /);
assert.deepEqual(manifest.executionPolicy, {
  stage: "inventory-routes",
  contexts: 10,
  attemptsPerContext: 1,
  retriesMaximum: 0,
  timeoutMsPerContext: 600000,
  timeoutExtensionsMaximum: 0,
  absoluteStageTimeoutMs: 3600000,
  copiedInputBytesMaximum: 115000,
  observedMaximumCopiedInputBytes: 59812,
  maximumParallelContexts: 2,
  schedulerRamp: [1, 2],
  rampOneServesAsOperationalCanary: true,
  eachRampPhaseMustPassBeforeExpansion: true,
  abortBeforeStartingAdditionalContextOnAnyFailure: true,
  allowAlreadyRunningIndependentContextToFinish: true,
  allTenRoutesMustPassBeforeSectionPacketPreparation: true,
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
assert.equal(manifest.contexts.length, 10);
assert.deepEqual(
  manifest.contexts.map((context) => context.debateNumber),
  ["17", "39", "121", "21", "75", "168", "177", "56", "49", "132"]
);
for (const [index, context] of manifest.contexts.entries()) {
  const prepared = preparation.contexts[index];
  assert.equal(context.contextIndex, index);
  assert.equal(context.stage, "inventory-routes");
  assert.equal(context.packet, prepared.routePacket);
  assert.equal(context.output, prepared.routeOutput);
  assert.deepEqual(context.writableDomains, ["routes"]);
  assert.equal(context.attemptsMaximum, 1);
  assert.equal(context.retries, 0);
  assert.equal(context.timeoutExtensions, 0);
  assert.equal(context.modelExecutionAuthorized, false);
  assert.equal(context.copiedInputs.length, 6);
  const packetBytes = await readFile(context.packet);
  assert.equal(sha256(packetBytes), context.packetSha256);
  const packet = JSON.parse(packetBytes);
  assert.equal(packet.modelExecutionAuthorized, false);
  assert.equal(packet.isolation.scoreBlind, true);
  assert.equal(packet.isolation.failedV221PlanOutputsUnavailable, true);
  assert.deepEqual(context.copiedInputs, packet.copiedInputs);
  assert.equal(await exists(context.output), false);
}
assert.deepEqual(manifest.totals, {
  debates: 10,
  routeContextsPrepared: 10,
  routeContextsAuthorized: 0,
  routeContextsExecuted: 0,
  acceptedRoutes: 0,
  exactSectionPacketsFrozen: 0,
  retries: 0,
  timeoutExtensions: 0,
  semanticCorrections: 0,
  audioCalls: 0,
  transcriptionCalls: 0,
  scoresDerived: 0,
  meteredApiCostUsd: 0,
  transcriptionCostUsd: 0,
});
assert.equal(manifest.stopRules.invalidRouteOutputBlocksEntireGate, true);
assert.equal(manifest.stopRules.routeTimeoutBlocksEntireGate, true);
assert.equal(manifest.stopRules.retryBlocks, true);
assert.deepEqual(manifest.authorization, {
  executionActivationPreparation: true,
  routeModelContexts: false,
  deterministicRouteValidation: false,
  routeAnalysis: false,
  exactSectionPacketPreparation: false,
  sectionModelExecution: false,
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
  "prepare-separate-v2.2.2-route-execution-activation-only"
);
console.log(
  JSON.stringify(
    {
      status: "passed",
      contexts: 10,
      maximumCopiedInputBytes:
        manifest.executionPolicy.observedMaximumCopiedInputBytes,
      routeModelContextsAuthorized: false,
      modelContextsExecuted: 0,
      scoresDerived: 0,
      nextAuthorizedAction: manifest.nextAuthorizedAction,
    },
    null,
    2
  )
);
