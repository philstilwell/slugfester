#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { validatePostCanaryBatch03DisputeAdjudicationOutput } from
  "./lib/assessment-production-post-canary-batch-03-dispute-adjudication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";
const shouldWrite = process.argv.includes("--write");
const root = "docs/assessment-production/post-canary-continuation-v1/batch-03/dispute-only-adjudication";
const outputPath = `${root}/failure-recovery/cohort-analysis.json`;
const debates = ["124","14","58","150","157","102","09","181","138","27"];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const correction124Path = `${root}/failure-recovery/correction-analysis.json`;
const correction27Path = `${root}/failure-recovery/debate-27-correction/analysis.json`;
const originalExecutionPath = `${root}/model-execution.json`;
const resumptionExecutionPath = `${root}/failure-recovery/resumption/model-execution.json`;
const [correction124Bytes, correction27Bytes, originalExecutionBytes, resumptionExecutionBytes] =
  await Promise.all([correction124Path, correction27Path, originalExecutionPath,
    resumptionExecutionPath].map((file) => readFile(file)));
const correction124 = JSON.parse(correction124Bytes);
const correction27 = JSON.parse(correction27Bytes);
const originalExecution = JSON.parse(originalExecutionBytes);
const resumptionExecution = JSON.parse(resumptionExecutionBytes);
assertV4(
  correction124.status ===
    "passed-batch-03-debate-124-field-disjoint-adjudication-correction-and-merge-successor" &&
  correction27.status === "passed-batch-03-debate-27-full-packet-adjudication-correction" &&
  originalExecution.results[0].status === "timed-out" &&
  resumptionExecution.validContexts === 8 && resumptionExecution.invalidContexts === 1 &&
  resumptionExecution.results.find((item) => item.debateNumber === "27").status ===
    "output-validation-failed",
  "Batch 3 correction provenance changed"
);
const contexts = [];
const sourceHashes = {
  [correction124Path]: sha256(correction124Bytes),
  [correction27Path]: sha256(correction27Bytes),
  [originalExecutionPath]: sha256(originalExecutionBytes),
  [resumptionExecutionPath]: sha256(resumptionExecutionBytes)
};
for (const debateNumber of debates) {
  const packetPath = `${root}/packets/debate-${debateNumber}.json`;
  const debateOutputPath = `${root}/outputs/debate-${debateNumber}.json`;
  const [packetBytes, debateOutputBytes] = await Promise.all([
    readFile(packetPath), readFile(debateOutputPath)
  ]);
  const validation = validatePostCanaryBatch03DisputeAdjudicationOutput(
    JSON.parse(debateOutputBytes), JSON.parse(packetBytes));
  assertV4(validation.status === "passed" && validation.calculatedScores === 0,
    `Debate ${debateNumber}: complete cohort replay failed`);
  sourceHashes[packetPath] = sha256(packetBytes);
  sourceHashes[debateOutputPath] = sha256(debateOutputBytes);
  contexts.push({
    debateNumber, status: "accepted", packet: packetPath,
    packetSha256: sha256(packetBytes), output: debateOutputPath,
    outputSha256: sha256(debateOutputBytes),
    route: debateNumber === "124" ? "field-disjoint-correction-merge-successor" :
      debateNumber === "27" ? "fresh-full-packet-correction" : "resumption",
    disputedMoves: validation.disputedMoves,
    candidateSelections: validation.candidateSelections,
    calculatedScores: validation.calculatedScores
  });
}
assertV4(contexts.reduce((sum, item) => sum + item.disputedMoves, 0) === 190 &&
  contexts.reduce((sum, item) => sum + item.candidateSelections, 0) === 586,
  "Batch 3 complete adjudication totals changed");
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-03-complete-adjudication-cohort-replay",
  status: "passed-complete-batch-03-adjudication-cohort-after-bounded-first-corrections-standing-authorization-active-for-final-ledger-assembly",
  analyzedAt: new Date().toISOString(), productionCanary: false, batchNumber: 3,
  stagingOnly: true, contexts,
  gate: {
    passed: true, debateOutputsAccepted: 10, correctedDebates: 2,
    ordinaryResumptionDebates: 8, disputedMovesDecided: 190,
    candidateSelections: 586, calculatedScores: 0,
    totalModelContextsExecuted: 13,
    acceptedModelContextsContributing: 11,
    preservedFailedModelContexts: 2,
    retries: 0, timeoutExtensions: 0
  },
  correctionAccounting: {
    debate124: { originalFailedContexts: 1, correctionContexts: 2,
      failedPartialOutputReused: false },
    debate27: { originalFailedContexts: 1, correctionContexts: 1,
      failedPartialOutputReused: false },
    secondFailuresOfCorrectedContexts: 0
  },
  evidenceBoundary: {
    scoreBlind: true, calculatedScores: 0, judgmentModelsExecutedThisStage: 0,
    paidServices: 0, legacyScoresAvailableToModels: false
  },
  sourceHashes,
  authorization: {
    finalLedgerAssembly: true, scoreDerivation: false,
    modelExecution: false, paidServices: false
  },
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: "assemble-validate-freeze-batch-03-final-ledgers"
};
if (shouldWrite) await writeFile(outputPath, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, debateOutputsAccepted: 10,
  correctedDebates: 2, disputedMoves: 190, candidateSelections: 586,
  totalModelContextsExecuted: 13, retries: 0, scoresDerived: 0,
  directIncrementalCostUsd: 0, nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
