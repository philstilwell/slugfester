#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { CHECKPOINT_V22_DEBATE_192_REPAIR_ROOT, mergeAndValidateDebate192Repairs, validateDebate192RepairOutput } from "./lib/assessment-production-checkpoint-v2.2-debate-192-repair.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const [preparation, activation, execution] = await Promise.all([
  readFile(path.resolve(`${CHECKPOINT_V22_DEBATE_192_REPAIR_ROOT}/preparation-manifest.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(`${CHECKPOINT_V22_DEBATE_192_REPAIR_ROOT}/execution-activation.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(`${CHECKPOINT_V22_DEBATE_192_REPAIR_ROOT}/model-execution.json`), "utf8").then(JSON.parse)
]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
for (const [file, digest] of Object.entries(activation.sourceHashes)) assertV4(sha256(await readFile(path.resolve(file))) === digest, `repair analysis source hash mismatch: ${file}`);
assertV4(execution.contextsPlanned === 4 && execution.attempts === execution.contextsAttempted && execution.retries === 0 && execution.furtherCorrectionContexts === 0 && execution.modelAuthoredScores === 0, "repair execution record changed");
if (shouldWrite) for (const file of [activation.artifacts.analysis, activation.artifacts.mergedOutput, activation.artifacts.completeValidation, activation.artifacts.mergeAudit]) assertV4(!(await exists(file)), `${file} already exists`);

