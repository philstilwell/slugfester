#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const root = "docs/assessment-production/post-canary-continuation-v1/batch-03/dispute-only-adjudication/failure-recovery";
const activationPath = `${root}/correction-execution-activation.json`;
const diagnosisPath = `${root}/correction-harness-diagnosis.json`;
const runnerPath = "scripts/run-assessment-production-post-canary-batch-03-debate-124-adjudication-correction.mjs";
const diagnosticPath = "scripts/diagnose-assessment-production-post-canary-batch-03-debate-124-adjudication-correction-harness.mjs";
const testPath = "scripts/test-assessment-production-post-canary-batch-03-debate-124-adjudication-correction-harness-diagnosis.mjs";
const successorPath = "scripts/prepare-assessment-production-post-canary-batch-03-debate-124-adjudication-correction-activation-successor.mjs";
const successorTestPath = "scripts/test-assessment-production-post-canary-batch-03-debate-124-adjudication-correction-activation-successor.mjs";
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const activationBytes = await readFile(activationPath);
const activation = JSON.parse(activationBytes);
const oldRunner = Buffer.from(execFileSync("git", ["show",
  `${activation.checkpointCommit}:${runnerPath}`]));
const currentRunner = await readFile(runnerPath);
assertV4(
  sha256(oldRunner) === activation.sourceHashes[runnerPath] &&
    oldRunner.includes(Buffer.from("`${RECOVERY_ROOT}/execution-activation.json`")) &&
    currentRunner.includes(Buffer.from("`${RECOVERY_ROOT}/correction-execution-activation-1.json`")) &&
    !(await exists(`${root}/correction-model-execution.json`)) &&
    !(await exists(`${root}/outputs/debate-124-shard-01.json`)) &&
    !(await exists(`${root}/outputs/debate-124-shard-02.json`)),
  "correction harness failure boundary changed"
);
const sourceFiles = [activationPath, runnerPath, diagnosticPath, testPath,
  successorPath, successorTestPath];
const diagnosis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-03-debate-124-adjudication-correction-harness-diagnosis",
  status: "frozen-diagnosed-debate-124-correction-pre-model-activation-path-mismatch",
  productionCanary: false, batchNumber: 3, stagingOnly: true, debateNumber: "124",
  failure: {
    classification: "pre-model-activation-path-resolution-failure",
    requestedPath: `${root}/execution-activation.json`,
    frozenActivationPath: activationPath,
    errorCode: "ENOENT",
    modelProcessesStarted: 0,
    modelContextsAttempted: 0,
    outputsWritten: 0,
    paidServices: 0,
    directIncrementalCostUsd: 0
  },
  correction: {
    operation: "replace-runner-activation-path-and-issue-authenticated-successor-activation",
    correctedPath: `${root}/correction-execution-activation-1.json`,
    originalPacketsPreserved: true,
    originalSchemasPreserved: true,
    modelSettingsPreserved: true,
    schedulerPreserved: true,
    timeoutPreserved: true,
    attemptsConsumed: 0
  },
  hashes: {
    originalActivationSha256: sha256(activationBytes),
    authenticatedOriginalRunnerSha256: sha256(oldRunner),
    correctedRunnerSha256: sha256(currentRunner)
  },
  sourceHashes: Object.fromEntries(await Promise.all(sourceFiles.map(async (file) =>
    [file, sha256(await readFile(file))]))),
  nextAuthorizedAction: "freeze-authenticated-debate-124-correction-activation-successor"
};
if (shouldWrite) await writeFile(diagnosisPath, `${JSON.stringify(diagnosis, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? diagnosis.status : "preview",
  modelContextsAttempted: 0, outputsWritten: 0, directIncrementalCostUsd: 0,
  nextAuthorizedAction: diagnosis.nextAuthorizedAction }, null, 2));
