#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

const CORRECTION_ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-05/production-compatibility/preparation-validation-correction-2";
const RECOVERY_ROOT = `${CORRECTION_ROOT}/execution-runner-recovery-final`;
const FAILURE_DIAGNOSIS = `${CORRECTION_ROOT}/execution-preflight-failure/diagnosis.json`;
const CORRECTION_PLAN = `${CORRECTION_ROOT}/correction-plan.json`;
const CORRECTION_ACTIVATION = `${CORRECTION_ROOT}/execution-activation.json`;
const TARGET_RUNNER = "scripts/run-assessment-production-post-canary-batch-05-compatibility-preparation-correction-2.mjs";
const PREPARE_SCRIPT = "scripts/prepare-assessment-production-post-canary-batch-05-compatibility-preparation-correction-2-execution-runner-recovery-final.mjs";
const ACTIVATE_SCRIPT = "scripts/activate-assessment-production-post-canary-batch-05-compatibility-preparation-correction-2-execution-runner-recovery-final.mjs";
const RUN_SCRIPT = "scripts/run-assessment-production-post-canary-batch-05-compatibility-preparation-correction-2-execution-runner-recovery-final.mjs";
const DIAGNOSIS = `${RECOVERY_ROOT}/diagnosis.json`;
const PROPOSED_RUNNER = `${RECOVERY_ROOT}/proposed-runner.mjs`;
const PROPOSED_PLAN = `${RECOVERY_ROOT}/proposed-correction-plan.json`;
const PROPOSED_ACTIVATION = `${RECOVERY_ROOT}/proposed-correction-activation.json`;
const PLAN = `${RECOVERY_ROOT}/correction-plan.json`;
const ACTIVATION = `${RECOVERY_ROOT}/execution-activation.json`;
const EXECUTION = `${RECOVERY_ROOT}/execution.json`;
const ANALYSIS = `${RECOVERY_ROOT}/analysis.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : null;
if (!frozenAt || Number.isNaN(Date.parse(frozenAt))) throw new Error("--frozen-at requires an ISO timestamp");
if (await exists(RECOVERY_ROOT)) throw new Error("final execution-runner recovery already exists");
if ((await exists(`${CORRECTION_ROOT}/execution.json`)) || (await exists(`${CORRECTION_ROOT}/analysis.json`))) {
  throw new Error("correction-2 deterministic validation already executed");
}

const [failureBytes, runnerBytes, correctionPlanBytes, correctionActivationBytes] = await Promise.all([
  readFile(FAILURE_DIAGNOSIS),
  readFile(TARGET_RUNNER),
  readFile(CORRECTION_PLAN),
  readFile(CORRECTION_ACTIVATION)
]);
const failure = JSON.parse(failureBytes);
const correctionPlan = JSON.parse(correctionPlanBytes);
const correctionActivation = JSON.parse(correctionActivationBytes);
if (
  failure.status !== "frozen-batch-05-correction-2-third-underlying-preimage-authentication-failure-diagnosed" ||
  failure.lockedEvidence?.runner?.sha256 !== sha256(runnerBytes) ||
  failure.lockedEvidence?.correctionPlan?.sha256 !== sha256(correctionPlanBytes) ||
  failure.lockedEvidence?.activation?.sha256 !== sha256(correctionActivationBytes) ||
  failure.writesBeforeFailure !== 0 ||
  failure.correctedValidationPassesAttempted !== 0
) throw new Error("preserved execution-preflight failure changed");

const before = "if (sha256(currentAnalysisBytes) !== activation.correctionScope.oldSha256) {";
const after = "if (JSON.parse(currentAnalysisBytes).preparation?.sha256 !== activation.correctionScope.oldSha256) {";
const runnerText = runnerBytes.toString("utf8");
if (runnerText.split(before).length !== 2) throw new Error("faulty runner preimage assertion is not unique");
const proposedRunnerBytes = Buffer.from(runnerText.replace(before, after));
const proposedRunnerSha256 = sha256(proposedRunnerBytes);

if (
  correctionPlan.sourceHashes?.[TARGET_RUNNER] !== sha256(runnerBytes) ||
  correctionActivation.sourceHashes?.[TARGET_RUNNER] !== sha256(runnerBytes) ||
  correctionActivation.plan?.sha256 !== sha256(correctionPlanBytes) ||
  correctionActivation.plan?.bytes !== correctionPlanBytes.length
) throw new Error("correction-2 plan or activation does not authenticate the failed runner");

const proposedCorrectionPlan = structuredClone(correctionPlan);
proposedCorrectionPlan.sourceHashes[TARGET_RUNNER] = proposedRunnerSha256;
const proposedCorrectionPlanBytes = jsonBytes(proposedCorrectionPlan);
const proposedCorrectionActivation = structuredClone(correctionActivation);
proposedCorrectionActivation.plan.sha256 = sha256(proposedCorrectionPlanBytes);
proposedCorrectionActivation.plan.bytes = proposedCorrectionPlanBytes.length;
proposedCorrectionActivation.sourceHashes[TARGET_RUNNER] = proposedRunnerSha256;
const proposedCorrectionActivationBytes = jsonBytes(proposedCorrectionActivation);

const diagnosis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-compatibility-preparation-correction-2-final-execution-runner-recovery-diagnosis",
  status: "frozen-batch-05-correction-2-final-execution-runner-recovery-diagnosed",
  diagnosedAt: frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  preservedFailure: { path: FAILURE_DIAGNOSIS, sha256: sha256(failureBytes) },
  finding: "The runner alone repeats the diagnosed complete-file-versus-JSON-field preimage comparison. The target analysis already contains the exact frozen old field value, so the correct preflight parses that field without changing the one-field correction payload.",
  correctionScope: {
    runnerAssertionChanges: 1,
    correctionPlanRunnerHashChanges: 1,
    correctionActivationRunnerHashChanges: 1,
    correctionActivationPlanHashChanges: 1,
    totalCredentialFieldsChanged: 3,
    proposedAnalysisChanged: false,
    targetAnalysisChangedDuringRecovery: false
  },
  recoveryFinal: true,
  furtherRecoveryForSameUnderlyingProblem: false,
  modelContexts: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0
};
const sourceFiles = [FAILURE_DIAGNOSIS, TARGET_RUNNER, CORRECTION_PLAN, CORRECTION_ACTIVATION, PREPARE_SCRIPT, ACTIVATE_SCRIPT, RUN_SCRIPT];
const sourceHashes = Object.fromEntries(await Promise.all(sourceFiles.map(async (file) => [file, sha256(await readFile(file))])));
const plan = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-compatibility-preparation-correction-2-final-execution-runner-recovery-plan",
  status: "frozen-batch-05-correction-2-final-execution-runner-recovery-prepared",
  frozenAt,
  diagnosis: { path: DIAGNOSIS, sha256: sha256(jsonBytes(diagnosis)) },
  correctionScope: {
    targetRunner: TARGET_RUNNER,
    exactOldAssertion: before,
    exactNewAssertion: after,
    correctionPlan: CORRECTION_PLAN,
    correctionActivation: CORRECTION_ACTIVATION,
    runnerAssertionsChanged: 1,
    authenticatedRunnerHashesChanged: 2,
    authenticatedPlanHashesChanged: 1,
    allOtherFieldsPreserved: true,
    proposedAnalysisPreserved: true,
    targetAnalysisPreserved: true
  },
  proposed: {
    runner: { path: PROPOSED_RUNNER, sha256: proposedRunnerSha256, bytes: proposedRunnerBytes.length },
    correctionPlan: { path: PROPOSED_PLAN, sha256: sha256(proposedCorrectionPlanBytes), bytes: proposedCorrectionPlanBytes.length },
    correctionActivation: { path: PROPOSED_ACTIVATION, sha256: sha256(proposedCorrectionActivationBytes), bytes: proposedCorrectionActivationBytes.length }
  },
  sourceHashes,
  executionPolicy: {
    recoveryAttemptsMaximum: 1,
    retriesMaximum: 0,
    rerunsMaximum: 0,
    furtherRecoveryForSameUnderlyingProblem: false,
    modelContexts: 0,
    paidServiceCalls: 0
  },
  artifacts: { activation: ACTIVATION, execution: EXECUTION, analysis: ANALYSIS },
  authorization: {
    finalExecutionRunnerRecovery: true,
    correction2DeterministicValidation: false,
    compatibilityExecution: false,
    modelExecution: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: "activate-one-final-batch-05-correction-2-execution-runner-recovery"
};
await mkdir(RECOVERY_ROOT, { recursive: true });
await Promise.all([
  writeFile(DIAGNOSIS, jsonBytes(diagnosis)),
  writeFile(PROPOSED_RUNNER, proposedRunnerBytes),
  writeFile(PROPOSED_PLAN, proposedCorrectionPlanBytes),
  writeFile(PROPOSED_ACTIVATION, proposedCorrectionActivationBytes),
  writeFile(PLAN, jsonBytes(plan))
]);
console.log(JSON.stringify({
  status: plan.status,
  runnerAssertionsChanged: 1,
  authenticatedRunnerHashesChanged: 2,
  authenticatedPlanHashesChanged: 1,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: plan.nextAuthorizedAction
}, null, 2));
