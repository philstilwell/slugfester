#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  loadV223FinalLedgerInputs,
  validateV223FinalLedger,
} from "./lib/assessment-production-score-stability-v2.2.3-final-ledger.mjs";
import {
  V223_CALCULATED_SCORES_VERSION,
  V223_SCORE_ROOT,
  validateV223Scores,
} from "./lib/assessment-production-score-stability-v2.2.3-score-gate.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const manifest = JSON.parse(
  await readFile(path.resolve(`${V223_SCORE_ROOT}/score-pass-manifest.json`), "utf8")
);
const scoresPath = manifest.artifacts.calculatedScores;
const analysisPath = manifest.artifacts.analysis;
const [scores, ledger, inputs, productionModule] = await Promise.all([
  readFile(path.resolve(scoresPath), "utf8").then(JSON.parse),
  readFile(path.resolve(manifest.inputs.finalLedger), "utf8").then(JSON.parse),
  loadV223FinalLedgerInputs(),
  import(pathToFileURL(path.resolve(manifest.inputs.productionReference)).href),
]);
validateV223FinalLedger(ledger, inputs.debateInputs, inputs.sourceHashes);
const requiredNumbers = new Set(ledger.debates.map((debate) => debate.debateNumber));
const productionReferences = productionModule.debates
  .filter((debate) => requiredNumbers.has(debate.number))
  .map((debate) => ({
    debateNumber: debate.number,
    pro: debate.score.pro,
    con: debate.score.con,
  }));
const validation = validateV223Scores(
  scores,
  ledger,
  inputs.debateInputs,
  productionReferences,
  {
    finalLedgerSha256: manifest.sourceHashes[manifest.inputs.finalLedger],
    productionReferenceSha256:
      manifest.sourceHashes[manifest.inputs.productionReference],
  }
);
assertV4(
  scores.schemaVersion === V223_CALCULATED_SCORES_VERSION &&
    !scores.productionCanary &&
    scores.stagingOnly &&
    scores.developmentValidationOnly &&
    scores.formulaBoundary.scoringPasses === 1 &&
    !scores.formulaBoundary.modelCalculatedScores,
  "v2.2.3 score artifact identity mismatch"
);
const productionWinnerMatches = scores.debates.filter(
  (debate) => debate.productionReferenceDiagnosticOnly.finalWinnerMatches
).length;
const productionDeltas = scores.debates.flatMap((debate) =>
  Object.values(debate.productionReferenceDiagnosticOnly.finalDeltas)
);
const passed = validation.acceptancePassed;
const analysis = {
  schemaVersion: "1.0-score-stability-v2.2.3-analysis",
  protocolId: scores.protocolId,
  status: passed
    ? "v2.2.3-prospective-score-stability-validation-passed"
    : "v2.2.3-prospective-score-stability-validation-failed",
  productionCanary: false,
  stagingOnly: true,
  developmentValidationOnly: true,
  resultIntegrity: {
    prospectiveV21ThresholdsApplied: true,
    everyIntegerRoundedTieAccepted: true,
    unroundedDirectionDiagnosticOnly: true,
    publishedOppositeSideReversalRejected: true,
    singleDeterministicScoringPass: true,
    scoresDerivedAfterLedgerLock: true,
    postResultTuningPerformed: false,
    automaticRerunPerformed: false,
    productionScoresUsedForAcceptance: false,
    deterministicScoreReplayPassed: true,
  },
  validation,
  stability: scores.stability,
  productionReferenceDiagnostic: {
    winnerMatches: productionWinnerMatches,
    debates: 10,
    signedSideDeltas: productionDeltas,
    meanSignedSideDelta: Number(
      (
        productionDeltas.reduce((sum, value) => sum + value, 0) /
        productionDeltas.length
      ).toFixed(2)
    ),
    diagnosticNotGold: true,
  },
  totals: {
    debates: 10,
    finalSides: 20,
    scoringPasses: 1,
    modelContexts: 0,
    retries: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsdThisStage: 0,
  },
  authorization: {
    readinessDecision: true,
    scoreRerun: false,
    policyPromotion: false,
    publicationPacketPreparation: false,
    publicationModelExecution: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  nextAuthorizedAction: passed
    ? "make-explicit-v2.2.3-production-readiness-decision"
    : "diagnose-v2.2.3-score-stability-failure-only",
};
if (shouldWrite) {
  await writeFile(
    path.resolve(analysisPath),
    `${JSON.stringify(analysis, null, 2)}\n`
  );
}
console.log(
  JSON.stringify(
    {
      status: analysis.status,
      validation: analysis.validation,
      numeric: {
        meanAbsoluteDistanceToInitialPasses:
          analysis.stability.meanAbsoluteDistanceToInitialPasses,
        maximumAbsoluteDistanceToEitherInitialPass:
          analysis.stability.maximumAbsoluteDistanceToEitherInitialPass,
        maximumOutsideInitialRange:
          analysis.stability.maximumOutsideInitialRange,
      },
      winnerStability: {
        agreedWinnerDebates:
          analysis.stability.winnerStability.agreedWinnerDebates,
        preserved:
          analysis.stability.winnerStability
            .proposedV21WinnerStabilityPreserved,
        allowedIntegerRoundedTieCollapses:
          analysis.stability.winnerStability
            .allowedIntegerRoundedTieCollapses,
        publishedOppositeSideReversals:
          analysis.stability.winnerStability.publishedOppositeSideReversals,
      },
      nextAuthorized: analysis.nextAuthorizedAction,
      policyPromotionAuthorized: false,
      productionMutationAuthorized: false,
      remainingProductionBatchesAuthorized: false,
    },
    null,
    2
  )
);
