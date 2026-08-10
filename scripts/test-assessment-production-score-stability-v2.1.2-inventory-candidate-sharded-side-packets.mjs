#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

import {
  buildCandidateShardedSideSelectionSchema,
  candidateShardedInventoryPlanSha256,
  validateCandidateShardedInventoryPlan,
} from "./lib/assessment-production-score-stability-v2-inventory-candidate-sharded.mjs";
import { auditDecomposedStrictSchema } from "./lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs";

const ROOT =
  "docs/assessment-production/score-stability-v2.1.2-validation-cohort/inventory-candidate-sharded";
const MANIFEST = `${ROOT}/side-packet-preparation-manifest.json`;
const SOURCE_PREPARATION = `${ROOT}/preparation-manifest.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const [manifestBytes, sourcePreparationBytes] = await Promise.all([
  readFile(MANIFEST),
  readFile(SOURCE_PREPARATION),
]);
const manifest = JSON.parse(manifestBytes);
const sourcePreparation = JSON.parse(sourcePreparationBytes);

assert.equal(
  manifest.schemaVersion,
  "1.0-score-stability-v2.1.2-candidate-sharded-side-packet-preparation"
);
assert.equal(manifest.protocolId, sourcePreparation.protocolId);
assert.equal(
  manifest.status,
  "twenty-exact-v2.1.2-side-selector-packets-frozen-not-authorized"
);
assert.equal(Number.isNaN(Date.parse(manifest.frozenAt)), false);
assert.match(manifest.checkpointCommit, /^[0-9a-f]{40}$/);
assert.equal(manifest.developmentValidationOnly, true);
assert.equal(manifest.productionCanary, false);
assert.equal(manifest.stagingOnly, true);
assert.equal(manifest.AIOnly, true);
assert.deepEqual(manifest.model, {
  label: "5.6 Sol",
  slug: "gpt-5.6-sol",
  reasoningEffort: "low",
  authentication: "ChatGPT subscription",
  scoreBlind: true,
  apiKeysRemovedForAnyLaterExecution: true,
  meteredApiCostUsdMaximum: 0,
});
assert.deepEqual(manifest.scheduling, {
  sideSelectorConcurrencyMaximum: 2,
  oneAttemptPerContext: true,
  retries: 0,
  timeoutExtensions: 0,
});
assert.equal(manifest.failedGateDisposition.v1CanaryPreservedFailed, true);
assert.equal(manifest.failedGateDisposition.v2ValidationPreservedFailed, true);
assert.equal(manifest.failedGateDisposition.v21DiscoveryPreservedFailed, true);
assert.equal(manifest.failedGateDisposition.v211DiscoveryPreservedFailed, true);
assert.equal(manifest.failedGateDisposition.currentCanaryReclassified, false);
assert.equal(manifest.proposedPolicy.everyIntegerRoundedTieAccepted, true);
assert.equal(manifest.proposedPolicy.promoted, false);

assert.equal(manifest.contexts.length, 20);
assert.equal(
  manifest.contexts.filter((context) => context.side === "pro").length,
  10
);
assert.equal(
  manifest.contexts.filter((context) => context.side === "con").length,
  10
);
const debates = new Set(manifest.contexts.map((context) => context.debateNumber));
assert.equal(debates.size, 10);
for (const debateNumber of debates) {
  assert.deepEqual(
    manifest.contexts
      .filter((context) => context.debateNumber === debateNumber)
      .map((context) => context.side),
    ["pro", "con"]
  );
}

for (const context of manifest.contexts) {
  const prepared = sourcePreparation.contexts.find(
    (item) => item.debateNumber === context.debateNumber
  );
  const sideAsset = prepared.sideAssets.find(
    (asset) => asset.side === context.side
  );
  assert.equal(context.stage, `${context.side}-candidate-evidence-selection`);
  assert.equal(context.debateId, prepared.debateId);
  assert.equal(context.candidates, sideAsset.candidates);
  assert.equal(context.immutablePlan, prepared.planOutput);
  assert.equal(context.sideTransport, sideAsset.transport);
  assert.equal(context.output, sideAsset.output);
  assert.equal(context.attemptsMaximum, 1);
  assert.equal(context.retries, 0);
  assert.equal(context.timeoutExtensions, 0);
  assert.equal(context.modelExecutionAuthorized, false);
  assert.equal(context.copiedInputs.length, 6);
  assert.equal(context.copiedInputBytes <= 115000, true);
  assert.equal(await exists(context.output), false);

  const [
    planBytes,
    transportBytes,
    schemaBytes,
    packetBytes,
    legacySchema,
    fullTransport,
    candidateCensus,
  ] = await Promise.all([
    readFile(context.immutablePlan),
    readFile(context.sideTransport),
    readFile(context.exactSchema),
    readFile(context.packet),
    readFile(prepared.compilerSchema, "utf8").then(JSON.parse),
    readFile(prepared.fullCandidateTransport, "utf8").then(JSON.parse),
    readFile(prepared.candidateCensus, "utf8").then(JSON.parse),
  ]);
  assert.equal(sha256(planBytes), context.immutablePlanSha256);
  assert.equal(sha256(transportBytes), context.sideTransportSha256);
  assert.equal(sha256(schemaBytes), context.exactSchemaSha256);
  assert.equal(schemaBytes.length, context.exactSchemaBytes);
  assert.equal(sha256(packetBytes), context.packetSha256);
  assert.equal(packetBytes.length, context.packetBytes);

  const plan = JSON.parse(planBytes);
  const sideTransport = JSON.parse(transportBytes);
  const schema = JSON.parse(schemaBytes);
  const packet = JSON.parse(packetBytes);
  validateCandidateShardedInventoryPlan({
    plan,
    legacySchema,
    candidateTransport: fullTransport,
    candidateCensus,
  });
  assert.equal(
    candidateShardedInventoryPlanSha256(plan),
    context.immutablePlanCanonicalSha256
  );
  assert.deepEqual(
    buildCandidateShardedSideSelectionSchema({
      side: context.side,
      legacySchema,
      candidateTransport: fullTransport,
      sideCandidateTransport: sideTransport,
      candidateCensus,
      plan,
    }),
    schema
  );
  assert.equal(
    schema.properties.inventoryPlanSha256.const,
    context.immutablePlanCanonicalSha256
  );
  assert.equal(
    auditDecomposedStrictSchema(schema).nullableCandidateProperties,
    context.candidates
  );

  assert.equal(
    packet.schemaVersion,
    "1.0-score-stability-v2.1.2-candidate-sharded-side-selector-packet"
  );
  assert.equal(packet.protocolId, manifest.protocolId);
  assert.equal(packet.stage, context.stage);
  assert.equal(packet.debateNumber, context.debateNumber);
  assert.equal(packet.debateId, context.debateId);
  assert.equal(packet.side, context.side);
  assert.deepEqual(packet.model, {
    label: "5.6 Sol",
    slug: "gpt-5.6-sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
  });
  assert.equal(packet.isolation.freshContextRequired, true);
  assert.equal(packet.isolation.oneDebateOnly, true);
  assert.equal(packet.isolation.oneSideOnly, true);
  assert.equal(packet.isolation.scoreBlind, true);
  assert.equal(packet.isolation.routesAndSectionsImmutable, true);
  assert.equal(packet.isolation.otherSideCandidateEvidenceUnavailable, true);
  assert.equal(packet.isolation.otherSideSelectorOutputUnavailable, true);
  assert.equal(packet.isolation.plannerExecutionMetadataUnavailable, true);
  assert.equal(
    packet.immutablePlanCanonicalSha256,
    context.immutablePlanCanonicalSha256
  );
  assert.deepEqual(packet.copiedInputs, context.copiedInputs);
  assert.deepEqual(packet.writableDomains, ["candidateSelections"]);
  assert.equal(packet.output, context.output);
  assert.equal(packet.attemptsMaximum, 1);
  assert.equal(packet.retries, 0);
  assert.equal(packet.timeoutExtensions, 0);
  assert.equal(packet.modelExecutionAuthorized, false);

  let copiedInputBytes = 0;
  for (const input of packet.copiedInputs) {
    const bytes = await readFile(input.path);
    assert.equal(sha256(bytes), input.sha256);
    assert.equal(bytes.length, input.bytes);
    copiedInputBytes += bytes.length;
  }
  assert.equal(copiedInputBytes, packet.copiedInputBytes);
  assert.equal(packet.copiedInputBytes, context.copiedInputBytes);
}

assert.deepEqual(manifest.totals, {
  debates: 10,
  exactSideSchemasFrozen: 20,
  exactSidePacketsFrozen: 20,
  proContexts: 10,
  conContexts: 10,
  candidatesTransported: 307,
  modelContextsExecuted: 0,
  audioCalls: 0,
  transcriptionCalls: 0,
  retries: 0,
  timeoutExtensions: 0,
  semanticCorrections: 0,
  scoresDerived: 0,
  meteredApiCostUsd: 0,
  transcriptionCostUsd: 0,
});
assert.equal(manifest.exactBinding.everySchemaBindsAcceptedCanonicalPlanHash, true);
assert.equal(manifest.exactBinding.everySchemaEnumeratesAcceptedPlanSectionIds, true);
assert.equal(manifest.exactBinding.everySchemaBindsCorrespondingSideTransportHash, true);
assert.equal(manifest.exactBinding.everyPacketContainsOnlyOneSideTransport, true);
assert.equal(manifest.exactBinding.completeSideCandidateCohortRetained, true);
assert.equal(manifest.exactBinding.semanticCandidateDownselectionPerformed, false);
assert.equal(manifest.exactBinding.exactSchemasExecutable, true);
assert.equal(manifest.exactBinding.prototypeSchemasExecutable, false);
assert.equal(
  manifest.exactBinding.maximumCopiedInputBytes <=
    manifest.exactBinding.provenCeilingBytes,
  true
);
assert.equal(manifest.stopRules.acceptedPlanHashMismatchBlocks, true);
assert.equal(manifest.stopRules.exactSideSchemaHashMismatchBlocks, true);
assert.equal(manifest.stopRules.crossSideEvidenceContaminationBlocks, true);
assert.equal(
  manifest.stopRules.sideModelExecutionBeforeSeparateActivationBlocks,
  true
);
assert.equal(manifest.stopRules.retryBlocks, true);
assert.equal(manifest.stopRules.timeoutExtensionBlocks, true);

for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash drifted`);
}
assert.equal(
  (
    await Promise.all(
      manifest.futureOutputPathsExcludedFromSourceHashes.map(exists)
    )
  ).every((present) => present === false),
  true
);
assert.deepEqual(manifest.authorization, {
  deterministicValidation: true,
  sideSelectorExecutionManifestPreparation: true,
  sideSelectorExecutionActivation: false,
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
  manifest.nextAuthorizedAction,
  "prepare-v2.1.2-side-selector-execution-manifest-model-free-only"
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: manifest.totals.debates,
      exactSideSchemasFrozen: manifest.totals.exactSideSchemasFrozen,
      exactSidePacketsFrozen: manifest.totals.exactSidePacketsFrozen,
      candidatesTransported: manifest.totals.candidatesTransported,
      maximumCopiedInputBytes:
        manifest.exactBinding.maximumCopiedInputBytes,
      modelExecutionAuthorized:
        manifest.authorization.sideSelectorModelExecution,
      scoresDerived: manifest.totals.scoresDerived,
      productionMutationAuthorized:
        manifest.authorization.productionMutation,
      nextAuthorizedAction: manifest.nextAuthorizedAction,
    },
    null,
    2
  )
);
