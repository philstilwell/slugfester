#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";

const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-05/discovery";
const CORRECTION_ROOT = `${ROOT}/manifest-validation-correction-1`;
const PLAN = `${CORRECTION_ROOT}/plan.json`;
const VALIDATION = `${ROOT}/execution-preparation-validation.json`;
const EXECUTION = `${CORRECTION_ROOT}/execution.json`;
const ANALYSIS = `${CORRECTION_ROOT}/analysis.json`;
const CORRECTED_TEST = "scripts/test-assessment-production-post-canary-batch-05-discovery-manifest-correction-1.mjs";

const executedAtIndex = process.argv.indexOf("--executed-at");
const executedAt = executedAtIndex >= 0 ? process.argv[executedAtIndex + 1] : null;
if (!executedAt || Number.isNaN(Date.parse(executedAt))) throw new Error("--executed-at requires an ISO timestamp");

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);

const planBytes = await readFile(PLAN);
const plan = JSON.parse(planBytes);
if (
  plan.status !== "frozen-batch-05-discovery-manifest-validation-correction-1-prepared" ||
  plan.correctionScope?.expectedSourceChainOverlayContexts !== 0 ||
  plan.executionControls?.attemptsMaximum !== 1 ||
  plan.executionControls?.retriesMaximum !== 0 ||
  plan.authorization?.correctedValidationPass !== true ||
  plan.authorization?.modelExecution !== false ||
  plan.authorization?.paidService !== false
) throw new Error("Batch 5 discovery validation correction plan is invalid");
for (const [file, digest] of Object.entries(plan.sourceHashes)) {
  if (sha256(await readFile(file)) !== digest) throw new Error(`${file}: correction source drifted`);
}
for (const file of [VALIDATION, EXECUTION, ANALYSIS]) {
  if (await exists(file)) throw new Error(`${file}: correction output already exists`);
}

const result = spawnSync(
  process.execPath,
  [CORRECTED_TEST, "--write", "--validated-at", executedAt],
  { encoding: "utf8", timeout: 300000 }
);
const validationBytes = await readFile(VALIDATION).catch(() => null);
const passed =
  result.status === 0 &&
  !result.error &&
  validationBytes &&
  JSON.parse(validationBytes).status ===
    "batch-05-discovery-execution-manifest-validation-passed-frozen-standing-authorization-active";
const execution = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-deterministic-correction-execution",
  status: passed
    ? "passed-batch-05-discovery-manifest-validation-correction-1"
    : "failed-batch-05-discovery-manifest-validation-correction-1",
  executedAt,
  correctionPlan: { path: PLAN, sha256: sha256(planBytes), bytes: planBytes.length },
  command: `${process.execPath} ${CORRECTED_TEST} --write --validated-at ${executedAt}`,
  attempt: 1,
  retries: 0,
  reruns: 0,
  timeoutExtensions: 0,
  recursiveCorrections: 0,
  exitCode: result.status,
  signal: result.signal,
  error: result.error ? String(result.error) : null,
  stdoutSha256: sha256(result.stdout ?? ""),
  stderrSha256: sha256(result.stderr ?? ""),
  validation: validationBytes
    ? { path: VALIDATION, sha256: sha256(validationBytes), bytes: validationBytes.length }
    : null,
  modelContextsExecuted: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0
};
await writeFile(EXECUTION, jsonBytes(execution));
const executionBytes = await readFile(EXECUTION);
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-deterministic-correction-analysis",
  status: passed
    ? "batch-05-discovery-manifest-validation-correction-1-accepted"
    : "batch-05-discovery-manifest-validation-correction-1-failed-stop",
  analyzedAt: executedAt,
  execution: { path: EXECUTION, sha256: sha256(executionBytes), bytes: executionBytes.length },
  finding: passed
    ? "The corrected deterministic validation confirmed that Batch 5 has zero source-chain overlay contexts while preserving all 41 frozen discovery contexts and every authenticated source input."
    : "The one authorized corrected validation pass did not succeed.",
  decision: {
    boundedCorrectionPassed: Boolean(passed),
    originalManifestPreserved: true,
    originalValidationHarnessPreserved: true,
    sourcePacketsPreserved: true,
    correctedValidationAccepted: Boolean(passed),
    modelExecutionPerformed: false,
    paidServiceUsed: false,
    resumeStandingAuthorization: Boolean(passed)
  },
  nextAuthorizedAction: passed
    ? "prepare-and-freeze-batch-05-discovery-execution-activation-under-standing-authorization"
    : "stop-and-request-new-approval"
};
await writeFile(ANALYSIS, jsonBytes(analysis));
console.log(JSON.stringify({ status: analysis.status, exitCode: result.status, validationPassed: Boolean(passed), modelContextsExecuted: 0, paidServiceCalls: 0, directIncrementalCostUsd: 0, nextAuthorizedAction: analysis.nextAuthorizedAction }, null, 2));
if (!passed) process.exitCode = 1;
