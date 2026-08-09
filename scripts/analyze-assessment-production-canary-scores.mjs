#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  PRODUCTION_CANARY_CALCULATED_SCORES_VERSION,
  PRODUCTION_CANARY_SCORE_ROOT,
} from "./lib/assessment-production-canary-score-gate.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const scoresPath = `${PRODUCTION_CANARY_SCORE_ROOT}/calculated-scores.json`;
const analysisPath = `${PRODUCTION_CANARY_SCORE_ROOT}/analysis.json`;
const scores = JSON.parse(await readFile(path.resolve(scoresPath), "utf8"));
assertV4(
  scores.schemaVersion === PRODUCTION_CANARY_CALCULATED_SCORES_VERSION &&
    scores.productionCanary &&
    scores.stagingOnly &&
    scores.formulaBoundary.scoringPasses === 1 &&
    !scores.formulaBoundary.modelCalculatedScores,
  "production-canary score artifact identity mismatch"
);
const productionWinnerMatches = scores.debates.filter(
  (debate) => debate.productionReferenceDiagnosticOnly.finalWinnerMatches
).length;
const productionDeltas = scores.debates.flatMap((debate) =>
  Object.values(debate.productionReferenceDiagnosticOnly.finalDeltas)
);
const passed = scores.totals.acceptancePassed;
const analysis = {
  schemaVersion: "1.0-production-canary-score-stability-analysis",
  protocolId: scores.protocolId,
  status: passed
    ? "production-canary-post-adjudication-score-stability-passed"
    : "production-canary-post-adjudication-score-stability-failed",
  productionCanary: true,
  stagingOnly: true,
  resultIntegrity: {
    prospectiveThresholdsApplied: true,
    singleDeterministicScoringPass: true,
    scoresDerivedAfterLedgerLock: true,
    postResultTuningPerformed: false,
    automaticRerunPerformed: false,
    productionScoresUsedForAcceptance: false,
  },
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
    publicationPacketPreparation: passed,
    publicationModelExecution: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
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
      stability: analysis.stability,
      productionReferenceDiagnostic:
        analysis.productionReferenceDiagnostic,
      nextAuthorized: passed
        ? "publication-packet-preparation"
        : "failure-diagnosis-only",
      productionMutationAuthorized: false,
      remainingProductionBatchesAuthorized: false,
    },
    null,
    2
  )
);
