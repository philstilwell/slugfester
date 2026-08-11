#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";

import { auditDecomposedStrictSchema } from "./lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs";
import { validateCandidateShardedInventoryPlan } from "./lib/assessment-production-score-stability-v2-inventory-candidate-sharded.mjs";
import {
  buildV222InventoryRouteSchema,
  buildV222InventorySectionSchema,
  composeV222CandidateCensusPlan,
  splitV222CandidateCensusPlan,
} from "./lib/assessment-production-score-stability-v2.2.2-route-section-plan.mjs";

const ROOT =
  "docs/assessment-production/score-stability-v2.2.2-route-section-plan-successor-development";
const ANALYSIS = `${ROOT}/development-analysis.json`;
const PREPARATION =
  "docs/assessment-production/score-stability-v2.2.1-validation-cohort/inventory-chronology-fallback/preparation-manifest.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const [analysisBytes, preparationBytes] = await Promise.all([
  readFile(ANALYSIS),
  readFile(PREPARATION),
]);
const analysis = JSON.parse(analysisBytes);
const preparation = JSON.parse(preparationBytes);

assert.equal(
  analysis.schemaVersion,
  "1.0-score-stability-v2.2.2-route-section-plan-successor-development-analysis"
);
assert.equal(
  analysis.status,
  "v2.2.2-route-section-plan-successor-model-free-regression-passed-preparation-authorized"
);
assert.deepEqual(analysis.userAuthorization, {
  instruction: "Authorized. Continue.",
  prospectiveSuccessorOnly: true,
});
assert.equal(analysis.failedGateDisposition.v221PlanningGatePreservedFailed, true);
assert.equal(
  analysis.failedGateDisposition.v221ValidPartialPlansReusableForSuccessorAcceptance,
  false
);
assert.equal(analysis.failedGateDisposition.v221Debate75Retried, false);
assert.equal(analysis.failedGateDisposition.v221TimeoutExtended, false);
assert.equal(analysis.failedGateDisposition.v221ExecutionReclassified, false);
assert.equal(analysis.failedGateDisposition.v22DiscoveryGatePreservedFailed, true);
assert.equal(analysis.failedGateDisposition.v213ScoreGatePreservedFailed, true);
assert.equal(analysis.failedGateDisposition.proposedV22ScorePolicyPromoted, false);
assert.deepEqual(analysis.design.stages, [
  "inventory-routes",
  "inventory-sections",
  "side-candidate-selection",
]);
assert.deepEqual(analysis.design.routeStageWritableDomains, ["routes"]);
assert.deepEqual(analysis.design.sectionStageWritableDomains, ["sections"]);
assert.equal(analysis.design.canonicalRouteHashBoundInSectionSchema, true);
assert.equal(analysis.design.deterministicCompositionRequired, true);
assert.equal(analysis.design.unchangedCandidateCensusPlanValidatorReplayed, true);
assert.equal(analysis.design.finalInventorySemanticsChanged, false);
assert.equal(analysis.design.scoreFieldsAvailable, false);

assert.equal(analysis.schemas.length, 10);
assert.equal(analysis.regression.failedGateValidPlansReplayedAsEvidenceOnly, 9);
assert.deepEqual(analysis.regression.failedGateMissingPlans, ["75"]);
assert.equal(analysis.regression.recomposedPlansIdentical, 9);
assert.equal(analysis.regression.routeBindingTamperRejected, true);
assert.equal(analysis.regression.crossDebateTamperRejected, true);
assert.equal(analysis.regression.unknownFieldRejected, true);
assert.equal(analysis.regression.freshModelEvidenceUsed, false);
assert.equal(analysis.sizing.everyStageWithinCeiling, true);
assert.equal(analysis.sizing.inputSizeCauseEstablished, false);
assert.equal(analysis.sizing.outputComplexityCauseEstablished, false);
assert.equal(analysis.conclusion.guaranteesModelCompletion, false);
assert.equal(analysis.conclusion.packetSizeCauseEstablished, false);
assert.equal(
  analysis.conclusion
    .sufficientForModelFreeSuccessorPreparationWithExplicitUserAuthorization,
  true
);

