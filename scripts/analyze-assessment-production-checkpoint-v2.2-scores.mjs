#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  loadCheckpointV22FinalLedgerInputs,
  validateCheckpointV22FinalLedger
} from "./lib/assessment-production-checkpoint-v2.2-final-ledger.mjs";
import {
  CHECKPOINT_V22_CALCULATED_SCORES_VERSION,
  CHECKPOINT_V22_SCORE_ROOT,
  validateCheckpointV22Scores
} from "./lib/assessment-production-checkpoint-v2.2-score-gate.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const manifest = JSON.parse(
  await readFile(
    path.resolve(`${CHECKPOINT_V22_SCORE_ROOT}/score-pass-manifest.json`),
    "utf8"
  )
);
const scoresPath = manifest.artifacts.calculatedScores;
const analysisPath = manifest.artifacts.analysis;
const [scores, ledger, inputs, productionModule] = await Promise.all([
  readFile(path.resolve(scoresPath), "utf8").then(JSON.parse),
  readFile(path.resolve(manifest.inputs.finalLedger), "utf8").then(JSON.parse),
  loadCheckpointV22FinalLedgerInputs(),
  import(
    pathToFileURL(
      path.resolve(manifest.inputs.productionReferenceDiagnosticOnly)
    ).href
  )
]);
validateCheckpointV22FinalLedger(
  ledger,
  inputs.debateInputs,
  inputs.sourceHashes
);
const requiredNumbers = new Set(
  ledger.debates.map((debate) => debate.debateNumber)
);
const productionReferences = productionModule.debates
  .filter((debate) => requiredNumbers.has(debate.number))
  .map((debate) => ({
    debateNumber: debate.number,
    pro: debate.score.pro,
    con: debate.score.con
  }));
const validation = validateCheckpointV22Scores(
  scores,
  ledger,
  inputs.debateInputs,
  productionReferences,
  {
    finalLedgerSha256: manifest.sourceHashes[manifest.inputs.finalLedger],
    productionReferenceSha256:
      manifest.sourceHashes[manifest.inputs.productionReferenceDiagnosticOnly],
    activePolicySha256:
      manifest.sourceHashes[manifest.activePolicyControl.promotionRecord]
  }
);
assertV4(
  scores.schemaVersion === CHECKPOINT_V22_CALCULATED_SCORES_VERSION &&
    scores.productionCanary &&
    scores.stagingOnly &&
    !scores.developmentValidationOnly &&
    scores.formulaBoundary.scoringPasses === 1 &&
    !scores.formulaBoundary.modelCalculatedScores,
  "production-checkpoint v2.2 score artifact identity mismatch"
);
const productionWinnerMatches = scores.debates.filter(
  (debate) => debate.productionReferenceDiagnosticOnly.finalWinnerMatches
).length;
const productionDeltas = scores.debates.flatMap((debate) =>
  Object.values(debate.productionReferenceDiagnosticOnly.finalDeltas)
);
const passed = validation.acceptancePassed;
const analysis = {
  schemaVersion: "1.0-production-checkpoint-v2.2-score-analysis",
  protocolId: scores.protocolId,
  status: passed
    ? "production-checkpoint-v2.2-score-stability-gate-passed"
    : "production-checkpoint-v2.2-score-stability-gate-failed",
  productionCanary: true,
  stagingOnly: true,
  developmentValidationOnly: false,
  resultIntegrity: {
    activeV22PolicyAppliedProspectively: true,
    everyIntegerRoundedTieAccepted: true,
    agreedInitialTieDirectionUnconstrained: true,
    disagreedInitialWinnerDirectionUnconstrained: true,
    unroundedDirectionDiagnosticOnly: true,
    publishedOppositeSideReversalRejected: true,
    singleDeterministicScoringPass: true,
    scoresDerivedAfterLedgerLock: true,
    postResultTuningPerformed: false,
    automaticRerunPerformed: false,
    productionScoresUsedForAcceptance: false,
    deterministicScoreReplayPassed: true
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
    diagnosticNotGold: true
  },
  totals: {
    debates: 10,
    finalSides: 20,
    scoringPasses: 1,
    modelContexts: 0,
    retries: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsdThisStage: 0
  },
  authorization: {
    publicationPacketPreparation: passed,
    publicationModelExecution: false,
    scoreRerun: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  nextAuthorizedAction: passed
    ? "prepare-and-freeze-ten-production-checkpoint-v2.2-publication-packets-model-free-only"
    : "diagnose-production-checkpoint-v2.2-score-stability-failure-only"
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
          analysis.stability.maximumOutsideInitialRange
      },
      winnerStability: {
        agreedWinningSideDebates:
          analysis.stability.winnerStability.agreedWinningSideDebates,
        preserved:
          analysis.stability.winnerStability.agreedWinningSidesPreserved,
        allowedIntegerRoundedTieCollapses:
          analysis.stability.winnerStability.allowedIntegerRoundedTieCollapses,
        allowedAgreedInitialTieDrifts:
          analysis.stability.winnerStability.allowedAgreedInitialTieDrifts,
        publishedOppositeSideReversals:
          analysis.stability.winnerStability.publishedOppositeSideReversals
      },
      nextAuthorized: analysis.nextAuthorizedAction,
      scoreRerunAuthorized: false,
      productionMutationAuthorized: false
    },
    null,
    2
  )
);
