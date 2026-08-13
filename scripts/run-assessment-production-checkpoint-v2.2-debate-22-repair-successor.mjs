#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validateCheckpointV22PublicationOutput } from "./lib/assessment-production-checkpoint-v2.2-publication-validation.mjs";
import {
  CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT,
  mergeAndValidateDebate22Repairs,
  validateDebate22RepairOutput
} from "./lib/assessment-production-checkpoint-v2.2-debate-22-repair.mjs";
import {
  CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ORDER,
  CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ROOT
} from "./lib/assessment-production-checkpoint-v2.2-debate-22-repair-successor.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const preparationPath = `${CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ROOT}/preparation-manifest.json`;
const activationPath = `${CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ROOT}/execution-activation.json`;
const [preparation, activation] = await Promise.all([
  readFile(path.resolve(preparationPath), "utf8").then(JSON.parse),
  readFile(path.resolve(activationPath), "utf8").then(JSON.parse)
]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(
  preparation.status === "explicit-order-model-free-complete-cohort-successor-prepared-and-frozen" &&
    activation.status === "explicit-order-model-free-complete-cohort-successor-authorized-and-frozen" &&
    activation.authorization.deterministicSuccessorExecution === true &&
    activation.authorization.modelExecution === false &&
    activation.authorization.retry === false &&
    activation.authorization.deterministicCompilation === false &&
    activation.authorization.productionMutation === false &&
    activation.executionPolicy.iterateExplicitOrderArrayDirectly === true &&
    JSON.stringify(activation.intendedOrder) === JSON.stringify(CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ORDER),
  "explicit-order successor execution is not authorized or controls changed"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest, `successor source hash mismatch: ${file}`);
}
for (const file of activation.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(file)), `successor future output already exists: ${file}`);
}

