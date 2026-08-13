#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validateCheckpointV22PublicationOutput } from "./lib/assessment-production-checkpoint-v2.2-publication-validation.mjs";
import {
  CHECKPOINT_V22_COMPLETE_COHORT_OUTPUTS,
  CHECKPOINT_V22_COMPLETE_COHORT_PACKETS,
  CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT,
  mergeAndValidateDebate22Repairs,
  validateDebate22RepairOutput
} from "./lib/assessment-production-checkpoint-v2.2-debate-22-repair.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const paths = {
  preparation: `${CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT}/preparation-manifest.json`,
  activation: `${CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT}/execution-activation.json`,
  execution: `${CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT}/model-execution.json`,
  analysis: `${CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT}/analysis.json`,
  diagnosis: `${CHECKPOINT_V22_DEBATE_22_REPAIR_ROOT}/analysis-failure-diagnosis.json`
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
if (shouldWrite) assertV4(!(await exists(paths.diagnosis)), `${paths.diagnosis} already exists`);
const bytes = {};
const documents = {};
for (const [name, file] of Object.entries(paths)) {
  if (name === "diagnosis") continue;
  bytes[name] = await readFile(path.resolve(file));
  documents[name] = JSON.parse(bytes[name]);
}
const { preparation, activation, execution, analysis } = documents;
assertV4(
  activation.status === "frozen-seven-isolated-thirteen-field-debate-22-publication-repair-contexts-authorized" &&
    execution.status === "seven-debate-22-publication-repair-contexts-passed" &&
    execution.contextsAttempted === 7 &&
    execution.validContexts === 7 &&
    execution.invalidContexts === 0 &&
    execution.retries === 0 &&
    execution.furtherCorrectionContexts === 0 &&
    execution.modelAuthoredScores === 0 &&
    analysis.status === "debate-22-publication-repair-or-complete-cohort-validation-failed" &&
    analysis.gate.repairSemanticPass === true &&
    analysis.gate.completeDebateValidationPassed === true &&
    analysis.gate.completeCohortValidationPassed === false &&
    analysis.nextAuthorizedAction === "failure-diagnosis-only" &&
    analysis.authorization.deterministicCompilation === false &&
    analysis.authorization.productionMutation === false,
  "failed Debate 22 repair analysis does not authorize this diagnosis"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest, `frozen repair source drifted: ${file}`);
}

const repairs = [];
const repairPackets = [];
for (const context of activation.contexts) {
  const result = execution.results.find(({ contextIndex }) => contextIndex === context.contextIndex);
  const [repairBytes, repairPacket] = await Promise.all([
    readFile(path.resolve(context.repairOutput)),
    readFile(path.resolve(context.packet), "utf8").then(JSON.parse)
  ]);
  assertV4(
    result?.gateAcceptancePassed === true &&
      result.attemptCount === 1 &&
      result.retryCount === 0 &&
      result.repairOutputSha256 === sha256(repairBytes),
    `packet ${context.packetIndex}: accepted repair record changed`
  );
  assertV4(validateDebate22RepairOutput(JSON.parse(repairBytes), repairPacket).status === "passed", `packet ${context.packetIndex}: repair replay failed`);
  repairs.push(JSON.parse(repairBytes));
  repairPackets.push(repairPacket);
}
const [baseOutputBytes, baseOutput, publicationPacket, sourceDiagnosis] = await Promise.all([
  readFile(path.resolve(preparation.inputs.immutableBaseOutput)),
  readFile(path.resolve(preparation.inputs.immutableBaseOutput), "utf8").then(JSON.parse),
  readFile(path.resolve(preparation.inputs.publicationPacket), "utf8").then(JSON.parse),
  readFile(path.resolve(preparation.inputs.diagnosis), "utf8").then(JSON.parse)
]);
assertV4(sha256(baseOutputBytes) === sourceDiagnosis.failedContext.outputSha256, "original failed Debate 22 output changed");
const merge = mergeAndValidateDebate22Repairs({ baseOutput, repairs, repairPackets, publicationPacket });
assertV4(
  merge.fullValidation.status === "passed" &&
    merge.fullValidation.moves === 19 &&
    merge.fullValidation.critiques === 19 &&
    merge.transformations.length === 13 &&
    merge.fullValidation.calculatedScoresAuthoredByModel === 0 &&
    merge.fullValidation.lockedScoresUnchanged === true,
  "complete Debate 22 repair replay failed"
);

