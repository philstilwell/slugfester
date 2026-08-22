#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-05/production-compatibility";
const CORRECTION_ROOT = `${ROOT}/preparation-validation-correction-1`;
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const TEST = "scripts/test-assessment-production-post-canary-batch-05-compatibility-preparation.mjs";
const DIAGNOSIS = `${CORRECTION_ROOT}/diagnosis.json`;
const PROPOSED_TEST = `${CORRECTION_ROOT}/proposed-test.mjs`;
const PROPOSED_PREPARATION = `${CORRECTION_ROOT}/proposed-preparation-manifest.json`;
const PLAN = `${CORRECTION_ROOT}/correction-plan.json`;
const ACTIVATION = `${CORRECTION_ROOT}/execution-activation.json`;
const EXECUTION = `${CORRECTION_ROOT}/execution.json`;
const ANALYSIS = `${CORRECTION_ROOT}/analysis.json`;
const PREPARE_SCRIPT = "scripts/prepare-assessment-production-post-canary-batch-05-compatibility-preparation-correction-1.mjs";
const ACTIVATE_SCRIPT = "scripts/activate-assessment-production-post-canary-batch-05-compatibility-preparation-correction-1.mjs";
const RUN_SCRIPT = "scripts/run-assessment-production-post-canary-batch-05-compatibility-preparation-correction-1.mjs";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : null;
if (!frozenAt || Number.isNaN(Date.parse(frozenAt))) {
  throw new Error("--frozen-at requires an ISO timestamp");
}
if (await exists(CORRECTION_ROOT)) throw new Error("correction-1 already exists");

const [preparationBytes, testBytes] = await Promise.all([
  readFile(PREPARATION),
  readFile(TEST)
]);
const preparation = JSON.parse(preparationBytes);
if (
  preparation.status !== "post-canary-batch-05-compatibility-plan-prepared-and-frozen" ||
  preparation.proposedValidatorRoute?.unchangedBehavior?.length !== 9 ||
  preparation.frozenSources?.[TEST] !== sha256(testBytes)
) {
  throw new Error("frozen Batch 5 compatibility preparation changed");
}
const before = `assert.equal(\n  preparation.proposedValidatorRoute.unchangedBehavior.length,\n  8\n);`;
const after = `assert.equal(\n  preparation.proposedValidatorRoute.unchangedBehavior.length,\n  9\n);`;
const testText = testBytes.toString("utf8");
if (testText.split(before).length !== 2) {
  throw new Error("stale compatibility test assertion is not unique");
}
const proposedTestBytes = Buffer.from(testText.replace(before, after));
const proposedPreparation = structuredClone(preparation);
proposedPreparation.frozenSources[TEST] = sha256(proposedTestBytes);
const proposedPreparationBytes = jsonBytes(proposedPreparation);
const diagnosis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-compatibility-preparation-validation-diagnosis",
  status: "frozen-batch-05-compatibility-preparation-validation-stale-regression-count-diagnosed",
  diagnosedAt: frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  failedCommand: `node ${TEST}`,
  failure: {
    category: "deterministic-validation-harness-stale-regression-count",
    assertion: "preparation.proposedValidatorRoute.unchangedBehavior.length === 8",
    observed: 9,
    expectedAfterAddingFrozenBatch04Preservation: 9
  },
  finding: "The Batch 5 plan correctly preserves the checkpoint and Batch 1 through Batch 4 routes. The copied Batch 4 preparation test retained the prior eight-item expectation instead of the required nine-item expectation.",
  protectedInputsChanged: false,
  modelContexts: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0
};
const sourceFiles = [PREPARATION, TEST, PREPARE_SCRIPT, ACTIVATE_SCRIPT, RUN_SCRIPT];
const sourceHashes = Object.fromEntries(
  await Promise.all(sourceFiles.map(async (file) => [file, sha256(await readFile(file))]))
);
const plan = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-compatibility-preparation-correction-1-plan",
  status: "frozen-batch-05-compatibility-preparation-correction-1-prepared",
  frozenAt,
  diagnosis: { path: DIAGNOSIS, sha256: sha256(jsonBytes(diagnosis)) },
  correctionScope: {
    test: TEST,
    oldExpectedCount: 8,
    newExpectedCount: 9,
    writableAssertions: 1,
    preparationManifest: PREPARATION,
    authenticatedSourceHashUpdates: 1,
    allOtherManifestFieldsPreserved: true
  },
  proposed: {
    test: { path: PROPOSED_TEST, sha256: sha256(proposedTestBytes), bytes: proposedTestBytes.length },
    preparation: { path: PROPOSED_PREPARATION, sha256: sha256(proposedPreparationBytes), bytes: proposedPreparationBytes.length }
  },
  sourceHashes,
  executionPolicy: {
    correctedValidationPassesMaximum: 1,
    retriesMaximum: 0,
    rerunsMaximum: 0,
    automaticRepairsMaximum: 0,
    modelContexts: 0,
    paidServiceCalls: 0
  },
  artifacts: { activation: ACTIVATION, execution: EXECUTION, analysis: ANALYSIS },
  authorization: {
    deterministicHarnessCorrection: true,
    correctedValidationPass: false,
    compatibilityActivation: false,
    compatibilityExecution: false,
    modelExecution: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: "activate-one-batch-05-compatibility-preparation-correction-1-validation-pass"
};

await mkdir(CORRECTION_ROOT, { recursive: true });
await Promise.all([
  writeFile(DIAGNOSIS, jsonBytes(diagnosis)),
  writeFile(PROPOSED_TEST, proposedTestBytes),
  writeFile(PROPOSED_PREPARATION, proposedPreparationBytes),
  writeFile(PLAN, jsonBytes(plan))
]);
console.log(JSON.stringify({ status: plan.status, observed: 9, correctedExpected: 9, directIncrementalCostUsd: 0, nextAuthorizedAction: plan.nextAuthorizedAction }, null, 2));
