#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { access, readFile, rename, writeFile } from "node:fs/promises";

const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-05/production-compatibility/preparation-validation-correction-2/activation-harness-correction-2";
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);
const executedAtIndex = process.argv.indexOf("--executed-at");
const executedAt = executedAtIndex >= 0 ? process.argv[executedAtIndex + 1] : null;
if (!executedAt || Number.isNaN(Date.parse(executedAt))) throw new Error("--executed-at requires an ISO timestamp");
if ((await exists(EXECUTION)) || (await exists(ANALYSIS))) throw new Error("activation harness correction-2 already executed");
const activationBytes = await readFile(ACTIVATION);
const activation = JSON.parse(activationBytes);
if (activation.status !== "frozen-batch-05-correction-2-activation-harness-correction-2-authorized" || activation.correctionScope?.writableCharactersRemoved !== 1 || activation.executionPolicy?.attemptsMaximum !== 1 || activation.executionPolicy?.retriesMaximum !== 0) throw new Error("invalid recursive activation harness activation");
for (const [file, digest] of Object.entries(activation.sourceHashes)) if (sha256(await readFile(file)) !== digest) throw new Error(`${file}: activated recursive recovery source drifted`);
const proposedScriptBytes = await readFile(activation.proposed.activationScript.path);
const proposedPlanBytes = await readFile(activation.proposed.correctionPlan.path);
if (sha256(proposedScriptBytes) !== activation.proposed.activationScript.sha256 || sha256(proposedPlanBytes) !== activation.proposed.correctionPlan.sha256) throw new Error("activated recursive recovery outputs drifted");
for (const [target, bytes] of [[activation.correctionScope.targetScript, proposedScriptBytes], [activation.correctionScope.correctionPlan, proposedPlanBytes]]) { const temporary = `${target}.activation-harness-correction-2.tmp`; await writeFile(temporary, bytes); await rename(temporary, target); }
const correctedPlan = JSON.parse(proposedPlanBytes);
const targetAnalysis = JSON.parse(await readFile(correctedPlan.correctionScope.target));
const internalValidationPassed = correctedPlan.sourceHashes?.[activation.correctionScope.targetScript] === sha256(proposedScriptBytes) && targetAnalysis.preparation?.sha256 === correctedPlan.correctionScope.oldSha256 && !proposedScriptBytes.toString("utf8").includes("\n+    plan.correctionScope.oldSha256");
const result = internalValidationPassed ? spawnSync(process.execPath, ["--check", activation.correctionScope.targetScript], { encoding: "utf8", timeout: 300000 }) : { status: 1, signal: null, error: null, stdout: "", stderr: "recursive corrected preflight did not authenticate\n" };
const passed = internalValidationPassed && result.status === 0 && !result.error;
const execution = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-compatibility-preparation-correction-2-activation-harness-correction-2-execution",
  status: passed ? "passed-batch-05-correction-2-activation-harness-correction-2" : "failed-batch-05-correction-2-activation-harness-correction-2-stop",
  executedAt,
  activation: { path: ACTIVATION, sha256: sha256(activationBytes), bytes: activationBytes.length },
  writes: [{ path: activation.correctionScope.targetScript, sha256: sha256(proposedScriptBytes), bytes: proposedScriptBytes.length }, { path: activation.correctionScope.correctionPlan, sha256: sha256(proposedPlanBytes), bytes: proposedPlanBytes.length }],
  internalValidationPassed,
  command: `${process.execPath} --check ${activation.correctionScope.targetScript}`,
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
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-compatibility-preparation-correction-2-activation-harness-correction-2-analysis",
  status: passed ? "batch-05-correction-2-activation-harness-correction-2-accepted" : "batch-05-correction-2-activation-harness-correction-2-failed-stop",
  analyzedAt: executedAt,
  decision: { unaryPlusRemoved: passed, correction2PlanSourceHashUpdated: passed, proposedAnalysisChanged: false, productionChanged: false, modelExecutionPerformed: false, paidServiceUsed: false, resumeCorrection2Activation: passed, furtherRecoveryForSamePreflight: false },
  execution: { path: EXECUTION, sha256: sha256(executionBytes) },
  nextAuthorizedAction: passed ? "activate-one-batch-05-compatibility-preparation-correction-2-validation-pass" : "stop-third-failure-same-underlying-problem-and-request-new-approval"
};
await writeFile(ANALYSIS, jsonBytes(analysis));
console.log(JSON.stringify({ status: analysis.status, internalValidationPassed, recoveryLevel: 2, directIncrementalCostUsd: 0, nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
if (!passed) process.exitCode = 1;
