#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { validatePostCanaryBatch04DisputeAdjudicationOutput } from
  "./lib/assessment-production-post-canary-batch-04-dispute-adjudication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";
const shouldWrite = process.argv.includes("--write");
const root = "docs/assessment-production/post-canary-continuation-v1/batch-04/dispute-only-adjudication";
const outputPath = `${root}/failure-recovery/cohort-analysis.json`;
const debates = ["127", "67", "85", "49", "186", "81", "148", "47", "03", "185"];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const correction185Path = `${root}/failure-recovery/debate-185-correction/analysis.json`;
const originalExecutionPath = `${root}/model-execution.json`;
const [correction185Bytes, originalExecutionBytes] = await Promise.all(
  [correction185Path, originalExecutionPath].map((file) => readFile(file))
);
const correction185 = JSON.parse(correction185Bytes);
const originalExecution = JSON.parse(originalExecutionBytes);
assertV4(
  correction185.status ===
      "passed-batch-04-debate-185-full-packet-adjudication-correction" &&
    originalExecution.contextsAttempted === 10 &&
    originalExecution.validContexts === 9 &&
    originalExecution.invalidContexts === 1 &&
    originalExecution.results.find((item) => item.debateNumber === "185")
      .status === "output-validation-failed",
  "Batch 4 Debate 185 correction provenance changed"
);
const contexts = [];
const sourceHashes = {
  [correction185Path]: sha256(correction185Bytes),
  [originalExecutionPath]: sha256(originalExecutionBytes)
};
for (const debateNumber of debates) {
  const packetPath = `${root}/packets/debate-${debateNumber}.json`;
  const debateOutputPath = `${root}/outputs/debate-${debateNumber}.json`;
  const [packetBytes, debateOutputBytes] = await Promise.all([
    readFile(packetPath), readFile(debateOutputPath)
  ]);
  const validation = validatePostCanaryBatch04DisputeAdjudicationOutput(
    JSON.parse(debateOutputBytes), JSON.parse(packetBytes));
  assertV4(validation.status === "passed" && validation.calculatedScores === 0,
    `Debate ${debateNumber}: complete cohort replay failed`);
  sourceHashes[packetPath] = sha256(packetBytes);
  sourceHashes[debateOutputPath] = sha256(debateOutputBytes);
  contexts.push({
    debateNumber, status: "accepted", packet: packetPath,
    packetSha256: sha256(packetBytes), output: debateOutputPath,
    outputSha256: sha256(debateOutputBytes),
    route:
      debateNumber === "185"
        ? "fresh-full-packet-correction"
        : "original-execution",
    disputedMoves: validation.disputedMoves,
    candidateSelections: validation.candidateSelections,
    calculatedScores: validation.calculatedScores
  });
}
assertV4(contexts.reduce((sum, item) => sum + item.disputedMoves, 0) === 196 &&
  contexts.reduce((sum, item) => sum + item.candidateSelections, 0) === 582,
  "Batch 4 complete adjudication totals changed");
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-04-complete-adjudication-cohort-replay",
  status: "passed-complete-batch-04-adjudication-cohort-after-bounded-first-correction-standing-authorization-active-for-final-ledger-assembly",
  analyzedAt: new Date().toISOString(), productionCanary: false, batchNumber: 4,
  stagingOnly: true, contexts,
  gate: {
    passed: true, debateOutputsAccepted: 10, correctedDebates: 1,
    ordinaryOriginalExecutionDebates: 9, disputedMovesDecided: 196,
    candidateSelections: 582, calculatedScores: 0,
    totalModelContextsExecuted: 11,
    acceptedModelContextsContributing: 10,
    preservedFailedModelContexts: 1,
    retries: 0, timeoutExtensions: 0
  },
  correctionAccounting: {
    debate185: { originalFailedContexts: 1, correctionContexts: 1,
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
  nextAuthorizedAction: "assemble-validate-freeze-batch-04-final-ledgers"
};
if (shouldWrite) await writeFile(outputPath, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, debateOutputsAccepted: 10,
  correctedDebates: 1, disputedMoves: 196, candidateSelections: 582,
  totalModelContextsExecuted: 11, retries: 0, scoresDerived: 0,
  directIncrementalCostUsd: 0, nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
