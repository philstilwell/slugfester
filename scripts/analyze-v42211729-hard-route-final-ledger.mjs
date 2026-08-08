#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V42211729_ROOT, loadV42211729FinalLedgerInputs, validateV42211729FinalLedger } from "./lib/v42211729-hard-route-final-ledger.mjs";

const shouldWrite = process.argv.includes("--write");
const ledgerPath = `${V42211729_ROOT}/final-ledger.json`;
const analysisPath = `${V42211729_ROOT}/analysis.json`;
const ledger = JSON.parse(await readFile(path.resolve(ledgerPath), "utf8"));
const inputs = await loadV42211729FinalLedgerInputs();
const validation = validateV42211729FinalLedger(ledger, inputs.debateInputs, inputs.sourceHashes);
const roundedMeanPopulation = validation.roundedMeanMerges + validation.dependencyMeanMergesSuppressed;
const passed = validation.status === "passed" && validation.debates === 5 && validation.disputedMoves === 94 && validation.candidateSelections === 271 && roundedMeanPopulation === 287 && validation.audioVerifiedMoves === 3 && validation.calculatedScores === 0;
const analysis = {
  schemaVersion: "4.2.21.17.29-hard-route-final-ledger-analysis",
  protocolId: ledger.protocolId,
  status: passed ? "hard-route-deterministic-final-ledger-gate-passed" : "hard-route-deterministic-final-ledger-gate-failed",
  calibrationOnly: true,
  AIOnly: true,
  validation,
  integrity: { bothPassesRevalidatedAgainstFullLocalTranscriptChain: true, disagreementsReplayedExactly: true, candidateAnonymizationAndProvenanceReplayedExactly: true, adjudicationSelectionsReplayedExactly: true, finalRawJudgmentsRevalidatedAgainstFullSourceChain: true, localTranscriptFilesHashLocked: true, audioVerificationAndRawDiarizedTranscriptHashesLockedWhereRequired: true, modelScoresPresent: false, repositoryScoresPresent: false },
  totals: { debates: 5, disputedMoves: validation.disputedMoves, candidateSelections: validation.candidateSelections, roundedMeanPopulation, dependencyMeanMergesSuppressed: validation.dependencyMeanMergesSuppressed, audioVerifiedMoves: validation.audioVerifiedMoves, modelContexts: 0, retries: 0, calculatedScores: 0, meteredApiCostUsd: 0, transcriptionCostUsdThisStage: 0 },
  authorization: { scoreDerivation: passed, scorePassesMaximum: passed ? 1 : 0, publicationFinalization: false, productionMutation: false, all195Debates: false }
};
if (shouldWrite) await writeFile(path.resolve(analysisPath), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, debates: 5, disputedMoves: analysis.totals.disputedMoves, candidateSelections: analysis.totals.candidateSelections, roundedMeanPopulation: analysis.totals.roundedMeanPopulation, audioVerifiedMoves: analysis.totals.audioVerifiedMoves, calculatedScores: 0, nextAuthorized: passed ? "single-deterministic-score-pass" : "failure-diagnosis-only" }, null, 2));
