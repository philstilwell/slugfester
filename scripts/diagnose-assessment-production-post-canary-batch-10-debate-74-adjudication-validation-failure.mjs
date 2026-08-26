#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validatePostCanaryBatch10DisputeAdjudicationOutput } from
  "./lib/assessment-production-post-canary-batch-10-dispute-adjudication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-10/dispute-only-adjudication";
const recovery = `${root}/failure-recovery`;
const diagnosisPath = `${recovery}/debate-74-validation-failure-diagnosis.json`;
const paths = {
  standingAuthorization:
    "docs/assessment-production/post-canary-continuation-v1/batch-10/standing-authorization.json",
  activation: `${root}/execution-activation.json`,
  execution: `${root}/model-execution.json`,
  packet: `${root}/packets/debate-74.json`,
  invalidOutput: `${root}/outputs/debate-74.json`,
  validator:
    "scripts/lib/assessment-production-post-canary-batch-10-dispute-adjudication.mjs",
  diagnostic:
    "scripts/diagnose-assessment-production-post-canary-batch-10-debate-74-adjudication-validation-failure.mjs"
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const bytes = Object.fromEntries(
  await Promise.all(
    Object.entries(paths).map(async ([key, file]) => [key, await readFile(file)])
  )
);
const standing = JSON.parse(bytes.standingAuthorization);
const activation = JSON.parse(bytes.activation);
const execution = JSON.parse(bytes.execution);
const packet = JSON.parse(bytes.packet);
const invalid = JSON.parse(bytes.invalidOutput);
const result = execution.results.find((item) => item.debateNumber === "74");

assertV4(
  standing.status ===
      "frozen-active-batch-10-complete-remaining-workflow-standing-authorization" &&
    standing.authorization.boundedCorrections === true &&
    standing.recoveryControls.boundedFirstRecoveryAuthorized === true &&
    standing.recoveryControls.minimumShardCountRequired === true &&
    standing.recoveryControls.failedPartialOutputReusable === false &&
    standing.recoveryControls.unattemptedContextResumptionPermitted === true &&
    activation.contexts.find((item) => item.debateNumber === "74")
      .candidateSelections === 52 &&
    result.status === "output-validation-failed" &&
    result.validationMessage.startsWith(
      "Error: burden adjustment decision count mismatch"
    ) &&
    result.outputSha256 === sha256(bytes.invalidOutput) &&
    result.commandExitCode === 0 &&
    result.timedOut === false &&
    result.outputWritten === true &&
    invalid.moveDecisions.length === 19 &&
    packet.disputedMoves.length === 19 &&
    invalid.burdenAdjustmentDecisions.length === 0 &&
    packet.burdenAdjustmentDisputes.length === 2 &&
    result.attemptCount === 1 &&
    result.retryCount === 0 &&
    result.timeoutExtensionCount === 0,
  "Debate 74 preserved adjudication validation failure changed"
);

const diagnosticOverlay = structuredClone(invalid);
diagnosticOverlay.burdenAdjustmentDecisions =
  packet.burdenAdjustmentDisputes.map((item) => ({
    side: item.side,
    choice: 1,
    rationale:
      "The selected candidate best follows the strict residual burden-adjustment exclusion rule for this diagnostic overlay only."
  }));
const overlayValidation = validatePostCanaryBatch10DisputeAdjudicationOutput(
  diagnosticOverlay,
  packet
);
assertV4(
  overlayValidation.status === "passed" &&
    overlayValidation.disputedMoves === 19 &&
    overlayValidation.candidateSelections === 52,
  "Debate 74 diagnostic overlay exposed another defect"
);

const diagnosis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-10-debate-74-adjudication-validation-failure-diagnosis",
  status:
    "frozen-diagnosed-batch-10-debate-74-missing-both-burden-adjustment-decisions",
  productionCanary: false,
  batchNumber: 10,
  stagingOnly: true,
  debateNumber: "74",
  preservedFailure: {
    classification:
      "schema-valid-transport-output-missing-required-burden-adjustment-decisions",
    returnedBurdenAdjustmentDecisions: 0,
    requiredBurdenAdjustmentDecisions: 2,
    requiredSides: packet.burdenAdjustmentDisputes.map((item) => item.side),
    commandExitCode: 0,
    timedOut: false,
    outputWritten: true,
    moveDecisionsReturned: 19,
    moveDecisionsRequired: 19,
    invalidOutputSha256: sha256(bytes.invalidOutput),
    invalidOutputReusable: false,
    attemptCount: 1,
    retries: 0,
    timeoutExtensions: 0,
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
  minimumBoundedCorrection: {
    operation:
      "two-fresh-field-disjoint-score-blind-adjudication-correction-shards",
    reason:
      "No field from the failed output may be reused, and the standing recovery boundary requires the minimum two-shard correction.",
    shardCount: 2,
    contexts: 2,
    disputedMoves: 19,
    candidateSelections: 52,
    attempts: 2,
    retries: 0,
    timeoutExtensions: 0,
    failedPartialOutputReusable: false,
    shard01: {
      moveIds: [
        "con-unfalsifiability-severs-evidence",
        "pro-conscious-suffering-likelihood",
        "con-unsatisfiable-pair-diagnosis",
        "con-shared-moral-knowledge-limits-skepticism",
        "pro-grim-core-inference",
        "con-rearrangement-can-cross-impossibility",
        "con-compensation-does-not-justify-atrocity",
        "pro-finite-agent-world-goods",
        "con-infinite-recombination-limits"
      ],
      burdenAdjustmentSides: ["pro"],
      candidateSelections: 26
    },
    shard02: {
      moveIds: [
        "pro-expected-unknown-divine-reasons",
        "con-unfair-distribution-of-extreme-suffering",
        "pro-randomized-clock-independence",
        "pro-auxiliary-probability-asymmetry",
        "con-fine-grained-consciousness-evidence",
        "pro-conditional-inference-defense",
        "pro-adjacent-world-clock-variation",
        "pro-voluntary-risk-arena",
        "con-minimal-diagnosis-parsimony",
        "pro-commonsense-moral-evidence"
      ],
      burdenAdjustmentSides: ["con"],
      candidateSelections: 26
    },
    originalPacketPreserved: true,
    originalSchemaPreserved: true,
    originalValidatorMeaningPreserved: true,
    eachOriginalFieldAcceptedExactlyOnce: true
  },
  originalGate: {
    acceptedDebates: ["21", "107"],
    failedDebate: "74",
    unattemptedContextIndexes: [3, 4, 5, 6, 7, 8, 9],
    unattemptedContextResumptionPermitted: true
  },
  sourceHashes: Object.fromEntries(
    Object.entries(paths).map(([key, file]) => [file, sha256(bytes[key])])
  ),
  authorization: {
    correctionPreparation: true,
    correctionModelExecution: false,
    resumptionPreparation: false,
    paidServices: false,
    scoreDerivation: false
  },
  directIncrementalCostUsd: 0,
  nextAuthorizedAction:
    "prepare-freeze-two-fresh-field-disjoint-debate-74-adjudication-correction-shards"
};

if (shouldWrite) {
  await mkdir(path.dirname(diagnosisPath), { recursive: true });
  await writeFile(diagnosisPath, `${JSON.stringify(diagnosis, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: shouldWrite ? diagnosis.status : "preview",
  returnedBurdenAdjustmentDecisions: 0,
  requiredBurdenAdjustmentDecisions: 2,
  additionalValidationDefectsExposed: 0,
  correctionContexts: 2,
  candidateSelections: 52,
  failedPartialOutputReusable: false,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: diagnosis.nextAuthorizedAction
}, null, 2));
