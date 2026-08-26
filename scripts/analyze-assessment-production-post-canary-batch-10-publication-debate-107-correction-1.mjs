#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ROOT, TARGETS, validateCorrectionOutput } from
  "./lib/assessment-production-post-canary-batch-10-publication-debate-107-correction-1.mjs";
import { validatePostCanaryBatch10PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-10-publication-validation.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const PUBLICATION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-10/publication-reconstruction";
const RESUMPTION_ROOT = path.dirname(ROOT);
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
    execution.timeoutExtensionCount === 0 && execution.furtherCorrectionContextCount === 0 &&
    execution.meteredApiCostUsd === 0 && execution.paidServiceCallsThisStage === 0 &&
    execution.modelAuthoredScores === 0 &&
    execution.explicitThreeWritableFieldException === true,
  "Debate 107 correction execution record changed"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `analysis source hash mismatch: ${file}`);
}

let correctionValidation = null;
let completeValidation = null;
let corrected = null;
let correction = null;
let bytes = null;
let failureMessage = null;
if (execution.status === "completed-valid" && execution.gateAcceptancePassed) {
  try {
    const [correctionBytes, packetBytes, failedOutputBytes, publicationPacketBytes,
      failedValidationBytes, failedProvenanceBytes] = await Promise.all([
      activation.context.output,
      activation.context.packet,
      activation.artifacts.acceptedBaseOutput,
      `${PUBLICATION_ROOT}/packets/debate-107.json`,
      activation.artifacts.acceptedBaseValidation,
      activation.artifacts.acceptedBaseProvenance
    ].map((file) => readFile(path.resolve(file))));
    assertV4(sha256(correctionBytes) === execution.outputSha256,
      "correction output hash changed");
    assertV4(
      sha256(failedOutputBytes) === preparation.sourceHashes[activation.artifacts.acceptedBaseOutput] &&
        sha256(failedValidationBytes) === preparation.sourceHashes[activation.artifacts.acceptedBaseValidation] &&
        sha256(failedProvenanceBytes) === preparation.sourceHashes[activation.artifacts.acceptedBaseProvenance],
      "preserved failed Debate 107 artifacts changed"
    );
    correction = JSON.parse(correctionBytes);
    const packet = JSON.parse(packetBytes);
    const failedOutput = JSON.parse(failedOutputBytes);
    const publicationPacket = JSON.parse(publicationPacketBytes);
    correctionValidation = validateCorrectionOutput(correction, packet);
    corrected = structuredClone(failedOutput);
    const replacements = [];
    for (let index = 0; index < TARGETS.length; index += 1) {
      const target = TARGETS[index];
      const item = corrected.aiExtension.pro.premises[target.arrayIndex];
      assertV4(item.id === target.itemId, `${target.itemId}: merge target changed`);
      const originalExplanation = item.novelty.explanation;
      const replacement = correction.corrections[index].explanation;
      assertV4(originalExplanation !== replacement,
        `${target.itemId}: rejected explanation was not replaced`);
      item.novelty.explanation = replacement;
      replacements.push({
        itemId: target.itemId,
        field: target.field,
        originalExplanationSha256: sha256(originalExplanation),
        replacementExplanationSha256: sha256(replacement)
      });
    }
    completeValidation = validatePostCanaryBatch10PublicationOutput(
      corrected,
      publicationPacket
    );
    assertV4(completeValidation.status === "passed",
      "complete corrected Debate 107 validation failed");
    bytes = {
      correction: correctionBytes,
      failedOutput: failedOutputBytes,
      failedValidation: failedValidationBytes,
      failedProvenance: failedProvenanceBytes,
      corrected: Buffer.from(`${JSON.stringify(corrected, null, 2)}\n`),
      replacements
    };
  } catch (error) {
    failureMessage = (error.stack ?? error.message).slice(-10000);
  }
}
const passed = completeValidation?.status === "passed" && !failureMessage;
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-10-publication-debate-107-correction-analysis",
  protocolId: activation.protocolId,
  status: passed
    ? "batch-10-debate-107-three-field-publication-correction-passed-awaiting-six-context-resumption"
    : "batch-10-debate-107-three-field-publication-correction-failed",
  productionCanary: false,
  batchNumber: 10,
  stagingOnly: true,
  gate: {
    contextsPlanned: 1,
    contextsAttempted: 1,
    contextsPassed: passed ? 1 : 0,
    contextsFailed: passed ? 0 : 1,
    writableFields: 3,
    correctedFields: passed ? 3 : 0,
    explicitUserAuthorizedThreeFieldException: true,
    normalRepairWritableFieldsMaximum: 2,
    passedDebates74And142Retained: passed,
    validationCleanDebate107FieldsRetainedDeterministically: passed,
    rejectedExplanationsRetained: false,
    failedPublicationOutputShownToCorrectionModel: false,
    completeDebate107Validated: completeValidation?.status === "passed",
    attempts: 1,
    retries: 0,
    timeoutExtensions: 0,
    furtherCorrections: 0,
    modelAuthoredScores: 0,
    scorePassesExecutedThisStage: 0
  },
  correctionValidation,
  completeDebateValidation: completeValidation,
  failureMessage,
  unattemptedOriginalContextIndexes: [4, 5, 6, 7, 8, 9],
  unattemptedDebates: ["123", "177", "68", "147", "61", "130"],
  totals: {
    modelContexts: 1,
    meteredApiCostUsd: 0,
    paidServiceCallsThisStage: 0,
    modelAuthoredScores: 0
  },
  authorization: {
    sixContextResumptionPreparation: passed,
    modelExecution: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: passed
    ? "prepare-freeze-and-run-only-six-original-unattempted-batch-10-publication-contexts"
    : "stop-no-automatic-retry-timeout-extension-or-further-correction"
};

