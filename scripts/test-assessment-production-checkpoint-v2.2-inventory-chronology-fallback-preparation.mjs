#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

import {
  canonicalJson,
  containsProhibitedCalculatedField,
} from "./lib/v4-lean-production.mjs";
import { makeV422116InventorySchema } from "./lib/v422116-decomposed-consensus.mjs";
import {
  buildV4221162InventoryCandidateTransport,
  validateV4221162InventoryCandidateTransport,
} from "./lib/v4221162-inventory-transport.mjs";
import { auditDecomposedStrictSchema } from "./lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs";
import {
  buildCandidateCensus,
  buildCandidateShardedInventoryPlanSchema,
  buildSideCandidateEvidenceTransport,
  validateCandidateShardedInventoryPlan,
} from "./lib/assessment-production-score-stability-v2-inventory-candidate-sharded.mjs";
import {
  V212_CANDIDATE_SHARDED_INVENTORY,
  buildMaximumCandidateShardedPlanFixture,
  buildV212InventoryEvidenceBundle,
  decodeV212LosslessColumnarCandidateTransport,
  validateV212InventoryEvidenceBundle,
  validateV212LosslessColumnarCandidateTransport,
} from "./lib/assessment-production-score-stability-v2.1.2-inventory-preparation.mjs";
import {
  CHRONOLOGY_FALLBACK_INVENTORY,
  buildChronologyFallbackSideSelectionSchema,
} from "./lib/assessment-production-score-stability-v2.1.2-inventory-chronology-fallback.mjs";

const ROOT =
  "docs/assessment-production/production-checkpoint-v2.2-1/inventory-chronology-fallback";
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const preparation = JSON.parse(await readFile(PREPARATION));
assert.equal(
  preparation.schemaVersion,
  "1.0-production-checkpoint-v2.2-chronology-fallback-inventory-preparation"
);
assert.equal(
  preparation.protocolId,
  "assessment-production-checkpoint-v2.2-1-chronology-fallback-inventory"
);
assert.equal(
  preparation.sideSelectionProtocolId,
  CHRONOLOGY_FALLBACK_INVENTORY.protocolId
);
assert.equal(
  preparation.status,
  "production-checkpoint-v2.2-chronology-fallback-source-assets-and-ten-planner-packets-frozen"
);
assert.equal(preparation.productionCanary, true);
assert.equal(preparation.developmentValidationOnly, false);
assert.equal(preparation.stagingOnly, true);
assert.deepEqual(preparation.model, {
  label: "5.6 Sol",
  slug: "gpt-5.6-sol",
  reasoningEffort: "low",
  authentication: "ChatGPT subscription",
  scoreBlind: true,
  apiKeysRemovedForAnyLaterExecution: true,
  meteredApiCostUsdMaximum: 0,
});
assert.deepEqual(preparation.scheduling, {
  inventoryConcurrencyRamp: [1, 2],
  inventoryConcurrencyMaximum: 2,
  oneAttemptPerContext: true,
  retries: 0,
  timeoutExtensions: 0,
});
assert.equal(
  preparation.gateDisposition.failedProductionCanaryV1PreservedFailed,
  true
);
assert.equal(
  preparation.gateDisposition.failedProductionCanaryV1OutputsUsedAsModelInput,
  false
);
assert.equal(
  preparation.gateDisposition.priorValidationCohortsReclassified,
  false
);
assert.equal(
  preparation.gateDisposition.priorValidationCohortOutputsUsedAsModelInput,
  false
);
assert.equal(preparation.gateDisposition.checkpointDiscoveryPassed, true);
assert.equal(preparation.gateDisposition.checkpointDiscoveryRetried, false);
assert.equal(
  preparation.gateDisposition.checkpointDiscoveryCandidatesChangedDuringTransport,
  false
);
assert.equal(preparation.activePolicy.version, "v2.2");
assert.equal(
  preparation.activePolicy.agreedWinningSideMayCollapseToIntegerRoundedTie,
  true
);
assert.equal(
  preparation.activePolicy.agreedInitialTieImposesNoDirectionConstraint,
  true
);
assert.equal(preparation.activePolicy.numericalThresholdsChanged, false);
assert.equal(preparation.activePolicy.scorePassesMaximum, 1);
assert.equal(
  preparation.validatedInventoryContract.planAndSideIsolationPreserved,
  true
);
assert.equal(
  preparation.validatedInventoryContract.fallbackConditionRepositoryOwned,
  true
);
assert.equal(
  preparation.validatedInventoryContract.validationCohortOutputsAvailableToModels,
  false
);
assert.equal(preparation.validatedInventoryContract.scoreFieldsAvailable, false);

