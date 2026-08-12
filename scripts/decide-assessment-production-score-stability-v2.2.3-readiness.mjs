#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const paths = {
  policy:
    "docs/assessment-production/score-stability-policy-v2.2-proposal.md",
  selection:
    "docs/assessment-production/score-stability-v2.2-validation-cohort/selection.json",
  discoveryExecution:
    "docs/assessment-production/score-stability-v2.2-validation-cohort/discovery/model-execution.json",
  discoveryRecovery:
    "docs/assessment-production/score-stability-v2.2.1-validation-cohort/discovery-mechanical-recovery/analysis.json",
  predecessorPlanExecution:
    "docs/assessment-production/score-stability-v2.2.1-validation-cohort/inventory-chronology-fallback/plan-model-execution.json",
  inventoryAnalysis:
    "docs/assessment-production/score-stability-v2.2.2-validation-cohort/inventory-route-section-plan-successor/inventory-analysis.json",
  inventoryRouteExecution:
    "docs/assessment-production/score-stability-v2.2.2-validation-cohort/inventory-route-section-plan-successor/route-model-execution.json",
  inventorySectionExecution:
    "docs/assessment-production/score-stability-v2.2.2-validation-cohort/inventory-route-section-plan-successor/section-model-execution.json",
  inventorySideExecution:
    "docs/assessment-production/score-stability-v2.2.2-validation-cohort/inventory-route-section-plan-successor/side-model-execution.json",
  judgmentActivation:
    "docs/assessment-production/score-stability-v2.2.3-validation-cohort/independent-judgments/execution-activation.json",
  judgmentExecution:
    "docs/assessment-production/score-stability-v2.2.3-validation-cohort/independent-judgments/model-execution.json",
  judgmentAnalysis:
    "docs/assessment-production/score-stability-v2.2.3-validation-cohort/independent-judgments/analysis.json",
  audioExecution:
    "docs/assessment-production/score-stability-v2.2.3-validation-cohort/audio-verification/model-execution.json",
  audioFailureDiagnosis:
    "docs/assessment-production/score-stability-v2.2.3-validation-cohort/audio-verification/failure-diagnosis.json",
  audioAttributionExecution:
    "docs/assessment-production/score-stability-v2.2.3-validation-cohort/audio-attribution-adjudication/model-execution.json",
  audioAttributionAnalysis:
    "docs/assessment-production/score-stability-v2.2.3-validation-cohort/audio-attribution-adjudication/analysis.json",
  disputeExecution:
    "docs/assessment-production/score-stability-v2.2.3-validation-cohort/dispute-only-adjudication/model-execution.json",
  disputeAnalysis:
    "docs/assessment-production/score-stability-v2.2.3-validation-cohort/dispute-only-adjudication/analysis.json",
  finalLedgerAnalysis:
    "docs/assessment-production/score-stability-v2.2.3-validation-cohort/final-ledger/analysis.json",
  scoreManifest:
    "docs/assessment-production/score-stability-v2.2.3-validation-cohort/score-pass/score-pass-manifest.json",
  calculatedScores:
    "docs/assessment-production/score-stability-v2.2.3-validation-cohort/score-pass/calculated-scores.json",
  scoreAnalysis:
    "docs/assessment-production/score-stability-v2.2.3-validation-cohort/score-pass/analysis.json",
  policyConformance:
    "docs/assessment-production/score-stability-v2.2.3-validation-cohort/score-pass/policy-conformance-analysis.json",
};
const outputPath =
  "docs/assessment-production/score-stability-v2.2.3-validation-cohort/readiness-decision.json";

if (shouldWrite) {
  await access(path.resolve(outputPath)).then(
    () => {
      throw new Error(`${outputPath} already exists`);
    },
    () => true
  );
}

