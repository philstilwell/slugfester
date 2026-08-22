#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-05/production-compatibility";
const CORRECTION_1_ROOT = `${ROOT}/preparation-validation-correction-1`;
const CORRECTION_2_ROOT = `${ROOT}/preparation-validation-correction-2`;
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const PREPARATION_ANALYSIS = `${ROOT}/analysis.json`;
const TEST = "scripts/test-assessment-production-post-canary-batch-05-compatibility-preparation.mjs";
const CORRECTION_1_ACTIVATION = `${CORRECTION_1_ROOT}/execution-activation.json`;
const CORRECTION_1_EXECUTION = `${CORRECTION_1_ROOT}/execution.json`;
const CORRECTION_1_ANALYSIS = `${CORRECTION_1_ROOT}/analysis.json`;
const DIAGNOSIS = `${CORRECTION_2_ROOT}/diagnosis.json`;
const PROPOSED_ANALYSIS = `${CORRECTION_2_ROOT}/proposed-analysis.json`;
const PLAN = `${CORRECTION_2_ROOT}/correction-plan.json`;
const ACTIVATION = `${CORRECTION_2_ROOT}/execution-activation.json`;
const EXECUTION = `${CORRECTION_2_ROOT}/execution.json`;
const ANALYSIS = `${CORRECTION_2_ROOT}/analysis.json`;
const PREPARE_SCRIPT = "scripts/prepare-assessment-production-post-canary-batch-05-compatibility-preparation-correction-2.mjs";
const ACTIVATE_SCRIPT = "scripts/activate-assessment-production-post-canary-batch-05-compatibility-preparation-correction-2.mjs";
const RUN_SCRIPT = "scripts/run-assessment-production-post-canary-batch-05-compatibility-preparation-correction-2.mjs";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : null;
if (!frozenAt || Number.isNaN(Date.parse(frozenAt))) {
  throw new Error("--frozen-at requires an ISO timestamp");
}
if (await exists(CORRECTION_2_ROOT)) throw new Error("correction-2 already exists");

const [
  preparationBytes,
  preparationAnalysisBytes,
  testBytes,
  correction1ActivationBytes,
  correction1ExecutionBytes,
  correction1AnalysisBytes
] = await Promise.all([
  readFile(PREPARATION),
  readFile(PREPARATION_ANALYSIS),
  readFile(TEST),
  readFile(CORRECTION_1_ACTIVATION),
  readFile(CORRECTION_1_EXECUTION),
  readFile(CORRECTION_1_ANALYSIS)
]);
const preparation = JSON.parse(preparationBytes);
const preparationAnalysis = JSON.parse(preparationAnalysisBytes);
const correction1Activation = JSON.parse(correction1ActivationBytes);
const correction1Execution = JSON.parse(correction1ExecutionBytes);
const correction1Analysis = JSON.parse(correction1AnalysisBytes);
const correctedPreparationSha256 = sha256(preparationBytes);
const oldPreparationSha256 = preparationAnalysis.preparation?.sha256;

if (
  preparation.status !== "post-canary-batch-05-compatibility-plan-prepared-and-frozen" ||
  preparation.proposedValidatorRoute?.unchangedBehavior?.length !== 9 ||
  preparation.frozenSources?.[TEST] !== sha256(testBytes) ||
  correction1Activation.proposed?.preparation?.sha256 !== correctedPreparationSha256 ||
  correction1Activation.proposed?.test?.sha256 !== sha256(testBytes) ||
  correction1Execution.status !== "failed-batch-05-compatibility-preparation-correction-1" ||
  correction1Execution.attempt !== 1 ||
  correction1Execution.retries !== 0 ||
  correction1Execution.reruns !== 0 ||
  correction1Analysis.status !== "batch-05-compatibility-preparation-correction-1-failed-stop" ||
  correction1Analysis.execution?.sha256 !== sha256(correction1ExecutionBytes) ||
  !correction1Execution.stderr?.includes(oldPreparationSha256) ||
  !correction1Execution.stderr?.includes(correctedPreparationSha256) ||
  oldPreparationSha256 === correctedPreparationSha256
) {
  throw new Error("preserved correction-1 failure does not match the diagnosed hash conflict");
}

