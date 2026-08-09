#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  PRODUCTION_CANARY_FINAL_LEDGER_ROOT,
  loadProductionCanaryFinalLedgerInputs,
  validateProductionCanaryFinalLedger,
} from "./lib/assessment-production-canary-final-ledger.mjs";

const shouldWrite = process.argv.includes("--write");
const ledgerPath = `${PRODUCTION_CANARY_FINAL_LEDGER_ROOT}/final-ledger.json`;
const analysisPath = `${PRODUCTION_CANARY_FINAL_LEDGER_ROOT}/analysis.json`;
const ledger = JSON.parse(await readFile(path.resolve(ledgerPath), "utf8"));
const inputs = await loadProductionCanaryFinalLedgerInputs();
const validation = validateProductionCanaryFinalLedger(
  ledger,
  inputs.debateInputs,
  inputs.sourceHashes
);
const roundedMeanPopulation =
  validation.roundedMeanMerges + validation.dependencyMeanMergesSuppressed;
const passed =
  validation.status === "passed" &&
  validation.debates === 10 &&
  validation.disputedMoves === 178 &&
  validation.candidateSelections === 504 &&
  roundedMeanPopulation === 392 &&
  validation.audioVerifiedMoves === 4 &&
  validation.calculatedScores === 0;
const analysis = {
  schemaVersion: "1.0-production-canary-final-ledger-analysis",
  protocolId: ledger.protocolId,
  status: passed
    ? "production-canary-deterministic-final-ledger-gate-passed"
    : "production-canary-deterministic-final-ledger-gate-failed",
  productionCanary: true,
  stagingOnly: true,
  AIOnly: true,
  validation,
  integrity: {
    bothPassesRevalidatedAgainstFullLocalTranscriptChain: true,
    disagreementsReplayedExactly: true,
    candidateAnonymizationAndProvenanceReplayedExactly: true,
    adjudicationSelectionsReplayedExactly: true,
    finalRawJudgmentsRevalidatedAgainstFullSourceChain: true,
    localTranscriptFilesHashLocked: true,
    audioVerificationAndRawDiarizedTranscriptHashesLockedWhereRequired: true,
    combinedAudioAttributionResolutionReplayed: true,
    modelScoresPresent: false,
    repositoryScoresPresent: false,
  },
  totals: {
    debates: 10,
    disputedMoves: validation.disputedMoves,
    candidateSelections: validation.candidateSelections,
    roundedMeanPopulation,
    dependencyMeanMergesSuppressed:
      validation.dependencyMeanMergesSuppressed,
    audioVerifiedMoves: validation.audioVerifiedMoves,
    modelContexts: 0,
    retries: 0,
    calculatedScores: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsdThisStage: 0,
  },
  authorization: {
    scoreDerivation: passed,
    scorePassesMaximum: passed ? 1 : 0,
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
      debates: 10,
      disputedMoves: analysis.totals.disputedMoves,
      candidateSelections: analysis.totals.candidateSelections,
      roundedMeanPopulation: analysis.totals.roundedMeanPopulation,
      audioVerifiedMoves: analysis.totals.audioVerifiedMoves,
      calculatedScores: 0,
      nextAuthorized: passed
        ? "single-deterministic-score-pass"
        : "failure-diagnosis-only",
    },
    null,
    2
  )
);
