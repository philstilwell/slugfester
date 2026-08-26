#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  POST_CANARY_BATCH_10_PUBLICATION_TIMEOUT_RECOVERY_ROOT as ROOT,
  mergeAndValidatePublicationTimeoutRecoveryDebate
} from "./lib/assessment-production-post-canary-batch-10-publication-resumption-timeout-recovery.mjs";
import {
  POST_CANARY_BATCH_10_PUBLICATION_ROOT as PUBLICATION_ROOT
} from "./lib/assessment-production-post-canary-batch-10-publication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const [preparation, activation, execution] = await Promise.all([
  "execution-preparation-manifest.json",
  "execution-activation.json",
  "model-execution.json"
].map((name) => readFile(path.resolve(`${ROOT}/${name}`)).then(JSON.parse)));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `analysis source hash mismatch: ${file}`);
}
assertV4(
  preparation.contexts.length === 2 &&
  execution.contextsPlanned === 2 &&
  execution.attempts === execution.contextsAttempted &&
  execution.retries === 0 &&
  execution.timeoutExtensions === 0 &&
  execution.recursiveCorrectionContexts === 0 &&
  execution.meteredApiCostUsd === 0 &&
  execution.paidServiceCallsThisStage === 0 &&
  execution.modelAuthoredScores === 0,
  "recovery execution record changed"
);

