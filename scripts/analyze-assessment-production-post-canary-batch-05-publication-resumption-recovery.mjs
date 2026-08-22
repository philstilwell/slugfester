#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_RECOVERY_ROOT,
  mergeAndValidateRecovery
} from "./lib/assessment-production-post-canary-batch-05-publication-resumption-recovery.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT = POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_RECOVERY_ROOT;
const [preparation, activation, execution] = await Promise.all([
  readFile(path.resolve(`${ROOT}/execution-preparation-manifest.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(`${ROOT}/execution-activation.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(`${ROOT}/model-execution.json`), "utf8").then(JSON.parse)
]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `recovery analysis source hash mismatch: ${file}`);
}
assertV4(execution.contextsPlanned === 6 && execution.attempts === execution.contextsAttempted &&
  execution.retries === 0 && execution.timeoutExtensions === 0 &&
  execution.recursiveCorrectionContexts === 0 && execution.meteredApiCostUsd === 0 &&
  execution.paidServiceCallsThisStage === 0 && execution.modelAuthoredScores === 0,
"the six-context recovery execution record changed");
if (shouldWrite) {
  for (const file of [activation.artifacts.analysis, activation.artifacts.merged189,
    activation.artifacts.merged109, activation.artifacts.validation189,
    activation.artifacts.validation109, activation.artifacts.mergeAudit189,
    activation.artifacts.mergeAudit109]) {
    assertV4(!(await exists(file)), `${file} already exists`);
  }
}

let merge = null;
let failureMessage = null;
let sourceBytes = null;
if (execution.validContexts === 6 && execution.invalidContexts === 0 &&
    execution.contextsAttempted === 6 && execution.results.every((row) => row.gateAcceptancePassed)) {
  try {
    const [base189Bytes, packet189Bytes, packet109Bytes] = await Promise.all([
      readFile(path.resolve(preparation.inputs.immutableDebate189Output)),
      readFile(path.resolve(preparation.inputs.publicationPacket189)),
      readFile(path.resolve(preparation.inputs.publicationPacket109))
    ]);
    const repairContexts = activation.contexts.filter((row) => row.debateNumber === "189");
    const shardContexts = activation.contexts.filter((row) => row.debateNumber === "109");
    const repairPacketBytes = await Promise.all(repairContexts.map((row) => readFile(path.resolve(row.packet))));
    const shardPacketBytes = await Promise.all(shardContexts.map((row) => readFile(path.resolve(row.packet))));
    const repairOutputBytes = await Promise.all(repairContexts.map((row) => readFile(path.resolve(row.output))));
    const shardOutputBytes = await Promise.all(shardContexts.map((row) => readFile(path.resolve(row.output))));
    for (const context of activation.contexts) {
      const result = execution.results.find((row) => row.contextIndex === context.contextIndex);
      assertV4(result && sha256(await readFile(path.resolve(context.output))) === result.outputSha256,
        `context ${context.contextIndex}: accepted output hash changed`);
    }
    merge = mergeAndValidateRecovery({
      base189: JSON.parse(base189Bytes),
      repairOutputs189: repairOutputBytes.map(JSON.parse),
      repairPackets189: repairPacketBytes.map(JSON.parse),
      shardOutputs109: shardOutputBytes.map(JSON.parse),
      shardPackets109: shardPacketBytes.map(JSON.parse),
      publicationPacket189: JSON.parse(packet189Bytes),
      publicationPacket109: JSON.parse(packet109Bytes)
    });
    sourceBytes = { base189Bytes, packet189Bytes, packet109Bytes,
      repairOutputBytes, shardOutputBytes };
  } catch (error) {
    failureMessage = (error.stack ?? error.message).slice(-10000);
  }
}
const passed = merge?.validation189?.status === "passed" &&
  merge?.validation109?.status === "passed";
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-publication-resumption-recovery-analysis",
  protocolId: activation.protocolId,
  status: passed
    ? "batch-05-debate-189-repair-and-debate-109-sharded-resumption-passed-complete-validation"
    : "batch-05-publication-resumption-recovery-or-complete-validation-failed",
  productionCanary: false, batchNumber: 5, stagingOnly: true,
  gate: { contextsPlanned: 6, contextsAttempted: execution.contextsAttempted,
    contextsPassed: execution.validContexts, contextsFailed: execution.invalidContexts,
    debate189RepairContexts: 4, debate189AuthorizedFields: 8,
    debate189CompleteValidationPassed: merge?.validation189?.status === "passed",
    debate189MovesValidated: merge?.validation189?.moves ?? 0,
    debate109ResumptionShards: 2, debate109AcceptedOriginalContentFields:
      merge?.acceptedContentFields109?.length ?? 0,
    debate109CompleteValidationPassed: merge?.validation109?.status === "passed",
    debate109MovesValidated: merge?.validation109?.moves ?? 0,
    immutableFieldsChangedOutsideDiagnosis: passed ? 0 : null,
    originalFailedDebate109PartialOutputReused: false,
    attempts: execution.attempts, retries: 0, timeoutExtensions: 0,
    recursiveCorrectionContexts: 0, modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0 },
  failureMessage,
  artifacts: { originalFailedDebate189Output: preparation.inputs.immutableDebate189Output,
    originalFailedDebate189OutputPreserved: true,
    originalFailedDebate109PartialOutputReused: false,
    mergedDebate189: passed ? activation.artifacts.merged189 : null,
    mergedDebate109: passed ? activation.artifacts.merged109 : null,
    completeValidationDebate189: passed ? activation.artifacts.validation189 : null,
    completeValidationDebate109: passed ? activation.artifacts.validation109 : null },
  totals: { modelContexts: execution.contextsAttempted, meteredApiCostUsd: 0,
    paidServiceCallsThisStage: 0, transcriptionCostUsdThisStage: 0,
    modelAuthoredScores: 0 },
  authorization: { fourContextResumptionManifestPreparation: passed,
    fourContextModelExecution: false, retry: false, timeoutExtension: false,
    recursiveCorrectionModelExecution: false, publicationFinalization: false,
    renderingVerification: false, productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: passed
    ? "prepare-and-resume-exactly-four-unattempted-frozen-batch-05-publication-contexts"
    : "stop-after-failed-bounded-publication-resumption-recovery"
};

