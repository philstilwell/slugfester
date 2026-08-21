#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import {
  BATCH_04_DEPENDENT_PILOT_CORRECTION_PROTOCOL_ID,
  BATCH_04_DEPENDENT_PILOT_CORRECTION_ROOT,
  runIsolatedBatch04DependentPilotAnalysis
} from "./lib/assessment-production-post-canary-batch-04-dependent-pilot-analysis-correction.mjs";
import { serializedJson, sha256 } from "./lib/assessment-production-post-canary-batch-04-production-publication.mjs";

const root = process.cwd();
const resolve = (relativePath) => path.resolve(root, relativePath);
const readBytes = (relativePath) => readFile(resolve(relativePath));
const readJson = (relativePath) => readFile(resolve(relativePath), "utf8").then(JSON.parse);
const lockFile = async (relativePath) => { const bytes = await readBytes(relativePath); return { path: relativePath, sha256: sha256(bytes), bytes: bytes.length }; };
const planPath = `${BATCH_04_DEPENDENT_PILOT_CORRECTION_ROOT}/correction-plan.json`;
const activationPath = `${BATCH_04_DEPENDENT_PILOT_CORRECTION_ROOT}/execution-activation.json`;
const executionPath = `${BATCH_04_DEPENDENT_PILOT_CORRECTION_ROOT}/execution.json`;
const analysisPath = `${BATCH_04_DEPENDENT_PILOT_CORRECTION_ROOT}/analysis.json`;
const startedAt = new Date().toISOString();
const [plan, activation] = await Promise.all([readJson(planPath), readJson(activationPath)]);
assertV4(
  plan.protocolId === BATCH_04_DEPENDENT_PILOT_CORRECTION_PROTOCOL_ID &&
    activation.status === "frozen-batch-04-dependent-pilot-analysis-correction-activated" &&
    activation.plan.sha256 === sha256(await readBytes(planPath)) &&
    activation.correctionContract.attemptsMaximum === 1 &&
    activation.correctionContract.retriesMaximum === 0 &&
    activation.correctionContract.rerunsMaximum === 0,
  "frozen one-shot Batch 4 dependent pilot correction activation required"
);
for (const lock of [...plan.dependentInputs, ...plan.preparationTools, plan.diagnosis]) {
  assertV4(sha256(await readBytes(lock.path)) === lock.sha256, `${lock.path}: activated input changed`);
}
for (const lock of [...plan.protectedProduction.generatedOutputs, ...plan.staleOutputs]) {
  assertV4(sha256(await readBytes(lock.path)) === lock.sha256, `${lock.path}: activated baseline changed`);
}

const isolated = await runIsolatedBatch04DependentPilotAnalysis(root);
assertV4(isolated.outputs.length === 2, "correction generator must produce exactly two outputs");
for (const proposed of activation.proposedOutputs) {
  const actual = isolated.outputs.find((record) => record.path === proposed.path);
  assertV4(actual && actual.sha256 === proposed.sha256 && actual.bytes === proposed.bytes, `${proposed.path}: correction output differs from frozen proposal`);
}
for (const proposed of isolated.outputs) await writeFile(resolve(proposed.path), proposed.content);
for (const proposed of activation.proposedOutputs) {
  assertV4(sha256(await readBytes(proposed.path)) === proposed.sha256, `${proposed.path}: postwrite hash mismatch`);
}

const validationStartedAt = new Date().toISOString();
const validation = spawnSync("npm", ["run", "check"], { cwd: root, encoding: "utf8" });
const validationCompletedAt = new Date().toISOString();
assertV4(validation.status === 0, `corrected complete repository validation failed: ${validation.stderr || validation.stdout}`);
for (const lock of plan.protectedProduction.generatedOutputs) {
  assertV4(sha256(await readBytes(lock.path)) === lock.sha256, `${lock.path}: generated output changed during correction`);
}
for (const lock of [
  plan.protectedProduction.debates,
  ...plan.protectedProduction.ledgers,
  plan.protectedProduction.references,
  plan.protectedProduction.validator,
  plan.protectedProduction.seoGenerator
]) {
  assertV4(sha256(await readBytes(lock.path)) === lock.sha256, `${lock.path}: protected production input changed during correction`);
}
const completedAt = new Date().toISOString();
const finalOutputs = await Promise.all(activation.proposedOutputs.map((record) => lockFile(record.path)));
const execution = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-04-dependent-pilot-analysis-correction-execution",
  protocolId: BATCH_04_DEPENDENT_PILOT_CORRECTION_PROTOCOL_ID,
  status: "passed-complete-batch-04-production-transaction-after-dependent-pilot-analysis-correction",
  startedAt,
  completedAt,
  activation: await lockFile(activationPath),
  correction: {
    attempts: 1,
    dependentGeneratorRuns: 1,
    exactWrites: finalOutputs,
    jsonLeafChanges: plan.isolatedPreparationPreview.changedJsonLeafCount,
    productionMutationReruns: 0,
    seoGeneratorWriteRuns: 0,
    scorePasses: 0,
    modelContexts: 0,
    paidServiceCalls: 0
  },
  validation: {
    command: "npm run check",
    runs: 1,
    startedAt: validationStartedAt,
    completedAt: validationCompletedAt,
    exitCode: validation.status,
    stdoutSha256: sha256(validation.stdout),
    stderrSha256: sha256(validation.stderr),
    completeRepositoryRegressionPassed: true
  },
  acceptedTransaction: {
    productionDebates: 10,
    productionLedgers: 10,
    generatedSeoWrites: 12,
    unchangedGeneratedSeoOutputs: 368,
    dependentPilotAnalysisWrites: 2,
    referencesByteIdentical: true,
    validatorByteIdentical: true,
    seoGeneratorByteIdentical: true
  },
  totals: {
    originalSeoPasses: 1,
    deterministicCorrectionPasses: 1,
    repositoryValidationRunsInCorrection: 1,
    productionMutationReruns: 0,
    retries: 0,
    reruns: 0,
    recursiveCorrections: 0,
    scorePasses: 0,
    modelContexts: 0,
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0
  },
  nextAuthorizedAction: "atomic-commit-and-push-complete-validated-batch-04-production-transaction-then-stop-before-batch-5-selection"
};
await writeFile(resolve(executionPath), serializedJson(execution));
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-04-dependent-pilot-analysis-correction-analysis",
  protocolId: BATCH_04_DEPENDENT_PILOT_CORRECTION_PROTOCOL_ID,
  status: "batch-04-production-publication-accepted-after-dependent-pilot-analysis-correction",
  analyzedAt: completedAt,
  execution: await lockFile(executionPath),
  decision: {
    boundedCorrectionPassed: true,
    exactTwoDependentWritesPassed: true,
    productionTransactionPreserved: true,
    all380GeneratedOutputsPreserved: true,
    completeRepositoryValidationPassed: true,
    completeTransactionAccepted: true,
    atomicCommitAndPushAuthorized: true,
    retryPerformed: false,
    rerunPerformed: false,
    productionMutationRerunPerformed: false,
    scorePassPerformed: false,
    modelExecutionPerformed: false,
    paidServiceUsed: false,
    nextBatchSelected: false
  },
  totals: execution.totals,
  nextAuthorizedAction: execution.nextAuthorizedAction
};
await writeFile(resolve(analysisPath), serializedJson(analysis));
console.log(serializedJson({ status: execution.status, dependentWrites: 2, completeRepositoryValidationPassed: true, directIncrementalCostUsd: 0 }));
