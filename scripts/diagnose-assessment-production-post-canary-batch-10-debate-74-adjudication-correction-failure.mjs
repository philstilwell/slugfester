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
const diagnosisPath = `${recovery}/correction-failure-diagnosis.json`;
const paths = {
  standingAuthorization:
    "docs/assessment-production/post-canary-continuation-v1/batch-10/standing-authorization.json",
  firstDiagnosis: `${recovery}/debate-74-validation-failure-diagnosis.json`,
  preparation: `${recovery}/correction-preparation-manifest.json`,
  activation: `${recovery}/correction-execution-activation.json`,
  execution: `${recovery}/correction-model-execution.json`,
  shard01Packet: `${recovery}/packets/debate-74-shard-01.json`,
  shard01Output: `${recovery}/outputs/debate-74-shard-01.json`,
  shard02Packet: `${recovery}/packets/debate-74-shard-02.json`,
  shard02Output: `${recovery}/outputs/debate-74-shard-02.json`,
  diagnostic:
    "scripts/diagnose-assessment-production-post-canary-batch-10-debate-74-adjudication-correction-failure.mjs"
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const bytes = Object.fromEntries(
  await Promise.all(
    Object.entries(paths).map(async ([key, file]) => [key, await readFile(file)])
  )
);
const standing = JSON.parse(bytes.standingAuthorization);
const firstDiagnosis = JSON.parse(bytes.firstDiagnosis);
const preparation = JSON.parse(bytes.preparation);
const activation = JSON.parse(bytes.activation);
const execution = JSON.parse(bytes.execution);
const shard01Packet = JSON.parse(bytes.shard01Packet);
const shard01Output = JSON.parse(bytes.shard01Output);
const shard02Packet = JSON.parse(bytes.shard02Packet);
const shard02Output = JSON.parse(bytes.shard02Output);
const shard01Result = execution.results.find((item) => item.contextIndex === 0);
const shard02Result = execution.results.find((item) => item.contextIndex === 1);

assertV4(
  standing.stopRules.failedSecondBoundedCorrectionBlocks === true &&
    standing.recoveryControls.recursiveCorrectionsMaximum === 1 &&
    firstDiagnosis.preservedFailure.requiredBurdenAdjustmentDecisions === 2 &&
    preparation.contexts.length === 2 &&
    activation.authorization.adjudicationModelContexts === true &&
    execution.status ===
      "batch-10-debate-74-adjudication-correction-gate-complete-with-failure" &&
    shard01Result.status === "completed-valid" &&
    shard01Result.validationSummary.status === "passed" &&
    shard01Result.outputSha256 === sha256(bytes.shard01Output) &&
    shard02Result.status === "output-validation-failed" &&
    shard02Result.validationMessage.startsWith(
      "Error: burden adjustment decision count mismatch"
    ) &&
    shard02Result.outputSha256 === sha256(bytes.shard02Output) &&
    shard02Packet.burdenAdjustmentDisputes.length === 1 &&
    shard02Packet.burdenAdjustmentDisputes[0].side === "con" &&
    shard02Output.burdenAdjustmentDecisions.length === 0 &&
    shard02Output.moveDecisions.length === 10 &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0,
  "Debate 74 bounded correction failure changed"
);

const diagnosticOverlay = structuredClone(shard02Output);
diagnosticOverlay.burdenAdjustmentDecisions = [{
  side: "con",
  choice: 1,
  rationale:
    "The selected candidate best follows the strict residual burden-adjustment exclusion rule for this diagnostic overlay only."
}];
const overlayValidation = validatePostCanaryBatch10DisputeAdjudicationOutput(
  diagnosticOverlay,
  shard02Packet
);
assertV4(
  validatePostCanaryBatch10DisputeAdjudicationOutput(
    shard01Output,
    shard01Packet
  ).status === "passed" &&
    overlayValidation.status === "passed" &&
    overlayValidation.candidateSelections === 26,
  "Debate 74 correction diagnostic overlay exposed another defect"
);

const diagnosis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-10-debate-74-adjudication-correction-failure-diagnosis",
  status:
    "blocked-batch-10-debate-74-bounded-correction-repeated-burden-decision-omission",
  diagnosedAt: new Date().toISOString(),
  productionCanary: false,
  batchNumber: 10,
  stagingOnly: true,
  debateNumber: "74",
  repeatedFailure: {
    underlyingProblem:
      "model-omitted-required-burden-adjustment-decision-array-entry",
    firstOccurrenceRequiredEntries: 2,
    firstOccurrenceReturnedEntries: 0,
    correctionOccurrenceRequiredEntries: 1,
    correctionOccurrenceReturnedEntries: 0,
    correctionShard: "shard-02",
    correctionMoveDecisionsReturned: 10,
    correctionCandidateSelectionsRequired: 26,
    commandExitCode: shard02Result.commandExitCode,
    timedOut: shard02Result.timedOut,
    attemptCount: 1,
    retryCount: 0,
    failedCorrectionOutputReusableUnderStandingAuthorization: false,
    additionalValidationDefectsExposed: 0
  },
  preservedPassingEvidence: {
    originalGateAcceptedDebates: ["21", "107"],
    correctionShard01Passed: true,
    correctionShard01CandidateSelections: 26,
    automaticMergePermitted: false,
    unattemptedOriginalContextIndexes: [3, 4, 5, 6, 7, 8, 9]
  },
  standingAuthorizationDisposition: {
    boundedCorrectionUsed: true,
    recursiveCorrectionsMaximum: 1,
    failedSecondBoundedCorrectionBlocks: true,
    automaticContinuationAllowed: false,
    additionalModelExecutionAuthorized: false,
    resumptionAuthorizedNow: false,
    newUserAuthorizationRequired: true,
    directIncrementalCostUsd: 0
  },
  safestProposedRecovery: {
    operation:
      "one-new-two-shard-field-disjoint-correction-for-the-failed-shard-02-boundary",
    failedShard02FieldsReusable: false,
    shardA:
      "nine of the ten failed-shard move decisions, with no burden adjustment",
    shardB:
      "the remaining one move decision plus the required con burden-adjustment decision",
    attempts: 2,
    retries: 0,
    timeoutExtensions: 0,
    model: "5.6 Sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    directIncrementalCostUsdMaximum: 0,
    promptMustExplicitlyEnumerateRequiredBurdenAdjustmentEntry: true,
    resumeSevenUnattemptedContextsOnlyAfterFullDebate74MergeReplayPasses: true
  },
  sourceHashes: Object.fromEntries(
    Object.entries(paths).map(([key, file]) => [file, sha256(bytes[key])])
  ),
  authorization: {
    additionalCorrectionPreparation: false,
    additionalCorrectionModelExecution: false,
    adjudicationResumption: false,
    paidServices: false,
    scoreDerivation: false,
    productionMutation: false
  },
  nextRequiredAction:
    "obtain-explicit-user-authorization-for-one-additional-two-shard-debate-74-correction"
};

if (shouldWrite) {
  await mkdir(path.dirname(diagnosisPath), { recursive: true });
  await writeFile(diagnosisPath, `${JSON.stringify(diagnosis, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: diagnosis.status,
  repeatedUnderlyingProblem: diagnosis.repeatedFailure.underlyingProblem,
  additionalValidationDefectsExposed: 0,
  automaticContinuationAllowed: false,
  newUserAuthorizationRequired: true,
  directIncrementalCostUsd: 0,
  nextRequiredAction: diagnosis.nextRequiredAction
}, null, 2));
