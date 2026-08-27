#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_13_FINAL_LEDGER_ROOT,
  loadPostCanaryBatch13FinalLedgerInputs,
  validatePostCanaryBatch13FinalLedger
} from "./lib/assessment-production-post-canary-batch-13-final-ledger.mjs";

const shouldWrite = process.argv.includes("--write");
const analyzedIndex = process.argv.indexOf("--analyzed-at");
const analyzedAt =
  analyzedIndex >= 0 ? process.argv[analyzedIndex + 1] : new Date().toISOString();
if (Number.isNaN(Date.parse(analyzedAt))) {
  throw new Error("--analyzed-at requires an ISO timestamp");
}
const ledgerPath = `${POST_CANARY_BATCH_13_FINAL_LEDGER_ROOT}/final-ledger.json`;
const manifestPath =
  `${POST_CANARY_BATCH_13_FINAL_LEDGER_ROOT}/final-ledger-manifest.json`;
const analysisPath = `${POST_CANARY_BATCH_13_FINAL_LEDGER_ROOT}/analysis.json`;
const [ledger, manifest] = await Promise.all(
  [ledgerPath, manifestPath].map((file) =>
    readFile(path.resolve(file), "utf8").then(JSON.parse)
  )
);
const inputs = await loadPostCanaryBatch13FinalLedgerInputs();
const validation = validatePostCanaryBatch13FinalLedger(
  ledger,
  inputs.debateInputs,
  inputs.sourceHashes
);
const roundedMeanPopulation =
  validation.roundedMeanMerges + validation.dependencyMeanMergesSuppressed;
const passed =
  validation.status === "passed" &&
  validation.debates === 10 &&
  validation.finalMoves === 199 &&
  validation.disputedMoves === 191 &&
  validation.candidateSelections === 541 &&
  roundedMeanPopulation === 440 &&
  validation.audioVerifiedMoves === 8 &&
  validation.acceptedAdjudicationOutputsWithoutCorrection === 10 &&
  validation.calculatedScores === 0 &&
  validation.scoreDerivationAuthorized === false;
const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-13-final-ledger-analysis",
  protocolId: ledger.protocolId,
  status: passed
    ? "post-canary-batch-13-deterministic-final-ledger-gate-passed"
    : "post-canary-batch-13-deterministic-final-ledger-gate-failed",
  analyzedAt,
  productionCanary: false,
  batchNumber: 13,
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
    acceptedAdjudicationOutputsAndBoundedCorrectionsAuthenticated: true,
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
    ? "standing-authorization-permits-batch-13-single-deterministic-score-pass-preparation"
    : "standing-authorization-permits-batch-13-final-ledger-diagnosis"
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