const intendedOrder = ["50", "192", "129", "40", "25", "104", "22", "10", "167", "122"];
const frozenAnalysisOrder = analysis.cohortRows.map(({ debateNumber }) => debateNumber);
const numericKeyEnumerationOrder = Object.keys(Object.fromEntries(intendedOrder.map((debateNumber) => [debateNumber, true])));
assertV4(
  JSON.stringify(frozenAnalysisOrder) === JSON.stringify(["10", "22", "25", "40", "50", "104", "122", "129", "167", "192"]) &&
    JSON.stringify(frozenAnalysisOrder) === JSON.stringify(numericKeyEnumerationOrder) &&
    JSON.stringify(frozenAnalysisOrder) !== JSON.stringify(intendedOrder),
  "frozen cohort order failure is not numeric-key enumeration"
);

const intendedRows = [];
for (const debateNumber of intendedOrder) {
  const packetPath = CHECKPOINT_V22_COMPLETE_COHORT_PACKETS[debateNumber];
  const packetBytes = await readFile(path.resolve(packetPath));
  const packet = JSON.parse(packetBytes);
  const outputPath = CHECKPOINT_V22_COMPLETE_COHORT_OUTPUTS[debateNumber];
  const outputBytes = debateNumber === "22"
    ? Buffer.from(`${JSON.stringify(merge.merged, null, 2)}\n`)
    : await readFile(path.resolve(outputPath));
  const output = debateNumber === "22" ? merge.merged : JSON.parse(outputBytes);
  const validation = validateCheckpointV22PublicationOutput(output, packet);
  intendedRows.push({
    debateNumber,
    debateId: packet.debateId,
    output: outputPath,
    outputSha256: sha256(outputBytes),
    packet: packetPath,
    packetSha256: sha256(packetBytes),
    validation
  });
}
const totals = {
  debates: intendedRows.length,
  moves: intendedRows.reduce((sum, row) => sum + row.validation.moves, 0),
  critiques: intendedRows.reduce((sum, row) => sum + row.validation.critiques, 0),
  exactSourceQuotes: intendedRows.reduce((sum, row) => sum + row.validation.quoteExactSourceMatches, 0),
  overallCommentarySides: intendedRows.reduce((sum, row) => sum + row.validation.overallCommentarySides, 0),
  aiExtensionSides: intendedRows.reduce((sum, row) => sum + row.validation.aiExtensionSides, 0),
  noveltyItems: intendedRows.reduce((sum, row) => sum + row.validation.noveltyItems, 0),
  introducedItems: intendedRows.reduce((sum, row) => sum + row.validation.introducedItems, 0),
  newArguments: intendedRows.reduce((sum, row) => sum + row.validation.newArguments, 0),
  modelAuthoredScores: 0
};
const allSemanticPredicatesPass =
  totals.debates === 10 &&
  totals.moves === 188 &&
  totals.critiques === 188 &&
  totals.exactSourceQuotes === 20 &&
  totals.overallCommentarySides === 20 &&
  totals.aiExtensionSides === 20 &&
  intendedRows.every((row) =>
    row.validation.status === "passed" &&
    row.validation.calculatedScoresAuthoredByModel === 0 &&
    row.validation.lockedScoresUnchanged === true
  );
assertV4(allSemanticPredicatesPass, "an actual complete-cohort semantic failure exists");
assertV4(
  JSON.stringify(totals) === JSON.stringify(analysis.gate.cohortTotals),
  "frozen failed analysis totals differ from intended-order replay totals"
);