const entries = await Promise.all(
  Object.entries(paths).map(async ([key, file]) => [
    key,
    file,
    await readFile(path.resolve(file)),
  ])
);
const documents = Object.fromEntries(
  entries
    .filter(([key]) => key !== "policy")
    .map(([key, , bytes]) => [key, JSON.parse(bytes)])
);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = Object.fromEntries(
  entries.map(([, file, bytes]) => [file, sha256(bytes)])
);

function validateModelResults(execution, expectedResults, allowedStatuses) {
  assertV4(
    Array.isArray(execution.results) &&
      execution.results.length === expectedResults,
    `${execution.schemaVersion}: unexpected model-result count`
  );
  for (const result of execution.results) {
    assertV4(
      result.model === "5.6 Sol" &&
        result.reasoningEffort === "low" &&
        result.authentication === "ChatGPT subscription" &&
        result.apiKeysRemoved === true &&
        result.attemptCount === 1 &&
        result.retryCount === 0 &&
        allowedStatuses.includes(result.status),
      `${execution.schemaVersion}: model, authentication, attempt, or status boundary changed`
    );
    if (Object.hasOwn(result, "scoreBlind")) {
      assertV4(
        result.scoreBlind === true,
        `${execution.schemaVersion}: score blindness changed`
      );
    }
  }
  assertV4(
    execution.retries === 0 &&
      (execution.meteredApiCostUsd ?? 0) === 0 &&
      (execution.scoresDerived ?? 0) === 0,
    `${execution.schemaVersion}: retry, cost, or score boundary changed`
  );
}

const {
  selection,
  discoveryExecution,
  discoveryRecovery,
  predecessorPlanExecution,
  inventoryAnalysis,
  inventoryRouteExecution,
  inventorySectionExecution,
  inventorySideExecution,
  judgmentActivation,
  judgmentExecution,
  judgmentAnalysis,
  audioExecution,
  audioFailureDiagnosis,
  audioAttributionExecution,
  audioAttributionAnalysis,
  disputeExecution,
  disputeAnalysis,
  finalLedgerAnalysis,
  scoreManifest,
  calculatedScores,
  scoreAnalysis,
  policyConformance,
} = documents;

assertV4(
  selection.status === "fresh-disjoint-v2.2-ten-debate-cohort-source-gate-passed" &&
    selection.selected.length === 10 &&
    selection.selectionPolicy.dyadicOnly &&
    selection.selectionPolicy.pendingReassessmentOnly &&
    selection.selectionPolicy.acceptedCalibrationExcluded &&
    selection.selectionPolicy.productionCanaryExcluded &&
    selection.selectionPolicy.everyPriorValidationCohortExcluded &&
    selection.selectionPolicy.replacementAfterSourceGateFailureAllowed === false &&
    selection.selectionPolicy.transcriptContentSemanticallyInspected === false &&
    selection.selectionPolicy.legacyAssessmentAccessed === false &&
    selection.selectionPolicy.scoreAccessed === false &&
    selection.selectionPolicy.winnerAccessed === false &&
    selection.policy.path === paths.policy &&
    selection.policy.sha256 === sourceHashes[paths.policy] &&
    selection.policy.version === "v2.2-proposal" &&
    selection.policy.agreedWinningSideMayCollapseToIntegerRoundedTie &&
    selection.policy.agreedInitialTieImposesNoDirectionConstraint &&
    !selection.policy.numericalThresholdsChanged,
  "fresh, disjoint, prospectively policy-frozen cohort requirement failed"
);
const firstModelStartedAt = Math.min(
  ...discoveryExecution.results.map((result) => Date.parse(result.startedAt))
);
assertV4(
  Date.parse(selection.frozenAt) < firstModelStartedAt,
  "v2.2 policy and cohort were not frozen before model execution"
);

