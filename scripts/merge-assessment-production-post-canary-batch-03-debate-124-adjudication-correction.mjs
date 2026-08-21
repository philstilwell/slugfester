#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { validatePostCanaryBatch03DisputeAdjudicationOutput } from
  "./lib/assessment-production-post-canary-batch-03-dispute-adjudication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const root = "docs/assessment-production/post-canary-continuation-v1/batch-03/dispute-only-adjudication";
const recovery = `${root}/failure-recovery`;
const activationPath = `${recovery}/correction-execution-activation.json`;
const executionPath = `${recovery}/correction-model-execution.json`;
const analysisPath = `${recovery}/correction-analysis.json`;
const [activationBytes, executionBytes] = await Promise.all([readFile(activationPath), readFile(executionPath)]);
const activation = JSON.parse(activationBytes);
const execution = JSON.parse(executionBytes);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(
  execution.status === "two-batch-03-debate-124-field-disjoint-adjudication-correction-contexts-passed" &&
    execution.contextsAttempted === 2 && execution.validContexts === 2 &&
    execution.retries === 0 && execution.timeoutExtensions === 0 &&
    execution.scoresDerived === 0,
  "Debate 124 correction execution did not pass"
);
const originalPacketBytes = await readFile(activation.mergePlan.originalPacket);
assertV4(sha256(originalPacketBytes) === activation.mergePlan.originalPacketSha256,
  "original Debate 124 packet changed");
const originalPacket = JSON.parse(originalPacketBytes);
const shardOutputs = [];
for (const context of activation.contexts) {
  const [packetBytes, outputBytes] = await Promise.all([readFile(context.packet), readFile(context.output)]);
  assertV4(sha256(packetBytes) === context.packetSha256, `${context.shardId}: packet changed`);
  const output = JSON.parse(outputBytes);
  const validation = validatePostCanaryBatch03DisputeAdjudicationOutput(output, JSON.parse(packetBytes));
  assertV4(validation.status === "passed" && validation.candidateSelections === context.candidateSelections,
    `${context.shardId}: correction output replay failed`);
  shardOutputs.push({ context, output, outputBytes, validation });
}
const first = shardOutputs[0].output;
const moveMap = new Map(shardOutputs.flatMap(({ output }) => output.moveDecisions)
  .map((decision) => [decision.moveId, decision]));
const burdenMap = new Map(shardOutputs.flatMap(({ output }) => output.burdenAdjustmentDecisions)
  .map((decision) => [decision.side, decision]));
assertV4(moveMap.size === 23 && burdenMap.size === 2,
  "Debate 124 correction decisions overlap or are incomplete");
const merged = {
  ...first,
  moveDecisions: activation.mergePlan.originalMoveOrder.map((moveId) => moveMap.get(moveId)),
  burdenAdjustmentDecisions:
    activation.mergePlan.originalBurdenOrder.map((side) => burdenMap.get(side))
};
assertV4(merged.moveDecisions.every(Boolean) && merged.burdenAdjustmentDecisions.every(Boolean),
  "Debate 124 original order cannot be restored");
const validation = validatePostCanaryBatch03DisputeAdjudicationOutput(merged, originalPacket);
assertV4(validation.status === "passed" && validation.candidateSelections === 67 &&
  validation.disputedMoves === 23 && validation.calculatedScores === 0,
  "merged Debate 124 correction failed original validation");
const mergedBytes = Buffer.from(`${JSON.stringify(merged, null, 2)}\n`);
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-03-debate-124-adjudication-correction-analysis",
  status: "passed-batch-03-debate-124-field-disjoint-adjudication-correction-and-merge",
  analyzedAt: new Date().toISOString(), productionCanary: false, batchNumber: 3, stagingOnly: true,
  debateNumber: "124",
  originalFailure: { acceptedOutputs: 0, failedPartialOutputReused: false },
  correction: {
    contexts: 2, attempts: 2, retries: 0, timeoutExtensions: 0,
    validContexts: 2, candidateSelections: 67, disputedMoves: 23,
    burdenAdjustmentDecisions: 2, mergedOutput: activation.mergePlan.mergedOutput,
    mergedOutputSha256: sha256(mergedBytes), validation
  },
  model: activation.model,
  sourceHashes: {
    [activationPath]: sha256(activationBytes),
    [executionPath]: sha256(executionBytes),
    [activation.mergePlan.originalPacket]: sha256(originalPacketBytes),
    ...Object.fromEntries(shardOutputs.map(({ context, outputBytes }) => [context.output, sha256(outputBytes)]))
  },
  protectedBoundary: {
    originalPacketPreserved: true, originalSchemaPreserved: true,
    originalValidatorMeaningPreserved: true, acceptedFieldsChanged: 0,
    scoresDerived: 0, paidServices: 0
  },
  authorization: {
    nineContextResumptionPreparation: true, adjudicationModelExecution: false,
    finalLedgerAssembly: false, scoreDerivation: false, paidServices: false
  },
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: "prepare-freeze-nine-unattempted-batch-03-adjudication-resumption-contexts"
};
if (shouldWrite) {
  await writeFile(activation.mergePlan.mergedOutput, mergedBytes);
  await writeFile(analysisPath, `${JSON.stringify(analysis, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? analysis.status : "preview",
  validCorrectionContexts: 2, disputedMoves: 23, candidateSelections: 67,
  mergedOutputSha256: analysis.correction.mergedOutputSha256,
  retries: 0, scoresDerived: 0, directIncrementalCostUsd: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
