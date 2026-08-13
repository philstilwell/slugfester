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
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const [preparation, activation, execution] = await Promise.all([
  readFile(path.resolve(`${CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT}/preparation-manifest.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(`${CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT}/execution-activation.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(`${CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT}/model-execution.json`), "utf8").then(JSON.parse)
]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest, `repair analysis source hash mismatch: ${file}`);
}
assertV4(
  execution.contextsPlanned === 7 &&
    execution.attempts === execution.contextsAttempted &&
    execution.retries === 0 &&
    execution.furtherCorrectionContexts === 0 &&
    execution.modelAuthoredScores === 0,
  "repair execution record changed"
);
if (shouldWrite) {
  for (const file of [
    activation.artifacts.analysis,
    activation.artifacts.mergedOutput,
    activation.artifacts.completeValidation,
    activation.artifacts.mergeAudit,
    activation.artifacts.completeCohortValidation
  ]) {
    assertV4(!(await exists(file)), `${file} already exists`);
  }
}

const contexts = [];
for (const context of activation.contexts) {
  const result = execution.results.find((item) => item.contextIndex === context.contextIndex);
  let replay = null;
  let replayMessage = null;
  if (result?.outputWritten) {
    const [outputBytes, packet] = await Promise.all([
      readFile(path.resolve(context.repairOutput)),
      readFile(path.resolve(context.packet), "utf8").then(JSON.parse)
    ]);
    assertV4(sha256(outputBytes) === result.repairOutputSha256, `packet ${context.packetIndex}: repair output hash mismatch`);
    try {
      replay = validateDebate22RepairOutput(JSON.parse(outputBytes), packet);
    } catch (error) {
      replayMessage = (error.stack ?? error.message).slice(-10000);
    }
    if (result.gateAcceptancePassed) {
      assertV4(replay?.status === "passed", `packet ${context.packetIndex}: accepted repair replay failed`);
    }
  }
  contexts.push({
    contextIndex: context.contextIndex,
    packetIndex: context.packetIndex,
    status: result?.status ?? "unattempted",
    accepted: Boolean(result?.gateAcceptancePassed && replay?.status === "passed"),
    elapsedMinutes: result ? Number((result.elapsedMs / 60000).toFixed(2)) : null,
    correctedFields: replay?.correctedFields ?? [],
    validationReplayed: replay?.status === "passed",
    replayMessage,
    modelAuthoredScores: replay?.modelAuthoredScores ?? null
  });
}
const valid = contexts.filter((context) => context.accepted);
const repairSemanticPass =
  valid.length === 7 &&
  valid.reduce((sum, context) => sum + context.correctedFields.length, 0) === 13 &&
  valid.every((context) => context.modelAuthoredScores === 0);

let merge = null;
let failureMessage = null;
let baseOutputBytes = null;
if (repairSemanticPass) {
  try {
    const [baseBytes, publicationPacket, diagnosis, repairs, repairPackets] = await Promise.all([
      readFile(path.resolve(preparation.inputs.immutableBaseOutput)),
      readFile(path.resolve(preparation.inputs.publicationPacket), "utf8").then(JSON.parse),
      readFile(path.resolve(preparation.inputs.diagnosis), "utf8").then(JSON.parse),
      Promise.all(activation.contexts.map((context) => readFile(path.resolve(context.repairOutput), "utf8").then(JSON.parse))),
      Promise.all(activation.contexts.map((context) => readFile(path.resolve(context.packet), "utf8").then(JSON.parse)))
    ]);
    baseOutputBytes = baseBytes;
    assertV4(sha256(baseBytes) === diagnosis.failedContext.outputSha256, "original failed Debate 22 output changed before merge");
    merge = mergeAndValidateDebate22Repairs({
      baseOutput: JSON.parse(baseBytes),
      repairs,
      repairPackets,
      publicationPacket
    });
  } catch (error) {
    failureMessage = (error.stack ?? error.message).slice(-10000);
  }
}
const completeDebateValidationPassed = merge?.fullValidation?.status === "passed";

