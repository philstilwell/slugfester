#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { validatePostCanaryBatch03DisputeAdjudicationOutput } from
  "./lib/assessment-production-post-canary-batch-03-dispute-adjudication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";
const shouldWrite = process.argv.includes("--write");
const root = "docs/assessment-production/post-canary-continuation-v1/batch-03/dispute-only-adjudication";
const resumption = `${root}/failure-recovery/resumption`;
const activationPath = `${resumption}/execution-activation.json`;
const executionPath = `${resumption}/model-execution.json`;
const analysisPath = `${resumption}/analysis.json`;
const [activationBytes, executionBytes] = await Promise.all([readFile(activationPath), readFile(executionPath)]);
const activation = JSON.parse(activationBytes);
const execution = JSON.parse(executionBytes);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(execution.status ===
  "nine-post-canary-batch-03-dispute-only-adjudication-resumption-contexts-passed" &&
  execution.validContexts === 9 && execution.retries === 0 &&
  execution.timeoutExtensions === 0 && execution.scoresDerived === 0,
  "nine-context resumption did not pass");
const contexts = [];
for (const context of activation.contexts) {
  const [packetBytes, outputBytes] = await Promise.all([readFile(context.packet), readFile(context.output)]);
  assertV4(sha256(packetBytes) === context.packetSha256,
    `${context.debateNumber}: packet changed`);
  const validation = validatePostCanaryBatch03DisputeAdjudicationOutput(
    JSON.parse(outputBytes), JSON.parse(packetBytes));
  assertV4(validation.status === "passed" &&
    validation.candidateSelections === context.candidateSelections,
    `${context.debateNumber}: resumption replay failed`);
  contexts.push({ debateNumber: context.debateNumber, debateId: context.debateId,
    status: "accepted-resumption", output: context.output,
    outputSha256: sha256(outputBytes), disputedMoves: validation.disputedMoves,
    candidateSelections: validation.candidateSelections,
    audioTranscriptInputs: context.audioTranscriptInputs.length });
}
const [correctionBytes, correctionPacketBytes] = await Promise.all([
  readFile(activation.acceptedCorrection.output),
  readFile(`${root}/packets/debate-124.json`)
]);
const correctionValidation = validatePostCanaryBatch03DisputeAdjudicationOutput(
  JSON.parse(correctionBytes), JSON.parse(correctionPacketBytes));
assertV4(correctionValidation.status === "passed" &&
  correctionValidation.candidateSelections === 67, "accepted Debate 124 correction changed");
const allContexts = [
  { debateNumber: "124", debateId: JSON.parse(correctionPacketBytes).debateId,
    status: "accepted-correction", output: activation.acceptedCorrection.output,
    outputSha256: sha256(correctionBytes), disputedMoves: 23,
    candidateSelections: 67, audioTranscriptInputs: 2 },
  ...contexts
];
const passed = allContexts.length === 10 &&
  allContexts.reduce((sum, item) => sum + item.disputedMoves, 0) === 190 &&
  allContexts.reduce((sum, item) => sum + item.candidateSelections, 0) === 586 &&
  allContexts.reduce((sum, item) => sum + item.audioTranscriptInputs, 0) === 8;
assertV4(passed, "complete Batch 3 adjudication cohort replay failed");
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-03-dispute-only-adjudication-resumption-analysis",
  status: "post-canary-batch-03-dispute-only-adjudication-gate-passed-after-correction-and-resumption-standing-authorization-active-for-final-ledger-assembly",
  analyzedAt: new Date().toISOString(), productionCanary: false, batchNumber: 3,
  stagingOnly: true, contexts: allContexts,
  gate: {
    passed: true, validContexts: 10, correctedContexts: 1, resumedContexts: 9,
    disputedMovesDecided: 190, candidateSelections: 586,
    audioTranscriptInputs: 8, attempts: 11, retries: 0,
    timeoutExtensions: 0, scoresDerived: 0
  },
  model: activation.model,
  evidenceBoundary: {
    scoreBlind: true, failedPartialOutputReused: false,
    passIdentitiesUnavailable: true, calculatedScores: 0,
    judgmentModelContexts: 0, paidServices: 0
  },
  sourceHashes: {
    [activationPath]: sha256(activationBytes), [executionPath]: sha256(executionBytes),
    [activation.acceptedCorrection.output]: sha256(correctionBytes),
    ...Object.fromEntries(contexts.map((item) => [item.output, item.outputSha256]))
  },
  authorization: {
    finalLedgerAssembly: true, scoreDerivation: false,
    modelExecution: false, paidServices: false
  },
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: "assemble-validate-freeze-batch-03-final-ledgers"
};
if (shouldWrite) await writeFile(analysisPath, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, validContexts: 10,
  correctedContexts: 1, resumedContexts: 9, disputedMoves: 190,
  candidateSelections: 586, retries: 0, scoresDerived: 0,
  directIncrementalCostUsd: 0, nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
