#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_01_DEBATE_31_REPAIR_ROOT,
  mergeAndValidateDebate31Repairs
} from "./lib/assessment-production-post-canary-batch-01-publication-repair.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT = POST_CANARY_BATCH_01_DEBATE_31_REPAIR_ROOT;
const [preparation, activation, execution] = await Promise.all([
  readFile(path.resolve(`${ROOT}/execution-preparation-manifest.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(`${ROOT}/execution-activation.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(`${ROOT}/model-execution.json`), "utf8").then(JSON.parse)
]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) =>
  access(path.resolve(file)).then(() => true, () => false);

for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `repair analysis source hash mismatch: ${file}`
  );
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
    execution.modelAuthoredScores === 0,
  "the Debate 31 repair execution record changed"
);
if (shouldWrite) {
  for (const file of [
    activation.artifacts.analysis,
    activation.artifacts.mergedOutput,
    activation.artifacts.completeValidation,
    activation.artifacts.mergeAudit
  ]) {
    assertV4(!(await exists(file)), `${file} already exists`);
  }
}

let merge = null;
let failureMessage = null;
let baseOutputBytes = null;
let repairOutputBytes = [];
if (
  execution.contextsAttempted === 7 &&
  execution.validContexts === 7 &&
  execution.invalidContexts === 0 &&
  execution.results.every((result) => result.gateAcceptancePassed)
) {
  try {
    const [baseBytes, publicationPacketBytes, diagnosis] = await Promise.all([
      readFile(path.resolve(preparation.inputs.immutableBaseOutput)),
      readFile(path.resolve(preparation.inputs.publicationPacket)),
      readFile(path.resolve(preparation.inputs.diagnosis), "utf8").then(JSON.parse)
    ]);
    baseOutputBytes = baseBytes;
    assertV4(
      sha256(baseBytes) === diagnosis.failedContext.outputSha256,
      "the original failed Debate 31 output changed before repair merge"
    );
    const repairPackets = await Promise.all(
      activation.contexts.map((context) =>
        readFile(path.resolve(context.packet), "utf8").then(JSON.parse)
      )
    );
    repairOutputBytes = await Promise.all(
      activation.contexts.map((context) =>
        readFile(path.resolve(context.repairOutput))
      )
    );
    for (let index = 0; index < 7; index += 1) {
      assertV4(
        sha256(repairOutputBytes[index]) ===
          execution.results[index].repairOutputSha256,
        `repair output ${index} hash mismatch`
      );
    }
    merge = mergeAndValidateDebate31Repairs({
      baseOutput: JSON.parse(baseBytes),
      repairs: repairOutputBytes.map((bytes) => JSON.parse(bytes)),
      repairPackets,
      publicationPacket: JSON.parse(publicationPacketBytes)
    });
  } catch (error) {
    failureMessage = (error.stack ?? error.message).slice(-10000);
  }
}

const passed =
  execution.validContexts === 7 && merge?.fullValidation?.status === "passed";