if (shouldWrite && passed) {
  const merged189Bytes = Buffer.from(`${JSON.stringify(merge.merged189, null, 2)}\n`);
  const merged109Bytes = Buffer.from(`${JSON.stringify(merge.merged109, null, 2)}\n`);
  const validation189 = { schemaVersion: "1.0-assessment-production-post-canary-batch-05-debate-189-complete-publication-validation",
    protocolId: activation.protocolId, status: "passed", debateNumber: "189",
    mergedOutputSha256: sha256(merged189Bytes), validationSummary: merge.validation189,
    originalFailedOutputPreserved: true, authorizedFieldsChanged: 8,
    immutableFieldsChanged: 0, modelAuthoredScores: 0, lockedScoresUnchanged: true };
  const validation109 = { schemaVersion: "1.0-assessment-production-post-canary-batch-05-debate-109-sharded-complete-publication-validation",
    protocolId: activation.protocolId, status: "passed", debateNumber: "109",
    mergedOutputSha256: sha256(merged109Bytes), validationSummary: merge.validation109,
    acceptedOriginalContentFields: 26, acceptedExactlyOnce: true,
    failedPartialOutputReused: false, modelAuthoredScores: 0, lockedScoresUnchanged: true };
  const audit189 = { schemaVersion: "1.0-assessment-production-post-canary-batch-05-debate-189-publication-repair-merge-audit",
    protocolId: activation.protocolId, status: "passed", debateNumber: "189",
    originalFailedOutput: preparation.inputs.immutableDebate189Output,
    originalFailedOutputSha256: sha256(sourceBytes.base189Bytes),
    acceptedRepairOutputs: activation.contexts.slice(0, 4).map((context, index) => ({
      path: context.output, sha256: sha256(sourceBytes.repairOutputBytes[index]) })),
    mergedOutput: activation.artifacts.merged189, mergedOutputSha256: sha256(merged189Bytes),
    authorizedTransformations: merge.transformations189, authorizedFieldsChanged: 8,
    immutableFieldsChanged: 0, completeValidation: merge.validation189,
    modelAuthoredScores: 0, lockedScoresUnchanged: true };
  const audit109 = { schemaVersion: "1.0-assessment-production-post-canary-batch-05-debate-109-publication-shard-merge-audit",
    protocolId: activation.protocolId, status: "passed", debateNumber: "109",
    originalFailedPartialOutputReused: false,
    acceptedShardOutputs: activation.contexts.slice(4).map((context, index) => ({
      shardId: context.shardId, path: context.output,
      sha256: sha256(sourceBytes.shardOutputBytes[index]),
      writableFields: context.writableFields })),
    acceptedOriginalContentFields: merge.acceptedContentFields109,
    acceptedOriginalContentFieldCount: 26, acceptedExactlyOnce: true,
    fixedFieldsDerivedDeterministically: true,
    mergedOutput: activation.artifacts.merged109, mergedOutputSha256: sha256(merged109Bytes),
    completeValidation: merge.validation109, modelAuthoredScores: 0,
    lockedScoresUnchanged: true };
  await mkdir(path.dirname(path.resolve(activation.artifacts.merged189)), { recursive: true });
  await writeFile(path.resolve(activation.artifacts.merged189), merged189Bytes);
  await writeFile(path.resolve(activation.artifacts.merged109), merged109Bytes);
  await writeFile(path.resolve(activation.artifacts.validation189), `${JSON.stringify(validation189, null, 2)}\n`);
  await writeFile(path.resolve(activation.artifacts.validation109), `${JSON.stringify(validation109, null, 2)}\n`);
  await writeFile(path.resolve(activation.artifacts.mergeAudit189), `${JSON.stringify(audit189, null, 2)}\n`);
  await writeFile(path.resolve(activation.artifacts.mergeAudit109), `${JSON.stringify(audit109, null, 2)}\n`);
}
if (shouldWrite) await writeFile(path.resolve(activation.artifacts.analysis),
  `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status,
  contextsAttempted: analysis.gate.contextsAttempted,
  contextsPassed: analysis.gate.contextsPassed,
  debate189CompleteValidationPassed: analysis.gate.debate189CompleteValidationPassed,
  debate109CompleteValidationPassed: analysis.gate.debate109CompleteValidationPassed,
  debate109AcceptedOriginalContentFields: analysis.gate.debate109AcceptedOriginalContentFields,
  attempts: analysis.gate.attempts, retries: 0, meteredApiCostUsd: 0,
  paidServiceCalls: 0, modelAuthoredScores: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
