#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  DEBATE_157_CORRECTION_2_ROOT,
  validateDebate157Correction2Output
} from "./lib/assessment-production-post-canary-batch-03-publication-resumption-2-repair-correction-2.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const PREPARATION = `${DEBATE_157_CORRECTION_2_ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${DEBATE_157_CORRECTION_2_ROOT}/execution-activation.json`;
const EXECUTION = `${DEBATE_157_CORRECTION_2_ROOT}/model-execution.json`;
const ANALYSIS = `${DEBATE_157_CORRECTION_2_ROOT}/analysis.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const preparationBytes = await readFile(path.resolve(PREPARATION));
const activationBytes = await readFile(path.resolve(ACTIVATION));
const executionBytes = await readFile(path.resolve(EXECUTION));
const preparation = JSON.parse(preparationBytes);
const activation = JSON.parse(activationBytes);
const execution = JSON.parse(executionBytes);
assertV4(
  execution.contextsPlanned === 1 &&
    execution.contextsAttempted === 1 &&
    execution.attempts === 1 &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    execution.recursiveRecoveryContexts === 1 &&
    execution.failedOriginalRepairOutputPreservedAndUnaccepted === true &&
    execution.failedOriginalRepairOutputAvailableToModel === false &&
    execution.meteredApiCostUsd === 0 &&
    execution.paidServiceCallsThisStage === 0 &&
    execution.modelAuthoredScores === 0,
  "the correction-2 execution record changed"
);
let validation = null;
let outputSha256 = null;
if (execution.validContexts === 1) {
  const outputBytes = await readFile(path.resolve(preparation.context.output));
  outputSha256 = sha256(outputBytes);
  assertV4(outputSha256 === execution.result.outputSha256, "the accepted correction-2 output hash changed");
  validation = validateDebate157Correction2Output(
    JSON.parse(outputBytes),
    JSON.parse(await readFile(path.resolve(preparation.context.packet), "utf8"))
  );
  assertV4(validation.status === "passed", "the accepted correction-2 output no longer validates");
}
const passed = execution.validContexts === 1 && execution.invalidContexts === 0;
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-03-debate-157-publication-repair-correction-2-analysis",
  protocolId: preparation.protocolId,
  status: passed
    ? "accepted-debate-157-publication-repair-correction-2"
    : "failed-debate-157-publication-repair-correction-2-stop-required",
  debateNumber: "157",
  correctionId: "correction-2",
  preparationManifestSha256: sha256(preparationBytes),
  activationSha256: sha256(activationBytes),
  executionSha256: sha256(executionBytes),
  acceptedOutputSha256: outputSha256,
  deterministicValidation: validation,
  controls: {
    originalPublicationOutputAndPacketWereOnlySubstantiveInputs: true,
    failedRepairOutputAvailableToModel: false,
    failedRepairOutputAccepted: false,
    writableFields: preparation.context.writableFields,
    scoresUnchanged: true,
    modelAuthoredScores: 0,
    attempts: 1,
    retries: 0,
    timeoutExtensions: 0,
    recursiveRecoveryContexts: 1,
    meteredApiCostUsd: 0,
    paidServiceCalls: 0
  },
  stopDecision: passed
    ? "continue-to-frozen-seven-context-debate-157-repair-resumption-preparation"
    : "stop-after-further-failed-repair-or-model-output",
  nextAuthorizedAction: passed
    ? "prepare-validate-freeze-commit-and-push-exactly-seven-unattempted-debate-157-repair-contexts"
    : "request-new-user-direction-without-retry-or-further-correction"
};
await writeFile(path.resolve(ANALYSIS), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({
  status: analysis.status,
  validation: validation?.status ?? "failed",
  acceptedOutputSha256: outputSha256,
  attempts: 1,
  retries: 0,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction
}, null, 2));
