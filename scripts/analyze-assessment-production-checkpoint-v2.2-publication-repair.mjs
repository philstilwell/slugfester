#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  CHECKPOINT_V22_REPAIR_ROOT,
  mergeAndValidateCheckpointV22Repair
} from "./lib/assessment-production-checkpoint-v2.2-publication-repair.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const [preparation, activation, execution] = await Promise.all([
  readFile(path.resolve(`${CHECKPOINT_V22_REPAIR_ROOT}/preparation-manifest.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(`${CHECKPOINT_V22_REPAIR_ROOT}/execution-activation.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(`${CHECKPOINT_V22_REPAIR_ROOT}/model-execution.json`), "utf8").then(JSON.parse)
]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest, `repair analysis source hash mismatch: ${file}`);
}
assertV4(
  execution.contextsPlanned === 1 &&
    execution.contextsAttempted === 1 &&
    execution.attempts === 1 &&
    execution.retries === 0 &&
    execution.furtherCorrectionContexts === 0 &&
    execution.modelAuthoredScores === 0,
  "repair execution record changed"
);
if (shouldWrite) {
  assertV4(!(await exists(activation.artifacts.analysis)), `${activation.artifacts.analysis} already exists`);
  assertV4(!(await exists(activation.artifacts.mergedOutput)), `${activation.artifacts.mergedOutput} already exists`);
  assertV4(!(await exists(activation.artifacts.completeValidation)), `${activation.artifacts.completeValidation} already exists`);
  assertV4(!(await exists(activation.artifacts.mergeAudit)), `${activation.artifacts.mergeAudit} already exists`);
}

