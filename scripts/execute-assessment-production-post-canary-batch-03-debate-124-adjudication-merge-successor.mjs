#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { validatePostCanaryBatch03DisputeAdjudicationOutput } from
  "./lib/assessment-production-post-canary-batch-03-dispute-adjudication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const root = "docs/assessment-production/post-canary-continuation-v1/batch-03/dispute-only-adjudication";
const recovery = `${root}/failure-recovery`;
const manifestPath = `${recovery}/merge-successor-manifest.json`;
const manifest = JSON.parse(await readFile(manifestPath));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(manifest.status === "frozen-debate-124-correction-merge-successor-prepared" &&
  manifest.authorization.deterministicMergeSuccessor === true &&
  manifest.correction.deterministicPassesMaximum === 1,
  "merge successor is not authorized");
for (const [file, digest] of Object.entries(manifest.sourceHashes))
  assertV4(sha256(await readFile(file)) === digest, `source drift: ${file}`);
const activation = JSON.parse(await readFile(
  `${recovery}/correction-execution-activation-1.json`));
const originalPacket = JSON.parse(await readFile(activation.mergePlan.originalPacket));
const outputs = await Promise.all(activation.contexts.map((context) =>
  readFile(context.output).then(JSON.parse)));
const moveMap = new Map(outputs.flatMap((output) => output.moveDecisions)
  .map((decision) => [decision.moveId, decision]));
const burdenMap = new Map(outputs.flatMap((output) => output.burdenAdjustmentDecisions)
  .map((decision) => [decision.side, decision]));
const merged = {
  ...outputs[0],
  moveDecisions: activation.mergePlan.originalMoveOrder.map((moveId) => moveMap.get(moveId)),
  burdenAdjustmentDecisions: activation.mergePlan.originalBurdenOrder.map((side) => burdenMap.get(side))
};
const validation = validatePostCanaryBatch03DisputeAdjudicationOutput(merged, originalPacket);
assertV4(validation.status === "passed" && validation.candidateSelections === 67,
  "merge successor validation failed");
const mergedBytes = Buffer.from(`${JSON.stringify(merged, null, 2)}\n`);
assertV4(sha256(mergedBytes) === manifest.correction.mergedOutputSha256,
  "merge successor candidate hash changed");
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-03-debate-124-adjudication-correction-analysis",
  status: "passed-batch-03-debate-124-field-disjoint-adjudication-correction-and-merge-successor",
  analyzedAt: new Date().toISOString(), productionCanary: false, batchNumber: 3,
  stagingOnly: true, debateNumber: "124",
  originalFailure: { acceptedOutputs: 0, failedPartialOutputReused: false },
  correction: {
    contexts: 2, attempts: 2, retries: 0, timeoutExtensions: 0,
    validContexts: 2, candidateSelections: 67, disputedMoves: 23,
    burdenAdjustmentDecisions: 2,
    mergedOutput: manifest.correction.mergedOutput,
    mergedOutputSha256: sha256(mergedBytes), validation
  },
  mergeSuccessor: {
    deterministicPasses: 1,
    parentDirectoryCreated: true,
    candidateSelectionsChanged: 0
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
await mkdir(path.dirname(manifest.correction.mergedOutput), { recursive: true });
await writeFile(manifest.correction.mergedOutput, mergedBytes);
await writeFile(manifest.correction.analysis, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, validContexts: 2,
  candidateSelections: 67, deterministicPasses: 1,
  retries: 0, scoresDerived: 0, directIncrementalCostUsd: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
