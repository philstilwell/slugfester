#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validateCheckpointV22PublicationOutput } from "./lib/assessment-production-checkpoint-v2.2-publication-validation.mjs";
import {
  CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT,
  mergeAndValidateDebate22Repairs,
  validateDebate22RepairOutput
} from "./lib/assessment-production-checkpoint-v2.2-debate-22-repair.mjs";
import {
  CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ARTIFACTS,
  CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_EXISTING_OUTPUTS,
  CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ORDER,
  CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_PACKETS,
  CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_PROTOCOL_ID,
  CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ROOT
} from "./lib/assessment-production-checkpoint-v2.2-debate-22-repair-successor.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const preparationPath = `${CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ROOT}/preparation-manifest.json`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(!(await exists(preparationPath)), `${preparationPath} already exists`);
const inputs = {
  productionWorkflow: "docs/assessment-production-workflow.md",
  readinessWorkflow: "docs/assessment-workflow-v4.2.21.17.41.md",
  rubric: "docs/reassessment-rubric-v2.1.md",
  outputContract: "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md",
  publicationValidator: "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  repairLibrary: "scripts/lib/assessment-production-checkpoint-v2.2-debate-22-repair.mjs",
  repairPreparation: `${CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT}/preparation-manifest.json`,
  repairActivation: `${CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT}/execution-activation.json`,
  repairExecution: `${CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT}/model-execution.json`,
  failedAnalysis: `${CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT}/analysis.json`,
  failureDiagnosis: `${CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT}/analysis-failure-diagnosis.json`
};
const [repairPreparation, repairActivation, repairExecution, failedAnalysis, failureDiagnosis] = await Promise.all(
  [inputs.repairPreparation, inputs.repairActivation, inputs.repairExecution, inputs.failedAnalysis, inputs.failureDiagnosis]
    .map((file) => readFile(path.resolve(file), "utf8").then(JSON.parse))
);
assertV4(
  repairExecution.status === "seven-debate-22-publication-repair-contexts-passed" &&
    repairExecution.contextsAttempted === 7 &&
    repairExecution.validContexts === 7 &&
    repairExecution.invalidContexts === 0 &&
    repairExecution.retries === 0 &&
    repairExecution.furtherCorrectionContexts === 0 &&
    failedAnalysis.status === "debate-22-publication-repair-or-complete-cohort-validation-failed" &&
    failedAnalysis.gate.repairSemanticPass === true &&
    failedAnalysis.gate.completeDebateValidationPassed === true &&
    failedAnalysis.gate.completeCohortValidationPassed === false &&
    failureDiagnosis.status === "diagnosed-complete-cohort-validation-false-negative-from-numeric-key-enumeration" &&
    failureDiagnosis.diagnosticReplay.intendedOrderReplayPassed === true &&
    failureDiagnosis.prospectiveRecoveryOnly.currentlyAuthorized === false &&
    failureDiagnosis.nextRequiredAction === "user-decision-on-model-free-explicit-order-complete-cohort-successor-validation",
  "explicit-order successor source state mismatch"
);
assertV4(
  JSON.stringify(failureDiagnosis.failureBoundary.intendedOrder) === JSON.stringify(CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ORDER),
  "frozen intended cohort order changed"
);

const repairs = [];
const repairPackets = [];
for (const context of repairActivation.contexts) {
  const result = repairExecution.results.find(({ contextIndex }) => contextIndex === context.contextIndex);
  const [repair, repairPacket] = await Promise.all([
    readFile(path.resolve(context.repairOutput), "utf8").then(JSON.parse),
    readFile(path.resolve(context.packet), "utf8").then(JSON.parse)
  ]);
  assertV4(
    result?.gateAcceptancePassed === true &&
      result.attemptCount === 1 &&
      result.retryCount === 0 &&
      validateDebate22RepairOutput(repair, repairPacket).status === "passed",
    `packet ${context.packetIndex}: accepted repair did not replay`
  );
  repairs.push(repair);
  repairPackets.push(repairPacket);
}
const [baseOutput, publicationPacket] = await Promise.all([
  readFile(path.resolve(repairPreparation.inputs.immutableBaseOutput), "utf8").then(JSON.parse),
  readFile(path.resolve(repairPreparation.inputs.publicationPacket), "utf8").then(JSON.parse)
]);
const merge = mergeAndValidateDebate22Repairs({ baseOutput, repairs, repairPackets, publicationPacket });
assertV4(
  merge.fullValidation.status === "passed" &&
    merge.fullValidation.moves === 19 &&
    merge.transformations.length === 13 &&
    merge.fullValidation.lockedScoresUnchanged === true,
  "complete Debate 22 successor preparation replay failed"
);