let merge = null;
let publicationPacket = null;
let packetBytes = null;
let shardOutputBytes = [];
let failureMessage = null;
if (
  execution.status ===
    "completed-two-valid-debate-21-publication-timeout-recovery-contexts" &&
  execution.validContexts === 2 &&
  execution.invalidContexts === 0 &&
  execution.contextsAttempted === 2 &&
  execution.results.every((row) => row.gateAcceptancePassed)
) {
  try {
    const contexts = activation.contexts;
    packetBytes = await readFile(path.resolve(
      `${PUBLICATION_ROOT}/packets/debate-21.json`));
    publicationPacket = JSON.parse(packetBytes);
    const shardPackets = await Promise.all(contexts.map((row) =>
      readFile(path.resolve(row.packet)).then(JSON.parse)));
    shardOutputBytes = await Promise.all(contexts.map((row) =>
      readFile(path.resolve(row.output))));
    for (let index = 0; index < contexts.length; index += 1) {
      const result = execution.results.find(
        (row) => row.contextIndex === contexts[index].contextIndex);
      assertV4(
        result && sha256(shardOutputBytes[index]) === result.outputSha256,
        `context ${contexts[index].contextIndex}: output hash changed`
      );
    }
    merge = mergeAndValidatePublicationTimeoutRecoveryDebate({
      shardOutputs: shardOutputBytes.map(JSON.parse),
      shardPackets,
      publicationPacket
    });
    assertV4(merge.validation.status === "passed",
      "Debate 21 complete validation failed");
  } catch (error) {
    failureMessage = (error.stack ?? error.message).slice(-10000);
  }
}
const passed = merge?.validation.status === "passed" && !failureMessage;
const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-10-debate-21-publication-timeout-recovery-analysis",
  protocolId: activation.protocolId,
  status: passed
    ? "batch-10-debate-21-sharded-publication-timeout-recovery-passed-awaiting-nine-context-resumption"
    : "batch-10-debate-21-publication-timeout-recovery-failed",
  productionCanary: false,
  batchNumber: 10,
  stagingOnly: true,
  gate: {
    contextsPlanned: 2,
    contextsAttempted: execution.contextsAttempted,
    contextsPassed: execution.validContexts,
    contextsFailed: execution.invalidContexts,
    recoveredDebates: passed ? 1 : 0,
    shardsPerDebate: 2,
    completeDebatesValidated: passed ? 1 : 0,
    recoveredMoves: passed ? merge.validation.moves : 0,
    recoveredCritiques: passed ? merge.validation.critiques : 0,
    failedPartialOutputsReused: 0,
    originalContentFieldsAcceptedExactlyOnce: passed,
    fixedFieldsReconstructedDeterministically: passed,
    hostAwakeGuardAppliedToEveryContext:
      execution.results.every((row) => row.hostAwakeGuardApplied),
    attempts: execution.attempts,
    retries: 0,
    timeoutExtensions: 0,
    recursiveCorrections: 0,
    modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0
  },
  failureMessage,
  recoveredDebate: "21",
  mergedOutput: passed ? activation.artifacts.merged["21"] : null,
  unattemptedOriginalContextIndexes: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  totals: {
    modelContexts: execution.contextsAttempted,
    meteredApiCostUsd: 0,
    paidServiceCallsThisStage: 0,
    modelAuthoredScores: 0
  },
  authorization: {
    nineContextResumptionPreparation: passed,
    modelExecution: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: passed
    ? "prepare-freeze-nine-unattempted-batch-10-publication-contexts"
    : "stop-on-further-publication-recovery-failure"
};
if (shouldWrite) {
  assertV4(!(await exists(activation.artifacts.analysis)),
    "analysis already exists");
  if (passed) {
    const mergedPath = activation.artifacts.merged["21"];
    const validationPath = `${ROOT}/complete-validation-debate-21.json`;
    const auditPath = `${ROOT}/merge-audit-debate-21.json`;
    for (const file of [mergedPath, validationPath, auditPath]) {
      assertV4(!(await exists(file)), `${file} already exists`);
    }
    const mergedBytes = Buffer.from(
      `${JSON.stringify(merge.merged, null, 2)}\n`);
    await mkdir(path.dirname(path.resolve(mergedPath)), { recursive: true });
    await writeFile(path.resolve(mergedPath), mergedBytes);
    await writeFile(path.resolve(validationPath),
      `${JSON.stringify({
        schemaVersion:
          "1.0-assessment-production-post-canary-batch-10-debate-21-publication-timeout-recovery-complete-validation",
        protocolId: activation.protocolId,
        status: "passed",
        debateNumber: "21",
        mergedOutputSha256: sha256(mergedBytes),
        validationSummary: merge.validation,
        acceptedOriginalContentFields: merge.acceptedContentFields.length,
        acceptedExactlyOnce: true,
        failedPartialOutputReused: false,
        fixedFieldsReconstructedDeterministically: true,
        modelAuthoredScores: 0,
        lockedScoresUnchanged: true
      }, null, 2)}\n`);
    await writeFile(path.resolve(auditPath),
      `${JSON.stringify({
        schemaVersion:
          "1.0-assessment-production-post-canary-batch-10-debate-21-publication-timeout-recovery-merge-audit",
        protocolId: activation.protocolId,
        status: "passed",
        debateNumber: "21",
        originalTimedOutOutputReused: false,
        acceptedShardOutputs: activation.contexts.map((context, index) => ({
          shardId: context.shardId,
          side: context.side,
          path: context.output,
          sha256: sha256(shardOutputBytes[index]),
          writableFields: context.writableFields
        })),
        acceptedOriginalContentFields: merge.acceptedContentFields,
        acceptedExactlyOnce: true,
        fixedFieldsReconstructedDeterministically: true,
        mergedOutput: mergedPath,
        mergedOutputSha256: sha256(mergedBytes),
        completeValidation: merge.validation,
        modelAuthoredScores: 0,
        lockedScoresUnchanged: true
      }, null, 2)}\n`);
  }
  await writeFile(path.resolve(activation.artifacts.analysis),
    `${JSON.stringify(analysis, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: analysis.status,
  contextsAttempted: analysis.gate.contextsAttempted,
  contextsPassed: analysis.gate.contextsPassed,
  recoveredDebates: analysis.gate.recoveredDebates,
  recoveredMoves: analysis.gate.recoveredMoves,
  attempts: analysis.gate.attempts,
  retries: 0,
  timeoutExtensions: 0,
  costUsd: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction
}, null, 2));
if (!passed) process.exitCode = 2;
