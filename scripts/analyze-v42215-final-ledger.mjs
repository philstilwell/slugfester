#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  loadV42215FinalLedgerInputs,
  validateV42215FinalLedger,
  V42215_FINAL_LEDGER_ROOT
} from "./lib/v42215-final-ledger.mjs";

const shouldWrite = process.argv.includes("--write");
const ledgerPath = `${V42215_FINAL_LEDGER_ROOT}/final-ledger.json`;
const analysisPath = `${V42215_FINAL_LEDGER_ROOT}/analysis.json`;
const ledger = JSON.parse(await readFile(path.resolve(ledgerPath), "utf8"));
const inputs = await loadV42215FinalLedgerInputs();
const validation = validateV42215FinalLedger(ledger, inputs.debateInputs, inputs.sourceHashes);
const passed =
  validation.status === "passed" &&
  validation.debates === 3 &&
  validation.disputedMoves === 34 &&
  validation.candidateSelections === 160 &&
  validation.roundedMeanMerges + validation.dependencyMeanMergesSuppressed === 64 &&
  validation.audioVerifiedMoves === 5 &&
  validation.calculatedScores === 0;
const analysis = {
  schemaVersion: "4.2.21.5-final-ledger-analysis",
  protocolId: ledger.protocolId,
  status: passed ? "deterministic-final-ledger-gate-passed" : "deterministic-final-ledger-gate-failed",
  calibrationOnly: true,
  AIOnly: true,
  validation,
  integrity: {
    bothPassesRevalidatedAgainstFullSourceChain: true,
    disagreementsReplayedExactly: true,
    candidateAnonymizationAndProvenanceReplayedExactly: true,
    adjudicationSelectionsReplayedExactly: true,
    finalRawJudgmentsRevalidatedAgainstFullSourceChain: true,
    audioVerificationLockedWhereRequired: true,
    modelScoresPresent: false,
    repositoryScoresPresent: false
  },
  totals: {
    debates: 3,
    disputedMoves: validation.disputedMoves,
    candidateSelections: validation.candidateSelections,
    roundedMeanPopulation:
      validation.roundedMeanMerges + validation.dependencyMeanMergesSuppressed,
    audioVerifiedMoves: validation.audioVerifiedMoves,
    modelContexts: 0,
    retries: 0,
    calculatedScores: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsdThisStage: 0
  },
  authorization: {
    scoreDerivation: passed,
    scorePassesMaximum: passed ? 1 : 0,
    publicationFinalization: false,
    productionMutation: false,
    heldOutGate: false,
    all195Debates: false
  }
};
if (shouldWrite) await writeFile(path.resolve(analysisPath), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      status: analysis.status,
      debates: 3,
      candidateSelections: analysis.totals.candidateSelections,
      roundedMeanPopulation: analysis.totals.roundedMeanPopulation,
      audioVerifiedMoves: analysis.totals.audioVerifiedMoves,
      calculatedScores: 0,
      nextAuthorized: passed ? "single-deterministic-score-pass" : "failure-diagnosis-only"
    },
    null,
    2
  )
);
