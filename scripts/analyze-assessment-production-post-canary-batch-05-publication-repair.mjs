#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_05_DEBATE_64_REPAIR_ROOT,
  mergeAndValidateDebate64Repair
} from "./lib/assessment-production-post-canary-batch-05-publication-repair.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT = POST_CANARY_BATCH_05_DEBATE_64_REPAIR_ROOT;
const [preparation, activation, execution] = await Promise.all([
  readFile(path.resolve(`${ROOT}/execution-preparation-manifest.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(`${ROOT}/execution-activation.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(`${ROOT}/model-execution.json`), "utf8").then(JSON.parse)
]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `repair analysis source hash mismatch: ${file}`);
}
assertV4(
  execution.contextsPlanned === 1 && execution.contextsAttempted === 1 &&
    execution.attempts === 1 && execution.retries === 0 &&
    execution.timeoutExtensions === 0 && execution.recursiveCorrectionContexts === 0 &&
    execution.meteredApiCostUsd === 0 && execution.paidServiceCallsThisStage === 0 &&
    execution.modelAuthoredScores === 0,
  "the Debate 64 repair execution record changed"
);
if (shouldWrite) {
  for (const file of [activation.artifacts.analysis, activation.artifacts.mergedOutput,
    activation.artifacts.completeValidation, activation.artifacts.mergeAudit]) {
    assertV4(!(await exists(file)), `${file} already exists`);
  }
}

let merge = null;
let failureMessage = null;
let baseOutputBytes = null;
let repairOutputBytes = null;
if (execution.validContexts === 1 && execution.invalidContexts === 0 &&
    execution.results[0].gateAcceptancePassed) {
  try {
    const context = activation.contexts[0];
    const [baseBytes, publicationPacketBytes, repairPacketBytes, outputBytes, diagnosis] =
      await Promise.all([
        readFile(path.resolve(preparation.inputs.immutableBaseOutput)),
        readFile(path.resolve(preparation.inputs.publicationPacket)),
        readFile(path.resolve(context.packet)),
        readFile(path.resolve(context.repairOutput)),
        readFile(path.resolve(preparation.inputs.diagnosis), "utf8").then(JSON.parse)
      ]);
    baseOutputBytes = baseBytes;
    repairOutputBytes = outputBytes;
    assertV4(sha256(baseBytes) === diagnosis.failedContext.outputSha256,
      "the original failed Debate 64 output changed before merge");
    assertV4(sha256(outputBytes) === execution.results[0].repairOutputSha256,
      "the repair output hash changed before merge");
    merge = mergeAndValidateDebate64Repair({
      baseOutput: JSON.parse(baseBytes), repair: JSON.parse(outputBytes),
      repairPacket: JSON.parse(repairPacketBytes),
      publicationPacket: JSON.parse(publicationPacketBytes)
    });
  } catch (error) { failureMessage = (error.stack ?? error.message).slice(-10000); }
}
const passed = execution.validContexts === 1 && merge?.fullValidation?.status === "passed";
const correctedFields = execution.results[0].validationSummary?.correctedFields ?? [];
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-debate-64-publication-repair-analysis",
  protocolId: activation.protocolId,
  status: passed
    ? "batch-05-debate-64-bounded-repair-and-complete-publication-validation-passed"
    : "batch-05-debate-64-bounded-repair-or-complete-publication-validation-failed",
  productionCanary: false, batchNumber: 5, stagingOnly: true,
  gate: {
    repairContextsPlanned: 1, repairContextsAttempted: 1,
    repairContextsPassed: execution.validContexts,
    repairContextsFailed: execution.invalidContexts,
    completeDebateValidationPassed: passed,
    correctedFields, correctedFieldCount: correctedFields.length,
    movesValidated: merge?.fullValidation?.moves ?? 0,
    critiquesValidated: merge?.fullValidation?.critiques ?? 0,
    exactSourceQuotesValidated: merge?.fullValidation?.quoteExactSourceMatches ?? 0,
    overallCommentarySidesValidated: merge?.fullValidation?.overallCommentarySides ?? 0,
    aiExtensionSidesValidated: merge?.fullValidation?.aiExtensionSides ?? 0,
    immutableFieldsChanged: passed ? 0 : null,
    attempts: 1, retries: 0, timeoutExtensions: 0,
    recursiveCorrectionContexts: 0, modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0
  },
  failureMessage,
  artifacts: {
    originalFailedOutput: preparation.inputs.immutableBaseOutput,
    originalFailedOutputPreserved: true,
    repairOutput: activation.contexts[0].repairOutput,
    mergedOutput: passed ? activation.artifacts.mergedOutput : null,
    completeValidation: passed ? activation.artifacts.completeValidation : null,
    mergeAudit: passed ? activation.artifacts.mergeAudit : null
  },
  totals: {
    modelContexts: 1, meteredApiCostUsd: 0, paidServiceCallsThisStage: 0,
    transcriptionCostUsdThisStage: 0, modelAuthoredScores: 0
  },
  authorization: {
    sevenContextResumptionManifestPreparation: passed,
    sevenContextModelExecution: false, retry: false, timeoutExtension: false,
    recursiveCorrectionModelExecution: false, publicationFinalization: false,
    renderingVerification: false, productionMutation: false, nextBatchSelection: false
  },
  nextAuthorizedAction: passed
    ? "prepare-a-separate-seven-context-batch-05-publication-resumption-manifest"
    : "stop-after-failed-bounded-debate-64-publication-repair"
};

if (shouldWrite && passed) {
  const mergedBytes = Buffer.from(`${JSON.stringify(merge.merged, null, 2)}\n`);
  const completeValidation = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-05-debate-64-complete-publication-validation",
    protocolId: activation.protocolId, status: "passed", debateNumber: "64",
    mergedOutputSha256: sha256(mergedBytes), validationSummary: merge.fullValidation,
    originalFailedOutputPreserved: true, authorizedFieldsChanged: 2,
    immutableFieldsChanged: 0, modelAuthoredScores: 0, lockedScoresUnchanged: true
  };
  const mergeAudit = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-05-debate-64-publication-repair-merge-audit",
    protocolId: activation.protocolId, status: "passed", debateNumber: "64",
    originalFailedOutput: preparation.inputs.immutableBaseOutput,
    originalFailedOutputSha256: sha256(baseOutputBytes),
    repairOutput: { path: activation.contexts[0].repairOutput, sha256: sha256(repairOutputBytes) },
    mergedOutput: activation.artifacts.mergedOutput, mergedOutputSha256: sha256(mergedBytes),
    authorizedTransformations: merge.transformations,
    authorizedFieldsChanged: 2, immutableFieldsChanged: 0,
    completeDebateValidation: merge.fullValidation,
    modelAuthoredScores: 0, lockedScoresUnchanged: true
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
console.log(JSON.stringify({
  status: analysis.status, repairContextsAttempted: 1,
  repairContextsPassed: analysis.gate.repairContextsPassed,
  completeDebateValidationPassed: analysis.gate.completeDebateValidationPassed,
  correctedFieldCount: analysis.gate.correctedFieldCount,
  movesValidated: analysis.gate.movesValidated,
  critiquesValidated: analysis.gate.critiquesValidated,
  attempts: 1, retries: 0, meteredApiCostUsd: 0,
  paidServiceCalls: 0, modelAuthoredScores: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction
}, null, 2));