assert.deepEqual(preparation.stageDesign.stages, [
  "candidate-census-plan",
  "pro-candidate-evidence-selection-with-chronology-fallback",
  "con-candidate-evidence-selection-with-chronology-fallback",
]);
assert.equal(preparation.stageDesign.contextsPerDebate, 3);
assert.equal(preparation.stageDesign.totalContextsPlanned, 30);
assert.equal(preparation.stageDesign.exactPlannerPacketsFrozen, 10);
assert.equal(preparation.stageDesign.completeSideTransportsFrozen, 20);
assert.equal(
  preparation.stageDesign.maximumPlanChronologyFallbackSchemaPrototypesFrozen,
  20
);
assert.equal(preparation.stageDesign.exactSidePacketsFrozen, 0);
assert.equal(preparation.stageDesign.exactSideSchemasFrozen, 0);
assert.equal(
  preparation.stageDesign.exactSidePacketFreezeRequiresAcceptedImmutablePlan,
  true
);
assert.equal(preparation.stageDesign.prototypeSchemasExecutable, false);

assert.equal(preparation.contexts.length, 10);
for (const context of preparation.contexts) {
  const assetPaths = [
    context.inventorySourcePacket,
    context.discoveryCandidateBundle,
    context.discoverySparseContext,
    context.validatorCandidateEvidenceBundle,
    context.fullCandidateTransport,
    context.candidateCensus,
    context.compilerSchema,
    context.planSchema,
    context.planPacket,
    context.originalTranscript,
    context.originalEvents,
    context.originalManifest,
    context.fullLedger,
    ...context.sideAssets.flatMap((asset) => [
      asset.transport,
      asset.maximumPlanSchemaPrototype,
    ]),
  ];
  assert.equal(
    (await Promise.all(assetPaths.map(exists))).every(Boolean),
    true,
    `${context.debateNumber}: prepared asset missing`
  );
  const [
    inventorySourcePacketBytes,
    candidateBundleBytes,
    sparseContextBytes,
    evidenceBundleBytes,
    fullTransportBytes,
    censusBytes,
    compilerSchemaBytes,
    planSchemaBytes,
    planPacketBytes,
    eventsBytes,
  ] = await Promise.all([
    readFile(context.inventorySourcePacket),
    readFile(context.discoveryCandidateBundle),
    readFile(context.discoverySparseContext),
    readFile(context.validatorCandidateEvidenceBundle),
    readFile(context.fullCandidateTransport),
    readFile(context.candidateCensus),
    readFile(context.compilerSchema),
    readFile(context.planSchema),
    readFile(context.planPacket),
    readFile(context.originalEvents),
  ]);
  assert.equal(
    sha256(inventorySourcePacketBytes),
    context.inventorySourcePacketSha256
  );
  assert.equal(
    sha256(candidateBundleBytes),
    context.discoveryCandidateBundleSha256
  );
  assert.equal(sha256(sparseContextBytes), context.discoverySparseContextSha256);
  assert.equal(
    sha256(evidenceBundleBytes),
    context.validatorCandidateEvidenceBundleSha256
  );
  assert.equal(sha256(fullTransportBytes), context.fullCandidateTransportSha256);
  assert.equal(sha256(censusBytes), context.candidateCensusSha256);
  assert.equal(sha256(compilerSchemaBytes), context.compilerSchemaSha256);
  assert.equal(sha256(planSchemaBytes), context.planSchemaSha256);
  assert.equal(sha256(planPacketBytes), context.planPacketSha256);

  const inventorySourcePacket = JSON.parse(inventorySourcePacketBytes);
  const candidateBundle = JSON.parse(candidateBundleBytes);
  const evidenceBundle = JSON.parse(evidenceBundleBytes);
  const fullTransport = JSON.parse(fullTransportBytes);
  const candidateCensus = JSON.parse(censusBytes);
  const compilerSchema = JSON.parse(compilerSchemaBytes);
  const planSchema = JSON.parse(planSchemaBytes);
  const planPacket = JSON.parse(planPacketBytes);
  const eventsDocument = JSON.parse(eventsBytes);
  assert.equal(
    inventorySourcePacket.schemaVersion,
    "1.0-production-checkpoint-v2.2-chronology-fallback-inventory-source-packet"
  );
  assert.equal(inventorySourcePacket.protocolId, preparation.protocolId);
  assert.equal(
    inventorySourcePacket.modelInputBoundary.candidateShardedInventoryOnly,
    true
  );
  assert.equal(
    inventorySourcePacket.modelInputBoundary.chronologyFallbackRequired,
    true
  );
  assert.equal(inventorySourcePacket.modelInputBoundary.productionCanary, true);
  assert.equal(
    inventorySourcePacket.modelInputBoundary.developmentValidationOnly,
    false
  );
  assert.equal(inventorySourcePacket.modelInputBoundary.scoreBlind, true);
  assert.equal(
    inventorySourcePacket.modelInputBoundary.failedProductionCanaryOutputsUnavailable,
    true
  );
  assert.equal(
    inventorySourcePacket.modelInputBoundary.validationCohortOutputsUnavailable,
    true
  );

  validateV212InventoryEvidenceBundle(
    evidenceBundle,
    candidateBundle,
    eventsDocument
  );
  assert.deepEqual(
    buildV212InventoryEvidenceBundle(candidateBundle, eventsDocument),
    evidenceBundle
  );
  const objectTransport =
    decodeV212LosslessColumnarCandidateTransport(fullTransport);
  validateV212LosslessColumnarCandidateTransport(fullTransport, objectTransport);
  validateV4221162InventoryCandidateTransport(objectTransport, evidenceBundle);
  assert.deepEqual(
    buildV4221162InventoryCandidateTransport(evidenceBundle),
    objectTransport
  );
  assert.deepEqual(
    makeV422116InventorySchema({ evidenceBundle: objectTransport }),
    compilerSchema
  );
  assert.deepEqual(buildCandidateCensus(fullTransport), candidateCensus);
  assert.deepEqual(
    buildCandidateShardedInventoryPlanSchema({
      legacySchema: compilerSchema,
      candidateTransport: fullTransport,
      candidateCensus,
    }),
    planSchema
  );
  assert.equal(auditDecomposedStrictSchema(planSchema).nullableCandidateProperties, 0);

  const maximumPlan = buildMaximumCandidateShardedPlanFixture({
    legacySchema: compilerSchema,
    candidateTransport: fullTransport,
  });
  validateCandidateShardedInventoryPlan({
    plan: maximumPlan,
    legacySchema: compilerSchema,
    candidateTransport: fullTransport,
    candidateCensus,
  });
  for (const asset of context.sideAssets) {
    const [sideTransportBytes, prototypeBytes] = await Promise.all([
      readFile(asset.transport),
      readFile(asset.maximumPlanSchemaPrototype),
    ]);
    assert.equal(sha256(sideTransportBytes), asset.transportSha256);
    assert.equal(sha256(prototypeBytes), asset.maximumPlanSchemaPrototypeSha256);
    const sideTransport = JSON.parse(sideTransportBytes);
    const prototype = JSON.parse(prototypeBytes);
    assert.deepEqual(
      buildSideCandidateEvidenceTransport(fullTransport, asset.side),
      sideTransport
    );
    assert.deepEqual(
      buildChronologyFallbackSideSelectionSchema({
        side: asset.side,
        legacySchema: compilerSchema,
        candidateTransport: fullTransport,
        sideCandidateTransport: sideTransport,
        candidateCensus,
        plan: maximumPlan,
      }),
      prototype
    );
    assert.equal(
      auditDecomposedStrictSchema(prototype).nullableCandidateProperties,
      asset.candidates
    );
    assert.equal(asset.preferredMoveKindRequired, true);
    assert.equal(asset.constructiveOrphanFallbackRequired, true);
    assert.equal(asset.fallbackConditionRepositoryOwned, true);
    assert.equal(asset.exactSchemaDeferredUntilAcceptedPlan, true);
    assert.equal(asset.exactPacketDeferredUntilAcceptedPlan, true);
    assert.equal(asset.prototypeExecutable, false);
    assert.equal(
      asset.maximumPlanCopiedInputBytes <=
        V212_CANDIDATE_SHARDED_INVENTORY.maximumCopiedInputBytes,
      true
    );
  }

  assert.equal(planPacket.stage, "candidate-census-plan");
  assert.equal(planPacket.protocolId, preparation.protocolId);
  assert.deepEqual(planPacket.model, {
    label: "5.6 Sol",
    slug: "gpt-5.6-sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
  });
  assert.equal(planPacket.isolation.scoreBlind, true);
  assert.equal(
    planPacket.isolation.failedProductionCanaryOutputsUnavailable,
    true
  );
  assert.equal(planPacket.isolation.validationCohortOutputsUnavailable, true);
  assert.equal(planPacket.modelExecutionAuthorized, false);
  assert.equal(planPacket.attemptsMaximum, 1);
  assert.equal(planPacket.retries, 0);
  assert.equal(planPacket.timeoutExtensions, 0);
  assert.deepEqual(planPacket.writableDomains, ["routes", "sections"]);
  let copiedInputBytes = 0;
  for (const copiedInput of planPacket.copiedInputs) {
    const bytes = await readFile(copiedInput.path);
    assert.equal(sha256(bytes), copiedInput.sha256);
    assert.equal(bytes.length, copiedInput.bytes);
    copiedInputBytes += bytes.length;
  }
  assert.equal(copiedInputBytes, planPacket.copiedInputBytes);
  assert.equal(context.planCopiedInputBytes, planPacket.copiedInputBytes);
  assert.equal(
    planPacket.copiedInputBytes <=
      V212_CANDIDATE_SHARDED_INVENTORY.maximumCopiedInputBytes,
    true
  );
  assert.equal(context.exactPlannerPacketFrozen, true);
  assert.equal(context.exactSidePacketsFrozen, false);
  assert.equal(context.plannedContexts, 3);
  assert.equal(context.candidates, candidateBundle.candidateCount);
  assert.equal(context.proCandidates + context.conCandidates, context.candidates);
  assert.equal(containsProhibitedCalculatedField(candidateCensus), false);
  assert.equal(containsProhibitedCalculatedField(planSchema), false);
  assert.equal(
    canonicalJson(JSON.parse(fullTransportBytes)),
    canonicalJson(fullTransport)
  );
}

