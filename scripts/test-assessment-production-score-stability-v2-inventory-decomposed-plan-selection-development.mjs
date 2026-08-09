#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { auditDecomposedStrictSchema } from "./lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs";

const ROOT =
  "docs/assessment-production/score-stability-v2-validation-cohort/inventory-decomposed-plan-selection-development";
const analysis = JSON.parse(
  await readFile(`${ROOT}/development-analysis.json`, "utf8")
);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(
  analysis.status,
  "decomposed-plan-selection-retired-regression-passed-successor-preparation-authorized"
);
assert.equal(analysis.failedGateDisposition.predecessorTimeoutGatePreservedFailed, true);
assert.equal(analysis.failedGateDisposition.columnarRecoveryGatePreservedFailed, true);
assert.equal(analysis.failedGateDisposition.uniqueSelectionSuccessorGatePreservedFailed, true);
assert.equal(
  analysis.failedGateDisposition.sidePartitionedSelectionSuccessorGatePreservedFailed,
  true
);
assert.equal(analysis.failedGateDisposition.allFourAcceptedAsPassed, false);
assert.equal(analysis.failedGateDisposition.priorOutputsReusableForSuccessorAcceptance, false);
assert.deepEqual(analysis.design.stages, ["inventory-plan", "candidate-selection"]);
assert.equal(analysis.design.freshIsolatedContextPerStage, true);
assert.deepEqual(analysis.design.plannerWritableDomains, ["routes", "sections"]);
assert.equal(analysis.design.plannerCandidateSelectionUnavailable, true);
assert.deepEqual(analysis.design.selectorWritableDomains, ["candidateSelectionsBySide"]);
assert.equal(analysis.design.selectorRoutesAndSectionsImmutable, true);
assert.equal(analysis.design.selectorPlannerExecutionMetadataUnavailable, true);
assert.equal(analysis.design.canonicalCandidateTransportHashBoundInBothStages, true);
assert.equal(analysis.design.canonicalPlanHashBoundInSelectionStage, true);
assert.equal(analysis.design.deterministicCompositionRequired, true);
assert.equal(analysis.design.duplicateCandidateSelectionRepresentable, false);
assert.equal(analysis.design.wrongSideCandidateKeyRepresentable, false);
assert.equal(analysis.design.orderWithinSideModelAuthored, false);
assert.equal(analysis.design.positionCollisionRepresentable, false);
assert.equal(analysis.design.selectionSectionIdsSchemaBoundToImmutablePlan, true);
assert.equal(
  analysis.design.sectionSideCardinalitySchemaEnforcedAcrossCandidateProperties,
  false
);
assert.equal(analysis.design.sectionSideCardinalityDeterministicallyValidated, true);
assert.equal(analysis.design.scoreFieldsAvailable, false);
assert.equal(analysis.schemas.length, 10);
for (const record of analysis.schemas) {
  const [planBytes, selectionBytes] = await Promise.all([
    readFile(record.planSchema),
    readFile(record.selectionSchemaPrototype),
  ]);
  assert.equal(sha256(planBytes), record.planSchemaSha256);
  assert.equal(sha256(selectionBytes), record.selectionSchemaPrototypeSha256);
  assert.equal(planBytes.includes(Buffer.from("candidateSelectionsBySide")), false);
  assert.equal(selectionBytes.includes(Buffer.from('"routes"')), false);
  assert.equal(selectionBytes.includes(Buffer.from('"sections"')), false);
  assert.equal(planBytes.includes(Buffer.from('"uniqueItems"')), false);
  assert.equal(selectionBytes.includes(Buffer.from('"uniqueItems"')), false);
  const planAudit = auditDecomposedStrictSchema(JSON.parse(planBytes));
  const selectionAudit = auditDecomposedStrictSchema(JSON.parse(selectionBytes));
  assert.equal(planAudit.nullableCandidateProperties, 0);
  assert.equal(selectionAudit.nullableCandidateProperties, record.candidates);
  assert(record.planCopiedInputBytes <= 115000);
  assert(record.maximumSelectionCopiedInputBytes <= 115000);
  assert(record.planMaximumSchemaTreeDepth <= 10);
  assert(record.selectionMaximumSchemaTreeDepth <= 10);
  assert(record.planTotalSchemaStringCharacters <= 120000);
  assert(record.selectionTotalSchemaStringCharacters <= 120000);
}
assert.equal(analysis.regression.acceptedArtifactsTested, 22);
assert.equal(analysis.regression.recomposedSideProposalsIdentical, 22);
assert.equal(analysis.regression.lockedInventoriesCanonicallyIdentical, 22);
assert.equal(analysis.regression.everyPlanOutputSmallerThanSourceProposal, true);
assert.equal(analysis.regression.everySelectionOutputSmallerThanSourceProposal, true);
assert.equal(analysis.regression.freshModelEvidenceUsed, false);
assert(analysis.outputDecomposition.minimumPlanReductionFraction > 0);
assert(analysis.outputDecomposition.minimumSelectionReductionFraction > 0);
assert.equal(
  analysis.outputDecomposition.eachStageOutputSmallerThanSourceProposal,
  true
);
assert.equal(analysis.failureProbes.failedDebate31DuplicateRejected, true);
assert.equal(analysis.failureProbes.failedDebate31CardinalityRejected, true);
assert.equal(analysis.failureProbes.selectionPlanHashMismatchRejected, true);
assert.equal(analysis.failureProbes.postSelectionPlanMutationRejected, true);
assert.equal(analysis.failureProbes.wrongSideCandidateRelocationRejected, true);
assert.equal(analysis.failureProbes.debate137TimeoutOccurrences, 2);
assert.equal(analysis.failureProbes.debate137ProposalAvailable, false);
assert.equal(analysis.failureProbes.debate137SemanticRepairAttempted, false);
assert(analysis.stageInputBounds.planMaximumCopiedInputBytes <= 115000);
assert(analysis.stageInputBounds.selectionMaximumCopiedInputBoundBytes <= 115000);
for (const [file, digest] of Object.entries(analysis.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash drift`);
}
assert.equal(analysis.totals.modelContextsExecuted, 0);
assert.equal(analysis.totals.retries, 0);
assert.equal(analysis.totals.semanticCorrections, 0);
assert.equal(analysis.totals.scoresDerived, 0);
assert.equal(analysis.authorization.successorPreparation, true);
for (const key of [
  "successorExecutionManifest",
  "successorModelExecution",
  "retry",
  "timeoutExtension",
  "semanticCorrection",
  "priorOutputReuseForSuccessorAcceptance",
  "independentJudgmentPacketPreparation",
  "independentJudgmentModelExecution",
  "scoreDerivation",
  "policyPromotion",
  "publicationPreparation",
  "productionMutation",
  "remainingProductionBatches",
]) {
  assert.equal(analysis.authorization[key], false, `${key}: must be false`);
}
console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: analysis.schemas.length,
      candidates: analysis.totals.candidates,
      acceptedArtifactsReplayed: analysis.regression.acceptedArtifactsTested,
      failedOutputsProbed: analysis.totals.failedOutputsProbed,
      bindingTamperProbes: analysis.totals.bindingTamperProbes,
      planMaximumCopiedInputBytes:
        analysis.stageInputBounds.planMaximumCopiedInputBytes,
      selectionMaximumCopiedInputBoundBytes:
        analysis.stageInputBounds.selectionMaximumCopiedInputBoundBytes,
      modelContextsExecuted: 0,
      scoresDerived: 0,
      nextAuthorized: "successor-preparation",
    },
    null,
    2
  )
);