const proposedAnalysis = structuredClone(preparationAnalysis);
proposedAnalysis.preparation.sha256 = correctedPreparationSha256;
const proposedAnalysisBytes = jsonBytes(proposedAnalysis);
const diagnosis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-compatibility-preparation-validation-correction-2-diagnosis",
  status: "frozen-batch-05-compatibility-preparation-correction-1-analysis-hash-conflict-diagnosed",
  diagnosedAt: frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  preservedFailure: {
    execution: { path: CORRECTION_1_EXECUTION, sha256: sha256(correction1ExecutionBytes) },
    analysis: { path: CORRECTION_1_ANALYSIS, sha256: sha256(correction1AnalysisBytes) },
    failedCommand: correction1Execution.command,
    exitCode: correction1Execution.exitCode,
    attempt: correction1Execution.attempt,
    retries: correction1Execution.retries,
    reruns: correction1Execution.reruns
  },
  failure: {
    category: "deterministic-preparation-analysis-authenticated-hash-stale-after-correction-1",
    path: `${PREPARATION_ANALYSIS}#/preparation/sha256`,
    observed: oldPreparationSha256,
    expected: correctedPreparationSha256
  },
  finding: "Correction-1 wrote the exact frozen test and corrected preparation manifest. The preparation test then failed only because the immutable preparation analysis still authenticated the pre-correction manifest hash.",
  permittedCorrection: "Replace only production-compatibility/analysis.json preparation.sha256 with the authenticated hash of the already-corrected preparation manifest.",
  protectedInputsChanged: false,
  modelContexts: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0
};
const sourceFiles = [
  PREPARATION,
  PREPARATION_ANALYSIS,
  TEST,
  CORRECTION_1_ACTIVATION,
  CORRECTION_1_EXECUTION,
  CORRECTION_1_ANALYSIS,
  PREPARE_SCRIPT,
  ACTIVATE_SCRIPT,
  RUN_SCRIPT
];
const sourceHashes = Object.fromEntries(
  await Promise.all(sourceFiles.map(async (file) => [file, sha256(await readFile(file))]))
);
const plan = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-compatibility-preparation-correction-2-plan",
  status: "frozen-batch-05-compatibility-preparation-correction-2-prepared",
  frozenAt,
  diagnosis: { path: DIAGNOSIS, sha256: sha256(jsonBytes(diagnosis)) },
  correctionScope: {
    target: PREPARATION_ANALYSIS,
    jsonPointer: "/preparation/sha256",
    oldSha256: oldPreparationSha256,
    newSha256: correctedPreparationSha256,
    writableFields: 1,
    allOtherAnalysisFieldsPreserved: true,
    preparationManifestPreserved: true,
    preparationTestPreserved: true,
    correction1RecordsPreserved: true
  },
  proposed: {
    analysis: {
      path: PROPOSED_ANALYSIS,
      sha256: sha256(proposedAnalysisBytes),
      bytes: proposedAnalysisBytes.length
    }
  },
  sourceHashes,
  executionPolicy: {
    correctedValidationPassesMaximum: 1,
    attemptsMaximum: 1,
    retriesMaximum: 0,
    rerunsMaximum: 0,
    automaticRepairsMaximum: 0,
    modelContexts: 0,
    paidServiceCalls: 0
  },
  artifacts: { activation: ACTIVATION, execution: EXECUTION, analysis: ANALYSIS },
  authorization: {
    recursiveDeterministicHarnessCorrection: true,
    correctedValidationPass: false,
    compatibilityActivation: false,
    compatibilityExecution: false,
    modelExecution: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: "activate-one-batch-05-compatibility-preparation-correction-2-validation-pass"
};

await mkdir(CORRECTION_2_ROOT, { recursive: true });
await Promise.all([
  writeFile(DIAGNOSIS, jsonBytes(diagnosis)),
  writeFile(PROPOSED_ANALYSIS, proposedAnalysisBytes),
  writeFile(PLAN, jsonBytes(plan))
]);
console.log(JSON.stringify({
  status: plan.status,
  diagnosedOldPreparationSha256: oldPreparationSha256,
  authenticatedCorrectedPreparationSha256: correctedPreparationSha256,
  writableFields: 1,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: plan.nextAuthorizedAction
}, null, 2));