assert.deepEqual(preparation.totals, {
  debates: 10,
  candidates: 332,
  proCandidates: 175,
  conCandidates: 157,
  plannedModelContexts: 30,
  exactPlannerPacketsFrozen: 10,
  exactSidePacketsFrozen: 0,
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
assert.equal(preparation.audioPolicy.discoveryBelowHighCandidates, 0);
assert.equal(preparation.audioPolicy.audioAccessedDuringPreparation, false);
assert.equal(preparation.transport.everyDiscoveredCandidateRetained, true);
assert.equal(preparation.transport.semanticCandidateDownselectionPerformed, false);
assert.equal(preparation.transport.semanticCandidateCorrectionPerformed, false);
assert.equal(preparation.transport.sourceSpanTruncationPerformed, false);
assert.equal(preparation.transport.modelAuthoredLexicalTokenCounts, false);
assert.equal(
  preparation.transport.maximumPlannerCopiedInputBytes <=
    preparation.transport.provenCeilingBytes,
  true
);
assert.equal(
  preparation.transport.maximumSidePrototypeCopiedInputBytes <=
    preparation.transport.provenCeilingBytes,
  true
);
assert.equal(preparation.deterministicCompilation.preferredMoveKindModelAuthored, true);
assert.equal(preparation.deterministicCompilation.constructiveFallbackModelAuthored, true);
assert.equal(
  preparation.deterministicCompilation.fallbackAppliedOnlyToRetainedOrphanReply,
  true
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash drifted`);
}
assert.equal(
  (
    await Promise.all(
      preparation.futureOutputPathsExcludedFromSourceHashes.map(exists)
    )
  ).every((present) => present === false),
  true
);
assert.deepEqual(preparation.authorization, {
  deterministicValidation: true,
  candidateCensusPlanExecutionManifestPreparation: true,
  candidateCensusPlanExecutionActivation: false,
  inventoryPlanModelExecution: false,
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
assert.equal(
  preparation.nextAuthorizedAction,
  "prepare-production-checkpoint-v2.2-candidate-census-plan-execution-manifest-model-free-only"
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: preparation.contexts.length,
      candidates: preparation.totals.candidates,
      exactPlannerPacketsFrozen: preparation.totals.exactPlannerPacketsFrozen,
      chronologyFallbackSchemaPrototypesFrozen:
        preparation.stageDesign
          .maximumPlanChronologyFallbackSchemaPrototypesFrozen,
      exactSidePacketsFrozen: preparation.totals.exactSidePacketsFrozen,
      maximumPlannerCopiedInputBytes:
        preparation.transport.maximumPlannerCopiedInputBytes,
      maximumSidePrototypeCopiedInputBytes:
        preparation.transport.maximumSidePrototypeCopiedInputBytes,
      modelContextsExecuted: 0,
      scoresDerived: 0,
      nextAuthorizedAction: preparation.nextAuthorizedAction,
    },
    null,
    2
  )
);
