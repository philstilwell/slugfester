#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { access, readFile, rename, writeFile } from "node:fs/promises";

const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-05/production-compatibility/preparation-validation-correction-2/execution-runner-recovery-final";
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);
const executedAtIndex = process.argv.indexOf("--executed-at");
const executedAt = executedAtIndex >= 0 ? process.argv[executedAtIndex + 1] : null;
if (!executedAt || Number.isNaN(Date.parse(executedAt))) throw new Error("--executed-at requires an ISO timestamp");
if ((await exists(EXECUTION)) || (await exists(ANALYSIS))) throw new Error("final execution-runner recovery already executed");

const activationBytes = await readFile(ACTIVATION);
const activation = JSON.parse(activationBytes);
if (
  activation.status !== "frozen-batch-05-correction-2-final-execution-runner-recovery-authorized" ||
  activation.correctionScope?.runnerAssertionsChanged !== 1 ||
  activation.executionPolicy?.recoveryAttemptsMaximum !== 1 ||
  activation.executionPolicy?.retriesMaximum !== 0 ||
  activation.executionPolicy?.rerunsMaximum !== 0 ||
  activation.executionPolicy?.furtherRecoveryForSameUnderlyingProblem !== false
) throw new Error("invalid final execution-runner recovery activation");
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  if (sha256(await readFile(file)) !== digest) throw new Error(`${file}: activated final recovery source drifted`);
}
const proposedRunnerBytes = await readFile(activation.proposed.runner.path);
const proposedPlanBytes = await readFile(activation.proposed.correctionPlan.path);
const proposedActivationBytes = await readFile(activation.proposed.correctionActivation.path);
if (
  sha256(proposedRunnerBytes) !== activation.proposed.runner.sha256 ||
  sha256(proposedPlanBytes) !== activation.proposed.correctionPlan.sha256 ||
  sha256(proposedActivationBytes) !== activation.proposed.correctionActivation.sha256
) throw new Error("activated final recovery outputs drifted");

const proposedPlan = JSON.parse(proposedPlanBytes);
const proposedActivation = JSON.parse(proposedActivationBytes);
const oldRunnerSha256 = activation.sourceHashes[activation.correctionScope.targetRunner];
const exactRecoveryValidated =
  proposedPlan.sourceHashes?.[activation.correctionScope.targetRunner] === sha256(proposedRunnerBytes) &&
  proposedActivation.sourceHashes?.[activation.correctionScope.targetRunner] === sha256(proposedRunnerBytes) &&
  proposedActivation.plan?.sha256 === sha256(proposedPlanBytes) &&
  proposedActivation.plan?.bytes === proposedPlanBytes.length &&
  oldRunnerSha256 !== sha256(proposedRunnerBytes) &&
  proposedRunnerBytes.toString("utf8").includes(activation.correctionScope.exactNewAssertion) &&
  !proposedRunnerBytes.toString("utf8").includes(activation.correctionScope.exactOldAssertion);
if (!exactRecoveryValidated) throw new Error("final runner and credential correction is not exact");

for (const [target, bytes] of [
  [activation.correctionScope.targetRunner, proposedRunnerBytes],
  [activation.correctionScope.correctionPlan, proposedPlanBytes],
  [activation.correctionScope.correctionActivation, proposedActivationBytes]
]) {
  const temporary = `${target}.execution-runner-recovery-final.tmp`;
  await writeFile(temporary, bytes);
  await rename(temporary, target);
}

const correctedTargetAnalysis = JSON.parse(await readFile(proposedPlan.correctionScope.target));
const correctedPreflightPassed =
  correctedTargetAnalysis.preparation?.sha256 === proposedPlan.correctionScope.oldSha256;
const result = correctedPreflightPassed
  ? spawnSync(process.execPath, ["--check", activation.correctionScope.targetRunner], { encoding: "utf8", timeout: 300000 })
  : { status: 1, signal: null, error: null, stdout: "", stderr: "corrected target field preflight failed\n" };
const passed = correctedPreflightPassed && result.status === 0 && !result.error;
const execution = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-compatibility-preparation-correction-2-final-execution-runner-recovery-execution",
  status: passed ? "passed-batch-05-correction-2-final-execution-runner-recovery" : "failed-batch-05-correction-2-final-execution-runner-recovery-stop",
  executedAt,
  activation: { path: ACTIVATION, sha256: sha256(activationBytes), bytes: activationBytes.length },
  writes: [
    { path: activation.correctionScope.targetRunner, sha256: sha256(proposedRunnerBytes), bytes: proposedRunnerBytes.length },
    { path: activation.correctionScope.correctionPlan, sha256: sha256(proposedPlanBytes), bytes: proposedPlanBytes.length },
    { path: activation.correctionScope.correctionActivation, sha256: sha256(proposedActivationBytes), bytes: proposedActivationBytes.length }
  ],
  exactRecoveryValidated,
  correctedPreflightPassed,
  command: `${process.execPath} --check ${activation.correctionScope.targetRunner}`,
  attempt: 1,
  retries: 0,
  reruns: 0,
  exitCode: result.status,
  signal: result.signal,
  error: result.error ? String(result.error) : null,
  stdoutSha256: sha256(result.stdout ?? ""),
  stderr: result.stderr ?? "",
  modelContexts: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0
};
const executionBytes = jsonBytes(execution);
await writeFile(EXECUTION, executionBytes);
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-compatibility-preparation-correction-2-final-execution-runner-recovery-analysis",
  status: passed ? "batch-05-correction-2-final-execution-runner-recovery-accepted" : "batch-05-correction-2-final-execution-runner-recovery-failed-stop",
  analyzedAt: executedAt,
  decision: {
    runnerAssertionCorrected: passed,
    authenticatedRunnerHashesUpdated: passed,
    authenticatedPlanHashUpdated: passed,
    proposedAnalysisChanged: false,
    targetAnalysisChangedDuringRecovery: false,
    productionChanged: false,
    modelExecutionPerformed: false,
    paidServiceUsed: false,
    resumeCorrection2Validation: passed,
    furtherRecoveryForSameUnderlyingProblem: false
  },
  execution: { path: EXECUTION, sha256: sha256(executionBytes) },
  nextAuthorizedAction: passed ? "execute-one-batch-05-compatibility-preparation-correction-2-validation-pass" : "stop-final-runner-recovery-failed"
};
await writeFile(ANALYSIS, jsonBytes(analysis));
console.log(JSON.stringify({ status: analysis.status, exactRecoveryValidated, correctedPreflightPassed, attempt: 1, directIncrementalCostUsd: 0, nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
if (!passed) process.exitCode = 1;
