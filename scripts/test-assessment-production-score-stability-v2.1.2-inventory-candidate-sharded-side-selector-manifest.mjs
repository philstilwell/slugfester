#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const ROOT =
  "docs/assessment-production/score-stability-v2.1.2-validation-cohort/inventory-candidate-sharded";
const MANIFEST = `${ROOT}/side-execution-preparation-manifest.json`;
const SIDE_PREPARATION = `${ROOT}/side-packet-preparation-manifest.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const [manifestBytes, sidePreparationBytes] = await Promise.all([
  readFile(MANIFEST),
  readFile(SIDE_PREPARATION),
]);
const manifest = JSON.parse(manifestBytes);
const sidePreparation = JSON.parse(sidePreparationBytes);

assert.equal(
  manifest.schemaVersion,
  "1.0-score-stability-v2.1.2-side-selector-execution-preparation-manifest"
);
assert.equal(manifest.protocolId, sidePreparation.protocolId);
assert.equal(
  manifest.status,
  "frozen-twenty-v2.1.2-side-selector-contexts-prepared-not-authorized"
);
assert.equal(Number.isNaN(Date.parse(manifest.frozenAt)), false);
assert.match(manifest.checkpointCommit, /^[0-9a-f]{40}$/);
assert.equal(manifest.developmentValidationOnly, true);
assert.equal(manifest.productionCanary, false);
assert.equal(manifest.stagingOnly, true);
assert.equal(manifest.AIOnly, true);
assert.equal(manifest.sidePacketPreparation, SIDE_PREPARATION);
assert.equal(
  manifest.sidePacketPreparationSha256,
  sha256(sidePreparationBytes)
);
assert.deepEqual(manifest.model, {
  label: "5.6 Sol",
  slug: "gpt-5.6-sol",
  reasoningEffort: "low",
  authentication: "ChatGPT subscription",
  scoreBlind: true,
});
assert.equal(manifest.failedGateDisposition.v1CanaryPreservedFailed, true);
assert.equal(manifest.failedGateDisposition.v2ValidationPreservedFailed, true);
assert.equal(manifest.failedGateDisposition.v21DiscoveryPreservedFailed, true);
assert.equal(manifest.failedGateDisposition.v211DiscoveryPreservedFailed, true);
assert.equal(manifest.failedGateDisposition.currentCanaryReclassified, false);
assert.equal(manifest.proposedPolicy.everyIntegerRoundedTieAccepted, true);
assert.equal(manifest.proposedPolicy.promoted, false);

assert.deepEqual(manifest.costEstimate.expectedParallelWallMinutes, [15, 35]);
assert.deepEqual(manifest.costEstimate.expectedAggregateModelMinutes, [25, 60]);
assert.equal(manifest.costEstimate.directIncrementalCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.meteredApiCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.contexts, 20);
assert.equal(manifest.costEstimate.absoluteStageTimeoutMinutes, 120);
assert.equal(
  manifest.executionEnvironment.codexPath,
  "/Applications/ChatGPT.app/Contents/Resources/codex"
);
assert.match(manifest.executionEnvironment.codexCliVersion, /^codex-cli /);
assert.equal(manifest.executionEnvironment.authentication, "ChatGPT subscription");
assert.equal(manifest.executionEnvironment.APIKeysRemoved, true);

assert.equal(manifest.contexts.length, 20);
assert.equal(
  manifest.contexts.filter((context) => context.side === "pro").length,
  10
);
assert.equal(
  manifest.contexts.filter((context) => context.side === "con").length,
  10
);
for (const [index, context] of manifest.contexts.entries()) {
  const prepared = sidePreparation.contexts[index];
  assert.equal(context.contextIndex, index);
  assert.equal(context.stage, prepared.stage);
  assert.equal(context.debateNumber, prepared.debateNumber);
  assert.equal(context.debateId, prepared.debateId);
  assert.equal(context.side, prepared.side);
  assert.equal(context.candidates, prepared.candidates);
  assert.equal(context.packet, prepared.packet);
  assert.equal(context.packetSha256, prepared.packetSha256);
  assert.equal(context.strictOutputSchema, prepared.exactSchema);
  assert.equal(
    context.strictOutputSchemaSha256,
    prepared.exactSchemaSha256
  );
  assert.equal(
    context.immutablePlanCanonicalSha256,
    prepared.immutablePlanCanonicalSha256
  );
  assert.equal(context.output, prepared.output);
  assert.deepEqual(context.writableDomains, ["candidateSelections"]);
  assert.equal(context.attemptsMaximum, 1);
  assert.equal(context.retries, 0);
  assert.equal(context.timeoutExtensions, 0);
  assert.equal(context.modelExecutionAuthorized, false);
  assert.equal(context.copiedInputs.length, 6);
  assert.equal(context.copiedInputBytes, prepared.copiedInputBytes);
  assert.equal(context.copiedInputBytes <= 115000, true);
  assert.equal(await exists(context.output), false);

  const packetBytes = await readFile(context.packet);
  assert.equal(sha256(packetBytes), context.packetSha256);
  const packet = JSON.parse(packetBytes);
  assert.equal(packet.modelExecutionAuthorized, false);
  assert.equal(packet.isolation.scoreBlind, true);
  assert.equal(packet.isolation.oneSideOnly, true);
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
}

assert.deepEqual(manifest.executionPolicy, {
  stage: "candidate-evidence-side-selection",
  contexts: 20,
  attemptsPerContext: 1,
  retriesMaximum: 0,
  timeoutMsPerContext: 600000,
  timeoutExtensionsMaximum: 0,
  absoluteStageTimeoutMs: 7200000,
  copiedInputBytesMaximum: 115000,
  observedMaximumCopiedInputBytes: 53339,
  maximumParallelContexts: 2,
  schedulerRamp: [1, 2],
  rampOneServesAsOperationalCanary: true,
  eachRampPhaseMustPassBeforeExpansion: true,
  abortBeforeStartingAdditionalContextOnAnyFailure: true,
  allowAlreadyRunningIndependentContextToFinish: true,
  allTwentySelectorsMustPassBeforeInventoryCompilation: true,
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
assert.equal(manifest.acceptancePolicy.exactContextCountRequired, 20);
assert.equal(manifest.acceptancePolicy.everyContextMustCompleteOnItsSingleAttempt, true);
assert.equal(manifest.acceptancePolicy.partialSideSelectorGateAcceptance, false);
assert.equal(manifest.acceptancePolicy.automaticSemanticCorrection, false);
assert.equal(
  manifest.acceptancePolicy.inventoryCompilationDeferredUntilAllSelectorsAccepted,
  true
);
assert.deepEqual(manifest.totals, {
  debates: 10,
  sideContextsPrepared: 20,
  sideContextsAuthorized: 0,
  sideContextsExecuted: 0,
  acceptedSideSelections: 0,
  candidatesTransported: 307,
  inventoryProposalsCompiled: 0,
  lockedInventoriesCompiled: 0,
  audioCalls: 0,
  transcriptionCalls: 0,
  retries: 0,
  timeoutExtensions: 0,
  semanticCorrections: 0,
  scoresDerived: 0,
  meteredApiCostUsd: 0,
  transcriptionCostUsd: 0,
});
assert.equal(manifest.stopRules.invalidSelectorOutputBlocksEntireInventoryGate, true);
assert.equal(manifest.stopRules.selectorTimeoutBlocksEntireInventoryGate, true);
assert.equal(manifest.stopRules.selectorContextFailureBlocksEntireInventoryGate, true);
assert.equal(manifest.stopRules.retryBlocks, true);
assert.equal(manifest.stopRules.timeoutExtensionBlocks, true);
assert.deepEqual(manifest.authorization, {
  executionActivationPreparation: true,
  sideSelectorModelContexts: false,
  deterministicSideValidation: false,
  inventoryCompilation: false,
  inventoryAnalysis: false,
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
  "prepare-separate-v2.1.2-side-selector-execution-activation-only"
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      contexts: manifest.totals.sideContextsPrepared,
      candidatesTransported: manifest.totals.candidatesTransported,
      maximumCopiedInputBytes:
        manifest.executionPolicy.observedMaximumCopiedInputBytes,
      sideSelectorModelContextsAuthorized:
        manifest.authorization.sideSelectorModelContexts,
      modelContextsExecuted: manifest.totals.sideContextsExecuted,
      scoresDerived: manifest.totals.scoresDerived,
      nextAuthorizedAction: manifest.nextAuthorizedAction,
    },
    null,
    2
  )
);
