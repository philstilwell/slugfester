#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validatePostCanaryBatch04PublicationOutput } from "./lib/assessment-production-post-canary-batch-04-publication-validation.mjs";
import {
  POST_CANARY_BATCH_04_DEBATE_49_REPAIR_ROOT,
  mergeAndValidateDebate49Repairs
} from "./lib/assessment-production-post-canary-batch-04-publication-resumption-repair.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT = POST_CANARY_BATCH_04_DEBATE_49_REPAIR_ROOT;
const [preparationBytes, activationBytes, executionBytes] = await Promise.all([
  readFile(path.resolve(`${ROOT}/execution-preparation-manifest.json`)),
  readFile(path.resolve(`${ROOT}/execution-activation.json`)),
  readFile(path.resolve(`${ROOT}/model-execution.json`))
]);
const preparation = JSON.parse(preparationBytes);
const activation = JSON.parse(activationBytes);
const execution = JSON.parse(executionBytes);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `repair analysis source hash mismatch: ${file}`);
}
assertV4(execution.contextsPlanned === 11 && execution.contextsAttempted >= 1 &&
  execution.contextsAttempted <= 11 && execution.attempts === execution.contextsAttempted &&
  execution.retries === 0 && execution.timeoutExtensions === 0 &&
  execution.recursiveCorrectionContexts === 0 && execution.meteredApiCostUsd === 0 &&
  execution.paidServiceCallsThisStage === 0 && execution.modelAuthoredScores === 0,
"the Debate 49 repair execution record changed");
if (shouldWrite) {
  for (const file of [activation.artifacts.analysis, activation.artifacts.mergedOutput,
    activation.artifacts.completeValidation, activation.artifacts.mergeAudit]) {
    assertV4(!(await exists(file)), `${file} already exists`);
  }
}

let merge = null; let failureMessage = null; let baseOutputBytes = null;
let repairOutputBytes = [];
if (execution.contextsAttempted === 11 && execution.validContexts === 11 &&
  execution.invalidContexts === 0 && execution.results.every((result) => result.gateAcceptancePassed)) {
  try {
    const [baseBytes, publicationPacketBytes, diagnosis] = await Promise.all([
      readFile(path.resolve(preparation.inputs.immutableBaseOutput)),
      readFile(path.resolve(preparation.inputs.publicationPacket)),
      readFile(path.resolve(preparation.inputs.diagnosis), "utf8").then(JSON.parse)
    ]);
    baseOutputBytes = baseBytes;
    assertV4(sha256(baseBytes) === diagnosis.failedContext.outputSha256,
      "the original failed Debate 49 output changed before merge");
    const repairPackets = await Promise.all(activation.contexts.map((context) =>
      readFile(path.resolve(context.packet), "utf8").then(JSON.parse)));
    repairOutputBytes = await Promise.all(activation.contexts.map((context) =>
      readFile(path.resolve(context.repairOutput))));
    for (let index = 0; index < 11; index += 1) {
      assertV4(sha256(repairOutputBytes[index]) ===
        execution.results[index].repairOutputSha256,
      `repair output ${index} hash mismatch`);
    }
    merge = mergeAndValidateDebate49Repairs({
      baseOutput: JSON.parse(baseBytes),
      repairs: repairOutputBytes.map((bytes) => JSON.parse(bytes)),
      repairPackets,
      publicationPacket: JSON.parse(publicationPacketBytes),
      repairFields: preparation.repairContract.writableFields
    });
  } catch (error) { failureMessage = (error.stack ?? error.message).slice(-10000); }
}
const passed = execution.validContexts === 11 && merge?.fullValidation?.status === "passed";
const correctedFields = execution.results.flatMap((result) =>
  result.validationSummary?.correctedFields ?? []);

const cohortSources = [
  {
    debateNumber: "127",
    output:
      "docs/assessment-production/post-canary-continuation-v1/batch-04/publication-reconstruction/repair-1/merged/debate-127.json",
    packet:
      "docs/assessment-production/post-canary-continuation-v1/batch-04/publication-reconstruction/packets/debate-127.json"
  },
  {
    debateNumber: "67",
    output:
      "docs/assessment-production/post-canary-continuation-v1/batch-04/publication-reconstruction/resumption-1/outputs/debate-67.json",
    packet:
      "docs/assessment-production/post-canary-continuation-v1/batch-04/publication-reconstruction/packets/debate-67.json"
  },
  {
    debateNumber: "85",
    output:
      "docs/assessment-production/post-canary-continuation-v1/batch-04/publication-reconstruction/resumption-1/outputs/debate-85.json",
    packet:
      "docs/assessment-production/post-canary-continuation-v1/batch-04/publication-reconstruction/packets/debate-85.json"
  }
];
const cohortReplay = [];
if (passed) {
  for (const source of cohortSources) {
    const [output, packet] = await Promise.all([
      readFile(path.resolve(source.output), "utf8").then(JSON.parse),
      readFile(path.resolve(source.packet), "utf8").then(JSON.parse)
    ]);
    cohortReplay.push({ debateNumber: source.debateNumber,
      validation: validatePostCanaryBatch04PublicationOutput(output, packet) });
  }
  cohortReplay.push({ debateNumber: "49", validation: merge.fullValidation });
}
const cohortPassed = passed && cohortReplay.length === 4 &&
  cohortReplay.every((row) => row.validation.status === "passed" &&
    row.validation.lockedScoresUnchanged === true &&
    row.validation.calculatedScoresAuthoredByModel === 0);