let merge = null;
let failureMessage = null;
let baseOutputBytes = null;
if (execution.result.gateAcceptancePassed) {
  try {
    const [baseBytes, repairBytes, repairPacketBytes, publicationPacketBytes, diagnosis] = await Promise.all([
      readFile(path.resolve(preparation.inputs.immutableBaseOutput)),
      readFile(path.resolve(activation.artifacts.repairOutput)),
      readFile(path.resolve(activation.context.packet)),
      readFile(path.resolve(preparation.inputs.publicationPacket)),
      readFile(path.resolve(preparation.inputs.diagnosis), "utf8").then(JSON.parse)
    ]);
    baseOutputBytes = baseBytes;
    assertV4(sha256(repairBytes) === execution.result.repairOutputSha256, "repair output hash mismatch");
    assertV4(
      sha256(baseBytes) === diagnosis.failedContext.outputSha256,
      "original failed output changed before merge"
    );
    merge = mergeAndValidateCheckpointV22Repair({
      baseOutput: JSON.parse(baseBytes),
      repair: JSON.parse(repairBytes),
      repairPacket: JSON.parse(repairPacketBytes),
      publicationPacket: JSON.parse(publicationPacketBytes)
    });
  } catch (error) {
    failureMessage = (error.stack ?? error.message).slice(-10000);
  }
}
const passed = execution.result.gateAcceptancePassed && merge?.fullValidation?.status === "passed";
const analysis = {
  schemaVersion: "1.0-production-checkpoint-v2.2-publication-repair-analysis",
  protocolId: activation.protocolId,
  status: passed
    ? "debate-50-bounded-repair-and-complete-publication-validation-passed"
    : "debate-50-bounded-repair-or-complete-publication-validation-failed",
  productionCanary: true,
  stagingOnly: true,
  gate: {
    repairContextPassed: execution.result.gateAcceptancePassed,
    completeDebateValidationPassed: passed,
    correctedFields: merge?.repairValidation.correctedFields ?? [],
    movesValidated: merge?.fullValidation.moves ?? 0,
    critiquesValidated: merge?.fullValidation.critiques ?? 0,
    exactSourceQuotesValidated: merge?.fullValidation.quoteExactSourceMatches ?? 0,
    overallCommentarySidesValidated: merge?.fullValidation.overallCommentarySides ?? 0,
    aiExtensionSidesValidated: merge?.fullValidation.aiExtensionSides ?? 0,
    immutableFieldsChanged: passed ? 0 : null,
    attempts: 1,
    retries: 0,
    furtherCorrectionContexts: 0,
    modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0
  },
  failureMessage,
  artifacts: {
    originalFailedOutput: preparation.inputs.immutableBaseOutput,
    originalFailedOutputPreserved: true,
    repairOutput: activation.artifacts.repairOutput,
    mergedOutput: passed ? activation.artifacts.mergedOutput : null,
    completeValidation: passed ? activation.artifacts.completeValidation : null,
    mergeAudit: passed ? activation.artifacts.mergeAudit : null
  },
  totals: {
    modelContexts: 1,
    meteredApiCostUsd: 0,
    transcriptionCostUsdThisStage: 0,
    modelAuthoredScores: 0
  },
  authorization: {
    nineContextResumptionPlanPreparation: passed,
    nineContextModelExecution: false,
    retry: false,
    furtherCorrectionModelExecution: false,
    deterministicCompilation: false,
    publicationFinalization: false,
    renderingVerification: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  nextAuthorizedAction: passed
    ? "prepare-and-freeze-separate-nine-context-publication-resumption-plan"
    : "failure-diagnosis-only"
};
if (shouldWrite && passed) {
  const mergedBytes = Buffer.from(`${JSON.stringify(merge.merged, null, 2)}\n`);
  const completeValidation = {
    schemaVersion: "1.0-production-checkpoint-v2.2-publication-complete-debate-validation",
    protocolId: activation.protocolId,
    status: "passed",
    debateNumber: "50",
    mergedOutputSha256: sha256(mergedBytes),
    validationSummary: merge.fullValidation,
    originalFailedOutputPreserved: true,
    immutableFieldsChanged: 0,
    modelAuthoredScores: 0,
    lockedScoresUnchanged: true
  };
  const mergeAudit = {
    schemaVersion: "1.0-production-checkpoint-v2.2-publication-repair-merge-audit",
    protocolId: activation.protocolId,
    status: "passed",
    debateNumber: "50",
    originalFailedOutput: preparation.inputs.immutableBaseOutput,
    originalFailedOutputSha256: sha256(baseOutputBytes),
    repairOutput: activation.artifacts.repairOutput,
    repairOutputSha256: sha256(await readFile(path.resolve(activation.artifacts.repairOutput))),
    mergedOutput: activation.artifacts.mergedOutput,
    mergedOutputSha256: sha256(mergedBytes),
    authorizedTransformations: merge.transformations,
    authorizedFieldsChanged: merge.transformations.length,
    immutableFieldsChanged: 0,
    completeDebateValidation: merge.fullValidation,
    modelAuthoredScores: 0,
    lockedScoresUnchanged: true
  };
  await mkdir(path.dirname(path.resolve(activation.artifacts.mergedOutput)), { recursive: true });
  await writeFile(path.resolve(activation.artifacts.mergedOutput), mergedBytes);
  await writeFile(path.resolve(activation.artifacts.completeValidation), `${JSON.stringify(completeValidation, null, 2)}\n`);
  await writeFile(path.resolve(activation.artifacts.mergeAudit), `${JSON.stringify(mergeAudit, null, 2)}\n`);
}
if (shouldWrite) await writeFile(path.resolve(activation.artifacts.analysis), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({
  status: analysis.status,
  repairContextPassed: analysis.gate.repairContextPassed,
  completeDebateValidationPassed: analysis.gate.completeDebateValidationPassed,
  correctedFields: analysis.gate.correctedFields,
  movesValidated: analysis.gate.movesValidated,
  critiquesValidated: analysis.gate.critiquesValidated,
  attempts: 1,
  retries: 0,
  meteredApiCostUsd: 0,
  modelAuthoredScores: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction
}, null, 2));
