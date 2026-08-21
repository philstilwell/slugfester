#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validatePostCanaryBatch04DisputeAdjudicationOutput } from
  "./lib/assessment-production-post-canary-batch-04-dispute-adjudication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-04/dispute-only-adjudication";
const correctionRoot = `${root}/failure-recovery/debate-185-correction`;
const diagnosisPath = `${correctionRoot}/diagnosis.json`;
const paths = {
  standingAuthorization:
    "docs/assessment-production/post-canary-continuation-v1/batch-04/standing-authorization.json",
  activation: `${root}/execution-activation.json`,
  execution: `${root}/model-execution.json`,
  packet: `${root}/packets/debate-185.json`,
  invalidOutput: `${root}/outputs/debate-185.json`,
  validator:
    "scripts/lib/assessment-production-post-canary-batch-04-dispute-adjudication.mjs",
  diagnostic:
    "scripts/diagnose-assessment-production-post-canary-batch-04-debate-185-adjudication-validation-failure.mjs",
  test:
    "scripts/test-assessment-production-post-canary-batch-04-debate-185-adjudication-validation-failure-diagnosis.mjs"
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const bytes = Object.fromEntries(
  await Promise.all(
    Object.entries(paths).map(async ([key, file]) => [key, await readFile(file)])
  )
);
const standing = JSON.parse(bytes.standingAuthorization);
const execution = JSON.parse(bytes.execution);
const packet = JSON.parse(bytes.packet);
const invalid = JSON.parse(bytes.invalidOutput);
const result = execution.results.find((item) => item.debateNumber === "185");
const moveId = "con-reasons-without-desert-freedom";
const invalidMove = invalid.moveDecisions.find((item) => item.moveId === moveId);
const packetMove = packet.disputedMoves.find((item) => item.moveId === moveId);

assertV4(
  standing.status ===
      "frozen-active-batch-04-complete-remaining-workflow-standing-authorization" &&
    standing.authorization.boundedCorrections === true &&
    result.status === "output-validation-failed" &&
    result.validationMessage.startsWith(
      `Error: ${moveId}.importancePairChoice: candidate 1 or 2 required`
    ) &&
    result.outputSha256 === sha256(bytes.invalidOutput) &&
    result.commandExitCode === 0 &&
    result.timedOut === false &&
    result.outputWritten === true &&
    invalid.moveDecisions.length === 18 &&
    packet.disputedMoves.length === 18 &&
    invalid.burdenAdjustmentDecisions.length === 2 &&
    packet.burdenAdjustmentDisputes.length === 2 &&
    invalidMove.importancePairChoice === null &&
    packetMove.requiredDecision.importancePairChoiceRequired === true &&
    result.attemptCount === 1 &&
    result.retryCount === 0 &&
    result.timeoutExtensionCount === 0,
  "Debate 185 preserved validation failure changed"
);

const diagnosticOverlay = structuredClone(invalid);
diagnosticOverlay.moveDecisions.find(
  (item) => item.moveId === moveId
).importancePairChoice = 1;
const overlayValidation = validatePostCanaryBatch04DisputeAdjudicationOutput(
  diagnosticOverlay,
  packet
);
assertV4(
  overlayValidation.status === "passed" &&
    overlayValidation.disputedMoves === 18 &&
    overlayValidation.candidateSelections === 60,
  "Debate 185 diagnostic overlay exposed another defect"
);

const diagnosis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-04-debate-185-adjudication-validation-failure-diagnosis",
  status:
    "frozen-diagnosed-batch-04-debate-185-missing-required-importance-choice",
  productionCanary: false,
  batchNumber: 4,
  stagingOnly: true,
  debateNumber: "185",
  preservedFailure: {
    classification:
      "schema-valid-transport-output-null-required-anonymous-importance-choice",
    moveId,
    field: "importancePairChoice",
    returnedValue: null,
    requiredValues: [1, 2],
    commandExitCode: 0,
    timedOut: false,
    outputWritten: true,
    moveDecisionsReturned: 18,
    moveDecisionsRequired: 18,
    burdenAdjustmentDecisionsReturned: 2,
    burdenAdjustmentDecisionsRequired: 2,
    invalidOutputSha256: sha256(bytes.invalidOutput),
    invalidOutputReusable: false,
    attemptCount: 1,
    retries: 0,
    timeoutExtensions: 0,
    directIncrementalCostUsd: 0
  },
  deterministicDiagnosisOverlay: {
    persistentMutation: false,
    placeholderEntries: 1,
    validationAfterOverlay: overlayValidation.status,
    candidateSelectionsAfterOverlay: overlayValidation.candidateSelections,
    additionalValidationDefectsExposed: 0,
    overlayDecisionAccepted: false
  },
  boundedCorrection: {
    operation: "fresh-full-packet-score-blind-adjudication-correction",
    reason:
      "No field from the failed partial output may be reused, so all 60 original anonymous selections must be decided in one fresh correction context.",
    contexts: 1,
    disputedMoves: 18,
    candidateSelections: 60,
    attempts: 1,
    retries: 0,
    timeoutExtensions: 0,
    originalPacketPreserved: true,
    originalSchemaPreserved: true,
    originalValidatorMeaningPreserved: true,
    failedPartialOutputReusable: false
  },
  sourceHashes: Object.fromEntries(
    Object.entries(paths).map(([key, file]) => [file, sha256(bytes[key])])
  ),
  authorization: {
    correctionPreparation: true,
    correctionModelExecution: false,
    paidServices: false,
    scoreDerivation: false
  },
  directIncrementalCostUsd: 0,
  nextAuthorizedAction:
    "prepare-freeze-one-fresh-full-packet-debate-185-adjudication-correction-context"
};

if (shouldWrite) {
  await mkdir(path.dirname(diagnosisPath), { recursive: true });
  await writeFile(diagnosisPath, `${JSON.stringify(diagnosis, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? diagnosis.status : "preview",
      failedMoveId: moveId,
      failedField: "importancePairChoice",
      returnedValue: null,
      requiredValues: [1, 2],
      additionalValidationDefectsExposed: 0,
      correctionContexts: 1,
      candidateSelections: 60,
      failedPartialOutputReusable: false,
      directIncrementalCostUsd: 0,
      nextAuthorizedAction: diagnosis.nextAuthorizedAction
    },
    null,
    2
  )
);
