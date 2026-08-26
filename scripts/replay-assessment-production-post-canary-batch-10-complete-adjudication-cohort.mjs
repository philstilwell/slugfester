#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { validatePostCanaryBatch10DisputeAdjudicationOutput } from
  "./lib/assessment-production-post-canary-batch-10-dispute-adjudication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-10/dispute-only-adjudication";
const outputPath = `${root}/failure-recovery/cohort-analysis.json`;
const debates = ["21", "74", "107", "142", "123", "177", "68", "147", "61", "130"];
const resumedDebates = ["142", "123", "177", "68", "147", "61", "130"];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const correction2Path = `${root}/failure-recovery/correction-2/analysis.json`;
const originalExecutionPath = `${root}/model-execution.json`;
const resumptionExecutionPath = `${root}/failure-recovery/resumption/model-execution.json`;
const [correction2Bytes, originalExecutionBytes, resumptionExecutionBytes] =
  await Promise.all([
    correction2Path,
    originalExecutionPath,
    resumptionExecutionPath
  ].map((file) => readFile(file)));
const correction2 = JSON.parse(correction2Bytes);
const originalExecution = JSON.parse(originalExecutionBytes);
const resumptionExecution = JSON.parse(resumptionExecutionBytes);

assertV4(
  correction2.status ===
    "passed-batch-10-debate-74-field-disjoint-adjudication-correction-2-and-merge" &&
  originalExecution.results.length === 3 &&
  originalExecution.results.find((item) => item.debateNumber === "21")?.status ===
    "completed-valid" &&
  originalExecution.results.find((item) => item.debateNumber === "107")?.status ===
    "completed-valid" &&
  originalExecution.results.find((item) => item.debateNumber === "74")?.status ===
    "output-validation-failed" &&
  resumptionExecution.status ===
    "seven-post-canary-batch-10-dispute-only-adjudication-resumption-contexts-passed" &&
  resumptionExecution.validContexts === 7 &&
  resumptionExecution.invalidContexts === 0 &&
  resumptionExecution.results.map((item) => item.debateNumber).join(",") ===
    resumedDebates.join(","),
  "Batch 10 adjudication provenance changed"
);

const contexts = [];
const sourceHashes = {
  [correction2Path]: sha256(correction2Bytes),
  [originalExecutionPath]: sha256(originalExecutionBytes),
  [resumptionExecutionPath]: sha256(resumptionExecutionBytes)
};
for (const debateNumber of debates) {
  const packetPath = `${root}/packets/debate-${debateNumber}.json`;
  const debateOutputPath = `${root}/outputs/debate-${debateNumber}.json`;
  const [packetBytes, debateOutputBytes] = await Promise.all([
    readFile(packetPath),
    readFile(debateOutputPath)
  ]);
  const validation = validatePostCanaryBatch10DisputeAdjudicationOutput(
    JSON.parse(debateOutputBytes),
    JSON.parse(packetBytes)
  );
  assertV4(
    validation.status === "passed" && validation.calculatedScores === 0,
    `Debate ${debateNumber}: complete cohort replay failed`
  );
  sourceHashes[packetPath] = sha256(packetBytes);
  sourceHashes[debateOutputPath] = sha256(debateOutputBytes);
  contexts.push({
    debateNumber,
    status: "accepted",
    packet: packetPath,
    packetSha256: sha256(packetBytes),
    output: debateOutputPath,
    outputSha256: sha256(debateOutputBytes),
    route: debateNumber === "74"
      ? "retained-passed-shard-01-plus-correction-2-merge"
      : ["21", "107"].includes(debateNumber)
        ? "original-ramp"
        : "seven-context-resumption",
    disputedMoves: validation.disputedMoves,
    candidateSelections: validation.candidateSelections,
    calculatedScores: validation.calculatedScores
  });
}
assertV4(
  contexts.reduce((sum, item) => sum + item.disputedMoves, 0) === 177 &&
  contexts.reduce((sum, item) => sum + item.candidateSelections, 0) === 483,
  "Batch 10 complete adjudication totals changed"
);

const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-10-complete-adjudication-cohort-replay",
  status:
    "passed-complete-batch-10-adjudication-cohort-after-authorized-debate-74-correction-2-standing-authorization-active-for-final-ledger-assembly",
  analyzedAt: new Date().toISOString(),
  productionCanary: false,
  batchNumber: 10,
  stagingOnly: true,
  contexts,
  gate: {
    passed: true,
    debateOutputsAccepted: 10,
    correctedDebates: 1,
    originalRampDebates: 2,
    ordinaryResumptionDebates: 7,
    disputedMovesDecided: 177,
    candidateSelections: 483,
    calculatedScores: 0,
    totalModelContextsExecuted: 14,
    acceptedModelContextsContributing: 12,
    preservedFailedModelContexts: 2,
    retries: 0,
    timeoutExtensions: 0
  },
  correctionAccounting: {
    debate74: {
      originalFailedContexts: 1,
      firstCorrectionContexts: 2,
      firstCorrectionPassedContexts: 1,
      firstCorrectionFailedContexts: 1,
      correction2Contexts: 2,
      failedOriginalOutputReused: false,
      failedFirstCorrectionShard02Reused: false,
      retainedPassedFirstCorrectionShard01: true
    },
    secondFailuresOfCorrection2Contexts: 0
  },
  evidenceBoundary: {
    scoreBlind: true,
    calculatedScores: 0,
    judgmentModelsExecutedThisStage: 0,
    paidServices: 0,
    legacyScoresAvailableToModels: false
  },
  sourceHashes,
  authorization: {
    finalLedgerAssembly: true,
    scoreDerivation: false,
    modelExecution: false,
    paidServices: false
  },
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: "assemble-validate-freeze-batch-10-final-ledgers"
};
if (shouldWrite) {
  await writeFile(outputPath, `${JSON.stringify(analysis, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: analysis.status,
  debateOutputsAccepted: 10,
  correctedDebates: 1,
  originalRampDebates: 2,
  ordinaryResumptionDebates: 7,
  disputedMoves: 177,
  candidateSelections: 483,
  totalModelContextsExecuted: 14,
  retries: 0,
  scoresDerived: 0,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction
}, null, 2));