const startedAt = new Date().toISOString();
const started = Date.now();
let outputArtifactsWritten = false;
let status = "failed";
let failureMessage = null;
let debate22Validation = null;
let cohortRows = [];
let totals = null;
let transformations = [];
let mergedBytes = null;
let originalBaseOutputSha256 = null;
try {
  const repairPreparation = JSON.parse(await readFile(path.resolve(preparation.inputs.repairPreparation), "utf8"));
  const repairActivation = JSON.parse(await readFile(path.resolve(preparation.inputs.repairActivation), "utf8"));
  const repairExecution = JSON.parse(await readFile(path.resolve(preparation.inputs.repairExecution), "utf8"));
  assertV4(
    repairExecution.status === "seven-debate-22-publication-repair-contexts-passed" &&
      repairExecution.validContexts === 7 && repairExecution.invalidContexts === 0 &&
      repairExecution.retries === 0 && repairExecution.furtherCorrectionContexts === 0,
    "accepted repair execution changed"
  );
  const repairs = [];
  const repairPackets = [];
  for (const context of repairActivation.contexts) {
    const result = repairExecution.results.find(({ contextIndex }) => contextIndex === context.contextIndex);
    const [repairBytes, packet] = await Promise.all([
      readFile(path.resolve(context.repairOutput)),
      readFile(path.resolve(context.packet), "utf8").then(JSON.parse)
    ]);
    assertV4(
      result?.gateAcceptancePassed === true && result.attemptCount === 1 && result.retryCount === 0 &&
        result.repairOutputSha256 === sha256(repairBytes),
      `repair packet ${context.packetIndex} provenance changed`
    );
    const repair = JSON.parse(repairBytes);
    assertV4(validateDebate22RepairOutput(repair, packet).status === "passed", `repair packet ${context.packetIndex} replay failed`);
    repairs.push(repair);
    repairPackets.push(packet);
  }
  const [baseBytes, publicationPacket] = await Promise.all([
    readFile(path.resolve(repairPreparation.inputs.immutableBaseOutput)),
    readFile(path.resolve(repairPreparation.inputs.publicationPacket), "utf8").then(JSON.parse)
  ]);
  originalBaseOutputSha256 = sha256(baseBytes);
  const merge = mergeAndValidateDebate22Repairs({
    baseOutput: JSON.parse(baseBytes),
    repairs,
    repairPackets,
    publicationPacket
  });
  debate22Validation = merge.fullValidation;
  transformations = merge.transformations;
  mergedBytes = Buffer.from(`${JSON.stringify(merge.merged, null, 2)}\n`);
  assertV4(
    debate22Validation.status === "passed" && debate22Validation.moves === 19 && debate22Validation.critiques === 19 &&
      transformations.length === 13 && debate22Validation.calculatedScoresAuthoredByModel === 0 &&
      debate22Validation.lockedScoresUnchanged === true,
    "complete Debate 22 successor validation failed"
  );

  // Do not enumerate numeric object keys here. The frozen array is the sole loop driver.
  for (const debateNumber of CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ORDER) {
    const packetPath = preparation.cohortPackets[debateNumber];
    const packetBytes = await readFile(path.resolve(packetPath));
    const packet = JSON.parse(packetBytes);
    const outputPath = debateNumber === "22"
      ? activation.artifacts.mergedOutput
      : preparation.existingCohortOutputs[debateNumber];
    const outputBytes = debateNumber === "22" ? mergedBytes : await readFile(path.resolve(outputPath));
    const output = debateNumber === "22" ? merge.merged : JSON.parse(outputBytes);
    cohortRows.push({
      debateNumber,
      debateId: packet.debateId,
      output: outputPath,
      outputSha256: sha256(outputBytes),
      packet: packetPath,
      packetSha256: sha256(packetBytes),
      validation: validateCheckpointV22PublicationOutput(output, packet)
    });
  }
  totals = {
    debates: cohortRows.length,
    moves: cohortRows.reduce((sum, row) => sum + row.validation.moves, 0),
    critiques: cohortRows.reduce((sum, row) => sum + row.validation.critiques, 0),
    exactSourceQuotes: cohortRows.reduce((sum, row) => sum + row.validation.quoteExactSourceMatches, 0),
    overallCommentarySides: cohortRows.reduce((sum, row) => sum + row.validation.overallCommentarySides, 0),
    aiExtensionSides: cohortRows.reduce((sum, row) => sum + row.validation.aiExtensionSides, 0),
    noveltyItems: cohortRows.reduce((sum, row) => sum + row.validation.noveltyItems, 0),
    introducedItems: cohortRows.reduce((sum, row) => sum + row.validation.introducedItems, 0),
    newArguments: cohortRows.reduce((sum, row) => sum + row.validation.newArguments, 0),
    modelAuthoredScores: 0
  };
  assertV4(
    JSON.stringify(cohortRows.map(({ debateNumber }) => debateNumber)) === JSON.stringify(CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ORDER) &&
      totals.debates === 10 && totals.moves === 188 && totals.critiques === 188 &&
      totals.exactSourceQuotes === 20 && totals.overallCommentarySides === 20 && totals.aiExtensionSides === 20 &&
      cohortRows.every((row) =>
        row.validation.status === "passed" && row.validation.calculatedScoresAuthoredByModel === 0 && row.validation.lockedScoresUnchanged === true
      ),
    "complete explicit-order publication cohort validation failed"
  );
  const completeDebateValidation = {
    schemaVersion: "1.0-production-checkpoint-v2.2-debate-22-explicit-order-successor-complete-validation",
    protocolId: activation.protocolId,
    status: "passed",
    debateNumber: "22",
    mergedOutputSha256: sha256(mergedBytes),
    validationSummary: debate22Validation,
    originalFailedOutputPreserved: true,
    immutableFieldsChanged: 0,
    modelAuthoredScores: 0,
    lockedScoresUnchanged: true
  };
  const mergeAudit = {
    schemaVersion: "1.0-production-checkpoint-v2.2-debate-22-explicit-order-successor-merge-audit",
    protocolId: activation.protocolId,
    status: "passed",
    debateNumber: "22",
    originalFailedOutput: repairPreparation.inputs.immutableBaseOutput,
    originalFailedOutputSha256: originalBaseOutputSha256,
    repairOutputs: repairActivation.contexts.map((context) => ({
      packetIndex: context.packetIndex,
      path: context.repairOutput,
      sha256: repairExecution.results.find((result) => result.packetIndex === context.packetIndex).repairOutputSha256
    })),
    mergedOutput: activation.artifacts.mergedOutput,
    mergedOutputSha256: sha256(mergedBytes),
    authorizedTransformations: transformations,
    authorizedFieldsChanged: transformations.length,
    immutableFieldsChanged: 0,
    completeDebateValidation: debate22Validation,
    modelAuthoredScores: 0,
    lockedScoresUnchanged: true
  };
  const completeCohortValidation = {
    schemaVersion: "1.0-production-checkpoint-v2.2-explicit-order-successor-complete-cohort-validation",
    protocolId: activation.protocolId,
    status: "passed",
    explicitOrderLoop: true,
    cohortOrder: CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ORDER,
    rows: cohortRows,
    totals,
    participantJudgmentWasScoreBlind: true,
    participantJudgmentClosed: true,
    scoresRecalculated: false,
    scoresChanged: false,
    modelAuthoredScores: 0,
    deterministicCompilationPerformed: false,
    publicationFinalizationPerformed: false,
    renderingVerificationPerformed: false,
    productionMutationPerformed: false
  };
  await mkdir(path.dirname(path.resolve(activation.artifacts.mergedOutput)), { recursive: true });
  await writeFile(path.resolve(activation.artifacts.mergedOutput), mergedBytes);
  await writeFile(path.resolve(activation.artifacts.completeDebateValidation), `${JSON.stringify(completeDebateValidation, null, 2)}\n`);
  await writeFile(path.resolve(activation.artifacts.mergeAudit), `${JSON.stringify(mergeAudit, null, 2)}\n`);
  await writeFile(path.resolve(activation.artifacts.completeCohortValidation), `${JSON.stringify(completeCohortValidation, null, 2)}\n`);
  outputArtifactsWritten = true;
  status = "passed";
} catch (error) {
  failureMessage = (error.stack ?? error.message).slice(-10000);
}
const execution = {
  schemaVersion: "1.0-production-checkpoint-v2.2-debate-22-explicit-order-successor-execution",
  protocolId: activation.protocolId,
  status: status === "passed" ? "explicit-order-complete-cohort-successor-passed" : "explicit-order-complete-cohort-successor-failed",
  startedAt,
  completedAt: new Date().toISOString(),
  elapsedMs: Date.now() - started,
  explicitOrder: CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ORDER,
  repairOutputsReused: 7,
  repairAttempts: 0,
  modelContexts: 0,
  retries: 0,
  directCostUsd: 0,
  debate22Validation,
  cohortTotals: totals,
  outputArtifactsWritten,
  failureMessage,
  deterministicCompilationPerformed: false,
  publicationFinalizationPerformed: false,
  renderingVerificationPerformed: false,
  productionMutationPerformed: false
};
const analysis = {
  schemaVersion: "1.0-production-checkpoint-v2.2-debate-22-explicit-order-successor-analysis",
  protocolId: activation.protocolId,
  status: status === "passed" ? "complete-ten-debate-publication-cohort-validation-passed" : "complete-ten-debate-publication-cohort-validation-failed",
  productionCanary: true,
  stagingOnly: true,
  gate: {
    sourceHashesPassed: failureMessage === null,
    explicitOrderPassed: status === "passed",
    debate22CompleteValidationPassed: debate22Validation?.status === "passed",
    completeCohortValidationPassed: status === "passed",
    outputArtifactsWritten,
    repairOutputsReused: 7,
    repairAttempts: 0,
    modelContexts: 0,
    retries: 0,
    modelAuthoredScores: 0,
    scoresRecalculated: false,
    scoresChanged: false,
    directCostUsd: 0,
    elapsedSeconds: Number(((Date.now() - started) / 1000).toFixed(3))
  },
  totals,
  failureMessage,
  artifacts: status === "passed" ? activation.artifacts : { execution: activation.artifacts.execution, analysis: activation.artifacts.analysis },
  authorization: {
    deterministicCompilationPlanPreparation: status === "passed",
    deterministicCompilation: false,
    publicationFinalization: false,
    renderingVerification: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  nextAuthorizedAction: status === "passed"
    ? "user-decision-on-deterministic-publication-compilation-plan-preparation"
    : "failure-diagnosis-only"
};
await writeFile(path.resolve(activation.artifacts.execution), `${JSON.stringify(execution, null, 2)}\n`);
await writeFile(path.resolve(activation.artifacts.analysis), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({
  status: analysis.status,
  explicitOrder: execution.explicitOrder,
  repairOutputsReused: 7,
  repairAttempts: 0,
  modelContexts: 0,
  debate22CompleteValidationPassed: analysis.gate.debate22CompleteValidationPassed,
  completeCohortValidationPassed: analysis.gate.completeCohortValidationPassed,
  totals,
  outputArtifactsWritten,
  elapsedSeconds: analysis.gate.elapsedSeconds,
  directCostUsd: 0,
  productionMutation: false,
  nextAuthorizedAction: analysis.nextAuthorizedAction
}, null, 2));
if (status !== "passed") process.exitCode = 1;
