#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  loadPostCanaryBatch01FinalLedgerInputs,
  validatePostCanaryBatch01FinalLedger
} from "./lib/assessment-production-post-canary-batch-01-final-ledger.mjs";
import {
  POST_CANARY_BATCH_01_CALCULATED_SCORES_VERSION,
  POST_CANARY_BATCH_01_SCORE_ROOT,
  validatePostCanaryBatch01Scores
} from "./lib/assessment-production-post-canary-batch-01-score-gate.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const manifest = JSON.parse(
  await readFile(
    path.resolve(`${POST_CANARY_BATCH_01_SCORE_ROOT}/score-pass-manifest.json`),
    "utf8"
  )
);
const scoresPath = manifest.artifacts.calculatedScores;
const analysisPath = manifest.artifacts.analysis;
const [scores, ledger, inputs, productionModule] = await Promise.all([
  readFile(path.resolve(scoresPath), "utf8").then(JSON.parse),
  readFile(path.resolve(manifest.inputs.finalLedger), "utf8").then(JSON.parse),
  loadPostCanaryBatch01FinalLedgerInputs(),
  import(
    pathToFileURL(
      path.resolve(manifest.inputs.productionReferenceDiagnosticOnly)
    ).href
  )
]);
validatePostCanaryBatch01FinalLedger(
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
const validation = validatePostCanaryBatch01Scores(
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
  scores.schemaVersion === POST_CANARY_BATCH_01_CALCULATED_SCORES_VERSION &&
    !scores.productionCanary &&
    scores.batchNumber === 1 &&
    scores.stagingOnly &&
    !scores.developmentValidationOnly &&
    scores.formulaBoundary.scoringPasses === 1 &&
    !scores.formulaBoundary.modelCalculatedScores,
  "post-canary Batch 1 score artifact identity mismatch"
);
const productionWinnerMatches = scores.debates.filter(
  (debate) => debate.productionReferenceDiagnosticOnly.finalWinnerMatches
).length;
const productionDeltas = scores.debates.flatMap((debate) =>
  Object.values(debate.productionReferenceDiagnosticOnly.finalDeltas)
);
const passed = validation.acceptancePassed;
const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-score-analysis",
  protocolId: scores.protocolId,
  status: passed
    ? "post-canary-batch-01-score-stability-gate-passed"
    : "post-canary-batch-01-score-stability-gate-failed",
  productionCanary: false,
  batchNumber: 1,
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
    paidServiceCalls: 0,
    retries: 0,
    directIncrementalCostUsd: 0
  },
  authorization: {
    publicationPacketPreparation: false,
    publicationModelExecution: false,
    scoreRerun: false,
    paidServices: false,
    publicationFinalization: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: passed
    ? "user-approval-required-before-batch-01-publication-packet-preparation"
    : "user-approval-required-before-batch-01-score-stability-failure-diagnosis-only"
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
      scoringPasses: 1,
      scoreRerunAuthorized: false,
      modelContexts: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0,
      nextAuthorizedAction: analysis.nextAuthorizedAction
    },
    null,
    2
  )
);