const correctedFields = execution.results.flatMap(
  (result) => result.validationSummary?.correctedFields ?? []
);
const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-debate-31-publication-repair-analysis",
  protocolId: activation.protocolId,
  status: passed
    ? "batch-01-debate-31-bounded-repair-and-complete-publication-validation-passed"
    : "batch-01-debate-31-bounded-repair-or-complete-publication-validation-failed",
  productionCanary: false,
  batchNumber: 1,
  stagingOnly: true,
  gate: {
    repairContextsPlanned: 7,
    repairContextsAttempted: execution.contextsAttempted,
    repairContextsPassed: execution.validContexts,
    repairContextsFailed: execution.invalidContexts,
    repairContextsUnattempted: execution.contextsUnattempted,
    completeDebateValidationPassed: passed,
    correctedFields,
    correctedFieldCount: correctedFields.length,
    movesValidated: merge?.fullValidation?.moves ?? 0,
    critiquesValidated: merge?.fullValidation?.critiques ?? 0,
    exactSourceQuotesValidated:
      merge?.fullValidation?.quoteExactSourceMatches ?? 0,
    overallCommentarySidesValidated:
      merge?.fullValidation?.overallCommentarySides ?? 0,
    aiExtensionSidesValidated: merge?.fullValidation?.aiExtensionSides ?? 0,
    immutableFieldsChanged: passed ? 0 : null,
    attempts: execution.attempts,
    retries: 0,
    timeoutExtensions: 0,
    recursiveCorrectionContexts: 0,
    modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0
  },
  failureMessage,
  artifacts: {
    originalFailedOutput: preparation.inputs.immutableBaseOutput,
    originalFailedOutputPreserved: true,
    repairOutputs: activation.contexts.map((context) => context.repairOutput),
    mergedOutput: passed ? activation.artifacts.mergedOutput : null,
    completeValidation: passed
      ? activation.artifacts.completeValidation
      : null,
    mergeAudit: passed ? activation.artifacts.mergeAudit : null
  },
  totals: {
    modelContexts: execution.contextsAttempted,
    meteredApiCostUsd: 0,
    paidServiceCallsThisStage: 0,
    transcriptionCostUsdThisStage: 0,
    modelAuthoredScores: 0
  },
  authorization: {
    nineContextResumptionManifestPreparation: passed,
    nineContextModelExecution: false,
    retry: false,
    timeoutExtension: false,
    recursiveCorrectionModelExecution: false,
    publicationFinalization: false,
    renderingVerification: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: passed
    ? "user-approval-required-before-preparation-of-a-separate-nine-context-batch-01-publication-resumption-manifest-only"
    : "failure-diagnosis-only"
};

if (shouldWrite && passed) {
  const mergedBytes = Buffer.from(`${JSON.stringify(merge.merged, null, 2)}\n`);
  const completeValidation = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-01-debate-31-complete-publication-validation",
    protocolId: activation.protocolId,
    status: "passed",
    debateNumber: "31",
    mergedOutputSha256: sha256(mergedBytes),
    validationSummary: merge.fullValidation,
    originalFailedOutputPreserved: true,
    authorizedFieldsChanged: 14,
    immutableFieldsChanged: 0,
    modelAuthoredScores: 0,
    lockedScoresUnchanged: true
  };
  const mergeAudit = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-01-debate-31-publication-repair-merge-audit",
    protocolId: activation.protocolId,
    status: "passed",
    debateNumber: "31",
    originalFailedOutput: preparation.inputs.immutableBaseOutput,
    originalFailedOutputSha256: sha256(baseOutputBytes),
    repairOutputs: activation.contexts.map((context, index) => ({
      packetIndex: index,
      path: context.repairOutput,
      sha256: sha256(repairOutputBytes[index])
    })),
    mergedOutput: activation.artifacts.mergedOutput,
    mergedOutputSha256: sha256(mergedBytes),
    authorizedTransformations: merge.transformations,
    authorizedFieldsChanged: merge.transformations.length,
    immutableFieldsChanged: 0,
    completeDebateValidation: merge.fullValidation,
    modelAuthoredScores: 0,
    lockedScoresUnchanged: true
  };
  await mkdir(path.dirname(path.resolve(activation.artifacts.mergedOutput)), {
    recursive: true
  });
  await writeFile(path.resolve(activation.artifacts.mergedOutput), mergedBytes);
  await writeFile(
    path.resolve(activation.artifacts.completeValidation),
    `${JSON.stringify(completeValidation, null, 2)}\n`
  );
  await writeFile(
    path.resolve(activation.artifacts.mergeAudit),
    `${JSON.stringify(mergeAudit, null, 2)}\n`
  );
}
if (shouldWrite) {
  await writeFile(
    path.resolve(activation.artifacts.analysis),
    `${JSON.stringify(analysis, null, 2)}\n`
  );
}
console.log(JSON.stringify({
  status: analysis.status,
  repairContextsAttempted: analysis.gate.repairContextsAttempted,
  repairContextsPassed: analysis.gate.repairContextsPassed,
  completeDebateValidationPassed:
    analysis.gate.completeDebateValidationPassed,
  correctedFieldCount: analysis.gate.correctedFieldCount,
  movesValidated: analysis.gate.movesValidated,
  critiquesValidated: analysis.gate.critiquesValidated,
  attempts: analysis.gate.attempts,
  retries: 0,
  meteredApiCostUsd: 0,
  paidServiceCalls: 0,
  modelAuthoredScores: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction
}, null, 2));
