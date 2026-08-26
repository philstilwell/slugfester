#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { validatePostCanaryBatch10DisputeAdjudicationOutput } from
  "./lib/assessment-production-post-canary-batch-10-dispute-adjudication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "invalid --frozen-at");
const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-10";
const ADJ = `${ROOT}/dispute-only-adjudication`;
const RESUMPTION = `${ADJ}/failure-recovery/resumption`;
const prepPath = `${RESUMPTION}/execution-preparation-manifest.json`;
const paths = {
  standingAuthorization: `${ROOT}/standing-authorization.json`,
  originalActivation: `${ADJ}/execution-activation.json`,
  originalExecution: `${ADJ}/model-execution.json`,
  correctionAnalysis: `${ADJ}/failure-recovery/correction-2/analysis.json`,
  correctionOutput: `${ADJ}/outputs/debate-74.json`,
  originalDebate74Packet: `${ADJ}/packets/debate-74.json`,
  acceptedDebate21Output: `${ADJ}/outputs/debate-21.json`,
  acceptedDebate21Packet: `${ADJ}/packets/debate-21.json`,
  acceptedDebate107Output: `${ADJ}/outputs/debate-107.json`,
  acceptedDebate107Packet: `${ADJ}/packets/debate-107.json`
};
const toolFiles = [
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v4221175-decomposed-adjudication.mjs",
  "scripts/lib/v42211728-hard-route-adjudication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-10-dispute-adjudication.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-10-dispute-adjudication-resumption.mjs",
  "scripts/activate-assessment-production-post-canary-batch-10-dispute-adjudication-resumption.mjs",
  "scripts/run-assessment-production-post-canary-batch-10-dispute-adjudication-resumption.mjs",
  "scripts/replay-assessment-production-post-canary-batch-10-complete-adjudication-cohort.mjs"
];
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const inputBytes = Object.fromEntries(await Promise.all(Object.entries(paths)
  .map(async ([key, file]) => [key, await readFile(file)])));
const standing = JSON.parse(inputBytes.standingAuthorization);
const originalActivation = JSON.parse(inputBytes.originalActivation);
const originalExecution = JSON.parse(inputBytes.originalExecution);
const correctionAnalysis = JSON.parse(inputBytes.correctionAnalysis);
const correctionOutput = JSON.parse(inputBytes.correctionOutput);
const debate74Packet = JSON.parse(inputBytes.originalDebate74Packet);
const correctionValidation = validatePostCanaryBatch10DisputeAdjudicationOutput(
  correctionOutput, debate74Packet);
const accepted21Validation = validatePostCanaryBatch10DisputeAdjudicationOutput(
  JSON.parse(inputBytes.acceptedDebate21Output),
  JSON.parse(inputBytes.acceptedDebate21Packet)
);
const accepted107Validation = validatePostCanaryBatch10DisputeAdjudicationOutput(
  JSON.parse(inputBytes.acceptedDebate107Output),
  JSON.parse(inputBytes.acceptedDebate107Packet)
);
assertV4(
  standing.recoveryControls.unattemptedContextResumptionPermitted === true &&
    originalExecution.status === "post-canary-batch-10-dispute-only-adjudication-gate-complete-with-failure" &&
    originalExecution.unattemptedContextIndexes.join(",") === "3,4,5,6,7,8,9" &&
    correctionAnalysis.status ===
      "passed-batch-10-debate-74-field-disjoint-adjudication-correction-2-and-merge" &&
    correctionAnalysis.authorization.sevenContextResumptionPreparation === true &&
    correctionValidation.status === "passed" &&
    correctionValidation.candidateSelections === 52 &&
    accepted21Validation.status === "passed" &&
    accepted107Validation.status === "passed",
  "Batch 10 adjudication resumption boundary changed"
);
const contexts = originalActivation.contexts
  .filter((context) =>
    originalExecution.unattemptedContextIndexes.includes(context.contextIndex)
  )
  .map((context, index) => ({
    ...structuredClone(context),
    contextIndex: index,
    originalContextIndex: context.contextIndex
  }));
assertV4(contexts.length === 7 &&
  contexts.map((item) => item.originalContextIndex).join(",") === "3,4,5,6,7,8,9" &&
  contexts.reduce((sum, item) => sum + item.disputedMoves, 0) === 124 &&
  contexts.reduce((sum, item) => sum + item.candidateSelections, 0) === 338 &&
  contexts.reduce((sum, item) => sum + item.audioTranscriptInputs.length, 0) === 6,
  "Batch 10 resumption workload changed");
