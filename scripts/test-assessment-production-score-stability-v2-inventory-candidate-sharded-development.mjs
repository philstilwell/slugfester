#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { auditDecomposedStrictSchema } from "./lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs";

const ROOT =
  "docs/assessment-production/score-stability-v2-validation-cohort/inventory-candidate-sharded-development";
const analysis = JSON.parse(
  await readFile(`${ROOT}/development-analysis.json`, "utf8")
);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(
  analysis.scoreStabilityPolicyClarification.prospectivePolicyVersion,
  "v2.1"
);
assert.equal(
  analysis.status,
  "candidate-sharded-retired-regression-and-adversarial-development-passed-fresh-disjoint-cohort-selection-authorized"
);
assert.equal(analysis.developmentValidationOnly, true);
assert.equal(analysis.productionCanary, false);
assert.equal(analysis.executionBoundary.modelLabel, "5.6 Sol");
assert.equal(analysis.executionBoundary.modelSlug, "gpt-5.6-sol");
assert.equal(analysis.executionBoundary.reasoningEffort, "low");
assert.equal(
  analysis.executionBoundary.authentication,
  "ChatGPT subscription"
);
assert.equal(analysis.executionBoundary.scoreBlind, true);
assert.equal(analysis.executionBoundary.retries, 0);
assert.equal(analysis.executionBoundary.timeoutExtensions, 0);
assert.equal(
  analysis.scoreStabilityPolicyClarification.everyIntegerRoundedTieAccepted,
  true
);
assert.equal(
  analysis.scoreStabilityPolicyClarification
    .unroundedDirectionRetainedAsDiagnosticOnly,
  true
);
assert.equal(
  analysis.scoreStabilityPolicyClarification
    .publishedOppositeSideReversalRejected,
  true
);
assert.equal(
  analysis.scoreStabilityPolicyClarification.failedV1CanaryReclassified,
  false
);
assert.equal(
  analysis.scoreStabilityPolicyClarification.frozenV2ProposalAltered,
  false
);
assert.equal(
  analysis.scoreStabilityPolicyClarification.proposedV2PolicyPromoted,
  false
);

assert.equal(analysis.failedGateDisposition.gatesAttempted, 5);
assert.equal(
  analysis.failedGateDisposition.completeTenDebateGatesPassed,
  0
);
assert.equal(analysis.failedGateDisposition.contextsAttempted, 36);
assert.equal(
  analysis.failedGateDisposition.locallyValidIntermediateContexts,
  30
);
assert.equal(analysis.failedGateDisposition.invalidContexts, 6);
assert.equal(analysis.failedGateDisposition.quarantinedFiles, 106);
assert.equal(
  analysis.failedGateDisposition.everyFailedGatePreservedFailed,
  true
);
assert.equal(
  analysis.failedGateDisposition.priorOutputsReusableForAcceptance,
  false
);
assert.equal(
  analysis.failedGateDisposition.priorOutputsReusableAsFreshModelInput,
  false
);

assert.deepEqual(analysis.design.stages, [
  "candidate-census-plan",
  "pro-candidate-evidence-selection",
  "con-candidate-evidence-selection",
]);
assert.equal(analysis.design.contextsPerDebate, 3);
assert.deepEqual(analysis.design.plannerWritableDomains, ["routes", "sections"]);
assert.equal(analysis.design.plannerCandidateSelectionUnavailable, true);
assert.equal(analysis.design.everyCandidatePresentInCensus, true);
assert.equal(analysis.design.sideSelectorsMutuallyIsolated, true);
assert.equal(
  analysis.design.everyOriginalModelVisibleFieldRetainedForSelectedSide,
  true
);
assert.equal(analysis.design.candidateIdentityStructurallyUnique, true);
assert.equal(analysis.design.crossSectionDuplicateRepresentable, false);
assert.equal(analysis.design.positionCollisionRepresentable, false);
assert.equal(analysis.design.overnominationPermitted, true);
assert.equal(
  analysis.design.deterministicCardinalityRule,
  "priority-tier-then-chronology-retain-first-two-per-section-side"
);
assert.equal(analysis.design.missingSectionSideCoverageFailsClosed, true);
assert.equal(analysis.design.scoreFieldsAvailable, false);
assert.equal(
  analysis.design.semanticCandidateDownselectionBeforeSelectors,
  false
);