validateModelResults(discoveryExecution, 38, [
  "completed-valid",
  "output-validation-failed",
]);
assertV4(
  discoveryExecution.status === "v2.2-validation-discovery-complete-with-failure" &&
    discoveryRecovery.status ===
      "v2.2.1-discovery-mechanically-recovered-chronology-fallback-inventory-preparation-authorized" &&
    discoveryRecovery.audit.sourceExecutionInvalid === 1 &&
    discoveryRecovery.audit.recoveryValid === 38 &&
    !discoveryRecovery.audit.rawOutputsRewritten &&
    !discoveryRecovery.audit.candidateFieldsModified &&
    !discoveryRecovery.audit.semanticCorrectionPerformed &&
    !discoveryRecovery.audit.retryPerformed &&
    !discoveryRecovery.audit.predecessorV22DiscoveryGateReclassified,
  "discovery failure was not preserved and mechanically recovered within bounds"
);

validateModelResults(predecessorPlanExecution, 10, [
  "completed-valid",
  "timed-out",
]);
validateModelResults(inventoryRouteExecution, 10, ["completed-valid"]);
validateModelResults(inventorySectionExecution, 10, ["completed-valid"]);
validateModelResults(inventorySideExecution, 20, ["completed-valid"]);
assertV4(
  predecessorPlanExecution.status ===
      "v2.2.1-candidate-census-plan-gate-complete-with-failure" &&
    predecessorPlanExecution.results.filter(
      (result) => result.status === "timed-out"
    ).length === 1 &&
    inventoryAnalysis.status ===
      "v2.2.2-chronology-fallback-inventory-gate-passed-independent-judgment-packet-preparation-authorized" &&
    inventoryAnalysis.totals.lockedInventoriesCompiled === 10 &&
    inventoryAnalysis.totals.moves === 197 &&
    inventoryAnalysis.totals.retries === 0 &&
    inventoryAnalysis.totals.timeoutExtensions === 0 &&
    inventoryAnalysis.totals.semanticCorrections === 0 &&
    inventoryAnalysis.totals.scoresDerived === 0 &&
    inventoryAnalysis.audit.everySelectorSingleAttempt &&
    inventoryAnalysis.audit.everyLockedInventoryValidated &&
    inventoryAnalysis.audit.ratingsAbsent &&
    inventoryAnalysis.audit.responseTopologyAbsent &&
    !inventoryAnalysis.audit.semanticRepairPerformed &&
    inventoryAnalysis.failedGateDisposition.v221PlanningGatePreservedFailed &&
    !inventoryAnalysis.failedGateDisposition.v221Debate75Retried &&
    !inventoryAnalysis.failedGateDisposition.v221TimeoutExtended &&
    !inventoryAnalysis.failedGateDisposition.v221ExecutionReclassified,
  "inventory predecessor failure or passing successor gate changed"
);

assertV4(
  judgmentActivation.status ===
      "frozen-twenty-v2.2.3-independent-judgment-contexts-authorized" &&
    judgmentActivation.model.label === "5.6 Sol" &&
    judgmentActivation.model.slug === "gpt-5.6-sol" &&
    judgmentActivation.model.reasoningEffort === "low" &&
    judgmentActivation.model.authentication === "ChatGPT subscription" &&
    judgmentActivation.model.scoreBlind &&
    Object.values(judgmentActivation.stopRules).every(Boolean) &&
    judgmentActivation.isolation.oneDebateAndOnePassPerContext &&
    judgmentActivation.isolation.otherPassOutputUnavailable &&
    judgmentActivation.isolation.otherDebateOutputsUnavailable &&
    judgmentActivation.isolation.legacyAssessmentsScoresWinnersTagsAndPublicationProseUnavailable,
  "independent-judgment frozen model, isolation, or stop-rule boundary changed"
);
validateModelResults(judgmentExecution, 20, ["completed-valid"]);
assertV4(
  judgmentExecution.status ===
      "twenty-v2.2.3-independent-judgment-contexts-passed" &&
    judgmentExecution.contextsAttempted === 20 &&
    judgmentExecution.validContexts === 20 &&
    judgmentExecution.scoreBlind &&
    judgmentExecution.modelAuthoredScores === 0 &&
    judgmentAnalysis.status ===
      "twenty-v2.2.3-independent-judgments-passed-disagreement-extraction-authorized" &&
    judgmentAnalysis.totals.movesJudgedAcrossPasses === 394 &&
    judgmentAnalysis.totals.modelAuthoredScores === 0 &&
    judgmentAnalysis.totals.scoresDerived === 0,
  "twenty isolated independent judgments did not pass unchanged"
);

