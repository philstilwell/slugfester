#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { validatePostCanaryBatch03DisputeAdjudicationOutput } from
  "./lib/assessment-production-post-canary-batch-03-dispute-adjudication.mjs";
import { loadAndValidateRecoveryAuthorization } from
  "./lib/assessment-production-post-canary-batch-03-failure-recovery-standing-authorization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";
const shouldWrite = process.argv.includes("--write");
const root = "docs/assessment-production/post-canary-continuation-v1/batch-03/dispute-only-adjudication";
const resumption = `${root}/failure-recovery/resumption`;
const outputPath = `${root}/failure-recovery/debate-27-correction/diagnosis.json`;
const paths = {
  recoveryAuthorization: "docs/assessment-production/post-canary-continuation-v1/batch-03/failure-recovery-standing-authorization.json",
  activation: `${resumption}/execution-activation.json`,
  execution: `${resumption}/model-execution.json`,
  packet: `${root}/packets/debate-27.json`,
  invalidOutput: `${root}/outputs/debate-27.json`,
  validator: "scripts/lib/assessment-production-post-canary-batch-03-dispute-adjudication.mjs",
  diagnostic: "scripts/diagnose-assessment-production-post-canary-batch-03-debate-27-adjudication-validation-failure.mjs",
  test: "scripts/test-assessment-production-post-canary-batch-03-debate-27-adjudication-validation-failure-diagnosis.mjs"
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const { record: recovery } = await loadAndValidateRecoveryAuthorization();
const bytes = Object.fromEntries(await Promise.all(Object.entries(paths)
  .map(async ([key, file]) => [key, await readFile(file)])));
const execution = JSON.parse(bytes.execution);
const packet = JSON.parse(bytes.packet);
const invalid = JSON.parse(bytes.invalidOutput);
const result = execution.results.find((item) => item.debateNumber === "27");
assertV4(
  recovery.authorization.boundedFirstCorrection === true &&
    result.status === "output-validation-failed" &&
    result.validationMessage.startsWith("Error: burden adjustment decision count mismatch") &&
    result.outputSha256 === sha256(bytes.invalidOutput) &&
    invalid.moveDecisions.length === 19 && packet.disputedMoves.length === 19 &&
    invalid.burdenAdjustmentDecisions.length === 0 &&
    packet.burdenAdjustmentDisputes.length === 2 &&
    result.attemptCount === 1 && result.retryCount === 0 &&
    result.timeoutExtensionCount === 0,
  "Debate 27 preserved validation failure changed"
);
const diagnosticOverlay = structuredClone(invalid);
diagnosticOverlay.burdenAdjustmentDecisions = packet.burdenAdjustmentDisputes.map((item) => ({
  side: item.side,
  choice: 1,
  rationale: "Diagnostic placeholder used only to test whether another validation defect remains after restoring the required array shape."
}));
const overlayValidation = validatePostCanaryBatch03DisputeAdjudicationOutput(
  diagnosticOverlay, packet);
assertV4(overlayValidation.status === "passed" &&
  overlayValidation.candidateSelections === 70,
  "Debate 27 diagnostic overlay exposed another defect");
const diagnosis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-03-debate-27-adjudication-validation-failure-diagnosis",
  status: "frozen-diagnosed-batch-03-debate-27-missing-burden-adjustment-decisions",
  productionCanary: false, batchNumber: 3, stagingOnly: true, debateNumber: "27",
  preservedFailure: {
    classification: "schema-valid-transport-output-omitted-required-burden-decision-array-items",
    commandExitCode: 0, timedOut: false, outputWritten: true,
    moveDecisionsReturned: 19, moveDecisionsRequired: 19,
    burdenAdjustmentDecisionsReturned: 0,
    burdenAdjustmentDecisionsRequired: 2,
    requiredBurdenSides: ["pro", "con"],
    invalidOutputSha256: sha256(bytes.invalidOutput),
    invalidOutputReusable: false,
    attemptCount: 1, retries: 0, timeoutExtensions: 0,
    directIncrementalCostUsd: 0
  },
  deterministicDiagnosisOverlay: {
    persistentMutation: false,
    placeholderEntries: 2,
    validationAfterOverlay: overlayValidation.status,
    candidateSelectionsAfterOverlay: overlayValidation.candidateSelections,
    additionalValidationDefectsExposed: 0,
    overlayDecisionsAccepted: false
  },
  boundedCorrection: {
    operation: "fresh-full-packet-score-blind-adjudication-correction",
    reason: "No field from the failed partial output may be reused, so all 70 original anonymous selections must be decided in one fresh correction context.",
    contexts: 1, candidateSelections: 70,
    explicitlyRequireBurdenDecisionCount: 2,
    explicitlyRequireBurdenSideOrder: ["pro", "con"],
    attempts: 1, retries: 0, timeoutExtensions: 0,
    originalPacketPreserved: true, originalSchemaPreserved: true,
    originalValidatorMeaningPreserved: true, failedPartialOutputReusable: false
  },
  sourceHashes: Object.fromEntries(Object.entries(paths).map(([key, file]) =>
    [file, sha256(bytes[key])])),
  authorization: {
    correctionPreparation: true, correctionModelExecution: false,
    paidServices: false, scoreDerivation: false
  },
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: "prepare-freeze-one-fresh-full-packet-debate-27-adjudication-correction-context"
};
if (shouldWrite) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(diagnosis, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? diagnosis.status : "preview",
  moveDecisionsReturned: 19, burdenDecisionsReturned: 0,
  burdenDecisionsRequired: 2, correctionContexts: 1,
  failedPartialOutputReusable: false, directIncrementalCostUsd: 0,
  nextAuthorizedAction: diagnosis.nextAuthorizedAction }, null, 2));
