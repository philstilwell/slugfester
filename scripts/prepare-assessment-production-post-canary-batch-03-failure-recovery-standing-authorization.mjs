#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";

import {
  PROTOCOL_ID,
  RECOVERY_AUTHORIZATION,
  ROOT,
  SELECTED_DEBATES,
  STATUS,
  USER_INSTRUCTION,
  validateRecoveryAuthorization
} from "./lib/assessment-production-post-canary-batch-03-failure-recovery-standing-authorization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const index = process.argv.indexOf("--authorized-at");
const authorizedAt = index >= 0 ? process.argv[index + 1] : null;
assertV4(authorizedAt && !Number.isNaN(Date.parse(authorizedAt)), "invalid --authorized-at");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
assertV4(!(await exists(RECOVERY_AUTHORIZATION)), "recovery authorization already exists");

const adjudicationRoot = `${ROOT}/dispute-only-adjudication`;
const standingPath = `${ROOT}/standing-authorization.json`;
const activationPath = `${adjudicationRoot}/execution-activation.json`;
const executionPath = `${adjudicationRoot}/model-execution.json`;
const analysisPath = `${adjudicationRoot}/analysis.json`;
const [standingBytes, activationBytes, executionBytes, analysisBytes] =
  await Promise.all(
    [standingPath, activationPath, executionPath, analysisPath].map((file) => readFile(file))
  );
const [standing, activation, execution, analysis] =
  [standingBytes, activationBytes, executionBytes, analysisBytes].map((bytes) => JSON.parse(bytes));
assertV4(
  standing.status === "frozen-active-batch-03-complete-remaining-workflow-standing-authorization" &&
    activation.status === "frozen-ten-post-canary-batch-03-dispute-only-adjudication-contexts-authorized" &&
    execution.status === "post-canary-batch-03-dispute-only-adjudication-gate-complete-with-failure" &&
    execution.contextsAttempted === 1 && execution.validContexts === 0 &&
    execution.results[0]?.debateNumber === "124" &&
    execution.results[0]?.status === "timed-out" &&
    execution.results[0]?.attemptCount === 1 &&
    execution.results[0]?.outputWritten === false &&
    analysis.status === "post-canary-batch-03-dispute-only-adjudication-gate-failed-validation",
  "preserved Debate 124 failure boundary changed"
);
const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const origin = execFileSync("git", ["rev-parse", "origin/main"], { encoding: "utf8" }).trim();
assertV4(head === "5b4b0064192949c30ad1d5daef551d54e7645a0d" && origin === head,
  "recovery authorization must freeze at the pushed failure checkpoint");

const sources = [
  "docs/assessment-production-workflow.md",
  "docs/reassessment-rubric-v2.1.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  standingPath,
  activationPath,
  executionPath,
  analysisPath,
  "scripts/lib/assessment-production-post-canary-batch-03-failure-recovery-standing-authorization.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-03-failure-recovery-standing-authorization.mjs",
  "scripts/test-assessment-production-post-canary-batch-03-failure-recovery-standing-authorization.mjs"
];
const sourceHashes = {};
for (const file of sources.sort()) sourceHashes[file] = sha256(await readFile(file));
const record = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-03-failure-recovery-standing-authorization",
  protocolId: PROTOCOL_ID,
  status: STATUS,
  authorizedAt,
  checkpointCommit: head,
  productionCanary: false,
  batchNumber: 3,
  stagingOnly: true,
  selectedDebates: SELECTED_DEBATES,
  userAuthorization: {
    instruction: USER_INSTRUCTION,
    directIncrementalCostUsdMaximum: 0,
    specificallyIncludesDebate124AdjudicationTimeout: true
  },
  model: {
    label: "5.6 Sol",
    slug: "gpt-5.6-sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription"
  },
  preservedFailure: {
    debateNumber: "124",
    activationPath,
    activationSha256: sha256(activationBytes),
    executionPath,
    executionSha256: sha256(executionBytes),
    analysisPath,
    analysisSha256: sha256(analysisBytes),
    originalAttemptCount: 1,
    originalAcceptedOutputs: 0,
    unattemptedContextIndexes: execution.unattemptedContextIndexes
  },
  recoveryControls: {
    recoveryAttemptsPerFailedContextMaximum: 1,
    ordinaryRetriesMaximum: 0,
    recursiveRepairsMaximum: 0,
    timeoutExtensionsMaximum: 0,
    failedPartialOutputReusable: false,
    freshIsolatedContextsRequired: true,
    everyContextHashLockedBeforeExecution: true,
    fieldDisjointShardingPermitted: true,
    minimumShardCountRequired: true,
    eachOriginalFieldAcceptedExactlyOnce: true,
    acceptedFieldsAndProtectedEvidenceImmutable: true,
    scorePassesMaximum: 1,
    modelAuthoredScoresAllowed: false
  },
  authorization: {
    diagnosis: true,
    boundedFirstCorrection: true,
    unattemptedContextResumption: true,
    deterministicValidationAndCohortReplay: true,
    downstreamStandingWorkflowAfterPassingRecovery: true,
    commitAndPush: true,
    paidServices: false,
    nextBatchSelection: false
  },
  stopRules: {
    secondFailureOfCorrectedContextBlocks: true,
    failedBoundedRepairBlocks: true,
    paidServiceOrCostAboveZeroBlocks: true,
    unfrozenProtectedChangeBlocks: true,
    outsideBatchThreeBlocks: true,
    moreThanOneRecoveryAttemptBlocks: true,
    recursiveCorrectionManualScoreRollbackBlocks: true,
    productionMutationManifestMismatchBlocks: true,
    batchFourSelectionBlocks: true,
    outsideAuthorizationBlocks: true
  },
  sourceHashes,
  nextAuthorizedAction: "diagnose-preserved-batch-03-debate-124-adjudication-timeout"
};
validateRecoveryAuthorization(record);
if (shouldWrite) await writeFile(RECOVERY_AUTHORIZATION, `${JSON.stringify(record, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? record.status : "preview", checkpointCommit: head,
  debateNumber: "124", recoveryAttemptsMaximum: 1, directIncrementalCostUsdMaximum: 0,
  nextAuthorizedAction: record.nextAuthorizedAction }, null, 2));
