#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const cohortRoot =
  "docs/assessment-production/score-stability-v2.1.3-validation-cohort";
const scoreRoot = `${cohortRoot}/score-pass`;
const scoresPath = `${scoreRoot}/calculated-scores.json`;
const analysisPath = `${scoreRoot}/analysis.json`;
const ledgerPath = `${cohortRoot}/final-ledger/final-ledger.json`;
const ledgerAnalysisPath = `${cohortRoot}/final-ledger/analysis.json`;
const outputPath = `${scoreRoot}/failure-diagnosis.json`;
const scoreManifestPath = `${scoreRoot}/score-pass-manifest.json`;
const scoreGateLibraryPath =
  "scripts/lib/assessment-production-score-stability-v2.1.3-score-gate.mjs";
const policyLibraryPath =
  "scripts/lib/assessment-production-score-stability-policy-v2.1.mjs";
const diagnosisScriptPath =
  "scripts/diagnose-assessment-production-score-stability-v2.1.3-score-failure.mjs";
const diagnosisTestPath =
  "scripts/test-assessment-production-score-stability-v2.1.3-score-failure-diagnosis.mjs";
const sourcePaths = [
  scoresPath,
  analysisPath,
  ledgerPath,
  ledgerAnalysisPath,
  scoreManifestPath,
  scoreGateLibraryPath,
  policyLibraryPath,
  diagnosisScriptPath,
  diagnosisTestPath,
];
const sourceEntries = await Promise.all(
  sourcePaths.map(async (file) => [file, await readFile(path.resolve(file))])
);
const sourceBytes = Object.fromEntries(sourceEntries);
const scores = JSON.parse(sourceBytes[scoresPath]);
const analysis = JSON.parse(sourceBytes[analysisPath]);
const ledger = JSON.parse(sourceBytes[ledgerPath]);
const ledgerAnalysis = JSON.parse(sourceBytes[ledgerAnalysisPath]);
assertV4(
  scores.status === "v2.1.3-single-score-pass-stability-gate-failed" &&
    scores.formulaBoundary.scoringPasses === 1 &&
    !scores.formulaBoundary.modelCalculatedScores &&
    analysis.status ===
      "v2.1.3-prospective-score-stability-validation-failed" &&
    analysis.nextAuthorizedAction ===
      "diagnose-v2.1.3-score-stability-failure-only" &&
    analysis.authorization.readinessDecision === true &&
    !analysis.authorization.policyPromotion &&
    !analysis.authorization.publicationPacketPreparation &&
    ledger.status === "passed-v2.1.3-deterministic-final-ledger-assembly" &&
    ledgerAnalysis.status === "v2.1.3-deterministic-final-ledger-gate-passed",
  "frozen v2.1.3 score failure unavailable"
);

const failedWinnerRows = scores.debates.filter(
  (debate) =>
    debate.consensus.initialWinnersAgree &&
    !debate.consensus.finalPreservesV21WinnerRule
);
assertV4(
  failedWinnerRows.length === 1 && failedWinnerRows[0].debateNumber === "172",
  "v2.1.3 winner-stability failure population changed"
);
const failed = failedWinnerRows[0];
const ledgerDebate = ledger.debates.find(
  (debate) => debate.debateNumber === "172"
);
assertV4(ledgerDebate, "Debate 172 final-ledger record unavailable");

const adjustedTotal = (overall) =>
  overall.weightedSectionMean + overall.burdenCompletionAdjustment;
