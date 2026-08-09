#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const root = "docs/assessment-production/canary-v1-score-pass";
const scoresPath = `${root}/calculated-scores.json`;
const analysisPath = `${root}/analysis.json`;
const ledgerPath =
  "docs/assessment-production/canary-v1-final-ledger/final-ledger.json";
const ledgerAnalysisPath =
  "docs/assessment-production/canary-v1-final-ledger/analysis.json";
const outputPath = `${root}/failure-diagnosis.json`;
const scoreManifestPath = `${root}/score-pass-manifest.json`;
const scoreGateLibraryPath =
  "scripts/lib/assessment-production-canary-score-gate.mjs";
const diagnosisScriptPath =
  "scripts/diagnose-assessment-production-canary-score-failure.mjs";
const diagnosisTestPath =
  "scripts/test-assessment-production-canary-score-failure-diagnosis.mjs";
const [
  scoresBytes,
  analysisBytes,
  ledgerBytes,
  ledgerAnalysisBytes,
  scoreManifestBytes,
  scoreGateLibraryBytes,
  diagnosisScriptBytes,
  diagnosisTestBytes,
] =
  await Promise.all(
    [
      scoresPath,
      analysisPath,
      ledgerPath,
      ledgerAnalysisPath,
      scoreManifestPath,
      scoreGateLibraryPath,
      diagnosisScriptPath,
      diagnosisTestPath,
    ].map((file) => readFile(path.resolve(file)))
  );
const scores = JSON.parse(scoresBytes);
const analysis = JSON.parse(analysisBytes);
const ledger = JSON.parse(ledgerBytes);
const ledgerAnalysis = JSON.parse(ledgerAnalysisBytes);
assertV4(
  scores.status ===
    "production-canary-single-score-pass-stability-gate-failed" &&
    scores.formulaBoundary.scoringPasses === 1 &&
    !scores.formulaBoundary.modelCalculatedScores &&
    analysis.status ===
      "production-canary-post-adjudication-score-stability-failed" &&
    !analysis.authorization.publicationPacketPreparation &&
    ledger.status ===
      "passed-production-canary-deterministic-final-ledger-assembly" &&
    ledgerAnalysis.status ===
      "production-canary-deterministic-final-ledger-gate-passed",
  "frozen production-canary score failure unavailable"
);