assertV4(
  audioExecution.status === "four-paid-known-speaker-diarizations-completed" &&
    audioExecution.callsPlanned === 4 &&
    audioExecution.callsCompleted === 4 &&
    audioExecution.attempts === 4 &&
    audioExecution.retries === 0 &&
    audioExecution.correctionCalls === 0 &&
    audioExecution.estimatedProcessingExposureUsd <=
      audioExecution.maximumAuthorizedCostUsd &&
    audioExecution.estimatedProcessingExposureUsd === 0.072 &&
    audioFailureDiagnosis.status ===
      "mixed-speaker-locked-excerpt-contamination-confirmed-audio-attribution-packet-preparation-authorized" &&
    !audioFailureDiagnosis.authorization.retry &&
    !audioFailureDiagnosis.authorization.correctionCall,
  "audio verification cost, retry, or failure disposition changed"
);
assertV4(
  audioAttributionExecution.status ===
      "v2.2.3-audio-attribution-adjudication-execution-passed" &&
    audioAttributionExecution.contexts === 1 &&
    audioAttributionExecution.attempts === 1 &&
    audioAttributionExecution.retries === 0 &&
    audioAttributionExecution.result.model === "5.6 Sol" &&
    audioAttributionExecution.result.reasoningEffort === "low" &&
    audioAttributionExecution.result.authentication === "ChatGPT subscription" &&
    audioAttributionExecution.result.apiKeysRemoved &&
    audioAttributionExecution.result.attemptCount === 1 &&
    audioAttributionExecution.result.retryCount === 0 &&
    audioAttributionExecution.result.gateAcceptancePassed &&
    audioAttributionExecution.scoresDerived === 0 &&
    audioAttributionAnalysis.status ===
      "v2.2.3-audio-attribution-adjudication-passed",
  "isolated audio-attribution resolution changed"
);

validateModelResults(disputeExecution, 10, ["completed-valid"]);
assertV4(
  disputeExecution.status ===
      "ten-isolated-v2.2.3-dispute-only-adjudication-contexts-passed" &&
    disputeAnalysis.status ===
      "v2.2.3-dispute-only-adjudication-gate-passed" &&
    disputeAnalysis.totals.modelContexts === 10 &&
    disputeAnalysis.totals.retries === 0 &&
    disputeAnalysis.totals.corrections === 0 &&
    disputeAnalysis.totals.scoresDerived === 0,
  "dispute-only adjudication gate changed"
);