const contexts = [];
for (const context of activation.contexts) {
  const result = execution.results.find((item) => item.contextIndex === context.contextIndex);
  let replay = null, replayMessage = null;
  if (result?.outputWritten) {
    const [outputBytes, packet] = await Promise.all([readFile(path.resolve(context.repairOutput)), readFile(path.resolve(context.packet), "utf8").then(JSON.parse)]);
    assertV4(sha256(outputBytes) === result.repairOutputSha256, `packet ${context.packetIndex}: repair output hash mismatch`);
    try { replay = validateDebate192RepairOutput(JSON.parse(outputBytes), packet); } catch (error) { replayMessage = (error.stack ?? error.message).slice(-10000); }
    if (result.gateAcceptancePassed) assertV4(replay?.status === "passed", `packet ${context.packetIndex}: accepted repair replay failed`);
  }
  contexts.push({ contextIndex: context.contextIndex, packetIndex: context.packetIndex, status: result?.status ?? "unattempted", accepted: Boolean(result?.gateAcceptancePassed && replay?.status === "passed"), elapsedMinutes: result ? Number((result.elapsedMs / 60000).toFixed(2)) : null, correctedFields: replay?.correctedFields ?? [], validationReplayed: replay?.status === "passed", replayMessage, modelAuthoredScores: replay?.modelAuthoredScores ?? null });
}
const valid = contexts.filter((context) => context.accepted);
const repairSemanticPass = valid.length === 4 && valid.reduce((sum, context) => sum + context.correctedFields.length, 0) === 7 && valid.every((context) => context.modelAuthoredScores === 0);
let merge = null, failureMessage = null, baseOutputBytes = null;
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
    assertV4(sha256(baseBytes) === diagnosis.failedContext.outputSha256, "original failed Debate 192 output changed before merge");
    merge = mergeAndValidateDebate192Repairs({ baseOutput: JSON.parse(baseBytes), repairs, repairPackets, publicationPacket });
  } catch (error) { failureMessage = (error.stack ?? error.message).slice(-10000); }
}
const completeDebateValidationPassed = merge?.fullValidation?.status === "passed";
const timingPass = execution.results.every((result) => result.elapsedMs <= activation.executionPolicy.timeoutMsPerContext && result.timedOut === false) && execution.wallElapsedMs <= activation.executionPolicy.absoluteGateTimeoutMs;
const passed = repairSemanticPass && completeDebateValidationPassed && timingPass;
const analysis = {
  schemaVersion: "1.0-production-checkpoint-v2.2-debate-192-publication-repair-analysis", protocolId: activation.protocolId,
  status: passed ? "debate-192-four-packet-repair-and-complete-publication-validation-passed" : repairSemanticPass && completeDebateValidationPassed ? "debate-192-publication-repair-failed-timing" : "debate-192-publication-repair-or-complete-validation-failed",
  productionCanary: true, stagingOnly: true, contexts,
  gate: {
    repairSemanticPass, completeDebateValidationPassed, timingPass, validRepairContexts: valid.length, requiredRepairContexts: 4,
    correctedFields: valid.reduce((sum, context) => sum + context.correctedFields.length, 0), requiredCorrectedFields: 7,
    movesValidated: merge?.fullValidation.moves ?? 0, critiquesValidated: merge?.fullValidation.critiques ?? 0,
    exactSourceQuotesValidated: merge?.fullValidation.quoteExactSourceMatches ?? 0, overallCommentarySidesValidated: merge?.fullValidation.overallCommentarySides ?? 0,
    aiExtensionSidesValidated: merge?.fullValidation.aiExtensionSides ?? 0, immutableFieldsChanged: completeDebateValidationPassed ? 0 : null,
    wallElapsedMinutes: Number((execution.wallElapsedMs / 60000).toFixed(2)), retries: 0, furtherCorrectionContexts: 0, modelAuthoredScores: 0, scorePassesExecutedThisStage: 0
  },
  failureMessage,
  artifacts: { originalFailedOutput: preparation.inputs.immutableBaseOutput, originalFailedOutputPreserved: true, repairOutputs: activation.contexts.map(({ repairOutput }) => repairOutput), mergedOutput: passed ? activation.artifacts.mergedOutput : null, completeValidation: passed ? activation.artifacts.completeValidation : null, mergeAudit: passed ? activation.artifacts.mergeAudit : null },
  totals: { modelContexts: execution.contextsAttempted, meteredApiCostUsd: 0, transcriptionCostUsdThisStage: 0, modelAuthoredScores: 0 },
  authorization: { eightContextResumptionPlanPreparation: passed, eightContextModelExecution: false, retry: false, furtherCorrectionModelExecution: false, deterministicCompilation: false, publicationFinalization: false, renderingVerification: false, productionMutation: false, remainingProductionBatches: false },
  nextAuthorizedAction: passed ? "prepare-and-freeze-separate-eight-context-publication-resumption-plan" : "failure-diagnosis-only"
};
if (shouldWrite && passed) {
  const mergedBytes = Buffer.from(`${JSON.stringify(merge.merged, null, 2)}\n`);
  const completeValidation = { schemaVersion: "1.0-production-checkpoint-v2.2-debate-192-complete-publication-validation", protocolId: activation.protocolId, status: "passed", debateNumber: "192", mergedOutputSha256: sha256(mergedBytes), validationSummary: merge.fullValidation, originalFailedOutputPreserved: true, immutableFieldsChanged: 0, modelAuthoredScores: 0, lockedScoresUnchanged: true };
  const mergeAudit = { schemaVersion: "1.0-production-checkpoint-v2.2-debate-192-publication-repair-merge-audit", protocolId: activation.protocolId, status: "passed", debateNumber: "192", originalFailedOutput: preparation.inputs.immutableBaseOutput, originalFailedOutputSha256: sha256(baseOutputBytes), repairOutputs: activation.contexts.map((context) => ({ packetIndex: context.packetIndex, path: context.repairOutput, sha256: execution.results.find((result) => result.packetIndex === context.packetIndex).repairOutputSha256 })), mergedOutput: activation.artifacts.mergedOutput, mergedOutputSha256: sha256(mergedBytes), authorizedTransformations: merge.transformations, authorizedFieldsChanged: merge.transformations.length, immutableFieldsChanged: 0, completeDebateValidation: merge.fullValidation, modelAuthoredScores: 0, lockedScoresUnchanged: true };
  await mkdir(path.dirname(path.resolve(activation.artifacts.mergedOutput)), { recursive: true });
  await writeFile(path.resolve(activation.artifacts.mergedOutput), mergedBytes);
  await writeFile(path.resolve(activation.artifacts.completeValidation), `${JSON.stringify(completeValidation, null, 2)}\n`);
  await writeFile(path.resolve(activation.artifacts.mergeAudit), `${JSON.stringify(mergeAudit, null, 2)}\n`);
}
if (shouldWrite) await writeFile(path.resolve(activation.artifacts.analysis), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, validRepairContexts: analysis.gate.validRepairContexts, correctedFields: analysis.gate.correctedFields, completeDebateValidationPassed, movesValidated: analysis.gate.movesValidated, critiquesValidated: analysis.gate.critiquesValidated, wallElapsedMinutes: analysis.gate.wallElapsedMinutes, retries: 0, meteredApiCostUsd: 0, modelAuthoredScores: 0, nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
