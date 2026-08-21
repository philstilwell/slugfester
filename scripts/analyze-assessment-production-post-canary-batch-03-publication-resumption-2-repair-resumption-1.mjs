#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { DEBATE_157_REPAIR_RESUMPTION_1_ROOT } from "./lib/assessment-production-post-canary-batch-03-publication-resumption-2-repair-resumption-1.mjs";
import { mergeAcceptedDebate157CorrectionAndRepairs } from "./lib/assessment-production-post-canary-batch-03-publication-resumption-2-repair-correction-2.mjs";
import { validatePostCanaryBatch03PublicationOutput } from "./lib/assessment-production-post-canary-batch-03-publication-validation.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT = DEBATE_157_REPAIR_RESUMPTION_1_ROOT;
const PREPARATION = `${ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const [preparationBytes, activationBytes, executionBytes] = await Promise.all([
  readFile(path.resolve(PREPARATION)),
  readFile(path.resolve(ACTIVATION)),
  readFile(path.resolve(EXECUTION))
]);
const preparation = JSON.parse(preparationBytes);
const activation = JSON.parse(activationBytes);
const execution = JSON.parse(executionBytes);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest, `repair resumption analysis source hash mismatch: ${file}`);
}
assertV4(
  execution.contextsPlanned === 7 &&
    execution.contextsAttempted >= 1 &&
    execution.contextsAttempted <= 7 &&
    execution.attempts === execution.contextsAttempted &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.recursiveCorrectionContexts === 0 &&
    execution.meteredApiCostUsd === 0 &&
    execution.paidServiceCallsThisStage === 0 &&
    execution.modelAuthoredScores === 0 &&
    execution.originalPacket0FailurePreservedAndUnaccepted === true &&
    execution.acceptedCorrection2PreservedAndUnavailableToModels === true,
  "the seven-context repair resumption execution record changed"
);
if (shouldWrite) {
  for (const file of [activation.artifacts.analysis, activation.artifacts.mergedOutput, activation.artifacts.completeValidation, activation.artifacts.mergeAudit, activation.artifacts.cohortReplay]) {
    assertV4(!(await exists(file)), `${file} already exists`);
  }
}

let merge = null;
let failureMessage = null;
let cohortRows = [];
let baseOutputBytes = null;
let correctionOutputBytes = null;
let remainingOutputBytes = [];
if (
  execution.contextsAttempted === 7 &&
  execution.validContexts === 7 &&
  execution.invalidContexts === 0 &&
  execution.results.every(({ gateAcceptancePassed }) => gateAcceptancePassed)
) {
  try {
    const [baseBytes, publicationPacketBytes, correctionBytes, correctionPacketBytes] = await Promise.all([
      readFile(path.resolve(preparation.inputs.immutableBaseOutput)),
      readFile(path.resolve(preparation.inputs.publicationPacket)),
      readFile(path.resolve(preparation.inputs.acceptedCorrectionOutput)),
      readFile(path.resolve(preparation.inputs.acceptedCorrectionPacket))
    ]);
    baseOutputBytes = baseBytes;
    correctionOutputBytes = correctionBytes;
    assertV4(sha256(baseBytes) === activation.sourceHashes[preparation.inputs.immutableBaseOutput], "the original Debate 157 output changed before merge");
    assertV4(sha256(correctionBytes) === activation.hashLocks.acceptedCorrectionOutput.sha256, "the accepted correction-2 output changed before merge");
    const remainingPackets = await Promise.all(activation.contexts.map((context) => readFile(path.resolve(context.packet), "utf8").then(JSON.parse)));
    remainingOutputBytes = await Promise.all(activation.contexts.map((context) => readFile(path.resolve(context.repairOutput))));
    for (let index = 0; index < 7; index += 1) {
      assertV4(sha256(remainingOutputBytes[index]) === execution.results[index].repairOutputSha256, `resumed repair output ${index} hash mismatch`);
    }
    merge = mergeAcceptedDebate157CorrectionAndRepairs({
      baseOutput: JSON.parse(baseBytes),
      correctionOutput: JSON.parse(correctionBytes),
      correctionPacket: JSON.parse(correctionPacketBytes),
      remainingRepairOutputs: remainingOutputBytes.map((bytes) => JSON.parse(bytes)),
      remainingRepairPackets: remainingPackets,
      publicationPacket: JSON.parse(publicationPacketBytes)
    });
    const acceptedCohort = JSON.parse(await readFile(path.resolve(preparation.inputs.failedPublicationResumptionPreparation), "utf8"));
    for (const accepted of Object.values(acceptedCohort.acceptedOutputs)) {
      const [outputBytes, packet] = await Promise.all([
        readFile(path.resolve(accepted.output)),
        readFile(path.resolve(accepted.packet), "utf8").then(JSON.parse)
      ]);
      assertV4(sha256(outputBytes) === accepted.outputSha256, `accepted Debate ${accepted.debateNumber} output hash changed`);
      cohortRows.push({
        debateNumber: accepted.debateNumber,
        source: "accepted-prior-output",
        output: accepted.output,
        outputSha256: accepted.outputSha256,
        validation: validatePostCanaryBatch03PublicationOutput(JSON.parse(outputBytes), packet)
      });
    }
    cohortRows.push({
      debateNumber: "157",
      source: "merged-correction-2-and-seven-resumed-repairs",
      output: activation.artifacts.mergedOutput,
      outputSha256: null,
      validation: merge.fullValidation
    });
  } catch (error) {
    failureMessage = (error.stack ?? error.message).slice(-10000);
  }
}
const cohortTotals = cohortRows.reduce(
  (sum, row) => ({
    debates: sum.debates + 1,
    moves: sum.moves + row.validation.moves,
    critiques: sum.critiques + row.validation.critiques,
    exactSourceQuotes: sum.exactSourceQuotes + row.validation.quoteExactSourceMatches,
    overallCommentarySides: sum.overallCommentarySides + row.validation.overallCommentarySides,
    aiExtensionSides: sum.aiExtensionSides + row.validation.aiExtensionSides,
    modelAuthoredScores: sum.modelAuthoredScores + row.validation.calculatedScoresAuthoredByModel,
    lockedScoresUnchanged: sum.lockedScoresUnchanged && row.validation.lockedScoresUnchanged
  }),
  { debates: 0, moves: 0, critiques: 0, exactSourceQuotes: 0, overallCommentarySides: 0, aiExtensionSides: 0, modelAuthoredScores: 0, lockedScoresUnchanged: true }
);
const correctedFields = [
  ...(JSON.parse(await readFile(path.resolve(preparation.inputs.acceptedCorrectionAnalysis), "utf8")).deterministicValidation?.correctedFields ?? []),
  ...execution.results.flatMap((result) => result.validationSummary?.correctedFields ?? [])
];
const passed =
  execution.validContexts === 7 &&
  merge?.fullValidation?.status === "passed" &&
  merge?.transformations?.length === 16 &&
  correctedFields.length === 16 &&
  cohortTotals.debates === 5 &&
  cohortTotals.moves === 103 &&
  cohortTotals.critiques === 103 &&
  cohortTotals.exactSourceQuotes === 10 &&
  cohortTotals.overallCommentarySides === 10 &&
  cohortTotals.aiExtensionSides === 10 &&
  cohortTotals.modelAuthoredScores === 0 &&
  cohortTotals.lockedScoresUnchanged === true;
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-03-debate-157-publication-repair-resumption-1-analysis",
  protocolId: activation.protocolId,
  status: passed
    ? "batch-03-debate-157-correction-2-and-seven-context-repair-resumption-passed"
    : "batch-03-debate-157-further-repair-or-validation-failure-stop-required",
  productionCanary: false,
  batchNumber: 3,
  stagingOnly: true,
  gate: {
    originalRepairPacket0Accepted: false,
    correction2Accepted: true,
    resumedContextsPlanned: 7,
    resumedContextsAttempted: execution.contextsAttempted,
    resumedContextsPassed: execution.validContexts,
    resumedContextsFailed: execution.invalidContexts,
    resumedContextsUnattempted: execution.contextsUnattempted,
    completeDebate157ValidationPassed: passed,
    correctedFields,
    correctedFieldCount: correctedFields.length,
    authorizedFieldsChanged: merge?.transformations?.length ?? 0,
    immutableFieldsChanged: passed ? 0 : null,
    movesValidated: merge?.fullValidation?.moves ?? 0,
    critiquesValidated: merge?.fullValidation?.critiques ?? 0,
    completeFiveDebateCohortReplayPassed: passed,
    cohort: cohortTotals,
    attempts: execution.attempts,
    retries: 0,
    timeoutExtensions: 0,
    recursiveCorrectionContextsThisResumption: 0,
    totalOneTimeRecursiveRecoveryContexts: 1,
    modelAuthoredScores: 0
  },
  failureMessage,
  sourceHashes: {
    preparation: sha256(preparationBytes),
    activation: sha256(activationBytes),
    execution: sha256(executionBytes),
    originalBaseOutput: baseOutputBytes ? sha256(baseOutputBytes) : activation.sourceHashes[preparation.inputs.immutableBaseOutput],
    acceptedCorrection2Output: correctionOutputBytes ? sha256(correctionOutputBytes) : activation.hashLocks.acceptedCorrectionOutput.sha256,
    resumedOutputs: remainingOutputBytes.map((bytes, index) => ({ packetIndex: activation.contexts[index].packetIndex, sha256: sha256(bytes) }))
  },
  totals: { modelContexts: execution.contextsAttempted, meteredApiCostUsd: 0, paidServiceCallsThisStage: 0, modelAuthoredScores: 0 },
  authorization: { fivePublicationContextResumptionPreparation: passed, fivePublicationContextModelExecution: false, retry: false, recursiveCorrection: false, paidServices: false, productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: passed
    ? "prepare-a-separate-five-context-batch-03-publication-resumption-manifest-for-debates-102-09-181-138-27"
    : "stop-without-retry-after-a-further-failed-repair-model-output-or-validation"
};
if (shouldWrite && passed) {
  const mergedBytes = Buffer.from(`${JSON.stringify(merge.merged, null, 2)}\n`);
  cohortRows[cohortRows.length - 1].outputSha256 = sha256(mergedBytes);
  await mkdir(path.dirname(path.resolve(activation.artifacts.mergedOutput)), { recursive: true });
  await writeFile(path.resolve(activation.artifacts.mergedOutput), mergedBytes);
  await writeFile(path.resolve(activation.artifacts.completeValidation), `${JSON.stringify({
    schemaVersion: "1.0-assessment-production-post-canary-batch-03-debate-157-complete-publication-validation",
    protocolId: activation.protocolId,
    status: "passed",
    debateNumber: "157",
    mergedOutputSha256: sha256(mergedBytes),
    validationSummary: merge.fullValidation,
    authorizedFieldsChanged: 16,
    immutableFieldsChanged: 0,
    lockedScoresUnchanged: true,
    modelAuthoredScores: 0
  }, null, 2)}\n`);
  await writeFile(path.resolve(activation.artifacts.mergeAudit), `${JSON.stringify({
    schemaVersion: "1.0-assessment-production-post-canary-batch-03-debate-157-correction-2-and-resumption-merge-audit",
    protocolId: activation.protocolId,
    status: "passed",
    debateNumber: "157",
    originalFailedRepairPacket0OutputAccepted: false,
    acceptedCorrection2: { path: preparation.inputs.acceptedCorrectionOutput, sha256: sha256(correctionOutputBytes), fields: 2 },
    acceptedResumedRepairs: activation.contexts.map((context, index) => ({ packetIndex: context.packetIndex, path: context.repairOutput, sha256: sha256(remainingOutputBytes[index]), fields: 2 })),
    mergedOutput: activation.artifacts.mergedOutput,
    mergedOutputSha256: sha256(mergedBytes),
    authorizedTransformations: merge.transformations,
    authorizedFieldsChanged: 16,
    immutableFieldsChanged: 0,
    completeDebateValidation: merge.fullValidation,
    lockedScoresUnchanged: true,
    modelAuthoredScores: 0
  }, null, 2)}\n`);
  await writeFile(path.resolve(activation.artifacts.cohortReplay), `${JSON.stringify({
    schemaVersion: "1.0-assessment-production-post-canary-batch-03-five-debate-publication-cohort-replay",
    protocolId: activation.protocolId,
    status: "passed",
    rows: cohortRows,
    totals: cohortTotals,
    mergedDebate157OutputSha256: sha256(mergedBytes)
  }, null, 2)}\n`);
}
if (shouldWrite) await writeFile(path.resolve(activation.artifacts.analysis), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({
  status: analysis.status,
  contextsAttempted: analysis.gate.resumedContextsAttempted,
  contextsPassed: analysis.gate.resumedContextsPassed,
  correctedFieldCount: analysis.gate.correctedFieldCount,
  completeDebate157ValidationPassed: analysis.gate.completeDebate157ValidationPassed,
  fiveDebateCohortReplayPassed: analysis.gate.completeFiveDebateCohortReplayPassed,
  movesValidated: analysis.gate.movesValidated,
  attempts: analysis.gate.attempts,
  retries: 0,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction
}, null, 2));
