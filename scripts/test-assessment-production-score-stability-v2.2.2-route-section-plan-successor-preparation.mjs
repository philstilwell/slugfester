#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const ROOT =
  "docs/assessment-production/score-stability-v2.2.2-validation-cohort/inventory-route-section-plan-successor";
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const preparation = JSON.parse(await readFile(PREPARATION));
assert.equal(
  preparation.schemaVersion,
  "1.0-score-stability-v2.2.2-route-section-plan-successor-preparation"
);
assert.equal(
  preparation.status,
  "ten-v2.2.2-exact-route-packets-and-section-prototypes-frozen"
);
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
  inventoryConcurrencyMaximum: 2,
  oneAttemptPerContext: true,
  retries: 0,
  timeoutExtensions: 0,
});
assert.equal(preparation.failedGateDisposition.v221PlanningGatePreservedFailed, true);
assert.equal(
  preparation.failedGateDisposition.v221ValidPartialPlansReusableForSuccessorAcceptance,
  false
);
assert.equal(preparation.failedGateDisposition.v221Debate75Retried, false);
assert.equal(preparation.failedGateDisposition.v221TimeoutExtended, false);
assert.equal(preparation.failedGateDisposition.v221ExecutionReclassified, false);
assert.equal(preparation.failedGateDisposition.v22DiscoveryGatePreservedFailed, true);
assert.equal(preparation.failedGateDisposition.v213ScoreGatePreservedFailed, true);
assert.equal(preparation.proposedPolicy.promoted, false);
assert.deepEqual(preparation.stageDesign, {
  planningStages: ["inventory-routes", "inventory-sections"],
  contextsPerDebateBeforeSideSelection: 2,
  routeContextsPlanned: 10,
  sectionContextsPlanned: 10,
  exactRoutePacketsFrozen: 10,
  maximumRouteBoundSectionSchemaPrototypesFrozen: 10,
  exactSectionSchemasFrozen: 0,
  exactSectionPacketsFrozen: 0,
  exactSectionFreezeRequiresAcceptedImmutableRoute: true,
  prototypeSchemasExecutable: false,
  failedV221PlanOutputsAvailableToModels: false,
});

assert.equal(preparation.contexts.length, 10);
for (const [index, context] of preparation.contexts.entries()) {
  assert.equal(context.contextIndex, index);
  assert.equal(context.exactRoutePacketFrozen, true);
  assert.equal(context.exactSectionSchemaFrozen, false);
  assert.equal(context.exactSectionPacketFrozen, false);
  const [packetBytes, routeSchemaBytes, sectionPrototypeBytes] =
    await Promise.all([
      readFile(context.routePacket),
      readFile(context.routeSchema),
      readFile(context.sectionSchemaPrototype),
    ]);
  assert.equal(sha256(packetBytes), context.routePacketSha256);
  assert.equal(sha256(routeSchemaBytes), context.routeSchemaSha256);
  assert.equal(
    sha256(sectionPrototypeBytes),
    context.sectionSchemaPrototypeSha256
  );
  const packet = JSON.parse(packetBytes);
  assert.equal(packet.stage, "inventory-routes");
  assert.equal(packet.protocolId, preparation.protocolId);
  assert.equal(packet.debateNumber, context.debateNumber);
  assert.equal(packet.debateId, context.debateId);
  assert.deepEqual(packet.writableDomains, ["routes"]);
  assert.equal(packet.model.label, "5.6 Sol");
  assert.equal(packet.model.slug, "gpt-5.6-sol");
  assert.equal(packet.model.reasoningEffort, "low");
  assert.equal(packet.model.authentication, "ChatGPT subscription");
  assert.equal(packet.isolation.scoreBlind, true);
  assert.equal(packet.isolation.sectionsUnavailable, true);
  assert.equal(packet.isolation.candidateSelectionUnavailable, true);
  assert.equal(packet.isolation.failedV221PlanOutputsUnavailable, true);
  assert.equal(packet.isolation.failedV221ExecutionMetadataUnavailable, true);
  assert.equal(packet.modelExecutionAuthorized, false);
  assert.equal(packet.attemptsMaximum, 1);
  assert.equal(packet.retries, 0);
  assert.equal(packet.timeoutExtensions, 0);
  let copiedInputBytes = 0;
  for (const input of packet.copiedInputs) {
    const bytes = await readFile(input.path);
    assert.equal(sha256(bytes), input.sha256);
    assert.equal(bytes.length, input.bytes);
    copiedInputBytes += bytes.length;
  }
  assert.equal(copiedInputBytes, packet.copiedInputBytes);
  assert.equal(copiedInputBytes, context.routeCopiedInputBytes);
  assert.equal(copiedInputBytes <= packet.maximumCopiedInputBytes, true);
  assert.equal(
    context.sectionMaximumCopiedInputBytes <= packet.maximumCopiedInputBytes,
    true
  );
}

assert.deepEqual(preparation.totals, {
  debates: 10,
  candidates: 361,
  routePacketsFrozen: 10,
  exactSectionPacketsFrozen: 0,
  modelContextsExecuted: 0,
  retries: 0,
  timeoutExtensions: 0,
  semanticCorrections: 0,
  audioCalls: 0,
  transcriptionCalls: 0,
  scoresDerived: 0,
  meteredApiCostUsd: 0,
  transcriptionCostUsd: 0,
});
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
  routeExecutionManifestPreparation: true,
  routeExecutionActivation: false,
  routeModelExecution: false,
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
  preparation.nextAuthorizedAction,
  "prepare-v2.2.2-route-plan-execution-manifest-model-free-only"
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: preparation.totals.debates,
      exactRoutePacketsFrozen: preparation.totals.routePacketsFrozen,
      sectionSchemaPrototypesFrozen:
        preparation.stageDesign.maximumRouteBoundSectionSchemaPrototypesFrozen,
      exactSectionPacketsFrozen: preparation.totals.exactSectionPacketsFrozen,
      maximumRouteCopiedInputBytes: Math.max(
        ...preparation.contexts.map((context) => context.routeCopiedInputBytes)
      ),
      maximumSectionPrototypeCopiedInputBytes: Math.max(
        ...preparation.contexts.map(
          (context) => context.sectionMaximumCopiedInputBytes
        )
      ),
      modelContextsExecuted: 0,
      scoresDerived: 0,
      nextAuthorizedAction: preparation.nextAuthorizedAction,
    },
    null,
    2
  )
);
