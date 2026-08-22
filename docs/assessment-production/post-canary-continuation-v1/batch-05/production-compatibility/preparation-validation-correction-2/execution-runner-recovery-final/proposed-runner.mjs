#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { access, readFile, rename, writeFile } from "node:fs/promises";

const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-05/production-compatibility/preparation-validation-correction-2";
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const TEST = "scripts/test-assessment-production-post-canary-batch-05-compatibility-preparation.mjs";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

const executedAtIndex = process.argv.indexOf("--executed-at");
const executedAt = executedAtIndex >= 0 ? process.argv[executedAtIndex + 1] : null;
if (!executedAt || Number.isNaN(Date.parse(executedAt))) {
  throw new Error("--executed-at requires an ISO timestamp");
}
if ((await exists(EXECUTION)) || (await exists(ANALYSIS))) {
  throw new Error("correction-2 already executed");
}

const activationBytes = await readFile(ACTIVATION);
const activation = JSON.parse(activationBytes);
if (
  activation.status !== "frozen-batch-05-compatibility-preparation-correction-2-authorized" ||
  activation.correctionScope?.writableFields !== 1 ||
  activation.correctionScope?.jsonPointer !== "/preparation/sha256" ||
  activation.executionPolicy?.correctedValidationPassesMaximum !== 1 ||
  activation.executionPolicy?.attemptsMaximum !== 1 ||
  activation.executionPolicy?.retriesMaximum !== 0 ||
  activation.executionPolicy?.rerunsMaximum !== 0 ||
  activation.authorization?.correctedValidationPass !== true
) {
  throw new Error("invalid correction-2 activation");
}
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  if (sha256(await readFile(file)) !== digest) throw new Error(`${file}: activated source drifted`);
}
const proposedAnalysisBytes = await readFile(activation.proposed.analysis.path);
if (
  sha256(proposedAnalysisBytes) !== activation.proposed.analysis.sha256 ||
  proposedAnalysisBytes.length !== activation.proposed.analysis.bytes
) {
  throw new Error("activated proposed correction-2 analysis drifted");
}
const currentAnalysisBytes = await readFile(activation.correctionScope.target);
if (JSON.parse(currentAnalysisBytes).preparation?.sha256 !== activation.correctionScope.oldSha256) {
  throw new Error("correction-2 target preimage changed");
}

const temporary = `${activation.correctionScope.target}.correction-2.tmp`;
await writeFile(temporary, proposedAnalysisBytes);
await rename(temporary, activation.correctionScope.target);
const result = spawnSync(process.execPath, [TEST], {
  encoding: "utf8",
  timeout: 300000,
  maxBuffer: 100 * 1024 * 1024
});
const passed = result.status === 0 && !result.error;
const execution = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-compatibility-preparation-correction-2-execution",
  status: passed
    ? "passed-batch-05-compatibility-preparation-correction-2"
    : "failed-batch-05-compatibility-preparation-correction-2",
  executedAt,
  activation: { path: ACTIVATION, sha256: sha256(activationBytes), bytes: activationBytes.length },
  write: {
    path: activation.correctionScope.target,
    jsonPointer: activation.correctionScope.jsonPointer,
    preimageSha256: activation.correctionScope.oldSha256,
    sha256: sha256(proposedAnalysisBytes),
    bytes: proposedAnalysisBytes.length,
    authenticatedPreparationSha256: activation.correctionScope.newSha256
  },
  command: `${process.execPath} ${TEST}`,
  attempt: 1,
  retries: 0,
  reruns: 0,
  exitCode: result.status,
  signal: result.signal,
  error: result.error ? String(result.error) : null,
  stdoutBytes: Buffer.byteLength(result.stdout ?? ""),
  stdoutSha256: sha256(result.stdout ?? ""),
  stdoutTail: (result.stdout ?? "").slice(-2000),
  stderrBytes: Buffer.byteLength(result.stderr ?? ""),
  stderrSha256: sha256(result.stderr ?? ""),
  stderrTail: (result.stderr ?? "").slice(-2000),
  modelContexts: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0
};
const executionBytes = jsonBytes(execution);
await writeFile(EXECUTION, executionBytes);
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-compatibility-preparation-correction-2-analysis",
  status: passed
    ? "batch-05-compatibility-preparation-correction-2-accepted"
    : "batch-05-compatibility-preparation-correction-2-failed-stop",
  analyzedAt: executedAt,
  decision: {
    preparationAnalysisHashCorrected: passed,
    correctedPreparationValidationPassed: passed,
    writableFieldsChanged: 1,
    preparationManifestPreserved: true,
    preparationTestPreserved: true,
    correction1FailurePreserved: true,
    packetsChanged: false,
    adaptersChanged: false,
    validatorChanged: false,
    scoresChanged: false,
    productionChanged: false,
    modelExecutionPerformed: false,
    paidServiceUsed: false,
    resumeStandingAuthorization: passed
  },
  execution: { path: EXECUTION, sha256: sha256(executionBytes) },
  nextAuthorizedAction: passed
    ? "activate-and-execute-one-batch-05-production-compatibility-pass-under-standing-authorization"
    : "stop-third-failure-same-underlying-problem-and-request-new-approval"
};
await writeFile(ANALYSIS, jsonBytes(analysis));
console.log(JSON.stringify({
  status: analysis.status,
  correctedValidationPassed: passed,
  writableFieldsChanged: 1,
  retries: 0,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction
}, null, 2));
if (!passed) process.exitCode = 1;