const contextByDebate = new Map(
  preparation.contexts.map((context) => [context.debateNumber, context])
);
for (const schemaRecord of analysis.schemas) {
  const context = contextByDebate.get(schemaRecord.debateNumber);
  assert(context);
  const [routeBytes, sectionBytes, planSchema] = await Promise.all([
    readFile(schemaRecord.routeSchema),
    readFile(schemaRecord.sectionSchemaPrototype),
    readFile(context.planSchema, "utf8").then(JSON.parse),
  ]);
  assert.equal(sha256(routeBytes), schemaRecord.routeSchemaSha256);
  assert.equal(sha256(sectionBytes), schemaRecord.sectionSchemaPrototypeSha256);
  const routeSchema = JSON.parse(routeBytes);
  const sectionSchema = JSON.parse(sectionBytes);
  auditDecomposedStrictSchema(routeSchema);
  auditDecomposedStrictSchema(sectionSchema);
  assert.equal(Object.hasOwn(routeSchema.properties, "routes"), true);
  assert.equal(Object.hasOwn(routeSchema.properties, "sections"), false);
  assert.equal(Object.hasOwn(sectionSchema.properties, "routes"), false);
  assert.equal(Object.hasOwn(sectionSchema.properties, "sections"), true);
  assert.equal(
    Object.hasOwn(sectionSchema.properties, "inventoryRoutesSha256"),
    true
  );
  assert.deepEqual(buildV222InventoryRouteSchema(planSchema), routeSchema);
  assert.equal(schemaRecord.bothWithinCeiling, true);
  assert(schemaRecord.routeCopiedInputBytes <= analysis.sizing.provenCeilingBytes);
  assert(
    schemaRecord.sectionMaximumCopiedInputBytes <=
      analysis.sizing.provenCeilingBytes
  );
}

for (const replay of analysis.regression.replayRecords) {
  const context = contextByDebate.get(replay.debateNumber);
  const [planBytes, compilerSchema, candidateTransport, candidateCensus] =
    await Promise.all([
      readFile(replay.sourcePlan),
      readFile(context.compilerSchema, "utf8").then(JSON.parse),
      readFile(context.fullCandidateTransport, "utf8").then(JSON.parse),
      readFile(context.candidateCensus, "utf8").then(JSON.parse),
    ]);
  assert.equal(sha256(planBytes), replay.sourcePlanSha256);
  const plan = JSON.parse(planBytes);
  const split = splitV222CandidateCensusPlan(plan);
  const sectionSchema = buildV222InventorySectionSchema(
    JSON.parse(await readFile(context.planSchema)),
    split.routes.routes
  );
  assert.equal(
    sectionSchema.properties.inventoryRoutesSha256.const,
    split.sections.inventoryRoutesSha256
  );
  const recomposed = composeV222CandidateCensusPlan(
    split.routes,
    split.sections
  );
  assert.equal(isDeepStrictEqual(recomposed, plan), true);
  validateCandidateShardedInventoryPlan({
    plan: recomposed,
    legacySchema: compilerSchema,
    candidateTransport,
    candidateCensus,
  });
  assert.equal(replay.evidenceOnlyNotReusableForSuccessorAcceptance, true);
}

assert.deepEqual(analysis.totals, {
  debates: 10,
  failedGatePlansReplayedAsEvidenceOnly: 9,
  schemaPairsBuilt: 10,
  modelContextsExecuted: 0,
  retries: 0,
  timeoutExtensions: 0,
  semanticCorrections: 0,
  scoresDerived: 0,
  meteredApiCostUsd: 0,
  transcriptionCostUsd: 0,
});
for (const [file, digest] of Object.entries(analysis.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash drifted`);
}
assert.deepEqual(analysis.authorization, {
  successorPacketPreparation: true,
  successorExecutionManifestPreparation: false,
  successorModelExecution: false,
  retry: false,
  timeoutExtension: false,
  semanticCorrection: false,
  exactSidePacketPreparation: false,
  sideSelectorModelExecution: false,
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
  analysis.nextAuthorizedAction,
  "prepare-v2.2.2-route-section-plan-successor-packets-model-free-only"
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: analysis.totals.debates,
      failedGatePlansReplayedAsEvidenceOnly:
        analysis.totals.failedGatePlansReplayedAsEvidenceOnly,
      schemaPairsBuilt: analysis.totals.schemaPairsBuilt,
      routeMaximumCopiedInputBytes:
        analysis.sizing.routeMaximumCopiedInputBytes,
      sectionMaximumCopiedInputBytes:
        analysis.sizing.sectionMaximumCopiedInputBytes,
      modelContextsExecuted: 0,
      scoresDerived: 0,
      nextAuthorizedAction: analysis.nextAuthorizedAction,
    },
    null,
    2
  )
);
