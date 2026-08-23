#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-07/dispute-only-adjudication";
const RECOVERY_ROOT = `${ROOT}/gate-validation-recovery-1`;
const PLAN = `${RECOVERY_ROOT}/correction-plan.json`;
const EXECUTION = `${RECOVERY_ROOT}/execution.json`;
const shouldWrite = process.argv.includes("--write");
const executedIndex = process.argv.indexOf("--executed-at");
const executedAt = executedIndex >= 0 ? process.argv[executedIndex + 1] : null;
assert(executedAt && !Number.isNaN(Date.parse(executedAt)));

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const count = (text, needle) => text.split(needle).length - 1;
const plan = JSON.parse(await readFile(PLAN, "utf8"));
assert.equal(
  plan.status,
  "frozen-batch-07-adjudication-gate-validation-recovery-1-not-executed"
);
assert.equal(plan.executionPolicy.attempts, 1);
assert.equal(plan.executionPolicy.retries, 0);
assert.equal(plan.executionPolicy.modelExecutionAuthorized, false);
assert.equal(await exists(EXECUTION), false, `${EXECUTION} already exists`);

for (const item of Object.values(plan.inputs)) {
  assert.equal(sha256(await readFile(item.path)), item.sha256, `${item.path} changed`);
}
const originalBytes = await readFile(plan.inputs.failedTestPreimage.path);
const original = originalBytes.toString("utf8");
const expectationFrom =
  "assert.equal(analysis.evidenceBoundary.audioTranscriptInputs, 2);";
const expectationTo =
  "assert.equal(analysis.evidenceBoundary.audioTranscriptInputs, 5);";
assert.equal(count(original, expectationFrom), 1);
const corrected = original.replace(expectationFrom, expectationTo);
assert.equal(count(corrected, expectationTo), 1);
assert.equal(sha256(corrected), plan.correction.correctedTestSha256);

let rawOutput;
const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "slugfester-batch-07-adj-gate-"));
try {
  const temporaryTest = path.join(temporaryRoot, "corrected-gate-test.mjs");
  await writeFile(temporaryTest, corrected);
  rawOutput = execFileSync(process.execPath, [temporaryTest], {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 60000,
    env: { ...process.env }
  });
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
const validation = JSON.parse(rawOutput);
assert.equal(validation.status, "passed-analyzed");
assert.equal(
  validation.analysisStatus,
  "post-canary-batch-07-dispute-only-adjudication-gate-passed-standing-authorization-active-for-final-ledger-assembly"
);
assert.equal(validation.validContexts, 10);
assert.equal(validation.disputedMovesDecided, 180);
assert.equal(validation.candidateSelections, 511);
assert.equal(validation.retries, 0);
assert.equal(validation.paidServiceCalls, 0);
assert.equal(validation.scoresDerived, 0);

const execution = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-07-adjudication-gate-validation-recovery-1-execution",
  status: "passed-one-bounded-batch-07-adjudication-gate-validation-overlay",
  executedAt,
  recoveryLevel: 1,
  plan: PLAN,
  planSha256: sha256(await readFile(PLAN)),
  authenticatedInputs: structuredClone(plan.inputs),
  correction: structuredClone(plan.correction),
  validation,
  controls: {
    acceptedOutputsUnchanged: true,
    modelExecutionRecordUnchanged: true,
    analysisUnchanged: true,
    failedTestPreimageUnchanged: true,
    correctedTestAppliedInMemoryOnly: true,
    temporaryFilesRemoved: true,
    modelExecutionOccurred: false,
    paidServiceCalls: 0,
    scoresDerived: 0,
    directIncrementalCostUsd: 0,
    attempts: 1,
    retries: 0
  },
  nextAuthorizedAction:
    "resume-batch-07-standing-authorization-with-deterministic-final-ledger-assembly"
};
if (shouldWrite) await writeFile(EXECUTION, `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify(execution, null, 2));
