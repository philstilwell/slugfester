#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_03_DEBATE_157_REPAIR_ROOT,
  mergeAndValidateDebate157Repairs
} from "./lib/assessment-production-post-canary-batch-03-publication-resumption-2-repair.mjs";
import { validatePostCanaryBatch03PublicationOutput } from "./lib/assessment-production-post-canary-batch-03-publication-validation.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT = POST_CANARY_BATCH_03_DEBATE_157_REPAIR_ROOT;
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
  execution.contextsPlanned === 8 &&
    execution.contextsAttempted >= 1 &&
    execution.contextsAttempted <= 8 &&
    execution.attempts === execution.contextsAttempted &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.recursiveCorrectionContexts === 0 &&
    execution.meteredApiCostUsd === 0 &&
    execution.paidServiceCallsThisStage === 0 &&
    execution.modelAuthoredScores === 0,
  "the Debate 157 repair execution record changed"
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
let cohortRows = [];
if (
  execution.contextsAttempted === 8 &&
  execution.validContexts === 8 &&
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
      "the original failed Debate 157 output changed before repair merge"
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
    for (let index = 0; index < 8; index += 1) {
      assertV4(
        sha256(repairOutputBytes[index]) ===
          execution.results[index].repairOutputSha256,
        `repair output ${index} hash mismatch`
      );
    }
    merge = mergeAndValidateDebate157Repairs({
      baseOutput: JSON.parse(baseBytes),
      repairs: repairOutputBytes.map((bytes) => JSON.parse(bytes)),
      repairPackets,
      publicationPacket: JSON.parse(publicationPacketBytes)
    });
    const failedResumptionPreparation = JSON.parse(
      await readFile(path.resolve(preparation.inputs.failedResumptionPreparation), "utf8")
    );
    for (const accepted of Object.values(failedResumptionPreparation.acceptedOutputs)) {
      const [output, packet] = await Promise.all([
        readFile(path.resolve(accepted.output), "utf8").then(JSON.parse),
        readFile(path.resolve(accepted.packet), "utf8").then(JSON.parse)
      ]);
      cohortRows.push({
        debateNumber: accepted.debateNumber,
        source: "accepted-prior-output",
        validation: validatePostCanaryBatch03PublicationOutput(output, packet)
      });
    }
    cohortRows.push({
      debateNumber: "157",
      source: "merged-repair-output",
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
    modelAuthoredScores:
      sum.modelAuthoredScores + row.validation.calculatedScoresAuthoredByModel,
    lockedScoresUnchanged:
      sum.lockedScoresUnchanged && row.validation.lockedScoresUnchanged
  }),
  {
    debates: 0,
    moves: 0,
    critiques: 0,
    exactSourceQuotes: 0,
    overallCommentarySides: 0,
    aiExtensionSides: 0,
    modelAuthoredScores: 0,
    lockedScoresUnchanged: true
  }
);
const passed =
  execution.validContexts === 8 &&
  merge?.fullValidation?.status === "passed" &&
  merge?.transformations?.length === 16 &&
  cohortTotals.debates === 5 &&
  cohortTotals.moves === 103 &&
  cohortTotals.critiques === 103 &&
  cohortTotals.exactSourceQuotes === 10 &&
  cohortTotals.overallCommentarySides === 10 &&
  cohortTotals.aiExtensionSides === 10 &&
  cohortTotals.modelAuthoredScores === 0 &&
  cohortTotals.lockedScoresUnchanged === true;
const correctedFields = execution.results.flatMap(
  (result) => result.validationSummary?.correctedFields ?? []
);
const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-03-publication-resumption-2-debate-157-repair-analysis",
  protocolId: activation.protocolId,
  status: passed
    ? "batch-03-debate-157-publication-resumption-2-bounded-repair-and-complete-publication-validation-passed"
    : "batch-03-debate-157-publication-resumption-2-bounded-repair-or-complete-publication-validation-failed",
  productionCanary: false,
  batchNumber: 3,
  stagingOnly: true,
  gate: {
    repairContextsPlanned: 8,
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
    completeFiveDebateCohortReplayPassed: passed,
    cohort: cohortTotals,
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
    fiveContextResumptionManifestPreparation: passed,
    fiveContextModelExecution: false,
    retry: false,
    timeoutExtension: false,
    recursiveCorrectionModelExecution: false,
    publicationFinalization: false,
    renderingVerification: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: passed
    ? "prepare-a-separate-five-context-batch-03-publication-resumption-3-manifest-under-standing-authorizations"
    : "stop-and-request-user-approval-after-failed-bounded-debate-157-publication-repair"
};

if (shouldWrite && passed) {
  const mergedBytes = Buffer.from(`${JSON.stringify(merge.merged, null, 2)}\n`);
  const completeValidation = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-03-publication-resumption-2-debate-157-complete-validation",
    protocolId: activation.protocolId,
    status: "passed",
    debateNumber: "157",
    mergedOutputSha256: sha256(mergedBytes),
    validationSummary: merge.fullValidation,
    originalFailedOutputPreserved: true,
    authorizedFieldsChanged: 16,
    immutableFieldsChanged: 0,
    modelAuthoredScores: 0,
    lockedScoresUnchanged: true
  };
  const mergeAudit = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-03-publication-resumption-2-debate-157-repair-merge-audit",
    protocolId: activation.protocolId,
    status: "passed",
    debateNumber: "157",
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
    completeFiveDebateCohortReplay: cohortTotals,
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
