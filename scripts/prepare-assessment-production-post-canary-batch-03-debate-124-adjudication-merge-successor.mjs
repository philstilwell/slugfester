#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import { validatePostCanaryBatch03DisputeAdjudicationOutput } from
  "./lib/assessment-production-post-canary-batch-03-dispute-adjudication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const root = "docs/assessment-production/post-canary-continuation-v1/batch-03/dispute-only-adjudication";
const recovery = `${root}/failure-recovery`;
const manifestPath = `${recovery}/merge-successor-manifest.json`;
const activationPath = `${recovery}/correction-execution-activation-1.json`;
const executionPath = `${recovery}/correction-model-execution.json`;
const originalMergePath = "scripts/merge-assessment-production-post-canary-batch-03-debate-124-adjudication-correction.mjs";
const preparePath = "scripts/prepare-assessment-production-post-canary-batch-03-debate-124-adjudication-merge-successor.mjs";
const executePath = "scripts/execute-assessment-production-post-canary-batch-03-debate-124-adjudication-merge-successor.mjs";
const testPath = "scripts/test-assessment-production-post-canary-batch-03-debate-124-adjudication-merge-successor.mjs";
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(!(await exists(manifestPath)), "merge successor manifest already exists");
const [activationBytes, executionBytes] = await Promise.all([readFile(activationPath), readFile(executionPath)]);
const activation = JSON.parse(activationBytes);
const execution = JSON.parse(executionBytes);
assertV4(
  execution.status === "two-batch-03-debate-124-field-disjoint-adjudication-correction-contexts-passed" &&
    execution.validContexts === 2 && execution.retries === 0 &&
    !(await exists(activation.mergePlan.mergedOutput)) &&
    !(await exists(activation.mergePlan.analysis)),
  "merge successor input boundary changed"
);
const originalPacketBytes = await readFile(activation.mergePlan.originalPacket);
assertV4(sha256(originalPacketBytes) === activation.mergePlan.originalPacketSha256,
  "original packet changed");
const originalPacket = JSON.parse(originalPacketBytes);
const shardOutputs = [];
for (const context of activation.contexts) {
  const [packetBytes, outputBytes] = await Promise.all([readFile(context.packet), readFile(context.output)]);
  const output = JSON.parse(outputBytes);
  const validation = validatePostCanaryBatch03DisputeAdjudicationOutput(output, JSON.parse(packetBytes));
  assertV4(validation.status === "passed" && validation.candidateSelections === context.candidateSelections,
    `${context.shardId}: accepted correction output changed`);
  shardOutputs.push({ context, output, outputBytes });
}
const first = shardOutputs[0].output;
const moveMap = new Map(shardOutputs.flatMap(({ output }) => output.moveDecisions)
  .map((decision) => [decision.moveId, decision]));
const burdenMap = new Map(shardOutputs.flatMap(({ output }) => output.burdenAdjustmentDecisions)
  .map((decision) => [decision.side, decision]));
const merged = {
  ...first,
  moveDecisions: activation.mergePlan.originalMoveOrder.map((moveId) => moveMap.get(moveId)),
  burdenAdjustmentDecisions: activation.mergePlan.originalBurdenOrder.map((side) => burdenMap.get(side))
};
const validation = validatePostCanaryBatch03DisputeAdjudicationOutput(merged, originalPacket);
assertV4(validation.status === "passed" && validation.candidateSelections === 67 &&
  validation.disputedMoves === 23 && validation.calculatedScores === 0,
  "merge successor candidate does not pass original validation");
const mergedBytes = Buffer.from(`${JSON.stringify(merged, null, 2)}\n`);
const sourceFiles = [activationPath, executionPath, activation.mergePlan.originalPacket,
  originalMergePath, preparePath, executePath, testPath,
  ...activation.contexts.flatMap((context) => [context.packet, context.output])];
const sourceHashes = Object.fromEntries(await Promise.all(sourceFiles.map(async (file) =>
  [file, sha256(await readFile(file))])));
const manifest = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-03-debate-124-adjudication-merge-successor",
  status: "frozen-debate-124-correction-merge-successor-prepared",
  productionCanary: false, batchNumber: 3, stagingOnly: true, debateNumber: "124",
  diagnosis: {
    classification: "deterministic-merge-output-parent-directory-missing",
    errorCode: "ENOENT",
    failedWritePath: activation.mergePlan.mergedOutput,
    acceptedShardOutputs: 2,
    acceptedCandidateSelections: 67,
    modelContextsAdded: 0,
    outputWrittenByFailedPass: false
  },
  correction: {
    operation: "create-exact-parent-directory-before-writing-hash-locked-merged-output",
    mergedOutput: activation.mergePlan.mergedOutput,
    mergedOutputSha256: sha256(mergedBytes),
    analysis: activation.mergePlan.analysis,
    validation,
    originalMergeMeaningPreserved: true,
    modelOutputsPreserved: true,
    candidateSelectionsChanged: 0,
    deterministicPassesMaximum: 1
  },
  sourceHashes,
  futureOutputPathsExcludedFromSourceHashes: [
    activation.mergePlan.mergedOutput,
    activation.mergePlan.analysis
  ],
  authorization: {
    deterministicMergeSuccessor: true, modelExecution: false,
    paidServices: false, scoreDerivation: false
  },
  directIncrementalCostUsdMaximum: 0,
  nextAuthorizedAction: "execute-one-deterministic-debate-124-merge-successor-pass"
};
if (shouldWrite) await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? manifest.status : "preview",
  acceptedShardOutputs: 2, candidateSelections: 67,
  mergedOutputSha256: manifest.correction.mergedOutputSha256,
  modelContextsAdded: 0, directIncrementalCostUsd: 0 }, null, 2));