const failedWinnerRows = scores.debates.filter(
  (debate) =>
    debate.consensus.initialWinnersAgree &&
    !debate.consensus.finalPreservesAgreedWinner
);
assertV4(
  failedWinnerRows.length === 1 && failedWinnerRows[0].debateNumber === "64",
  "production-canary winner-preservation failure population changed"
);
const failed = failedWinnerRows[0];
const ledgerDebate = ledger.debates.find(
  (debate) => debate.debateNumber === "64"
);
assertV4(ledgerDebate, "Debate 64 final-ledger record unavailable");
const sectionRows = failed.final.sections.map((section) => {
  const passA = failed.passA.sections.find(
    (item) => item.sectionId === section.sectionId
  );
  const passB = failed.passB.sections.find(
    (item) => item.sectionId === section.sectionId
  );
  assertV4(passA && passB, `${section.sectionId}: initial score section missing`);
  return {
    sectionId: section.sectionId,
    weightPercent: section.weightPercent,
    passA: {
      pro: passA.sides.pro.score,
      con: passA.sides.con.score,
      conMinusPro: passA.sides.con.score - passA.sides.pro.score,
    },
    passB: {
      pro: passB.sides.pro.score,
      con: passB.sides.con.score,
      conMinusPro: passB.sides.con.score - passB.sides.pro.score,
    },
    final: {
      pro: section.sides.pro.score,
      con: section.sides.con.score,
      conMinusPro: section.sides.con.score - section.sides.pro.score,
    },
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
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
const thresholds = scores.stability.thresholds;
const numericThresholdsPassed = {
  scoreBounds:
    scores.stability.scoreBoundsPassed,
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
    scores.stability.agreedWinnerDebates === 10 &&
    scores.stability.agreedWinnersPreserved === 9,
  "score failure is no longer isolated to agreed-winner preservation"
);

const diagnosis = {
  schemaVersion: "1.0-production-canary-score-failure-diagnosis",
  protocolId: scores.protocolId,
  status: "confirmed-single-rounding-edge-winner-preservation-failure",
  productionCanary: true,
  stagingOnly: true,
  sourceHashes: {
    [scoresPath]: sha256(scoresBytes),
    [analysisPath]: sha256(analysisBytes),
    [ledgerPath]: sha256(ledgerBytes),
    [ledgerAnalysisPath]: sha256(ledgerAnalysisBytes),
    [scoreManifestPath]: sha256(scoreManifestBytes),
    [scoreGateLibraryPath]: sha256(scoreGateLibraryBytes),
    [diagnosisScriptPath]: sha256(diagnosisScriptBytes),
    [diagnosisTestPath]: sha256(diagnosisTestBytes),
  },
  resultIntegrity: {
    scoreArtifactUnchanged: true,
    scoringPasses: 1,
    deterministicCompilerPassed: true,
    exactLedgerReplayPassed: true,
    sourceSchemaValidationPassed: true,
    modelCalculatedScores: false,
    postResultTuningPerformed: false,
    rerunPerformed: false,
  },
  gateIsolation: {
    numericThresholdsPassed,
    agreedWinnerDebates: scores.stability.agreedWinnerDebates,
    agreedWinnersPreserved: scores.stability.agreedWinnersPreserved,
    failedDebates: ["64"],
    allOtherDebatesPassedWinnerPreservation: true,
  },
  debate64: {
    debateId: failed.debateId,
    initial: {
      passA: {
        pro: failed.passA.overall.pro.score,
        con: failed.passA.overall.con.score,
        conMinusProWeightedMean: Number(
          (
            failed.passA.overall.con.weightedSectionMean -
            failed.passA.overall.pro.weightedSectionMean
          ).toFixed(2)
        ),
        winner: failed.passA.winner,
      },
      passB: {
        pro: failed.passB.overall.pro.score,
        con: failed.passB.overall.con.score,
        conMinusProWeightedMean: Number(
          (
            failed.passB.overall.con.weightedSectionMean -
            failed.passB.overall.pro.weightedSectionMean
          ).toFixed(2)
        ),
        winner: failed.passB.winner,
      },
    },
    final: {
      proWeightedSectionMean: failed.final.overall.pro.weightedSectionMean,
      conWeightedSectionMean: failed.final.overall.con.weightedSectionMean,
      conMinusProWeightedMean: Number(
        (
          failed.final.overall.con.weightedSectionMean -
          failed.final.overall.pro.weightedSectionMean
        ).toFixed(2)
      ),
      proRoundedScore: failed.final.overall.pro.score,
      conRoundedScore: failed.final.overall.con.score,
      winner: failed.final.winner,
      interpretation:
        "The final unrounded weighted mean still favors con by 0.08, but repository rounding maps both sides to 82 and therefore classifies the result as a tie.",
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
    semanticWinnerInversionDetected: false,
    roundedWinnerClassCollapseDetected: true,
    interpretation:
      "The frozen gate failed exactly as specified because deterministic field-level consensus narrowed a one-point con win to a rounded tie. The evidence supports a rounding-edge outcome, not a compiler defect or an unrounded pro-over-con reversal.",
  },
  decision: {
    canaryPassed: false,
    automaticRerunAuthorized: false,
    thresholdRelaxationAuthorized: false,
    judgmentRepairAuthorized: false,
    publicationPacketPreparationAuthorized: false,
    publicationModelExecutionAuthorized: false,
    productionMutationAuthorized: false,
    remainingProductionBatchesAuthorized: false,
  },
  recommendation: {
    preserveFailureUnchanged: true,
    doNotForceDebate64Winner: true,
    doNotRelaxFrozenGate: true,
    nextActionRequiresNewProspectiveAuthorization: true,
    candidatePolicyQuestion:
      "For a future version only, decide prospectively whether agreed-winner preservation should operate on rounded published scores or on the sign of unrounded weighted means, then validate that policy on a fresh disjoint sample.",
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
      finalWeightedMeans: {
        pro: diagnosis.debate64.final.proWeightedSectionMean,
        con: diagnosis.debate64.final.conWeightedSectionMean,
        conMinusPro: diagnosis.debate64.final.conMinusProWeightedMean,
      },
      roundedScores: {
        pro: diagnosis.debate64.final.proRoundedScore,
        con: diagnosis.debate64.final.conRoundedScore,
        winner: diagnosis.debate64.final.winner,
      },
      compilerDefectDetected: false,
      rerunAuthorized: false,
      publicationAuthorized: false,
      productionMutationAuthorized: false,
    },
    null,
    2
  )
);
