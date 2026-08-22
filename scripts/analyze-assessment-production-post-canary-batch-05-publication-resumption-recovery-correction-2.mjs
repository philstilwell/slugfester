#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  POST_CANARY_BATCH_05_DEBATE_109_CORRECTION_2_ROOT,
  mergeAndValidateDebate109Correction2
} from "./lib/assessment-production-post-canary-batch-05-publication-resumption-recovery-correction-2.mjs";
import { mergeAndValidateRecovery } from
  "./lib/assessment-production-post-canary-batch-05-publication-resumption-recovery.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT = POST_CANARY_BATCH_05_DEBATE_109_CORRECTION_2_ROOT;
const [preparation, activation, execution] = await Promise.all([
  readFile(path.resolve(`${ROOT}/execution-preparation-manifest.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(`${ROOT}/execution-activation.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(`${ROOT}/model-execution.json`), "utf8").then(JSON.parse)
]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `correction-2 analysis source hash mismatch: ${file}`);
}
assertV4(execution.contextsPlanned === 4 && execution.attempts === execution.contextsAttempted &&
  execution.retries === 0 && execution.timeoutExtensions === 0 &&
  execution.furtherRecursiveCorrections === 0 && execution.meteredApiCostUsd === 0 &&
  execution.paidServiceCallsThisStage === 0 && execution.modelAuthoredScores === 0,
"the correction-2 execution record changed");
if (shouldWrite) for (const file of [activation.artifacts.analysis,
  activation.artifacts.repairedProShard, activation.artifacts.merged189,
  activation.artifacts.merged109, activation.artifacts.validation189,
  activation.artifacts.validation109, activation.artifacts.proShardMergeAudit,
  activation.artifacts.completeMergeAudit]) {
  assertV4(!(await exists(file)), `${file} already exists`);
}

let proRepair = null; let complete = null; let failureMessage = null; let source = null;
if (execution.validContexts === 4 && execution.invalidContexts === 0 &&
    execution.contextsAttempted === 4 && execution.results.every((row) => row.gateAcceptancePassed)) {
  try {
    const rejectedBytes = await readFile(path.resolve(preparation.inputs.immutableRejectedShardOutput));
    const originalProPacketBytes = await readFile(path.resolve(preparation.inputs.originalProShardPacket));
    const acceptedConBytes = await readFile(path.resolve(preparation.inputs.acceptedConOutput));
    const acceptedConPacketBytes = await readFile(path.resolve(preparation.inputs.acceptedConPacket));
    const base189Bytes = await readFile(path.resolve(preparation.inputs.immutableDebate189Output));
    const publicationPacket189Bytes = await readFile(path.resolve(preparation.inputs.publicationPacket189));
    const publicationPacket109Bytes = await readFile(path.resolve(preparation.inputs.publicationPacket109));
    const correctionPacketBytes = await Promise.all(activation.contexts.map((row) =>
      readFile(path.resolve(row.packet))));
    const correctionOutputBytes = await Promise.all(activation.contexts.map((row) =>
      readFile(path.resolve(row.output))));
    for (const context of activation.contexts) {
      const result = execution.results.find((row) => row.contextIndex === context.contextIndex);
      assertV4(result && sha256(await readFile(path.resolve(context.output))) === result.outputSha256,
        `correction-2 context ${context.contextIndex}: accepted output changed`);
    }
    proRepair = mergeAndValidateDebate109Correction2({ rejectedOutput: JSON.parse(rejectedBytes),
      correctionOutputs: correctionOutputBytes.map(JSON.parse),
      correctionPackets: correctionPacketBytes.map(JSON.parse),
      originalShardPacket: JSON.parse(originalProPacketBytes) });
    const recoveryRoot = path.dirname(ROOT);
    const repairOutputs189 = await Promise.all(Array.from({ length: 4 }, (_, index) =>
      readFile(path.resolve(`${recoveryRoot}/outputs/context-${index}.json`), "utf8").then(JSON.parse)));
    const repairPackets189 = await Promise.all(Array.from({ length: 4 }, (_, index) =>
      readFile(path.resolve(`${recoveryRoot}/packets/context-${index}.json`), "utf8").then(JSON.parse)));
    complete = mergeAndValidateRecovery({ base189: JSON.parse(base189Bytes),
      repairOutputs189, repairPackets189,
      shardOutputs109: [proRepair.repaired, JSON.parse(acceptedConBytes)],
      shardPackets109: [JSON.parse(originalProPacketBytes), JSON.parse(acceptedConPacketBytes)],
      publicationPacket189: JSON.parse(publicationPacket189Bytes),
      publicationPacket109: JSON.parse(publicationPacket109Bytes) });
    source = { rejectedBytes, acceptedConBytes, correctionOutputBytes };
  } catch (error) { failureMessage = (error.stack ?? error.message).slice(-10000); }
}
const passed = proRepair?.shardValidation?.status === "passed" &&
  complete?.validation189?.status === "passed" && complete?.validation109?.status === "passed";
