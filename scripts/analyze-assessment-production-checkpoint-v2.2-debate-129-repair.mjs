#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CHECKPOINT_V22_DEBATE_129_REPAIR_ROOT, mergeAndValidateDebate129Repair } from "./lib/assessment-production-checkpoint-v2.2-debate-129-repair.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const [preparation, activation, execution] = await Promise.all(["preparation-manifest.json", "execution-activation.json", "model-execution.json"].map((file) => readFile(path.resolve(`${CHECKPOINT_V22_DEBATE_129_REPAIR_ROOT}/${file}`), "utf8").then(JSON.parse)));
const sha256 = (value) => createHash("sha256").update(value).digest("hex"), exists = (file) => access(path.resolve(file)).then(() => true, () => false);
for (const [file, digest] of Object.entries(activation.sourceHashes)) assertV4(sha256(await readFile(path.resolve(file))) === digest, `analysis source hash mismatch: ${file}`);
assertV4(execution.contextsAttempted === 1 && execution.attempts === 1 && execution.retries === 0 && execution.furtherCorrectionContexts === 0 && execution.modelAuthoredScores === 0, "repair execution record changed");
if (shouldWrite) for (const file of [activation.artifacts.analysis, activation.artifacts.mergedOutput, activation.artifacts.completeValidation, activation.artifacts.mergeAudit]) assertV4(!(await exists(file)), `${file} already exists`);
let merge = null, failureMessage = null, baseOutputBytes = null;
if (execution.result.gateAcceptancePassed) {
  try {
    const [baseBytes, repair, repairPacket, publicationPacket, diagnosis] = await Promise.all([readFile(path.resolve(preparation.inputs.immutableBaseOutput)), readFile(path.resolve(activation.artifacts.repairOutput), "utf8").then(JSON.parse), readFile(path.resolve(activation.context.packet), "utf8").then(JSON.parse), readFile(path.resolve(preparation.inputs.publicationPacket), "utf8").then(JSON.parse), readFile(path.resolve(preparation.inputs.diagnosis), "utf8").then(JSON.parse)]);
    baseOutputBytes = baseBytes; assertV4(sha256(baseBytes) === diagnosis.failedContext.outputSha256, "original failed Debate 129 output changed before merge");
    merge = mergeAndValidateDebate129Repair({ baseOutput: JSON.parse(baseBytes), repair, repairPacket, publicationPacket });
  } catch (error) { failureMessage = (error.stack ?? error.message).slice(-10000); }
}
const repairPassed = execution.result.gateAcceptancePassed && merge?.repairValidation.status === "passed", completeDebateValidationPassed = merge?.fullValidation.status === "passed", passed = repairPassed && completeDebateValidationPassed;
const analysis = {
  schemaVersion: "1.0-production-checkpoint-v2.2-debate-129-publication-repair-analysis", protocolId: activation.protocolId,
  status: passed ? "debate-129-bounded-repair-and-complete-publication-validation-passed" : "debate-129-bounded-repair-or-complete-publication-validation-failed",
  productionCanary: true, stagingOnly: true,
  gate: { repairContextPassed: repairPassed, completeDebateValidationPassed, correctedFields: merge?.repairValidation.correctedFields ?? [], movesValidated: merge?.fullValidation.moves ?? 0, critiquesValidated: merge?.fullValidation.critiques ?? 0, exactSourceQuotesValidated: merge?.fullValidation.quoteExactSourceMatches ?? 0, overallCommentarySidesValidated: merge?.fullValidation.overallCommentarySides ?? 0, aiExtensionSidesValidated: merge?.fullValidation.aiExtensionSides ?? 0, immutableFieldsChanged: passed ? 0 : null, attempts: 1, retries: 0, furtherCorrectionContexts: 0, modelAuthoredScores: 0, scorePassesExecutedThisStage: 0 },
  failureMessage,
  artifacts: { originalFailedOutput: preparation.inputs.immutableBaseOutput, originalFailedOutputPreserved: true, repairOutput: activation.artifacts.repairOutput, mergedOutput: passed ? activation.artifacts.mergedOutput : null, completeValidation: passed ? activation.artifacts.completeValidation : null, mergeAudit: passed ? activation.artifacts.mergeAudit : null },
  totals: { modelContexts: 1, meteredApiCostUsd: 0, transcriptionCostUsdThisStage: 0, modelAuthoredScores: 0 },
  authorization: { sevenContextResumptionPlanPreparation: passed, sevenContextModelExecution: false, retry: false, furtherCorrectionModelExecution: false, deterministicCompilation: false, publicationFinalization: false, renderingVerification: false, productionMutation: false, remainingProductionBatches: false },
  nextAuthorizedAction: passed ? "prepare-and-freeze-separate-seven-context-publication-resumption-plan" : "failure-diagnosis-only"
};
if (shouldWrite && passed) {
  const mergedBytes = Buffer.from(`${JSON.stringify(merge.merged, null, 2)}\n`);
  const completeValidation = { schemaVersion: "1.0-production-checkpoint-v2.2-debate-129-complete-publication-validation", protocolId: activation.protocolId, status: "passed", debateNumber: "129", mergedOutputSha256: sha256(mergedBytes), validationSummary: merge.fullValidation, originalFailedOutputPreserved: true, immutableFieldsChanged: 0, modelAuthoredScores: 0, lockedScoresUnchanged: true };
  const mergeAudit = { schemaVersion: "1.0-production-checkpoint-v2.2-debate-129-publication-repair-merge-audit", protocolId: activation.protocolId, status: "passed", debateNumber: "129", originalFailedOutput: preparation.inputs.immutableBaseOutput, originalFailedOutputSha256: sha256(baseOutputBytes), repairOutput: activation.artifacts.repairOutput, repairOutputSha256: execution.result.repairOutputSha256, mergedOutput: activation.artifacts.mergedOutput, mergedOutputSha256: sha256(mergedBytes), authorizedTransformations: merge.transformations, authorizedFieldsChanged: 2, immutableFieldsChanged: 0, completeDebateValidation: merge.fullValidation, modelAuthoredScores: 0, lockedScoresUnchanged: true };
  await mkdir(path.dirname(path.resolve(activation.artifacts.mergedOutput)), { recursive: true }); await writeFile(path.resolve(activation.artifacts.mergedOutput), mergedBytes); await writeFile(path.resolve(activation.artifacts.completeValidation), `${JSON.stringify(completeValidation, null, 2)}\n`); await writeFile(path.resolve(activation.artifacts.mergeAudit), `${JSON.stringify(mergeAudit, null, 2)}\n`);
}
if (shouldWrite) await writeFile(path.resolve(activation.artifacts.analysis), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, repairContextPassed: repairPassed, completeDebateValidationPassed, correctedFields: analysis.gate.correctedFields, movesValidated: analysis.gate.movesValidated, critiquesValidated: analysis.gate.critiquesValidated, attempts: 1, retries: 0, meteredApiCostUsd: 0, modelAuthoredScores: 0, nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
