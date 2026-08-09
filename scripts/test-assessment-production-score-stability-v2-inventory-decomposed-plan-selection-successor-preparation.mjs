#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

import {
  auditDecomposedStrictSchema,
  candidateTransportCanonicalSha256,
} from "./lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs";

const ROOT =
  "docs/assessment-production/score-stability-v2-validation-cohort/inventory-decomposed-plan-selection-successor";
const preparation = JSON.parse(await readFile(`${ROOT}/preparation-manifest.json`));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

assert.equal(
  preparation.status,
  "ten-fresh-decomposed-plan-selection-v2-validation-inventory-contexts-prepared"
);
assert.deepEqual(
  preparation.contexts.map((context) => context.debateNumber),
  ["86", "60", "31", "151", "93", "80", "158", "123", "146", "137"]
);
assert.equal(preparation.contexts.length, 10);
assert.equal(preparation.totals.candidates, 406);
assert.equal(preparation.totals.proCandidates, 203);
assert.equal(preparation.totals.conCandidates, 203);
assert.equal(preparation.totals.stageContextsPlanned, 20);
assert.equal(preparation.totals.planContextsExecuted, 0);
assert.equal(preparation.totals.selectionContextsExecuted, 0);
assert.equal(preparation.totals.modelContextsExecuted, 0);
assert.equal(preparation.totals.selectionSchemasGenerated, 0);
assert.equal(preparation.totals.inventoriesComposed, 0);
assert.equal(preparation.totals.scoresDerived, 0);
assert.equal(preparation.currentCanaryDisposition.reclassified, false);
assert.equal(preparation.proposedPolicy.promoted, false);
assert.equal(preparation.model.label, "5.6 Sol");
assert.equal(preparation.model.slug, "gpt-5.6-sol");
assert.equal(preparation.model.reasoningEffort, "low");
assert.equal(preparation.model.authentication, "ChatGPT subscription");
assert.equal(preparation.model.meteredApiCostUsdMaximum, 0);

for (const key of [
  "predecessorTimeoutGatePreservedFailed",
  "columnarRecoveryGatePreservedFailed",
  "uniqueSelectionSuccessorGatePreservedFailed",
  "sidePartitionedSelectionSuccessorGatePreservedFailed",
]) {
  assert.equal(preparation.failedGateDisposition[key], true, `${key}: must remain failed`);
}
assert.equal(preparation.failedGateDisposition.allFourAcceptedAsPassed, false);
assert.equal(
  preparation.failedGateDisposition.priorValidOutputsReusableForSuccessorAcceptance,
  false
);
assert.equal(
  preparation.failedGateDisposition.priorFailedOutputsReusableForSuccessorAcceptance,
  false
);

assert.equal(preparation.retiredRegressionEvidence.acceptedArtifactsReplayed, 22);
assert.equal(preparation.retiredRegressionEvidence.recomposedProposalsIdentical, 22);
assert.equal(preparation.retiredRegressionEvidence.lockedInventoriesIdentical, 22);
assert.equal(preparation.retiredRegressionEvidence.failedOutputsProbed, 3);
assert.equal(preparation.retiredRegressionEvidence.bindingTamperProbes, 3);
assert.equal(preparation.retiredRegressionEvidence.freshModelEvidenceUsed, false);
assert.equal(
  preparation.retiredRegressionEvidence.eachStageOutputSmallerThanSourceProposal,
  true
);

assert.deepEqual(preparation.executionDesign.stageOrder, [
  "all-inventory-plans",
  "all-candidate-selections",
]);
assert.deepEqual(preparation.executionDesign.schedulerRampPerStage, [1, 2]);
assert.equal(preparation.executionDesign.attemptsPerStageContext, 1);
assert.equal(preparation.executionDesign.retriesMaximum, 0);
assert.equal(preparation.executionDesign.timeoutMsPerStageContext, 600000);
assert.equal(preparation.executionDesign.timeoutExtensionApplied, false);
assert.equal(preparation.executionDesign.allPlansMustPassBeforeSelectionStageBegins, true);
assert.equal(preparation.executionDesign.authentication, "ChatGPT subscription");
assert.equal(preparation.executionDesign.meteredApiCostUsdMaximum, 0);
assert.equal(preparation.isolation.freshTemporaryCodexHomePerStageContext, true);
assert.equal(preparation.isolation.twentyFreshStageContextsRequired, true);
assert.equal(preparation.isolation.planAndSelectionContextsShareNoSessionState, true);

assert.equal(preparation.decomposedTopology.plannerCandidateSelectionUnavailable, true);
assert.equal(preparation.decomposedTopology.selectorRoutesAndSectionsImmutable, true);
assert.equal(
  preparation.decomposedTopology.actualSelectionSchemaGeneratedOnlyAfterValidPlan,
  true
);
assert.equal(
  preparation.decomposedTopology.developmentSelectionSchemaPrototypesAreNotExecutionInputs,
  true
);
assert.equal(preparation.decomposedTopology.duplicateCandidateSelectionRepresentable, false);
assert.equal(preparation.decomposedTopology.wrongSideCandidateKeyRepresentable, false);
assert.equal(preparation.decomposedTopology.positionCollisionRepresentable, false);
assert.equal(
  preparation.decomposedTopology.sectionSideCardinalitySchemaEnforcedAcrossCandidateProperties,
  false
);
assert.equal(
  preparation.decomposedTopology.sectionSideCardinalityDeterministicallyValidated,
  true
);
assert.equal(preparation.decomposedTopology.scoreFieldsAvailable, false);
assert(preparation.transport.planMaximumCopiedInputBytes <= 115000);
assert(preparation.transport.selectionMaximumCopiedInputBoundBytes <= 115000);