const analysis = { schemaVersion: "1.0-assessment-production-post-canary-batch-05-debate-109-correction-2-analysis",
  protocolId: activation.protocolId, status: passed
    ? "batch-05-debate-109-correction-2-and-two-debate-complete-validation-passed"
    : "batch-05-debate-109-correction-2-or-complete-validation-failed",
  productionCanary: false, batchNumber: 5, stagingOnly: true,
  gate: { contextsPlanned: 4, contextsAttempted: execution.contextsAttempted,
    contextsPassed: execution.validContexts, contextsFailed: execution.invalidContexts,
    correctedFields: 8, immutableProShardFieldsChanged: passed ? 0 : null,
    acceptedConShardChanged: passed ? false : null,
    repairedProShardValidationPassed: proRepair?.shardValidation?.status === "passed",
    debate189CompleteValidationPassed: complete?.validation189?.status === "passed",
    debate109CompleteValidationPassed: complete?.validation109?.status === "passed",
    attempts: execution.attempts, retries: 0, timeoutExtensions: 0,
    furtherRecursiveCorrections: 0, modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0 },
  failureMessage,
  totals: { modelContexts: execution.contextsAttempted, meteredApiCostUsd: 0,
    paidServiceCallsThisStage: 0, modelAuthoredScores: 0 },
  authorization: { fourContextResumptionManifestPreparation: passed,
    fourContextModelExecution: false, retry: false, timeoutExtension: false,
    furtherRecursiveCorrection: false, paidServices: false,
    productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: passed
    ? "prepare-and-resume-exactly-four-unattempted-frozen-batch-05-publication-contexts"
    : "stop-after-failed-one-time-recursive-correction" };
if (shouldWrite && passed) {
  const repairedBytes = Buffer.from(`${JSON.stringify(proRepair.repaired, null, 2)}\n`);
  const merged189Bytes = Buffer.from(`${JSON.stringify(complete.merged189, null, 2)}\n`);
  const merged109Bytes = Buffer.from(`${JSON.stringify(complete.merged109, null, 2)}\n`);
  const validation189 = { schemaVersion: "1.0-assessment-production-post-canary-batch-05-debate-189-complete-publication-validation",
    protocolId: activation.protocolId, status: "passed", debateNumber: "189",
    mergedOutputSha256: sha256(merged189Bytes), validationSummary: complete.validation189,
    authorizedFieldsChanged: 8, immutableFieldsChanged: 0,
    modelAuthoredScores: 0, lockedScoresUnchanged: true };
  const validation109 = { schemaVersion: "1.0-assessment-production-post-canary-batch-05-debate-109-complete-publication-validation",
    protocolId: activation.protocolId, status: "passed", debateNumber: "109",
    mergedOutputSha256: sha256(merged109Bytes), validationSummary: complete.validation109,
    acceptedOriginalContentFields: 26, acceptedExactlyOnce: true,
    correctedProCritiques: 8, immutableProFieldsChanged: 0, acceptedConShardChanged: false,
    modelAuthoredScores: 0, lockedScoresUnchanged: true };
  const proAudit = { schemaVersion: "1.0-assessment-production-post-canary-batch-05-debate-109-pro-correction-2-merge-audit",
    protocolId: activation.protocolId, status: "passed", debateNumber: "109",
    rejectedShardOutput: preparation.inputs.immutableRejectedShardOutput,
    rejectedShardOutputSha256: sha256(source.rejectedBytes),
    correctionOutputs: activation.contexts.map((context, index) => ({ path: context.output,
      sha256: sha256(source.correctionOutputBytes[index]), writableFields: context.writableFields })),
    repairedProShard: activation.artifacts.repairedProShard,
    repairedProShardSha256: sha256(repairedBytes),
    authorizedTransformations: proRepair.transformations,
    authorizedFieldsChanged: 8, immutableFieldsChanged: 0,
    validationSummary: proRepair.shardValidation };
  const completeAudit = { schemaVersion: "1.0-assessment-production-post-canary-batch-05-two-debate-recovery-merge-audit",
    protocolId: activation.protocolId, status: "passed", debates: ["189", "109"],
    acceptedConShard: preparation.inputs.acceptedConOutput,
    acceptedConShardSha256: sha256(source.acceptedConBytes), acceptedConShardChanged: false,
    debate189MergedOutput: activation.artifacts.merged189,
    debate189MergedOutputSha256: sha256(merged189Bytes),
    debate109MergedOutput: activation.artifacts.merged109,
    debate109MergedOutputSha256: sha256(merged109Bytes),
    validation189: complete.validation189, validation109: complete.validation109,
    modelAuthoredScores: 0, lockedScoresUnchanged: true };
  await mkdir(path.dirname(path.resolve(activation.artifacts.repairedProShard)), { recursive: true });
  await writeFile(path.resolve(activation.artifacts.repairedProShard), repairedBytes);
  await writeFile(path.resolve(activation.artifacts.merged189), merged189Bytes);
  await writeFile(path.resolve(activation.artifacts.merged109), merged109Bytes);
  await writeFile(path.resolve(activation.artifacts.validation189), `${JSON.stringify(validation189, null, 2)}\n`);
  await writeFile(path.resolve(activation.artifacts.validation109), `${JSON.stringify(validation109, null, 2)}\n`);
  await writeFile(path.resolve(activation.artifacts.proShardMergeAudit), `${JSON.stringify(proAudit, null, 2)}\n`);
  await writeFile(path.resolve(activation.artifacts.completeMergeAudit), `${JSON.stringify(completeAudit, null, 2)}\n`);
}
if (shouldWrite) await writeFile(path.resolve(activation.artifacts.analysis),
  `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status,
  contextsAttempted: analysis.gate.contextsAttempted,
  contextsPassed: analysis.gate.contextsPassed,
  repairedProShardValidationPassed: analysis.gate.repairedProShardValidationPassed,
  debate189CompleteValidationPassed: analysis.gate.debate189CompleteValidationPassed,
  debate109CompleteValidationPassed: analysis.gate.debate109CompleteValidationPassed,
  correctedFields: 8, attempts: analysis.gate.attempts, retries: 0,
  meteredApiCostUsd: 0, paidServiceCalls: 0, modelAuthoredScores: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
