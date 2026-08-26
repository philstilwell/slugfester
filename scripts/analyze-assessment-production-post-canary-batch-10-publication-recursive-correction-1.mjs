#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ROOT,
  TARGET_FIELD,
  TARGET_MOVE_ID,
  validateCorrectionOutput
} from "./lib/assessment-production-post-canary-batch-10-publication-recursive-correction-1.mjs";
import {
  mergeAndValidatePublicationTimeoutRecoveryDebate,
  validatePublicationTimeoutRecoveryShardOutput
} from "./lib/assessment-production-post-canary-batch-10-publication-resumption-timeout-recovery.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const RECOVERY_ROOT = path.dirname(ROOT);
const PUBLICATION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-10/publication-reconstruction";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const [preparationBytes, activationBytes, executionBytes] = await Promise.all([
  `${ROOT}/execution-preparation-manifest.json`,
  `${ROOT}/execution-activation.json`,
  `${ROOT}/model-execution.json`
].map((file) => readFile(path.resolve(file))));
const preparation = JSON.parse(preparationBytes);
const activation = JSON.parse(activationBytes);
const execution = JSON.parse(executionBytes);

assertV4(
  execution.attemptCount === 1 && execution.retryCount === 0 &&
    execution.timeoutExtensionCount === 0 &&
    execution.furtherRecursiveCorrectionContextCount === 0 &&
    execution.meteredApiCostUsd === 0 && execution.paidServiceCallsThisStage === 0 &&
    execution.modelAuthoredScores === 0,
  "correction execution record changed"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `analysis source hash mismatch: ${file}`);
}

let merge = null;
let correctedCon = null;
let correctionValidation = null;
let correctedConValidation = null;
let failureMessage = null;
let bytes = null;
if (execution.status === "completed-valid" && execution.gateAcceptancePassed) {
  try {
    const [correctionBytes, packetBytes, proBytes, conBytes, proPacketBytes,
      conPacketBytes, publicationPacketBytes] = await Promise.all([
      activation.context.output,
      activation.context.packet,
      `${RECOVERY_ROOT}/outputs/context-0.json`,
      `${RECOVERY_ROOT}/outputs/context-1.json`,
      `${RECOVERY_ROOT}/packets/context-0.json`,
      `${RECOVERY_ROOT}/packets/context-1.json`,
      `${PUBLICATION_ROOT}/packets/debate-21.json`
    ].map((file) => readFile(path.resolve(file))));
    assertV4(sha256(correctionBytes) === execution.outputSha256,
      "correction output hash changed");
    assertV4(sha256(proBytes) === preparation.sourceHashes[`${RECOVERY_ROOT}/outputs/context-0.json`],
      "passed pro shard changed");
    assertV4(sha256(conBytes) === preparation.sourceHashes[`${RECOVERY_ROOT}/outputs/context-1.json`],
      "preserved con shard changed");
    const correction = JSON.parse(correctionBytes);
    const packet = JSON.parse(packetBytes);
    const proOutput = JSON.parse(proBytes);
    correctedCon = JSON.parse(conBytes);
    const proPacket = JSON.parse(proPacketBytes);
    const conPacket = JSON.parse(conPacketBytes);
    const publicationPacket = JSON.parse(publicationPacketBytes);
    correctionValidation = validateCorrectionOutput(correction, packet);
    const before = correctedCon.content.moveProse[TARGET_MOVE_ID].critique;
    correctedCon.content.moveProse[TARGET_MOVE_ID].critique = correction.critique;
    assertV4(before !== correction.critique, "correction did not replace the failed critique");
    correctedConValidation = validatePublicationTimeoutRecoveryShardOutput(
      correctedCon,
      conPacket
    );
    merge = mergeAndValidatePublicationTimeoutRecoveryDebate({
      shardOutputs: [proOutput, correctedCon],
      shardPackets: [proPacket, conPacket],
      publicationPacket
    });
    assertV4(merge.validation.status === "passed", "complete Debate 21 validation failed");
    bytes = {
      correctedCon: Buffer.from(`${JSON.stringify(correctedCon, null, 2)}\n`),
      merged: Buffer.from(`${JSON.stringify(merge.merged, null, 2)}\n`)
    };
  } catch (error) {
    failureMessage = (error.stack ?? error.message).slice(-10000);
  }
}
const passed = merge?.validation.status === "passed" && !failureMessage;
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-10-publication-recursive-correction-analysis",
  protocolId: activation.protocolId,
  status: passed
    ? "batch-10-debate-21-one-field-publication-correction-passed-awaiting-nine-context-resumption"
    : "batch-10-debate-21-one-field-publication-correction-failed",
  productionCanary: false,
  batchNumber: 10,
  stagingOnly: true,
  correctedField: TARGET_FIELD,
  gate: {
    contextsPlanned: 1,
    contextsAttempted: 1,
    contextsPassed: passed ? 1 : 0,
    contextsFailed: passed ? 0 : 1,
    writableFields: 1,
    correctedFields: passed ? 1 : 0,
    passedProShardRetained: passed,
    validationCleanConFieldsRetainedDeterministically: passed,
    failedCritiqueRetained: false,
    failedOutputShownToCorrectionModel: false,
    correctedConShardValidated: correctedConValidation?.status === "passed",
    completeDebate21Validated: merge?.validation.status === "passed",
    attempts: 1,
    retries: 0,
    timeoutExtensions: 0,
    furtherRecursiveCorrections: 0,
    modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0
  },
  correctionValidation,
  correctedConValidation,
  completeDebateValidation: merge?.validation ?? null,
  failureMessage,
  unattemptedOriginalContextIndexes: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  totals: {
    modelContexts: 1,
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
    ? "prepare-freeze-and-run-only-nine-original-unattempted-batch-10-publication-contexts"
    : "stop-no-automatic-retry-timeout-extension-or-further-correction"
};