assertV4(
  finalLedgerAnalysis.status ===
      "v2.2.3-deterministic-final-ledger-gate-passed" &&
    finalLedgerAnalysis.validation.debates === 10 &&
    finalLedgerAnalysis.validation.disputedMoves === 185 &&
    finalLedgerAnalysis.validation.audioVerifiedMoves === 4 &&
    finalLedgerAnalysis.validation.calculatedScores === 0 &&
    finalLedgerAnalysis.integrity
      .bothPassesRevalidatedAgainstFullLocalTranscriptChain &&
    finalLedgerAnalysis.integrity.disagreementsReplayedExactly &&
    finalLedgerAnalysis.integrity
      .candidateAnonymizationAndProvenanceReplayedExactly &&
    finalLedgerAnalysis.integrity.adjudicationSelectionsReplayedExactly &&
    finalLedgerAnalysis.integrity
      .finalRawJudgmentsRevalidatedAgainstFullSourceChain &&
    finalLedgerAnalysis.integrity.localTranscriptFilesHashLocked &&
    finalLedgerAnalysis.integrity
      .audioVerificationAndRawDiarizedTranscriptHashesLockedWhereRequired &&
    finalLedgerAnalysis.integrity.combinedAudioAttributionResolutionReplayed &&
    !finalLedgerAnalysis.integrity.modelScoresPresent &&
    !finalLedgerAnalysis.integrity.repositoryScoresPresent,
  "final-ledger lock or score-blind boundary changed"
);
assertV4(
  scoreManifest.scoringPolicy.passes === 1 &&
    !scoreManifest.scoringPolicy.modelScoringAllowed &&
    !scoreManifest.scoringPolicy.postResultTuningAllowed &&
    !scoreManifest.scoringPolicy.automaticRerunAllowed &&
    calculatedScores.formulaBoundary.scoringPasses === 1 &&
    !calculatedScores.formulaBoundary.modelCalculatedScores &&
    calculatedScores.totals.retries === 0 &&
    scoreAnalysis.status ===
      "v2.2.3-prospective-score-stability-validation-passed" &&
    scoreAnalysis.validation.numericPassed &&
    scoreAnalysis.validation.winnerStabilityPassed &&
    scoreAnalysis.validation.acceptancePassed &&
    policyConformance.status ===
      "v2.2-policy-conformance-passed-score-manifest-policy-reference-mismatch-nonmaterial" &&
    policyConformance.conformance.numericPassed &&
    policyConformance.conformance.winnerStability.passed &&
    policyConformance.conformance.acceptancePassed &&
    policyConformance.conformance.v21AndV22AcceptanceOutcomesMatch &&
    policyConformance.conformance.winnerStability.agreedInitialTieDebates === 0 &&
    !policyConformance.defect.frozenScoreManifestMutated &&
    !policyConformance.defect.calculatedScoresMutated &&
    !policyConformance.defect.scoreRerunPerformed &&
    !policyConformance.defect.thresholdChangePerformed &&
    !policyConformance.defect.resultDependentPolicyChangePerformed,
  "single score pass or disclosed v2.2 conformance result changed"
);

const selectedNumbers = selection.selected.map((item) => item.debateNumber);
const scoredNumbers = calculatedScores.debates.map(
  (item) => item.debateNumber
);
assertV4(
  canonicalJson([...selectedNumbers].sort()) ===
    canonicalJson([...scoredNumbers].sort()),
  "readiness cohort identity changed"
);

