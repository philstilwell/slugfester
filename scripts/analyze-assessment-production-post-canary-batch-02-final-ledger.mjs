#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_02_FINAL_LEDGER_ROOT,
  loadPostCanaryBatch02FinalLedgerInputs,
  validatePostCanaryBatch02FinalLedger
} from "./lib/assessment-production-post-canary-batch-02-final-ledger.mjs";

const shouldWrite = process.argv.includes("--write");
const analyzedIndex = process.argv.indexOf("--analyzed-at");
const analyzedAt =
  analyzedIndex >= 0 ? process.argv[analyzedIndex + 1] : new Date().toISOString();
if (Number.isNaN(Date.parse(analyzedAt))) {
  throw new Error("--analyzed-at requires an ISO timestamp");
}
const ledgerPath = `${POST_CANARY_BATCH_02_FINAL_LEDGER_ROOT}/final-ledger.json`;
const manifestPath =
  `${POST_CANARY_BATCH_02_FINAL_LEDGER_ROOT}/final-ledger-manifest.json`;
const analysisPath = `${POST_CANARY_BATCH_02_FINAL_LEDGER_ROOT}/analysis.json`;
const [ledger, manifest] = await Promise.all(
  [ledgerPath, manifestPath].map((file) =>
    readFile(path.resolve(file), "utf8").then(JSON.parse)
  )
);
const inputs = await loadPostCanaryBatch02FinalLedgerInputs();
const validation = validatePostCanaryBatch02FinalLedger(
  ledger,
  inputs.debateInputs,
  inputs.sourceHashes
);
const roundedMeanPopulation =
  validation.roundedMeanMerges + validation.dependencyMeanMergesSuppressed;
const passed =
  validation.status === "passed" &&
  validation.debates === 10 &&
  validation.finalMoves === 190 &&
  validation.disputedMoves === 182 &&
  validation.candidateSelections === 535 &&
  roundedMeanPopulation === 393 &&
  validation.audioVerifiedMoves === 10 &&
  validation.acceptedAdjudicationOutputsWithoutCorrection === 10 &&
  validation.calculatedScores === 0 &&
  validation.scoreDerivationAuthorized === false;
const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-02-final-ledger-analysis",
  protocolId: ledger.protocolId,
  status: passed
    ? "post-canary-batch-02-deterministic-final-ledger-gate-passed"
    : "post-canary-batch-02-deterministic-final-ledger-gate-failed",
  analyzedAt,
  productionCanary: false,
  batchNumber: 2,
  stagingOnly: true,
  developmentValidationOnly: false,
  AIOnly: true,
  userAuthorization: structuredClone(manifest.userAuthorization),
  validation,
  integrity: {
    bothPassesRevalidatedAgainstFullLocalTranscriptChain: true,
    disagreementsReplayedExactly: true,
    candidateAnonymizationAndProvenanceReplayedExactly: true,
    adjudicationSelectionsReplayedExactly: true,
    allAcceptedAdjudicationOutputsReplayedWithoutCorrection: true,
    finalRawJudgmentsRevalidatedAgainstFullSourceChain: true,
    localTranscriptFilesHashLocked: true,
    audioVerificationAndRawDiarizedTranscriptHashesLockedWhereRequired: true,
    dependencyPairOwnershipAppliedBeforeRoundedMean: true,
    rawAdjudicationOutputsPreserved: true,
    modelScoresPresent: false,
    repositoryScoresPresent: false
  },
  totals: {
    debates: validation.debates,
    finalMoves: validation.finalMoves,
    disputedMoves: validation.disputedMoves,
    candidateSelections: validation.candidateSelections,
    pairSelections: ledger.audit.pairSelections,
    scoringFieldSelections: ledger.audit.scoringFieldSelections,
    burdenAdjustmentSelections: ledger.audit.burdenAdjustmentSelections,
    roundedMeanPopulation,
    dependencyMeanMergesSuppressed:
      validation.dependencyMeanMergesSuppressed,
    audioVerifiedMoves: validation.audioVerifiedMoves,
    modelContextsThisStage: 0,
    paidServiceCallsThisStage: 0,
    retriesThisStage: 0,
    finalLedgersAssembled: validation.debates,
    calculatedScores: 0,
    publicationReconstructions: 0,
    productionMutations: 0,
    nextBatchSelections: 0,
    directIncrementalCostUsd: 0
  },
  authorization: {
    scorePassManifestPreparation: false,
    scoreDerivation: false,
    modelExecution: false,
    paidServices: false,
    publicationReconstruction: false,
    publicationModelExecution: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: passed
    ? "user-approval-required-before-batch-02-single-deterministic-score-pass-preparation"
    : "user-approval-required-before-batch-02-final-ledger-failure-diagnosis-only"
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
      debates: analysis.totals.debates,
      finalMoves: analysis.totals.finalMoves,
      disputedMoves: analysis.totals.disputedMoves,
      candidateSelections: analysis.totals.candidateSelections,
      roundedMeanPopulation: analysis.totals.roundedMeanPopulation,
      audioVerifiedMoves: analysis.totals.audioVerifiedMoves,
      modelContextsThisStage: 0,
      paidServiceCallsThisStage: 0,
      calculatedScores: 0,
      directIncrementalCostUsd: 0,
      nextAuthorizedAction: analysis.nextAuthorizedAction
    },
    null,
    2
  )
);