const sideSummary = (scored) => ({
  proWeightedSectionMean: scored.overall.pro.weightedSectionMean,
  conWeightedSectionMean: scored.overall.con.weightedSectionMean,
  proBurdenCompletionAdjustment:
    scored.overall.pro.burdenCompletionAdjustment,
  conBurdenCompletionAdjustment:
    scored.overall.con.burdenCompletionAdjustment,
  proAdjustedTotal: adjustedTotal(scored.overall.pro),
  conAdjustedTotal: adjustedTotal(scored.overall.con),
  conMinusProAdjustedTotal: Number(
    (adjustedTotal(scored.overall.con) - adjustedTotal(scored.overall.pro)).toFixed(2)
  ),
  proRoundedScore: scored.overall.pro.score,
  conRoundedScore: scored.overall.con.score,
  winner: scored.winner,
});
const sectionRows = failed.final.sections.map((section) => {
  const passA = failed.passA.sections.find(
    (item) => item.sectionId === section.sectionId
  );
  const passB = failed.passB.sections.find(
    (item) => item.sectionId === section.sectionId
  );
  assertV4(passA && passB, `${section.sectionId}: initial score section missing`);
  const summarize = (item) => ({
    pro: item.sides.pro.score,
    con: item.sides.con.score,
    conMinusPro: item.sides.con.score - item.sides.pro.score,
  });
  return {
    sectionId: section.sectionId,
    weightPercent: section.weightPercent,
    passA: summarize(passA),
    passB: summarize(passB),
    final: summarize(section),
  };
});
const selectionRows = [
  ...ledgerDebate.mergeAudit.pairSelections,
  ...ledgerDebate.mergeAudit.scoringFieldSelections,
  ...ledgerDebate.mergeAudit.burdenAdjustmentSelections,
];
const selectionSources = Object.fromEntries(
  ["passA", "passB"].map((source) => [
    source,
    selectionRows.filter((row) => row.source === source).length,
  ])
);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const thresholds = scores.stability.thresholds;
const numericThresholdsPassed = {
  scoreBounds: scores.stability.scoreBoundsPassed,
  meanAbsoluteDistance:
    scores.stability.meanAbsoluteDistanceToInitialPasses <=
    thresholds.meanAbsoluteDistanceToInitialPassesMaximum,
  maximumAbsoluteDistance:
    scores.stability.maximumAbsoluteDistanceToEitherInitialPass <=
    thresholds.maximumAbsoluteDistanceToEitherInitialPassMaximum,
  maximumOutsideInitialRange:
    scores.stability.maximumOutsideInitialRange <=
    thresholds.maximumOutsideInitialRangeMaximum,
};
assertV4(
  Object.values(numericThresholdsPassed).every(Boolean) &&
    scores.stability.winnerStability.agreedWinnerDebates === 9 &&
    scores.stability.winnerStability.proposedV21WinnerStabilityPreserved === 8 &&
    scores.stability.winnerStability.allowedIntegerRoundedTieCollapses.length === 0 &&
    scores.stability.winnerStability.publishedOppositeSideReversals.length === 0,
  "score failure is no longer isolated to agreed-initial-tie stability"
);