const sourceHashes = {};
for (const [key, file] of Object.entries(paths)) sourceHashes[file] = sha256(inputBytes[key]);
for (const file of [...Object.values(originalActivation.modelInputs), ...toolFiles,
  ...contexts.flatMap((context) => [context.packet,
    ...context.audioTranscriptInputs.map((item) => item.sourcePath)])])
  sourceHashes[file] = sha256(await readFile(file));
for (const context of contexts) {
  assertV4(sha256(await readFile(context.packet)) === context.packetSha256,
    `${context.debateNumber}: resumption packet changed`);
  assertV4(!(await exists(context.output)), `${context.debateNumber}: output already exists`);
}
const manifest = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-10-dispute-only-adjudication-resumption-preparation",
  protocolId: originalActivation.protocolId,
  status: "frozen-seven-post-canary-batch-10-dispute-only-adjudication-resumption-contexts-prepared",
  frozenAt, productionCanary: false, batchNumber: 10, stagingOnly: true,
  acceptedCorrection: {
    debateNumber: "74", analysis: paths.correctionAnalysis,
    output: paths.correctionOutput, outputSha256: sha256(inputBytes.correctionOutput),
    disputedMoves: 19, candidateSelections: 52,
    retainedPassedCorrectionShard01: true,
    failedCorrectionShard02Reused: false,
    correction2Contexts: 2
  },
  originalFailure: {
    execution: paths.originalExecution,
    unattemptedContextIndexes: originalExecution.unattemptedContextIndexes,
    resumeOnlyUnattempted: true
  },
  model: structuredClone(originalActivation.model),
  modelInputs: structuredClone(originalActivation.modelInputs),
  contexts,
  executionPolicy: {
    contexts: 7, schedulerRamp: [1,2], maximumParallelContexts: 2,
    rampPhases: [
      { phase: 1, contextIndexes: [0], expansionRequiresAllValid: true },
      { phase: 2, contextIndexes: [1,2], expansionRequiresAllValid: true },
      { phase: 3, contextIndexes: [3,4,5,6], expansionRequiresAllValid: true }
    ],
    attemptsPerContext: 1, retriesMaximum: 0, timeoutExtensionsMaximum: 0,
    timeoutMsPerContext: originalActivation.executionPolicy.timeoutMsPerContext,
    maximumMinutesPerContext: originalActivation.executionPolicy.maximumMinutesPerContext,
    maximumMeanMinutes: originalActivation.executionPolicy.maximumMeanMinutes,
    removedEnvironmentVariables: originalActivation.executionPolicy.removedEnvironmentVariables,
    terminateIsolatedProcessGroupAtFrozenTimeout: true
  },
  artifacts: {
    preparation: prepPath,
    activation: `${RESUMPTION}/execution-activation.json`,
    execution: `${RESUMPTION}/model-execution.json`,
    cohortAnalysis: `${ADJ}/failure-recovery/cohort-analysis.json`
  },
  sourceHashes,
  futureOutputPathsExcludedFromSourceHashes: [
    `${RESUMPTION}/execution-activation.json`, `${RESUMPTION}/model-execution.json`,
    `${ADJ}/failure-recovery/cohort-analysis.json`,
    ...contexts.map((context) => context.output)
  ],
  authorization: {
    executionActivation: true, adjudicationModelContexts: false,
    deterministicValidationAndCohortReplay: false, paidServices: false,
    finalLedgerAssembly: false, scoreDerivation: false
  },
  directIncrementalCostUsdMaximum: 0,
  nextAuthorizedAction: "activate-seven-frozen-unattempted-batch-10-adjudication-contexts"
};
if (shouldWrite) {
  assertV4(!(await exists(prepPath)), "resumption preparation already exists");
  await mkdir(path.dirname(prepPath), { recursive: true });
  await writeFile(prepPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? manifest.status : "preview",
  debates: contexts.map((item) => item.debateNumber), contexts: 7,
  disputedMoves: 124, candidateSelections: 338, audioTranscriptInputs: 6,
  attemptsPerContext: 1, retriesMaximum: 0, directIncrementalCostUsdMaximum: 0,
  nextAuthorizedAction: manifest.nextAuthorizedAction }, null, 2));