const diagnosis = {
  schemaVersion: "1.0-production-checkpoint-v2.2-debate-22-repair-analysis-failure-diagnosis",
  protocolId: activation.protocolId,
  status: "diagnosed-complete-cohort-validation-false-negative-from-numeric-key-enumeration",
  productionCanary: true,
  stagingOnly: true,
  failureBoundary: {
    repairContextsPassed: 7,
    repairedFieldsPassed: 13,
    completeDebate22ValidationPassed: true,
    completeCohortSemanticPredicatesPassed: true,
    frozenOrderPredicatePassed: false,
    frozenAnalysisOrder,
    intendedOrder,
    numericKeyEnumerationOrder,
    cause: "Object.keys and Object.entries enumerate integer-like debate-number keys in ascending numeric order, so the frozen analyzer compared a semantically complete cohort against the intended operational order and returned false."
  },
  diagnosticReplay: {
    persistedMergedOutput: false,
    originalFailedOutputModified: false,
    repairOutputsModified: false,
    intendedOrderReplayPassed: allSemanticPredicatesPass,
    totals,
    rows: intendedRows
  },
  preservedControls: {
    participantJudgmentWasScoreBlind: true,
    scoresRecalculated: false,
    scoresChanged: false,
    modelAuthoredScores: 0,
    modelContextsRerun: 0,
    retries: 0,
    furtherCorrectionContexts: 0,
    meteredApiCostUsd: 0,
    deterministicCompilation: false,
    publicationFinalization: false,
    renderingVerification: false,
    productionMutation: false
  },
  prospectiveRecoveryOnly: {
    currentlyAuthorized: false,
    action: "freeze-and-run-one-explicit-order-deterministic-successor-validator-over-the-existing-seven-repair-outputs-and-ten-publication-packets",
    modelContexts: 0,
    repairAttempts: 0,
    retries: 0,
    proposedDirectCostUsd: 0,
    expectedWallMinutes: [1, 2],
    requiredBehavior: [
      "iterate-the-frozen-intended-debate-order-array-directly",
      "merge-only-the-thirteen-already-authorized-repair-fields",
      "revalidate-complete-debate-22-and-all-ten-debates",
      "persist-merged-and-validation-artifacts-only-if-every-semantic-predicate-passes",
      "retain-compilation-finalization-rendering-and-production-mutation-stop-rules"
    ]
  },
  authorization: {
    deterministicSuccessorPreparation: false,
    deterministicSuccessorExecution: false,
    modelExecution: false,
    retry: false,
    furtherCorrectionModelExecution: false,
    deterministicCompilation: false,
    publicationFinalization: false,
    renderingVerification: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  artifacts: {
    preparation: { path: paths.preparation, sha256: sha256(bytes.preparation) },
    activation: { path: paths.activation, sha256: sha256(bytes.activation) },
    execution: { path: paths.execution, sha256: sha256(bytes.execution) },
    failedAnalysis: { path: paths.analysis, sha256: sha256(bytes.analysis) },
    originalFailedOutput: { path: preparation.inputs.immutableBaseOutput, sha256: sha256(baseOutputBytes) },
    repairOutputs: activation.contexts.map((context) => ({
      packetIndex: context.packetIndex,
      path: context.repairOutput,
      sha256: execution.results.find((result) => result.packetIndex === context.packetIndex).repairOutputSha256
    }))
  },
  nextRequiredAction: "user-decision-on-model-free-explicit-order-complete-cohort-successor-validation"
};
if (shouldWrite) await writeFile(path.resolve(paths.diagnosis), `${JSON.stringify(diagnosis, null, 2)}\n`);
console.log(JSON.stringify({
  status: diagnosis.status,
  repairContextsPassed: 7,
  repairedFieldsPassed: 13,
  completeDebate22ValidationPassed: true,
  completeCohortSemanticPredicatesPassed: true,
  frozenOrderPredicatePassed: false,
  frozenAnalysisOrder,
  intendedOrder,
  totals,
  modelContextsRerun: 0,
  retries: 0,
  meteredApiCostUsd: 0,
  productionMutation: false,
  successorCurrentlyAuthorized: false,
  nextRequiredAction: diagnosis.nextRequiredAction
}, null, 2));
