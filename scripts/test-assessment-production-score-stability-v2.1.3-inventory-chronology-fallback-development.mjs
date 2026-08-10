#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const ANALYSIS =
  "docs/assessment-production/score-stability-v2.1.3-chronology-fallback-development/development-analysis.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const analysis = JSON.parse(await readFile(ANALYSIS));
assert.equal(
  analysis.schemaVersion,
  "1.0-score-stability-v2.1.3-chronology-fallback-development-analysis"
);
assert.equal(
  analysis.status,
  "chronology-fallback-successor-development-passed-fresh-disjoint-cohort-selection-authorized"
);
assert.equal(Number.isNaN(Date.parse(analysis.frozenAt)), false);
assert.match(analysis.checkpointCommit, /^[0-9a-f]{40}$/);
assert.equal(analysis.developmentValidationOnly, true);
assert.equal(analysis.productionCanary, false);
assert.equal(analysis.stagingOnly, true);
assert.equal(
  analysis.failedGateDisposition.currentV212InventoryGatePreservedFailed,
  true
);
assert.equal(
  analysis.failedGateDisposition.v212FailedOutputsUsedForSuccessorAcceptance,
  false
);
assert.equal(
  analysis.failedGateDisposition.v212FailedOutputsUsedAsFreshSuccessorModelInput,
  false
);
assert.equal(
  analysis.failedGateDisposition.v212FailedOutputsUsedForDevelopmentEvidenceOnly,
  true
);
assert.equal(analysis.successorContract.preferredMoveKindModelAuthored, true);
assert.equal(analysis.successorContract.constructiveFallbackModelAuthored, true);
assert.equal(analysis.successorContract.fallbackRationaleModelAuthored, true);
assert.equal(analysis.successorContract.fallbackConditionRepositoryOwned, true);
assert.equal(
  analysis.successorContract.fallbackAppliedOnlyToRetainedOrphanReply,
  true
);
assert.equal(analysis.successorContract.planAndSideIsolationPreserved, true);
assert.equal(analysis.successorContract.otherSideEvidenceStillUnavailable, true);
assert.equal(analysis.successorContract.scoreFieldsAvailable, false);
assert.deepEqual(analysis.preservedExecutionBoundary.model, {
  label: "5.6 Sol",
  slug: "gpt-5.6-sol",
  reasoningEffort: "low",
  authentication: "ChatGPT subscription",
  scoreBlind: true,
});
assert.equal(
  Object.values(analysis.preservedExecutionBoundary.stopRules).every(Boolean),
  true
);
assert.equal(analysis.preservedExecutionBoundary.attemptsPerContext, 1);
assert.equal(analysis.preservedExecutionBoundary.retriesMaximum, 0);
assert.equal(analysis.preservedExecutionBoundary.timeoutExtensionsMaximum, 0);
assert.equal(
  analysis.preservedExecutionBoundary.separatePreparationAndActivationRequired,
  true
);
assert.equal(
  analysis.preservedExecutionBoundary.successorModelExecutionCurrentlyAuthorized,
  false
);

assert.equal(analysis.schemas.length, 20);
assert.equal(
  analysis.schemas.every(
    (record) =>
      record.nullableCandidateProperties === record.candidates &&
      record.copiedInputBytes <= 115000
  ),
  true
);
assert.equal(analysis.debates.length, 10);
assert.equal(
  analysis.debates.every((debate) => debate.successorCompilationPassed),
  true
);
assert.equal(
  analysis.debates.reduce(
    (sum, debate) => sum + debate.successorChronologyFallbacks.length,
    0
  ),
  6
);
assert.equal(analysis.regression.priorPassingDebates, 5);
assert.equal(analysis.regression.priorFailedDebates, 5);
assert.equal(analysis.regression.priorPassingOutputsCanonicallyIdentical, 5);
assert.equal(analysis.regression.priorOrphanReplies, 6);
assert.equal(analysis.regression.successorFallbacksApplied, 6);
assert.equal(analysis.regression.successorCompilationsPassed, 10);
assert.equal(analysis.regression.failedOutputsUsedForAcceptance, false);
assert.equal(analysis.regression.freshModelEvidenceUsed, false);
assert.equal(analysis.failureProbes.missingFallbackRejected, true);
assert.equal(analysis.failureProbes.nonconstructiveFallbackRejected, true);
assert.equal(analysis.failureProbes.originalOrphanReplyFailureReproduced, true);
assert.equal(analysis.failureProbes.semanticRepairAttempted, false);
assert.equal(analysis.inputBounds.provenCeilingBytes, 115000);
assert.equal(analysis.inputBounds.everyContextWithinProvenCeiling, true);
assert.equal(
  analysis.inputBounds.maximumCopiedInputBytes <=
    analysis.inputBounds.provenCeilingBytes,
  true
);
assert.deepEqual(analysis.totals, {
  debatesReplayed: 10,
  schemasGeneratedInMemory: 20,
  predecessorFailedDebates: 5,
  predecessorOrphanReplies: 6,
  successorCompilationsPassed: 10,
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
assert.deepEqual(analysis.authorization, {
  freshDisjointCohortSelection: true,
  successorPacketPreparation: false,
  successorExecutionManifestPreparation: false,
  successorModelExecution: false,
  currentFailedOutputAcceptance: false,
  retry: false,
  timeoutExtension: false,
  semanticCorrection: false,
  independentJudgmentPacketPreparation: false,
  independentJudgmentModelExecution: false,
  scoreDerivation: false,
  policyPromotion: false,
  publicationPreparation: false,
  productionMutation: false,
  remainingProductionBatches: false,
});
for (const [file, digest] of Object.entries(analysis.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash drifted`);
}
assert.equal(
  analysis.nextAuthorizedAction,
  "select-fresh-disjoint-v2.1.3-validation-cohort-model-free-only"
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      debatesReplayed: analysis.totals.debatesReplayed,
      predecessorOrphanReplies: analysis.totals.predecessorOrphanReplies,
      successorCompilationsPassed:
        analysis.totals.successorCompilationsPassed,
      maximumCopiedInputBytes:
        analysis.inputBounds.maximumCopiedInputBytes,
      modelContextsExecuted: analysis.totals.modelContextsExecuted,
      scoresDerived: analysis.totals.scoresDerived,
      nextAuthorizedAction: analysis.nextAuthorizedAction,
    },
    null,
    2
  )
);