const sum = (field) => cohortReplay.reduce((total, row) => total + row.validation[field], 0);
assertV4(!passed || (cohortPassed && sum("moves") === 85 && sum("critiques") === 85 &&
  sum("quoteExactSourceMatches") === 8 && sum("overallCommentarySides") === 8 &&
  sum("aiExtensionSides") === 8),
"the four-debate accepted publication cohort replay failed");

const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-04-debate-49-publication-resumption-repair-analysis",
  protocolId: activation.protocolId,
  status: passed && cohortPassed ?
    "batch-04-debate-49-bounded-resumption-repair-and-four-debate-cohort-validation-passed" :
    "batch-04-debate-49-bounded-resumption-repair-or-cohort-validation-failed",
  productionCanary: false, batchNumber: 4, stagingOnly: true,
  gate: { repairContextsPlanned: 11,
    repairContextsAttempted: execution.contextsAttempted,
    repairContextsPassed: execution.validContexts,
    repairContextsFailed: execution.invalidContexts,
    repairContextsUnattempted: execution.contextsUnattempted,
    completeDebateValidationPassed: passed,
    fourDebateCohortReplayPassed: cohortPassed,
    correctedFields, correctedFieldCount: correctedFields.length,
    movesValidated: merge?.fullValidation?.moves ?? 0,
    critiquesValidated: merge?.fullValidation?.critiques ?? 0,
    acceptedCohortDebates: cohortReplay.length,
    acceptedCohortMoves: cohortReplay.length ? sum("moves") : 0,
    immutableFieldsChanged: passed ? 0 : null,
    attempts: execution.attempts, retries: 0, timeoutExtensions: 0,
    recursiveCorrectionContexts: 0, modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0 },
  cohortReplay,
  failureMessage,
  artifacts: { originalFailedOutput: preparation.inputs.immutableBaseOutput,
    originalFailedOutputPreserved: true,
    repairOutputs: activation.contexts.map((context) => context.repairOutput),
    mergedOutput: passed ? activation.artifacts.mergedOutput : null,
    completeValidation: passed ? activation.artifacts.completeValidation : null,
    mergeAudit: passed ? activation.artifacts.mergeAudit : null },
  totals: { modelContexts: execution.contextsAttempted, meteredApiCostUsd: 0,
    paidServiceCallsThisStage: 0, transcriptionCostUsdThisStage: 0,
    modelAuthoredScores: 0 },
  authorization: { sixContextResumptionManifestPreparation: passed && cohortPassed,
    sixContextModelExecution: false, retry: false, timeoutExtension: false,
    recursiveCorrectionModelExecution: false, publicationFinalization: false,
    paidServices: false, productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: passed && cohortPassed ?
    "prepare-a-separate-six-context-batch-04-publication-resumption-2-manifest-under-standing-authorization" :
    "stop-and-request-user-approval-after-failed-bounded-debate-49-publication-repair"
};

if (shouldWrite && passed && cohortPassed) {
  const mergedBytes = Buffer.from(`${JSON.stringify(merge.merged, null, 2)}\n`);
  const completeValidation = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-04-debate-49-complete-publication-validation",
    protocolId: activation.protocolId, status: "passed", debateNumber: "49",
    mergedOutputSha256: sha256(mergedBytes), validationSummary: merge.fullValidation,
    originalFailedOutputPreserved: true, authorizedFieldsChanged: 22,
    immutableFieldsChanged: 0, modelAuthoredScores: 0, lockedScoresUnchanged: true
  };
  const mergeAudit = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-04-debate-49-publication-resumption-repair-merge-audit",
    protocolId: activation.protocolId, status: "passed", debateNumber: "49",
    originalFailedOutput: preparation.inputs.immutableBaseOutput,
    originalFailedOutputSha256: sha256(baseOutputBytes),
    repairOutputs: activation.contexts.map((context, index) => ({ packetIndex: index,
      path: context.repairOutput, sha256: sha256(repairOutputBytes[index]) })),
    mergedOutput: activation.artifacts.mergedOutput,
    mergedOutputSha256: sha256(mergedBytes),
    authorizedTransformations: merge.transformations,
    authorizedFieldsChanged: merge.transformations.length,
    immutableFieldsChanged: 0, completeDebateValidation: merge.fullValidation,
    fourDebateCohortReplay: cohortReplay, modelAuthoredScores: 0,
    lockedScoresUnchanged: true
  };
  await mkdir(path.dirname(path.resolve(activation.artifacts.mergedOutput)), { recursive: true });
  await writeFile(path.resolve(activation.artifacts.mergedOutput), mergedBytes);
  await writeFile(path.resolve(activation.artifacts.completeValidation),
    `${JSON.stringify(completeValidation, null, 2)}\n`);
  await writeFile(path.resolve(activation.artifacts.mergeAudit),
    `${JSON.stringify(mergeAudit, null, 2)}\n`);
}
if (shouldWrite) await writeFile(path.resolve(activation.artifacts.analysis),
  `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status,
  repairContextsAttempted: analysis.gate.repairContextsAttempted,
  repairContextsPassed: analysis.gate.repairContextsPassed,
  completeDebateValidationPassed: analysis.gate.completeDebateValidationPassed,
  fourDebateCohortReplayPassed: analysis.gate.fourDebateCohortReplayPassed,
  correctedFieldCount: analysis.gate.correctedFieldCount,
  acceptedCohortDebates: analysis.gate.acceptedCohortDebates,
  acceptedCohortMoves: analysis.gate.acceptedCohortMoves,
  attempts: analysis.gate.attempts, retries: 0, meteredApiCostUsd: 0,
  paidServiceCalls: 0, modelAuthoredScores: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
