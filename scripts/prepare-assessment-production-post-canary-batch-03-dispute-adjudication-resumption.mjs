#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { validatePostCanaryBatch03DisputeAdjudicationOutput } from
  "./lib/assessment-production-post-canary-batch-03-dispute-adjudication.mjs";
import { loadAndValidateRecoveryAuthorization } from
  "./lib/assessment-production-post-canary-batch-03-failure-recovery-standing-authorization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "invalid --frozen-at");
const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-03";
const ADJ = `${ROOT}/dispute-only-adjudication`;
const RESUMPTION = `${ADJ}/failure-recovery/resumption`;
const prepPath = `${RESUMPTION}/execution-preparation-manifest.json`;
const paths = {
  recoveryAuthorization: `${ROOT}/failure-recovery-standing-authorization.json`,
  originalActivation: `${ADJ}/execution-activation.json`,
  originalExecution: `${ADJ}/model-execution.json`,
  correctionAnalysis: `${ADJ}/failure-recovery/correction-analysis.json`,
  correctionOutput: `${ADJ}/outputs/debate-124.json`,
  originalDebate124Packet: `${ADJ}/packets/debate-124.json`
};
const toolFiles = [
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v4221175-decomposed-adjudication.mjs",
  "scripts/lib/v42211728-hard-route-adjudication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-03-dispute-adjudication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-03-failure-recovery-standing-authorization.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-03-dispute-adjudication-resumption.mjs",
  "scripts/test-assessment-production-post-canary-batch-03-dispute-adjudication-resumption-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-03-dispute-adjudication-resumption.mjs",
  "scripts/run-assessment-production-post-canary-batch-03-dispute-adjudication-resumption.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-03-dispute-adjudication-resumption.mjs",
  "scripts/test-assessment-production-post-canary-batch-03-dispute-adjudication-resumption-gate.mjs"
];
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const { record: recovery } = await loadAndValidateRecoveryAuthorization();
const inputBytes = Object.fromEntries(await Promise.all(Object.entries(paths)
  .map(async ([key, file]) => [key, await readFile(file)])));
const originalActivation = JSON.parse(inputBytes.originalActivation);
const originalExecution = JSON.parse(inputBytes.originalExecution);
const correctionAnalysis = JSON.parse(inputBytes.correctionAnalysis);
const correctionOutput = JSON.parse(inputBytes.correctionOutput);
const debate124Packet = JSON.parse(inputBytes.originalDebate124Packet);
const correctionValidation = validatePostCanaryBatch03DisputeAdjudicationOutput(
  correctionOutput, debate124Packet);
assertV4(
  recovery.authorization.unattemptedContextResumption === true &&
    originalExecution.status === "post-canary-batch-03-dispute-only-adjudication-gate-complete-with-failure" &&
    originalExecution.unattemptedContextIndexes.join(",") === "1,2,3,4,5,6,7,8,9" &&
    correctionAnalysis.status ===
      "passed-batch-03-debate-124-field-disjoint-adjudication-correction-and-merge-successor" &&
    correctionValidation.status === "passed" && correctionValidation.candidateSelections === 67,
  "Batch 3 adjudication resumption boundary changed"
);
const contexts = originalActivation.contexts.slice(1).map((context, index) => ({
  ...structuredClone(context),
  contextIndex: index,
  originalContextIndex: context.contextIndex
}));
assertV4(contexts.length === 9 &&
  contexts.map((item) => item.originalContextIndex).join(",") === "1,2,3,4,5,6,7,8,9" &&
  contexts.reduce((sum, item) => sum + item.disputedMoves, 0) === 167 &&
  contexts.reduce((sum, item) => sum + item.candidateSelections, 0) === 519 &&
  contexts.reduce((sum, item) => sum + item.audioTranscriptInputs.length, 0) === 6,
  "Batch 3 resumption workload changed");
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
  schemaVersion: "1.0-assessment-production-post-canary-batch-03-dispute-only-adjudication-resumption-preparation",
  protocolId: originalActivation.protocolId,
  status: "frozen-nine-post-canary-batch-03-dispute-only-adjudication-resumption-contexts-prepared",
  frozenAt, productionCanary: false, batchNumber: 3, stagingOnly: true,
  acceptedCorrection: {
    debateNumber: "124", analysis: paths.correctionAnalysis,
    output: paths.correctionOutput, outputSha256: sha256(inputBytes.correctionOutput),
    disputedMoves: 23, candidateSelections: 67
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
    contexts: 9, schedulerRamp: [1,2], maximumParallelContexts: 2,
    rampPhases: [
      { phase: 1, contextIndexes: [0], expansionRequiresAllValid: true },
      { phase: 2, contextIndexes: [1,2], expansionRequiresAllValid: true },
      { phase: 3, contextIndexes: [3,4,5,6,7,8], expansionRequiresAllValid: true }
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
    analysis: `${RESUMPTION}/analysis.json`
  },
  sourceHashes,
  futureOutputPathsExcludedFromSourceHashes: [
    `${RESUMPTION}/execution-activation.json`, `${RESUMPTION}/model-execution.json`,
    `${RESUMPTION}/analysis.json`, ...contexts.map((context) => context.output)
  ],
  authorization: {
    executionActivation: true, adjudicationModelContexts: false,
    deterministicValidationAndCohortReplay: false, paidServices: false,
    finalLedgerAssembly: false, scoreDerivation: false
  },
  directIncrementalCostUsdMaximum: 0,
  nextAuthorizedAction: "activate-nine-frozen-unattempted-batch-03-adjudication-contexts"
};
if (shouldWrite) {
  assertV4(!(await exists(prepPath)), "resumption preparation already exists");
  await mkdir(path.dirname(prepPath), { recursive: true });
  await writeFile(prepPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? manifest.status : "preview",
  debates: contexts.map((item) => item.debateNumber), contexts: 9,
  disputedMoves: 167, candidateSelections: 519, audioTranscriptInputs: 6,
  attemptsPerContext: 1, retriesMaximum: 0, directIncrementalCostUsdMaximum: 0,
  nextAuthorizedAction: manifest.nextAuthorizedAction }, null, 2));