for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash drift`);
}
for (const evidence of Object.values(preparation.inputs.failedGateEvidence)) {
  assert.equal(sha256(await readFile(evidence.file)), evidence.sha256);
}

const [manual, columnarGuide, decomposedGuide] = await Promise.all([
  readFile(preparation.inputs.manual),
  readFile(preparation.inputs.columnarTransportGuide),
  readFile(preparation.inputs.decomposedInventoryGuide),
]);
for (const context of preparation.contexts) {
  const [packet, transportBytes, planSchemaBytes, prototypeBytes] =
    await Promise.all([
      readFile(context.packet),
      readFile(context.modelCandidateTransport),
      readFile(context.planSchema),
      readFile(context.developmentMaximumPlanSelectionSchemaPrototype),
    ]);
  assert.equal(sha256(planSchemaBytes), context.planSchemaSha256);
  assert.equal(
    sha256(prototypeBytes),
    context.developmentMaximumPlanSelectionSchemaPrototypeSha256
  );
  const transport = JSON.parse(transportBytes);
  assert.equal(
    candidateTransportCanonicalSha256(transport),
    context.candidateTransportCanonicalSha256
  );
  const planSchema = JSON.parse(planSchemaBytes);
  const prototype = JSON.parse(prototypeBytes);
  const planAudit = auditDecomposedStrictSchema(planSchema);
  const selectionAudit = auditDecomposedStrictSchema(prototype);
  assert.equal(Object.hasOwn(planSchema.properties, "candidateSelectionsBySide"), false);
  assert.equal(Object.hasOwn(planSchema.properties, "routes"), true);
  assert.equal(Object.hasOwn(planSchema.properties, "sections"), true);
  assert.equal(Object.hasOwn(prototype.properties, "routes"), false);
  assert.equal(Object.hasOwn(prototype.properties, "sections"), false);
  assert.equal(Object.hasOwn(prototype.properties, "candidateSelectionsBySide"), true);
  assert.equal(
    planSchema.properties.candidateTransportCanonicalSha256.const,
    context.candidateTransportCanonicalSha256
  );
  assert.equal(
    prototype.properties.candidateTransportCanonicalSha256.const,
    context.candidateTransportCanonicalSha256
  );
  assert.equal(planAudit.objectsAudited, context.planSchemaStrictObjectsAudited);
  assert.equal(selectionAudit.nullableCandidateProperties, context.candidates);
  assert.equal(context.selectionCandidateProperties, context.candidates);
  assert.equal(
    manual.length +
      columnarGuide.length +
      decomposedGuide.length +
      packet.length +
      transportBytes.length +
      planSchemaBytes.length,
    context.planCopiedInputBytes
  );
  assert.equal(
    columnarGuide.length +
      decomposedGuide.length +
      transportBytes.length +
      context.maximumPlanOutputBytes +
      prototypeBytes.length,
    context.maximumSelectionCopiedInputBytes
  );
  assert(context.planCopiedInputBytes <= 115000);
  assert(context.maximumSelectionCopiedInputBytes <= 115000);
}

assert.equal(preparation.futureOutputPathsExcludedFromSourceHashes.length, 75);
for (const output of preparation.futureOutputPathsExcludedFromSourceHashes) {
  assert.equal(await exists(output), false, `${output}: premature output`);
  assert.equal(Object.hasOwn(preparation.sourceHashes, output), false);
}
assert.equal(preparation.authorization.deterministicValidation, true);
assert.equal(preparation.authorization.deterministicSelectionSchemaGeneration, true);
assert.equal(preparation.authorization.successorExecutionManifest, true);
for (const key of [
  "successorModelExecution",
  "retry",
  "timeoutExtension",
  "semanticCorrection",
  "priorOutputReuseForSuccessorAcceptance",
  "independentJudgmentPacketPreparation",
  "independentJudgmentModelExecution",
  "paidTranscription",
  "audioVerification",
  "adjudicationModelExecution",
  "scoreDerivation",
  "policyPromotion",
  "publicationPreparation",
  "productionMutation",
  "remainingProductionBatches",
]) {
  assert.equal(preparation.authorization[key], false, `${key}: must be false`);
}
assert.equal(preparation.nextAuthorizedAction, "successor-execution-manifest");

console.log(
  JSON.stringify(
    {
      status: "passed",
      contexts: preparation.contexts.length,
      stageContextsPlanned: preparation.totals.stageContextsPlanned,
      candidates: preparation.totals.candidates,
      failedGatesPreserved: 4,
      maximumPlanCopiedInputBytes:
        preparation.transport.planMaximumCopiedInputBytes,
      maximumSelectionCopiedInputBoundBytes:
        preparation.transport.selectionMaximumCopiedInputBoundBytes,
      modelContextsExecuted: 0,
      scoresDerived: 0,
      nextAuthorized: preparation.nextAuthorizedAction,
    },
    null,
    2
  )
);
