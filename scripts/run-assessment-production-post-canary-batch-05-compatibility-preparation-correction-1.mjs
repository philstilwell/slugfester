#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { access, readFile, rename, writeFile } from "node:fs/promises";

const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-05/production-compatibility/preparation-validation-correction-1";
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const TEST = "scripts/test-assessment-production-post-canary-batch-05-compatibility-preparation.mjs";
const PREPARATION = "docs/assessment-production/post-canary-continuation-v1/batch-05/production-compatibility/preparation-manifest.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);
const executedAtIndex = process.argv.indexOf("--executed-at");
const executedAt = executedAtIndex >= 0 ? process.argv[executedAtIndex + 1] : null;
if (!executedAt || Number.isNaN(Date.parse(executedAt))) throw new Error("--executed-at requires an ISO timestamp");
if ((await exists(EXECUTION)) || (await exists(ANALYSIS))) throw new Error("correction-1 already executed");

const activationBytes = await readFile(ACTIVATION);
const activation = JSON.parse(activationBytes);
if (
  activation.status !== "frozen-batch-05-compatibility-preparation-correction-1-authorized" ||
  activation.executionPolicy?.correctedValidationPassesMaximum !== 1 ||
  activation.executionPolicy?.retriesMaximum !== 0 ||
  activation.authorization?.correctedValidationPass !== true
) throw new Error("invalid correction-1 activation");
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  if (sha256(await readFile(file)) !== digest) throw new Error(`${file}: activated source drifted`);
}
const [proposedTestBytes, proposedPreparationBytes] = await Promise.all([
  readFile(activation.proposed.test.path),
  readFile(activation.proposed.preparation.path)
]);
if (
  sha256(proposedTestBytes) !== activation.proposed.test.sha256 ||
  sha256(proposedPreparationBytes) !== activation.proposed.preparation.sha256
) throw new Error("activated proposed correction drifted");

for (const [target, bytes] of [[TEST, proposedTestBytes], [PREPARATION, proposedPreparationBytes]]) {
  const temporary = `${target}.correction-1.tmp`;
  await writeFile(temporary, bytes);
  await rename(temporary, target);
}
const result = spawnSync(process.execPath, [TEST], { encoding: "utf8", timeout: 300000 });
const passed = result.status === 0 && !result.error;
const execution = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-compatibility-preparation-correction-1-execution",
  status: passed ? "passed-batch-05-compatibility-preparation-correction-1" : "failed-batch-05-compatibility-preparation-correction-1",
  executedAt,
  activation: { path: ACTIVATION, sha256: sha256(activationBytes), bytes: activationBytes.length },
  writes: [
    { path: TEST, sha256: sha256(proposedTestBytes), bytes: proposedTestBytes.length },
    { path: PREPARATION, sha256: sha256(proposedPreparationBytes), bytes: proposedPreparationBytes.length }
  ],
  command: `${process.execPath} ${TEST}`,
  attempt: 1,
  retries: 0,
  reruns: 0,
  exitCode: result.status,
  signal: result.signal,
  error: result.error ? String(result.error) : null,
  stdoutSha256: sha256(result.stdout ?? ""),
  stderr: result.stderr,
  modelContexts: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0
};
await writeFile(EXECUTION, jsonBytes(execution));
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-compatibility-preparation-correction-1-analysis",
  status: passed ? "batch-05-compatibility-preparation-correction-1-accepted" : "batch-05-compatibility-preparation-correction-1-failed-stop",
  analyzedAt: executedAt,
  decision: {
    staleRegressionCountCorrected: passed,
    authenticatedTestHashUpdated: passed,
    allOtherManifestFieldsPreserved: true,
    packetsChanged: false,
    adaptersChanged: false,
    validatorChanged: false,
    scoresChanged: false,
    productionChanged: false,
    modelExecutionPerformed: false,
    paidServiceUsed: false,
    resumeStandingAuthorization: passed
  },
  execution: { path: EXECUTION, sha256: sha256(jsonBytes(execution)) },
  nextAuthorizedAction: passed ? "activate-and-execute-one-batch-05-production-compatibility-pass-under-standing-authorization" : "stop-and-request-new-approval"
};
await writeFile(ANALYSIS, jsonBytes(analysis));
console.log(JSON.stringify({ status: analysis.status, correctedValidationPassed: passed, retries: 0, directIncrementalCostUsd: 0, nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
if (!passed) process.exitCode = 1;