if (shouldWrite) {
  assertV4(!(await exists(activation.artifacts.analysis)), "correction analysis already exists");
  if (passed) {
    for (const file of [activation.artifacts.correctedDebate107,
      activation.artifacts.completeValidation, activation.artifacts.mergeAudit]) {
      assertV4(!(await exists(file)), `${file} already exists`);
    }
    const correctedSha256 = sha256(bytes.corrected);
    const acceptedValidation = {
      schemaVersion: "1.0-assessment-production-post-canary-batch-10-publication-validation-after-field-correction",
      protocolId: activation.protocolId,
      status: "passed",
      debateNumber: "107",
      debateId: corrected.debateId,
      outputSha256: correctedSha256,
      validationSummary: completeValidation,
      correction: {
        path: activation.context.output,
        sha256: execution.outputSha256,
        correctedFields: TARGETS.map((target) => target.field),
        explicitUserAuthorizedThreeFieldException: true
      },
      lockedScoresUnchanged: true,
      modelAuthoredScores: 0
    };
    const acceptedProvenance = {
      schemaVersion: "1.0-assessment-production-post-canary-batch-10-publication-provenance-after-field-correction",
      protocolId: activation.protocolId,
      debateNumber: "107",
      debateId: corrected.debateId,
      originalPublicationAttempt: {
        sourceResumptionExecution: `${RESUMPTION_ROOT}/model-execution.json`,
        sourceOutputSha256: sha256(bytes.failedOutput),
        sourceValidationSha256: sha256(bytes.failedValidation),
        sourceProvenanceSha256: sha256(bytes.failedProvenance),
        attemptCount: 1,
        retryCount: 0
      },
      fieldCorrection: {
        sourceExecution: activation.artifacts.execution,
        sourceOutputSha256: execution.outputSha256,
        model: activation.model,
        authentication: "ChatGPT subscription",
        attemptCount: 1,
        retryCount: 0,
        timeoutExtensionCount: 0,
        writableFields: TARGETS.map((target) => target.field),
        explicitUserAuthorizedThreeFieldException: true,
        failedPublicationOutputAvailableToModel: false,
        rejectedExplanationsAvailableToModel: false
      },
      acceptedOutputSha256: correctedSha256,
      lockedScoresUnchanged: true,
      modelAuthoredScores: 0,
      meteredApiCostUsd: 0,
      paidServiceCalls: 0
    };
    await writeFile(path.resolve(activation.artifacts.correctedDebate107), bytes.corrected);
    await writeFile(path.resolve(activation.artifacts.completeValidation),
      `${JSON.stringify({
        schemaVersion: "1.0-assessment-production-post-canary-batch-10-debate-107-publication-correction-complete-validation",
        protocolId: activation.protocolId,
        status: "passed",
        debateNumber: "107",
        correctedFields: TARGETS.map((target) => target.field),
        correctedOutputSha256: correctedSha256,
        validationSummary: completeValidation,
        lockedScoresUnchanged: true,
        modelAuthoredScores: 0
      }, null, 2)}\n`);
    await writeFile(path.resolve(activation.artifacts.mergeAudit),
      `${JSON.stringify({
        schemaVersion: "1.0-assessment-production-post-canary-batch-10-debate-107-publication-correction-merge-audit",
        protocolId: activation.protocolId,
        status: "passed",
        debateNumber: "107",
        sourceFailedOutput: {
          path: activation.artifacts.acceptedBaseOutput,
          sha256: sha256(bytes.failedOutput),
          retainedValidationCleanFieldsDeterministically: true,
          rejectedExplanationsRetained: false
        },
        correction: {
          path: activation.context.output,
          sha256: execution.outputSha256,
          failedPublicationOutputShownToModel: false,
          rejectedExplanationsShownToModel: false,
          explicitUserAuthorizedThreeFieldException: true,
          replacements: bytes.replacements
        },
        correctedOutput: {
          path: activation.artifacts.correctedDebate107,
          sha256: correctedSha256,
          validation: completeValidation
        },
        acceptedBaseOutput: activation.artifacts.acceptedBaseOutput,
        lockedScoresUnchanged: true,
        modelAuthoredScores: 0
      }, null, 2)}\n`);
    await writeFile(path.resolve(activation.artifacts.acceptedBaseOutput), bytes.corrected);
    await writeFile(path.resolve(activation.artifacts.acceptedBaseValidation),
      `${JSON.stringify(acceptedValidation, null, 2)}\n`);
    await writeFile(path.resolve(activation.artifacts.acceptedBaseProvenance),
      `${JSON.stringify(acceptedProvenance, null, 2)}\n`);
  }
  await writeFile(path.resolve(activation.artifacts.analysis),
    `${JSON.stringify(analysis, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: analysis.status,
  correctedFields: analysis.gate.correctedFields,
  completeDebate107Validated: analysis.gate.completeDebate107Validated,
  attempts: 1,
  retries: 0,
  timeoutExtensions: 0,
  furtherCorrections: 0,
  costUsd: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction
}, null, 2));
if (!passed) process.exitCode = 2;
