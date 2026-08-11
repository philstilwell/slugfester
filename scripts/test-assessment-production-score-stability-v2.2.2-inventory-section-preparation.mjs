#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const ROOT =
  "docs/assessment-production/score-stability-v2.2.2-validation-cohort/inventory-route-section-plan-successor";
const SECTION_PREPARATION = `${ROOT}/section-packet-preparation-manifest.json`;
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const ROUTE_ANALYSIS = `${ROOT}/route-analysis.json`;
const ROUTE_EXECUTION = `${ROOT}/route-model-execution.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const [manifestBytes, preparationBytes, analysisBytes, executionBytes] =
  await Promise.all([
    readFile(SECTION_PREPARATION),
    readFile(PREPARATION),
    readFile(ROUTE_ANALYSIS),
    readFile(ROUTE_EXECUTION),
  ]);
const manifest = JSON.parse(manifestBytes);
const preparation = JSON.parse(preparationBytes);
const analysis = JSON.parse(analysisBytes);
const execution = JSON.parse(executionBytes);

assert.equal(
  manifest.schemaVersion,
  "1.0-score-stability-v2.2.2-exact-section-packet-preparation"
);
assert.equal(
  manifest.status,
  "ten-exact-v2.2.2-section-packets-frozen-not-authorized"
);
assert.equal(manifest.protocolId, preparation.protocolId);
assert.equal(manifest.inputs.preparation, PREPARATION);
assert.equal(manifest.inputs.preparationSha256, sha256(preparationBytes));
assert.equal(manifest.inputs.routeAnalysis, ROUTE_ANALYSIS);
assert.equal(manifest.inputs.routeAnalysisSha256, sha256(analysisBytes));
assert.equal(manifest.inputs.routeExecution, ROUTE_EXECUTION);
assert.equal(manifest.inputs.routeExecutionSha256, sha256(executionBytes));
assert.equal(
  analysis.status,
  "v2.2.2-route-gate-passed-exact-section-packet-preparation-authorized"
);
assert.equal(execution.status, "ten-v2.2.2-route-contexts-passed");
assert.equal(manifest.failedGateDisposition.v221PlanningGatePreservedFailed, true);
assert.equal(
  manifest.failedGateDisposition.v221ValidPartialPlansReusableForSuccessorAcceptance,
  false
);
assert.equal(manifest.failedGateDisposition.v221Debate75Retried, false);
assert.equal(manifest.failedGateDisposition.v221TimeoutExtended, false);
assert.equal(manifest.proposedPolicy.promoted, false);
assert.deepEqual(manifest.model, preparation.model);

assert.equal(manifest.contexts.length, 10);
assert.deepEqual(
  manifest.contexts.map((context) => context.debateNumber),
  ["17", "39", "121", "21", "75", "168", "177", "56", "49", "132"]
);
for (const [index, context] of manifest.contexts.entries()) {
  const prepared = preparation.contexts[index];
  const acceptedRoute = analysis.routes[index];
  assert.equal(context.contextIndex, index);
  assert.equal(context.debateNumber, prepared.debateNumber);
  assert.equal(context.debateId, prepared.debateId);
  assert.equal(context.routeOutput, acceptedRoute.output);
  assert.equal(context.routeOutputSha256, acceptedRoute.outputSha256);
  assert.equal(context.inventoryRoutesSha256, acceptedRoute.inventoryRoutesSha256);
  assert.equal(context.sectionSchema, prepared.exactSectionSchema);
  assert.equal(context.sectionPacket, prepared.exactSectionPacket);
  assert.equal(context.sectionOutput, prepared.sectionOutput);
  assert.equal(context.composedPlanOutput, prepared.composedPlanOutput);
  assert.equal(context.exactSectionSchemaFrozen, true);
  assert.equal(context.exactSectionPacketFrozen, true);

  const [schemaBytes, packetBytes, routeBytes] = await Promise.all([
    readFile(context.sectionSchema),
    readFile(context.sectionPacket),
    readFile(context.routeOutput),
  ]);
  assert.equal(sha256(schemaBytes), context.sectionSchemaSha256);
  assert.equal(schemaBytes.length, context.sectionSchemaBytes);
  assert.equal(sha256(packetBytes), context.sectionPacketSha256);
  assert.equal(packetBytes.length, context.sectionPacketBytes);
  assert.equal(sha256(routeBytes), context.routeOutputSha256);

  const schema = JSON.parse(schemaBytes);
  const packet = JSON.parse(packetBytes);
  assert.equal(
    schema.properties.inventoryRoutesSha256.const,
    context.inventoryRoutesSha256
  );
  assert.equal(schema.additionalProperties, false);
  assert.equal(packet.stage, "inventory-sections");
  assert.equal(packet.protocolId, manifest.protocolId);
  assert.equal(packet.debateNumber, context.debateNumber);
  assert.equal(packet.debateId, context.debateId);
  assert.deepEqual(packet.writableDomains, ["sections"]);
  assert.equal(packet.inventoryRoutesSha256, context.inventoryRoutesSha256);
  assert.equal(packet.model.label, "5.6 Sol");
  assert.equal(packet.model.slug, "gpt-5.6-sol");
  assert.equal(packet.model.reasoningEffort, "low");
  assert.equal(packet.model.authentication, "ChatGPT subscription");
  assert.equal(packet.isolation.scoreBlind, true);
  assert.equal(packet.isolation.inventoryRoutesImmutable, true);
  assert.equal(packet.isolation.routeExecutionMetadataUnavailable, true);
  assert.equal(packet.isolation.otherDebateRoutesUnavailable, true);
  assert.equal(packet.isolation.candidateSelectionUnavailable, true);
  assert.equal(packet.isolation.failedV221PlanOutputsUnavailable, true);
  assert.equal(packet.isolation.failedV221ExecutionMetadataUnavailable, true);
  assert.equal(packet.modelExecutionAuthorized, false);
  assert.equal(packet.attemptsMaximum, 1);
  assert.equal(packet.retries, 0);
  assert.equal(packet.timeoutExtensions, 0);
  assert.equal(packet.copiedInputs.length, 7);
  assert.equal(
    packet.copiedInputs.find((input) => input.role === "immutable-inventory-routes")
      .sha256,
    context.routeOutputSha256
  );
  assert.equal(
    packet.copiedInputs.find((input) => input.role === "strict-section-output-schema")
      .sha256,
    context.sectionSchemaSha256
  );
  let copiedInputBytes = 0;
  for (const input of packet.copiedInputs) {
    const bytes = await readFile(input.path);
    assert.equal(sha256(bytes), input.sha256);
    assert.equal(bytes.length, input.bytes);
    copiedInputBytes += bytes.length;
  }
  assert.equal(copiedInputBytes, packet.copiedInputBytes);
  assert.equal(copiedInputBytes, context.sectionCopiedInputBytes);
  assert.equal(copiedInputBytes <= packet.maximumCopiedInputBytes, true);
  assert.equal(copiedInputBytes <= prepared.sectionMaximumCopiedInputBytes, true);
  assert.equal(await exists(context.sectionOutput), false);
  assert.equal(await exists(context.composedPlanOutput), false);
}

assert.deepEqual(manifest.totals, {
  debates: 10,
  acceptedRoutes: 10,
  exactSectionSchemasFrozen: 10,
  exactSectionPacketsFrozen: 10,
  sectionModelContextsExecuted: 0,
  retries: 0,
  timeoutExtensions: 0,
  semanticCorrections: 0,
  scoresDerived: 0,
  meteredApiCostUsd: 0,
  transcriptionCostUsd: 0,
});
assert.deepEqual(manifest.authorization, {
  sectionExecutionManifestPreparation: true,
  sectionExecutionActivation: false,
  sectionModelExecution: false,
  planComposition: false,
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
  "prepare-v2.2.2-section-execution-manifest-model-free-only"
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: manifest.totals.debates,
      exactSectionPacketsFrozen: manifest.totals.exactSectionPacketsFrozen,
      maximumSectionCopiedInputBytes: Math.max(
        ...manifest.contexts.map((context) => context.sectionCopiedInputBytes)
      ),
      sectionModelContextsAuthorized: false,
      sectionModelContextsExecuted: 0,
      scoresDerived: 0,
      nextAuthorizedAction: manifest.nextAuthorizedAction,
    },
    null,
    2
  )
);
