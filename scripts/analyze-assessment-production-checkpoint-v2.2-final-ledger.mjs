#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  CHECKPOINT_V22_FINAL_LEDGER_ROOT,
  loadCheckpointV22FinalLedgerInputs,
  validateCheckpointV22FinalLedger
} from "./lib/assessment-production-checkpoint-v2.2-final-ledger.mjs";

const shouldWrite = process.argv.includes("--write");
const ledgerPath = `${CHECKPOINT_V22_FINAL_LEDGER_ROOT}/final-ledger.json`;
const analysisPath = `${CHECKPOINT_V22_FINAL_LEDGER_ROOT}/analysis.json`;
const ledger = JSON.parse(await readFile(path.resolve(ledgerPath), "utf8"));
const inputs = await loadCheckpointV22FinalLedgerInputs();
const validation = validateCheckpointV22FinalLedger(
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
  validation.candidateSelections === 507 &&
  roundedMeanPopulation === 403 &&
  validation.audioVerifiedMoves === 2 &&
  validation.calculatedScores === 0;
const analysis = {
  schemaVersion: "1.0-production-checkpoint-v2.2-final-ledger-analysis",
  protocolId: ledger.protocolId,
  status: passed
    ? "production-checkpoint-v2.2-deterministic-final-ledger-gate-passed"
    : "production-checkpoint-v2.2-deterministic-final-ledger-gate-failed",
  productionCanary: true,
  stagingOnly: true,
  developmentValidationOnly: false,
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
    dependencyPairOwnershipAppliedBeforeRoundedMean: true,
    modelScoresPresent: false,
    repositoryScoresPresent: false
  },
  totals: {
    debates: validation.debates,
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
    transcriptionCostUsdThisStage: 0
  },
  authorization: {
    scorePassManifestPreparation: passed,
    scoreDerivation: false,
    scorePassesMaximum: passed ? 1 : 0,
    policyPromotion: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  nextAuthorizedAction: passed
    ? "prepare-and-freeze-single-deterministic-production-checkpoint-v2.2-score-pass"
    : "diagnose-production-checkpoint-v2.2-final-ledger-failure-only"
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
      disputedMoves: analysis.totals.disputedMoves,
      candidateSelections: analysis.totals.candidateSelections,
      roundedMeanPopulation: analysis.totals.roundedMeanPopulation,
      dependencyMeanMergesSuppressed:
        analysis.totals.dependencyMeanMergesSuppressed,
      audioVerifiedMoves: analysis.totals.audioVerifiedMoves,
      calculatedScores: 0,
      meteredApiCostUsd: 0,
      nextAuthorized: analysis.nextAuthorizedAction
    },
    null,
    2
  )
);