const decision = {
  schemaVersion: "1.0-score-stability-v2.2.3-production-readiness-decision",
  status:
    "v2.2-policy-ready-for-promotion-with-nonmaterial-score-manifest-reference-defect-disclosed",
  policy: {
    version: "v2.2",
    proposal: paths.policy,
    sha256: selection.policy.sha256,
    readyForPromotion: true,
    promotedByThisDecision: false,
  },
  decision: {
    validationPassed: true,
    policyReadyForPromotion: true,
    productionCampaignReady: false,
    publicationPreparationReady: false,
    rationale:
      "The fresh disjoint cohort satisfied the prospectively frozen v2.2 rule, every unchanged numerical threshold, the required model/authentication/isolation controls, and the single-score-pass boundary. The later score manifest named v2.1, but the v2.2 policy was frozen before model execution, its evaluator remained unchanged, no agreed-initial-tie case occurred, and the disclosed conformance audit proves that the mistake changed neither scores nor acceptance.",
  },
  requirements: {
    freshDisjointTenDebateDyadicCohort: true,
    policyFrozenBeforeModelExecution: true,
    model56SolLowViaChatGPTSubscription: true,
    scoreBlindUntilRepositoryScoring: true,
    isolationAndStopRulesPreserved: true,
    predecessorFailuresPreservedNotReclassified: true,
    noModelRetriesOrSemanticCorrections: true,
    audioExceptionResolvedThroughAuthorizedIsolatedRoute: true,
    finalLedgerLockedBeforeScoring: true,
    exactlyOneDeterministicRepositoryScorePass: true,
    exactProspectiveV22RulePassed: true,
    noThresholdTuningOrAutomaticRerun: true,
    explicitReadinessDecisionRecorded: true,
  },
  evidenceSummary: {
    debates: 10,
    lockedInventoryMoves: 197,
    independentJudgmentContexts: 20,
    disputedMoves: 185,
    disputeAdjudicationContexts: 10,
    audioDiarizationCalls: 4,
    audioAttributionAdjudicationContexts: 1,
    estimatedAudioProcessingExposureUsd: 0.072,
    scorePasses: 1,
    numericStability: {
      meanAbsoluteDistanceToInitialPasses:
        calculatedScores.stability.meanAbsoluteDistanceToInitialPasses,
      meanAbsoluteDistanceMaximum:
        calculatedScores.stability.thresholds
          .meanAbsoluteDistanceToInitialPassesMaximum,
      maximumAbsoluteDistanceToEitherInitialPass:
        calculatedScores.stability.maximumAbsoluteDistanceToEitherInitialPass,
      maximumAbsoluteDistanceMaximum:
        calculatedScores.stability.thresholds
          .maximumAbsoluteDistanceToEitherInitialPassMaximum,
      maximumOutsideInitialRange:
        calculatedScores.stability.maximumOutsideInitialRange,
      maximumOutsideInitialRangeMaximum:
        calculatedScores.stability.thresholds.maximumOutsideInitialRangeMaximum,
    },
    v22WinnerStability: {
      agreedWinningSideDebates:
        policyConformance.conformance.winnerStability
          .agreedWinningSideDebates,
      agreedWinningSidesPreserved:
        policyConformance.conformance.winnerStability
          .agreedWinningSidesPreserved,
      agreedInitialTieDebates:
        policyConformance.conformance.winnerStability.agreedInitialTieDebates,
      publishedOppositeSideReversals:
        policyConformance.conformance.winnerStability
          .publishedOppositeSideReversals,
    },
  },
  disclosedDefect: {
    kind: policyConformance.defect.kind,
    materialToScores: false,
    materialToAcceptanceOutcome: false,
    originalArtifactsPreserved: true,
    mustBeCorrectedBeforePublicationPreparation: true,
  },
  requiredBeforePublicationPreparation: [
    "Promote the hash-locked v2.2 proposal as the active production score-stability rule in a separate committed decision.",
    "Replace the future production score-control manifest and gate reference with v2.2 and test the agreed-initial-tie behavior before freezing publication work.",
    "Freeze a separate publication-preparation authorization; this readiness decision does not execute publication models or mutate production.",
  ],
  sourceHashes,
  authorization: {
    policyPromotion: true,
    productionScoreControlCorrectionPreparation: true,
    scoreRerun: false,
    judgmentRerun: false,
    adjudicationRerun: false,
    publicationPacketPreparation: false,
    publicationModelExecution: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  nextAuthorizedAction:
    "promote-v2.2-policy-and-prepare-corrected-production-score-control-model-free-only",
};

if (shouldWrite) {
  await writeFile(path.resolve(outputPath), `${JSON.stringify(decision, null, 2)}\n`);
}

console.log(
  JSON.stringify(
    {
      status: decision.status,
      policyReadyForPromotion: decision.decision.policyReadyForPromotion,
      policyPromoted: decision.policy.promotedByThisDecision,
      scoreManifestDefectDisclosed: true,
      productionCampaignReady: decision.decision.productionCampaignReady,
      publicationPreparationAuthorized:
        decision.authorization.publicationPacketPreparation,
      productionMutationAuthorized: decision.authorization.productionMutation,
      nextAuthorized: decision.nextAuthorizedAction,
    },
    null,
    2
  )
);
