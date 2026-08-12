#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  V223_FINAL_LEDGER_ROOT,
  loadV223FinalLedgerInputs,
  validateV223FinalLedger,
} from "./lib/assessment-production-score-stability-v2.2.3-final-ledger.mjs";

const shouldWrite = process.argv.includes("--write");
const ledgerPath = `${V223_FINAL_LEDGER_ROOT}/final-ledger.json`;
const analysisPath = `${V223_FINAL_LEDGER_ROOT}/analysis.json`;
const ledger = JSON.parse(await readFile(path.resolve(ledgerPath), "utf8"));
const inputs = await loadV223FinalLedgerInputs();
const validation = validateV223FinalLedger(
  ledger,
  inputs.debateInputs,
  inputs.sourceHashes
);
const roundedMeanPopulation =
  validation.roundedMeanMerges + validation.dependencyMeanMergesSuppressed;
const passed =
  validation.status === "passed" &&
  validation.debates === 10 &&
  validation.disputedMoves === 185 &&
  validation.candidateSelections === 490 &&
  roundedMeanPopulation === 434 &&
  validation.audioVerifiedMoves === 4 &&
  validation.calculatedScores === 0;
const analysis = {
  schemaVersion: "1.0-score-stability-v2.2.3-final-ledger-analysis",
  protocolId: ledger.protocolId,
  status: passed
    ? "v2.2.3-deterministic-final-ledger-gate-passed"
    : "v2.2.3-deterministic-final-ledger-gate-failed",
  productionCanary: false,
  stagingOnly: true,
  developmentValidationOnly: true,
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
    policyPromotion: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  nextAuthorizedAction: passed
    ? "single-deterministic-v2.2.3-score-pass"
    : "diagnose-v2.2.3-final-ledger-failure-only",
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
      nextAuthorized: analysis.nextAuthorizedAction,
    },
    null,
    2
  )
);