const replayRows = [];
for (const debateNumber of CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ORDER) {
  const packetPath = CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_PACKETS[debateNumber];
  const packet = await readFile(path.resolve(packetPath), "utf8").then(JSON.parse);
  const outputPath = debateNumber === "22" ? "in-memory-authorized-merge" : CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_EXISTING_OUTPUTS[debateNumber];
  const output = debateNumber === "22"
    ? merge.merged
    : await readFile(path.resolve(outputPath), "utf8").then(JSON.parse);
  replayRows.push({
    debateNumber,
    output: outputPath,
    packet: packetPath,
    validation: validateCheckpointV22PublicationOutput(output, packet)
  });
}
const totals = {
  debates: replayRows.length,
  moves: replayRows.reduce((sum, row) => sum + row.validation.moves, 0),
  critiques: replayRows.reduce((sum, row) => sum + row.validation.critiques, 0),
  exactSourceQuotes: replayRows.reduce((sum, row) => sum + row.validation.quoteExactSourceMatches, 0),
  overallCommentarySides: replayRows.reduce((sum, row) => sum + row.validation.overallCommentarySides, 0),
  aiExtensionSides: replayRows.reduce((sum, row) => sum + row.validation.aiExtensionSides, 0),
  modelAuthoredScores: 0
};
assertV4(
  JSON.stringify(replayRows.map(({ debateNumber }) => debateNumber)) === JSON.stringify(CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ORDER) &&
    totals.debates === 10 && totals.moves === 188 && totals.critiques === 188 &&
    totals.exactSourceQuotes === 20 && totals.overallCommentarySides === 20 && totals.aiExtensionSides === 20 &&
    replayRows.every((row) => row.validation.status === "passed" && row.validation.lockedScoresUnchanged === true),
  "explicit-order successor preparation replay failed"
);

const preparation = {
  schemaVersion: "1.0-production-checkpoint-v2.2-debate-22-publication-repair-explicit-order-successor-preparation",
  protocolId: CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_PROTOCOL_ID,
  status: "explicit-order-model-free-complete-cohort-successor-prepared-and-frozen",
  preparedAt: new Date().toISOString(),
  productionCanary: true,
  stagingOnly: true,
  modelExecution: false,
  directCostUsd: 0,
  intendedOrder: CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ORDER,
  inputs,
  repairPackets: repairActivation.contexts.map(({ packetIndex, packet, repairOutput, writableFields }) => ({
    packetIndex, packet, repairOutput, writableFields
  })),
  existingCohortOutputs: CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_EXISTING_OUTPUTS,
  cohortPackets: CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_PACKETS,
  preparationReplay: { debate22: merge.fullValidation, rows: replayRows, totals },
  artifacts: CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ARTIFACTS,
  controls: {
    iterateExplicitOrderArrayDirectly: true,
    mergeOnlyThirteenAuthorizedCritiqueFields: true,
    validateCompleteDebate22BeforeCohort: true,
    persistMergedAndValidationArtifactsOnlyIfEverySemanticPredicatePasses: true,
    scoreRecalculationForbidden: true,
    scoreMutationForbidden: true,
    modelExecutionForbidden: true,
    retryForbidden: true,
    deterministicCompilationForbidden: true,
    publicationFinalizationForbidden: true,
    renderingVerificationForbidden: true,
    productionMutationForbidden: true
  },
  authorization: {
    executionActivationPreparation: true,
    deterministicSuccessorExecution: false,
    modelExecution: false,
    retry: false,
    deterministicCompilation: false,
    publicationFinalization: false,
    renderingVerification: false,
    productionMutation: false,
    remainingProductionBatches: false
  }
};
await mkdir(path.resolve(CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ROOT), { recursive: true });
await writeFile(path.resolve(preparationPath), `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({
  status: preparation.status,
  intendedOrder: preparation.intendedOrder,
  repairOutputs: 7,
  writableFields: 13,
  preparationReplayTotals: totals,
  modelExecution: false,
  directCostUsd: 0,
  productionMutation: false
}, null, 2));