assert.equal(analysis.schemas.length, 10);
for (const record of analysis.schemas) {
  const [censusBytes, planSchemaBytes] = await Promise.all([
    readFile(record.candidateCensus),
    readFile(record.planSchema),
  ]);
  assert.equal(sha256(censusBytes), record.candidateCensusSha256);
  assert.equal(sha256(planSchemaBytes), record.planSchemaSha256);
  const census = JSON.parse(censusBytes);
  assert.equal(census.columnOrder.includes("candidateEvidence.excerpt"), false);
  assert.equal(
    census.columnOrder.includes("candidateEvidence.sourceExact"),
    false
  );
  assert.deepEqual(census.censusPolicy.omittedColumns, [
    "candidateEvidence.excerpt",
    "candidateEvidence.sourceExact",
  ]);
  assert.equal(planSchemaBytes.includes(Buffer.from("candidateSelections")), false);
  assert.equal(planSchemaBytes.includes(Buffer.from('"uniqueItems"')), false);
  const planAudit = auditDecomposedStrictSchema(JSON.parse(planSchemaBytes));
  assert.equal(planAudit.nullableCandidateProperties, 0);
  assert(record.planCopiedInputBytes <= analysis.stageInputBounds.provenCeilingBytes);
  assert.equal(record.sideSelectors.length, 2);
  for (const sideRecord of record.sideSelectors) {
    const [transportBytes, schemaBytes] = await Promise.all([
      readFile(sideRecord.transport),
      readFile(sideRecord.schema),
    ]);
    assert.equal(sha256(transportBytes), sideRecord.transportSha256);
    assert.equal(sha256(schemaBytes), sideRecord.schemaSha256);
    assert.equal(schemaBytes.includes(Buffer.from('"routes"')), false);
    assert.equal(schemaBytes.includes(Buffer.from('"sections"')), false);
    assert.equal(schemaBytes.includes(Buffer.from('"uniqueItems"')), false);
    const audit = auditDecomposedStrictSchema(JSON.parse(schemaBytes));
    assert.equal(
      audit.nullableCandidateProperties,
      sideRecord.nullableCandidateProperties
    );
    assert.equal(sideRecord.nullableCandidateProperties, sideRecord.candidates);
    assert(
      sideRecord.copiedInputBytes <=
        analysis.stageInputBounds.provenCeilingBytes
    );
  }
}

assert.equal(analysis.regression.acceptedArtifactsTested, 22);
assert.equal(analysis.regression.recomposedSideProposalsIdentical, 22);
assert.equal(analysis.regression.lockedInventoriesCanonicallyIdentical, 22);
assert.equal(analysis.regression.everyStageOutputSmallerThanSourceProposal, true);
assert.equal(analysis.regression.decomposedPlanOnlyArtifactsTested, 8);
assert.equal(analysis.regression.freshModelEvidenceUsed, false);
for (const record of analysis.regression.records) {
  assert.equal(record.recomposedSideProposalIdentical, true);
  assert.equal(record.lockedInventoryCanonicallyIdentical, true);
  assert.equal(record.deterministicDeferrals, 0);
  assert(record.planOutputBytes < record.sideProposalBytes);
  assert(record.proSelectionOutputBytes < record.sideProposalBytes);
  assert(record.conSelectionOutputBytes < record.sideProposalBytes);
}

assert.equal(
  analysis.failureProbes.failedDebate31LegacyDuplicateRejected,
  true
);
assert.equal(
  analysis.failureProbes
    .failedDebate31OvernominationAcceptedAsDevelopmentFixture,
  true
);
assert.equal(
  analysis.failureProbes.failedDebate31DeterministicallyDeferredCandidates,
  1
);
assert.equal(
  analysis.failureProbes.failedDebate31CompiledAfterDeterministicReduction,
  true
);
for (const key of [
  "planHashMismatchRejected",
  "postSelectionPlanMutationRejected",
  "sideTransportHashMismatchRejected",
  "extraCandidateKeyRejected",
  "wrongSideCandidateRelocationRejected",
  "emptySectionCoverageRejected",
]) {
  assert.equal(analysis.failureProbes[key], true, `${key}: must be rejected`);
}
assert.equal(analysis.failureProbes.debate137TimeoutOccurrences, 3);
assert.equal(analysis.failureProbes.debate93TimeoutOccurrences, 1);
assert.equal(analysis.failureProbes.failedOutputsUsedForAcceptance, false);
assert.equal(analysis.failureProbes.semanticRepairAttempted, false);

assert(
  analysis.stageInputBounds.planMaximumCopiedInputBytes <=
    analysis.stageInputBounds.provenCeilingBytes
);
assert(
  analysis.stageInputBounds.sideMaximumCopiedInputBytes <=
    analysis.stageInputBounds.provenCeilingBytes
);
assert.equal(analysis.stageInputBounds.everyStageWithinProvenCeiling, true);
for (const [file, digest] of Object.entries(analysis.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash drift`);
}

assert.equal(analysis.totals.modelContextsExecuted, 0);
assert.equal(analysis.totals.audioCalls, 0);
assert.equal(analysis.totals.transcriptionCalls, 0);
assert.equal(analysis.totals.retries, 0);
assert.equal(analysis.totals.timeoutExtensions, 0);
assert.equal(analysis.totals.semanticCorrections, 0);
assert.equal(analysis.totals.scoresDerived, 0);
assert.equal(analysis.totals.meteredApiCostUsd, 0);
assert.equal(analysis.authorization.freshDisjointCohortSelection, true);
for (const key of [
  "successorPreparation",
  "successorExecutionManifest",
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
  assert.equal(analysis.authorization[key], false, `${key}: must be false`);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      debatesMeasured: analysis.totals.debatesMeasured,
      candidates: analysis.totals.candidates,
      acceptedArtifactsReplayed:
        analysis.totals.acceptedRetiredOutputsReplayed,
      acceptedPlansReplayed: analysis.totals.acceptedRetiredPlansReplayed,
      planMaximumCopiedInputBytes:
        analysis.stageInputBounds.planMaximumCopiedInputBytes,
      sideMaximumCopiedInputBytes:
        analysis.stageInputBounds.sideMaximumCopiedInputBytes,
      modelContextsExecuted: 0,
      scoresDerived: 0,
      nextAuthorized: "fresh-disjoint-cohort-selection-only",
    },
    null,
    2
  )
);