if (shouldWrite) {
  assertV4(!(await exists(activation.artifacts.analysis)), "correction analysis already exists");
  if (passed) {
    for (const file of [activation.artifacts.correctedConShard,
      activation.artifacts.mergedDebate21, activation.artifacts.completeValidation,
      activation.artifacts.mergeAudit]) {
      assertV4(!(await exists(file)), `${file} already exists`);
    }
    await writeFile(path.resolve(activation.artifacts.correctedConShard), bytes.correctedCon);
    await writeFile(path.resolve(activation.artifacts.mergedDebate21), bytes.merged);
    await writeFile(path.resolve(activation.artifacts.completeValidation),
      `${JSON.stringify({
        schemaVersion: "1.0-assessment-production-post-canary-batch-10-debate-21-publication-recursive-correction-complete-validation",
        protocolId: activation.protocolId,
        status: "passed",
        debateNumber: "21",
        correctedField: TARGET_FIELD,
        mergedOutput: activation.artifacts.mergedDebate21,
        mergedOutputSha256: sha256(bytes.merged),
        validationSummary: merge.validation,
        lockedScoresUnchanged: true,
        modelAuthoredScores: 0
      }, null, 2)}\n`);
    await writeFile(path.resolve(activation.artifacts.mergeAudit),
      `${JSON.stringify({
        schemaVersion: "1.0-assessment-production-post-canary-batch-10-debate-21-publication-recursive-correction-merge-audit",
        protocolId: activation.protocolId,
        status: "passed",
        debateNumber: "21",
        passedProShardRetained: {
          path: `${RECOVERY_ROOT}/outputs/context-0.json`,
          sha256: preparation.sourceHashes[`${RECOVERY_ROOT}/outputs/context-0.json`]
        },
        sourceConShardRetainedExceptFailedCritique: {
          path: `${RECOVERY_ROOT}/outputs/context-1.json`,
          sha256: preparation.sourceHashes[`${RECOVERY_ROOT}/outputs/context-1.json`],
          validationCleanFieldsRetainedDeterministically: true,
          failedCritiqueRetained: false
        },
        correction: {
          path: activation.context.output,
          sha256: execution.outputSha256,
          replacedField: TARGET_FIELD,
          otherFieldsAuthored: 0,
          failedOutputShownToModel: false
        },
        correctedConShard: {
          path: activation.artifacts.correctedConShard,
          sha256: sha256(bytes.correctedCon),
          validation: correctedConValidation
        },
        mergedOutput: {
          path: activation.artifacts.mergedDebate21,
          sha256: sha256(bytes.merged),
          validation: merge.validation
        },
        lockedScoresUnchanged: true,
        modelAuthoredScores: 0
      }, null, 2)}\n`);
  }
  await writeFile(path.resolve(activation.artifacts.analysis),
    `${JSON.stringify(analysis, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: analysis.status,
  correctedFields: analysis.gate.correctedFields,
  correctedConShardValidated: analysis.gate.correctedConShardValidated,
  completeDebate21Validated: analysis.gate.completeDebate21Validated,
  attempts: 1,
  retries: 0,
  timeoutExtensions: 0,
  furtherCorrections: 0,
  costUsd: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction
}, null, 2));
if (!passed) process.exitCode = 2;