let cohortRows = [];
let cohortFailureMessage = null;
let mergedBytes = null;
if (completeDebateValidationPassed) {
  try {
    mergedBytes = Buffer.from(`${JSON.stringify(merge.merged, null, 2)}\n`);
    for (const [debateNumber, packetPath] of Object.entries(preparation.cohortPackets)) {
      const packet = JSON.parse(await readFile(path.resolve(packetPath), "utf8"));
      const outputPath = debateNumber === "22"
        ? activation.artifacts.mergedOutput
        : preparation.acceptedCohortOutputs[debateNumber];
      const outputBytes = debateNumber === "22"
        ? mergedBytes
        : await readFile(path.resolve(outputPath));
      const output = debateNumber === "22" ? merge.merged : JSON.parse(outputBytes);
      const validation = validateCheckpointV22PublicationOutput(output, packet);
      cohortRows.push({
        debateNumber,
        debateId: packet.debateId,
        output: outputPath,
        outputSha256: sha256(outputBytes),
        packet: packetPath,
        packetSha256: sha256(await readFile(path.resolve(packetPath))),
        validation
      });
    }
  } catch (error) {
    cohortFailureMessage = (error.stack ?? error.message).slice(-10000);
  }
}
const cohortTotals = {
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
const expectedDebates = ["50", "192", "129", "40", "25", "104", "22", "10", "167", "122"];
const cohortSemanticPass =
  JSON.stringify(cohortRows.map(({ debateNumber }) => debateNumber)) === JSON.stringify(expectedDebates) &&
  cohortTotals.debates === 10 &&
  cohortTotals.moves === 188 &&
  cohortTotals.critiques === 188 &&
  cohortTotals.exactSourceQuotes === 20 &&
  cohortTotals.overallCommentarySides === 20 &&
  cohortTotals.aiExtensionSides === 20 &&
  cohortRows.every((row) =>
    row.validation.status === "passed" &&
    row.validation.calculatedScoresAuthoredByModel === 0 &&
    row.validation.lockedScoresUnchanged === true
  );
const timingPass =
  execution.results.every((result) =>
    result.elapsedMs <= activation.executionPolicy.timeoutMsPerContext && result.timedOut === false
  ) && execution.wallElapsedMs <= activation.executionPolicy.absoluteGateTimeoutMs;
const passed = repairSemanticPass && completeDebateValidationPassed && cohortSemanticPass && timingPass;
const analysis = {
  schemaVersion: "1.0-production-checkpoint-v2.2-debate-22-publication-repair-analysis",
  protocolId: activation.protocolId,
  status: passed
    ? "debate-22-seven-packet-repair-and-complete-cohort-validation-passed"
    : repairSemanticPass && completeDebateValidationPassed && cohortSemanticPass
      ? "debate-22-publication-repair-failed-timing"
      : "debate-22-publication-repair-or-complete-cohort-validation-failed",
  productionCanary: true,
  stagingOnly: true,
  contexts,
  gate: {
    repairSemanticPass,
    completeDebateValidationPassed,
    completeCohortValidationPassed: cohortSemanticPass,
    timingPass,
    validRepairContexts: valid.length,
    requiredRepairContexts: 7,
    correctedFields: valid.reduce((sum, context) => sum + context.correctedFields.length, 0),
    requiredCorrectedFields: 13,
    debate22MovesValidated: merge?.fullValidation.moves ?? 0,
    debate22CritiquesValidated: merge?.fullValidation.critiques ?? 0,
    debate22ExactSourceQuotesValidated: merge?.fullValidation.quoteExactSourceMatches ?? 0,
    debate22OverallCommentarySidesValidated: merge?.fullValidation.overallCommentarySides ?? 0,
    debate22AIExtensionSidesValidated: merge?.fullValidation.aiExtensionSides ?? 0,
    immutableFieldsChanged: completeDebateValidationPassed ? 0 : null,
    cohortTotals,
    wallElapsedMinutes: Number((execution.wallElapsedMs / 60000).toFixed(2)),
    retries: 0,
    furtherCorrectionContexts: 0,
    modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0
  },
  failureMessage,
  cohortFailureMessage,
  cohortRows,
  artifacts: {
    originalFailedOutput: preparation.inputs.immutableBaseOutput,
    originalFailedOutputPreserved: true,
    repairOutputs: activation.contexts.map(({ repairOutput }) => repairOutput),
    mergedOutput: passed ? activation.artifacts.mergedOutput : null,
    completeValidation: passed ? activation.artifacts.completeValidation : null,
    mergeAudit: passed ? activation.artifacts.mergeAudit : null,
    completeCohortValidation: passed ? activation.artifacts.completeCohortValidation : null
  },
  totals: {
    modelContexts: execution.contextsAttempted,
    cohortDebates: cohortTotals.debates,
    cohortMoves: cohortTotals.moves,
    meteredApiCostUsd: 0,
    transcriptionCostUsdThisStage: 0,
    modelAuthoredScores: 0
  },
  authorization: {
    deterministicCompilationPlanPreparation: passed,
    deterministicCompilation: false,
    retry: false,
    furtherCorrectionModelExecution: false,
    publicationFinalization: false,
    renderingVerification: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  nextAuthorizedAction: passed
    ? "user-decision-on-deterministic-publication-compilation-plan-preparation"
    : "failure-diagnosis-only"
};

if (shouldWrite && passed) {
  const completeValidation = {
    schemaVersion: "1.0-production-checkpoint-v2.2-debate-22-complete-publication-validation",
    protocolId: activation.protocolId,
    status: "passed",
    debateNumber: "22",
    mergedOutputSha256: sha256(mergedBytes),
    validationSummary: merge.fullValidation,
    originalFailedOutputPreserved: true,
    immutableFieldsChanged: 0,
    modelAuthoredScores: 0,
    lockedScoresUnchanged: true
  };
  const mergeAudit = {
    schemaVersion: "1.0-production-checkpoint-v2.2-debate-22-publication-repair-merge-audit",
    protocolId: activation.protocolId,
    status: "passed",
    debateNumber: "22",
    originalFailedOutput: preparation.inputs.immutableBaseOutput,
    originalFailedOutputSha256: sha256(baseOutputBytes),
    repairOutputs: activation.contexts.map((context) => ({
      packetIndex: context.packetIndex,
      path: context.repairOutput,
      sha256: execution.results.find((result) => result.packetIndex === context.packetIndex).repairOutputSha256
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
  const completeCohortValidation = {
    schemaVersion: "1.0-production-checkpoint-v2.2-complete-publication-cohort-validation",
    protocolId: activation.protocolId,
    status: "passed",
    cohortOrder: expectedDebates,
    rows: cohortRows,
    totals: cohortTotals,
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
  await writeFile(path.resolve(activation.artifacts.completeValidation), `${JSON.stringify(completeValidation, null, 2)}\n`);
  await writeFile(path.resolve(activation.artifacts.mergeAudit), `${JSON.stringify(mergeAudit, null, 2)}\n`);
  await writeFile(path.resolve(activation.artifacts.completeCohortValidation), `${JSON.stringify(completeCohortValidation, null, 2)}\n`);
}
if (shouldWrite) {
  await writeFile(path.resolve(activation.artifacts.analysis), `${JSON.stringify(analysis, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: analysis.status,
  validRepairContexts: analysis.gate.validRepairContexts,
  correctedFields: analysis.gate.correctedFields,
  completeDebateValidationPassed,
  completeCohortValidationPassed: cohortSemanticPass,
  debate22MovesValidated: analysis.gate.debate22MovesValidated,
  cohortDebates: cohortTotals.debates,
  cohortMoves: cohortTotals.moves,
  wallElapsedMinutes: analysis.gate.wallElapsedMinutes,
  retries: 0,
  meteredApiCostUsd: 0,
  modelAuthoredScores: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction
}, null, 2));