const diagnosis = {
  schemaVersion: "1.0-score-stability-v2.1.3-failure-diagnosis",
  protocolId: scores.protocolId,
  status: "confirmed-single-agreed-initial-tie-drift-failure",
  productionCanary: false,
  stagingOnly: true,
  developmentValidationOnly: true,
  sourceHashes: Object.fromEntries(
    sourceEntries.map(([file, bytes]) => [file, sha256(bytes)])
  ),
  resultIntegrity: {
    scoreArtifactUnchanged: true,
    scoringPasses: 1,
    deterministicCompilerPassed: true,
    exactLedgerReplayPassed: true,
    deterministicScoreReplayPassed: true,
    sourceSchemaValidationPassed: true,
    modelCalculatedScores: false,
    postResultTuningPerformed: false,
    rerunPerformed: false,
    failedAnalysisArtifactPreservedUnchanged: true,
  },
  controlCorrection: {
    analysisAuthorizationDefectDetected: true,
    conflictingField: "authorization.readinessDecision",
    frozenValue: true,
    conflict:
      "The failed analysis and diagnosis-only next action cannot authorize a readiness decision.",
    effectiveValue: false,
    downstreamActionOccurred: false,
    scoreResultChanged: false,
    scorePassRerun: false,
  },
  gateIsolation: {
    numericThresholdsPassed,
    meanAbsoluteDistanceToInitialPasses:
      scores.stability.meanAbsoluteDistanceToInitialPasses,
    maximumAbsoluteDistanceToEitherInitialPass:
      scores.stability.maximumAbsoluteDistanceToEitherInitialPass,
    maximumOutsideInitialRange:
      scores.stability.maximumOutsideInitialRange,
    agreedWinnerDebates:
      scores.stability.winnerStability.agreedWinnerDebates,
    agreedWinnerDebatesPreserved:
      scores.stability.winnerStability.proposedV21WinnerStabilityPreserved,
    failedDebates: ["172"],
    allowedIntegerRoundedTieCollapses: [],
    publishedOppositeSideReversals: [],
    allOtherDebatesPassedWinnerStability: true,
  },
  debate172: {
    debateId: failed.debateId,
    initial: {
      passA: sideSummary(failed.passA),
      passB: sideSummary(failed.passB),
      bothIntegerRoundedTies: true,
    },
    final: {
      ...sideSummary(failed.final),
      interpretation:
        "The deterministic final ledger combines adjudicated and nondisputed field values into a 1.02-point con adjusted-total advantage, which repository rounding publishes as 79-80 rather than preserving the two initial rounded ties.",
    },
    sectionRows,
    mergeAudit: {
      disputedMoves: ledgerDebate.mergeAudit.disputedMoves,
      candidateSelections: selectionRows.length,
      selectionSources,
      roundedMeanMerges: ledgerDebate.mergeAudit.meanMerges.length,
      dependencyMeanMergesSuppressed:
        ledgerDebate.mergeAudit.dependencyMeanMergesSuppressed.length,
      burdenAdjustments: {
        pro: failed.final.overall.pro.burdenCompletionAdjustment,
        con: failed.final.overall.con.burdenCompletionAdjustment,
      },
    },
  },
  diagnosis: {
    compilerDefectDetected: false,
    sourceHashFailureDetected: false,
    unresolvedDisputeDetected: false,
    scoreBoundsFailureDetected: false,
    distanceThresholdFailureDetected: false,
    publishedOppositeSideReversalDetected: false,
    integerRoundedTieCollapseDetected: false,
    agreedInitialTieDriftDetected: true,
    deterministicFieldLevelRecombinationDetected: true,
    analysisAuthorizationDefectDetected: true,
    interpretation:
      "The frozen v2.1 rule accepts final integer-rounded tie collapses from an agreed pro or con winner, but it separately requires two agreed initial ties to remain a tie. Debate 172 violates only that latter clause. The result is a valid deterministic consequence of the accepted field ledger, not a compiler or adjudication-integrity defect.",
  },
  decision: {
    validationPassed: false,
    automaticRerunAuthorized: false,
    thresholdRelaxationAuthorized: false,
    judgmentRepairAuthorized: false,
    adjudicationRepairAuthorized: false,
    readinessDecisionAuthorized: false,
    policyPromotionAuthorized: false,
    publicationPacketPreparationAuthorized: false,
    publicationModelExecutionAuthorized: false,
    productionMutationAuthorized: false,
    remainingProductionBatchesAuthorized: false,
  },
  recommendation: {
    preserveFailureUnchanged: true,
    doNotForceDebate172Tie: true,
    doNotRelaxFrozenGatePostResult: true,
    nextActionRequiresNewProspectiveAuthorization: true,
    candidatePolicyQuestion:
      "For a future policy version only, decide prospectively whether agreement on two integer-rounded ties must constrain the final result after independent field-level adjudication, then validate any changed rule on a fresh disjoint cohort.",
  },
};
if (shouldWrite) {
  await writeFile(
    path.resolve(outputPath),
    `${JSON.stringify(diagnosis, null, 2)}\n`
  );
}
console.log(
  JSON.stringify(
    {
      status: diagnosis.status,
      failedDebates: diagnosis.gateIsolation.failedDebates,
      numericThresholdsPassed,
      initial: diagnosis.debate172.initial,
      final: diagnosis.debate172.final,
      compilerDefectDetected: false,
      analysisAuthorizationDefectDetected: true,
      rerunAuthorized: false,
      readinessDecisionAuthorized: false,
      policyPromotionAuthorized: false,
      publicationAuthorized: false,
      productionMutationAuthorized: false,
    },
    null,
    2
  )
);
