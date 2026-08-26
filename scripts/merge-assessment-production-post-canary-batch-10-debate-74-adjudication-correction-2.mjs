#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { validatePostCanaryBatch10DisputeAdjudicationOutput } from
  "./lib/assessment-production-post-canary-batch-10-dispute-adjudication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const root = "docs/assessment-production/post-canary-continuation-v1/batch-10/dispute-only-adjudication";
const recovery = `${root}/failure-recovery/correction-2`;
const activationPath = `${recovery}/execution-activation.json`;
const executionPath = `${recovery}/model-execution.json`;
const analysisPath = `${recovery}/analysis.json`;
const [activationBytes, executionBytes] = await Promise.all([readFile(activationPath), readFile(executionPath)]);
const activation = JSON.parse(activationBytes);
const execution = JSON.parse(executionBytes);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(
  execution.status === "two-batch-10-debate-74-field-disjoint-adjudication-correction-2-contexts-passed" &&
    execution.contextsAttempted === 2 && execution.validContexts === 2 &&
    execution.retries === 0 && execution.timeoutExtensions === 0 &&
    execution.scoresDerived === 0,
  "Debate 74 correction-2 execution did not pass"
);
const originalPacketBytes = await readFile(activation.mergePlan.originalPacket);
assertV4(sha256(originalPacketBytes) === activation.mergePlan.originalPacketSha256,
  "original Debate 74 packet changed");
const originalPacket = JSON.parse(originalPacketBytes);
const retainedPacketBytes = await readFile(
  activation.predecessor.retainedShard01Packet
);
const retainedOutputBytes = await readFile(
  activation.predecessor.retainedShard01Output
);
assertV4(
  sha256(retainedPacketBytes) ===
      activation.predecessor.retainedShard01PacketSha256 &&
    sha256(retainedOutputBytes) ===
      activation.predecessor.retainedShard01OutputSha256,
  "retained Debate 74 shard-01 evidence changed"
);
const retainedOutput = JSON.parse(retainedOutputBytes);
const retainedValidation = validatePostCanaryBatch10DisputeAdjudicationOutput(
  retainedOutput,
  JSON.parse(retainedPacketBytes)
);
assertV4(
  retainedValidation.status === "passed" &&
    retainedValidation.candidateSelections === 26,
  "retained Debate 74 shard-01 replay failed"
);
const shardOutputs = [];
for (const context of activation.contexts) {
  const [packetBytes, outputBytes] = await Promise.all([readFile(context.packet), readFile(context.output)]);
  assertV4(sha256(packetBytes) === context.packetSha256, `${context.shardId}: packet changed`);
  const output = JSON.parse(outputBytes);
  const validation = validatePostCanaryBatch10DisputeAdjudicationOutput(output, JSON.parse(packetBytes));
  assertV4(validation.status === "passed" && validation.candidateSelections === context.candidateSelections,
    `${context.shardId}: correction output replay failed`);
  shardOutputs.push({ context, output, outputBytes, validation });
}
const acceptedOutputs = [retainedOutput, ...shardOutputs.map(({ output }) => output)];
const first = retainedOutput;
const moveMap = new Map(acceptedOutputs.flatMap((output) => output.moveDecisions)
  .map((decision) => [decision.moveId, decision]));
const burdenMap = new Map(acceptedOutputs.flatMap((output) => output.burdenAdjustmentDecisions)
  .map((decision) => [decision.side, decision]));
assertV4(moveMap.size === 19 && burdenMap.size === 2,
  "Debate 74 correction decisions overlap or are incomplete");
const merged = {
  ...first,
  moveDecisions: activation.mergePlan.originalMoveOrder.map((moveId) => moveMap.get(moveId)),
  burdenAdjustmentDecisions:
    activation.mergePlan.originalBurdenOrder.map((side) => burdenMap.get(side))
};
assertV4(merged.moveDecisions.every(Boolean) && merged.burdenAdjustmentDecisions.every(Boolean),
  "Debate 74 original order cannot be restored");
const validation = validatePostCanaryBatch10DisputeAdjudicationOutput(merged, originalPacket);
assertV4(validation.status === "passed" && validation.candidateSelections === 52 &&
  validation.disputedMoves === 19 && validation.calculatedScores === 0,
  "merged Debate 74 correction failed original validation");
const mergedBytes = Buffer.from(`${JSON.stringify(merged, null, 2)}\n`);
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-10-debate-74-adjudication-correction-2-analysis",
  status: "passed-batch-10-debate-74-field-disjoint-adjudication-correction-2-and-merge",
  analyzedAt: new Date().toISOString(), productionCanary: false, batchNumber: 10, stagingOnly: true,
  debateNumber: "74",
  originalFailure: {
    retainedPassedShard01: true,
    failedShard02OutputReused: false
  },
  correction: {
    contexts: 2, attempts: 2, retries: 0, timeoutExtensions: 0,
    validContexts: 2, replacementCandidateSelections: 26,
    retainedCandidateSelections: 26, candidateSelections: 52, disputedMoves: 19,
    burdenAdjustmentDecisions: 2, mergedOutput: activation.mergePlan.mergedOutput,
    mergedOutputSha256: sha256(mergedBytes), validation
  },
  model: activation.model,
  sourceHashes: {
    [activationPath]: sha256(activationBytes),
    [executionPath]: sha256(executionBytes),
    [activation.mergePlan.originalPacket]: sha256(originalPacketBytes),
    [activation.predecessor.retainedShard01Packet]: sha256(retainedPacketBytes),
    [activation.predecessor.retainedShard01Output]: sha256(retainedOutputBytes),
    ...Object.fromEntries(shardOutputs.map(({ context, outputBytes }) => [context.output, sha256(outputBytes)]))
  },
  protectedBoundary: {
    originalPacketPreserved: true, originalSchemaPreserved: true,
    originalValidatorMeaningPreserved: true, acceptedFieldsChanged: 0,
    scoresDerived: 0, paidServices: 0
  },
  authorization: {
    sevenContextResumptionPreparation: true, adjudicationModelExecution: false,
    finalLedgerAssembly: false, scoreDerivation: false, paidServices: false
  },
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: "prepare-freeze-seven-unattempted-batch-10-adjudication-resumption-contexts"
};
if (shouldWrite) {
  await writeFile(activation.mergePlan.mergedOutput, mergedBytes);
  await writeFile(analysisPath, `${JSON.stringify(analysis, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? analysis.status : "preview",
  validCorrectionContexts: 2, disputedMoves: 19, candidateSelections: 52,
  mergedOutputSha256: analysis.correction.mergedOutputSha256,
  retries: 0, scoresDerived: 0, directIncrementalCostUsd: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
