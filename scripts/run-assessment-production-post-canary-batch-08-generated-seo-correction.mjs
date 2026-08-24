#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { assertV4 } from "./lib/v4-lean-production.mjs";
import {
  POST_CANARY_BATCH_08_GENERATED_SEO_CORRECTION_PROTOCOL_ID,
  POST_CANARY_BATCH_08_GENERATED_SEO_CORRECTION_ROOT,
  generatedInventoryDigest,
  generatedPathSetDigest,
  runIsolatedBatch08SeoGenerator
} from "./lib/assessment-production-post-canary-batch-08-generated-seo-correction.mjs";
import { serializedJson, sha256 } from "./lib/assessment-production-post-canary-batch-08-production-publication.mjs";

const root = process.cwd();
const resolve = (relativePath) => path.resolve(root, relativePath);
const readBytes = (relativePath) => readFile(resolve(relativePath));
const readJson = (relativePath) => readFile(resolve(relativePath), "utf8").then(JSON.parse);
const lockFile = async (relativePath) => {
  const bytes = await readBytes(relativePath);
  return { path: relativePath, sha256: sha256(bytes), bytes: bytes.length };
};
const planPath = `${POST_CANARY_BATCH_08_GENERATED_SEO_CORRECTION_ROOT}/correction-plan.json`;
const activationPath = `${POST_CANARY_BATCH_08_GENERATED_SEO_CORRECTION_ROOT}/execution-activation.json`;
const executionPath = `${POST_CANARY_BATCH_08_GENERATED_SEO_CORRECTION_ROOT}/execution.json`;
const analysisPath = `${POST_CANARY_BATCH_08_GENERATED_SEO_CORRECTION_ROOT}/analysis.json`;
const startedAt = new Date().toISOString();
const [plan, activation] = await Promise.all([readJson(planPath), readJson(activationPath)]);

assertV4(
  plan.protocolId === POST_CANARY_BATCH_08_GENERATED_SEO_CORRECTION_PROTOCOL_ID &&
    activation.status === "frozen-batch-08-generated-seo-correction-pass-activated" &&
    activation.executionDiscipline.isolatedGeneratorRuns === 1 &&
    activation.executionDiscipline.repositoryValidationRuns === 1 &&
    activation.executionDiscipline.retries === 0 &&
    activation.executionDiscipline.reruns === 0,
  "frozen Batch 8 generated SEO activation required"
);
assertV4(sha256(await readBytes(planPath)) === activation.plan.sha256, "generated SEO correction plan changed after activation");
for (const lock of [
  ...activation.executionTools,
  plan.productionMutation.manifest,
  plan.productionMutation.activation,
  plan.productionMutation.execution,
  plan.productionMutation.analysis,
  plan.productionMutation.productionDebates,
  ...plan.productionMutation.productionLedgers,
  plan.productionMutation.references,
  plan.productionMutation.validator,
  plan.generator
]) {
  assertV4(sha256(await readBytes(lock.path)) === lock.sha256, `${lock.path}: activated input changed`);
}
for (const record of plan.inventory) {
  const baseline = await readBytes(record.path);
  assertV4(sha256(baseline) === record.baselineSha256, `${record.path}: generated baseline changed before execution`);
}

const isolated = await runIsolatedBatch08SeoGenerator(root);
assertV4(isolated.outputs.length === activation.frozenEnumeration.outputCount, "isolated generator output count changed");
assertV4(generatedPathSetDigest(isolated.outputs) === activation.frozenEnumeration.pathSetSha256, "isolated generator path set changed");
const proposedByPath = new Map(isolated.outputs.map((record) => [record.path, record]));
const replayInventory = plan.inventory.map((record) => {
  const proposed = proposedByPath.get(record.path);
  assertV4(proposed, `${record.path}: isolated output missing`);
  assertV4(proposed.sha256 === record.proposedSha256 && proposed.bytes === record.proposedBytes, `${record.path}: isolated output differs from frozen proposal`);
  return record;
});
assertV4(generatedInventoryDigest(replayInventory) === activation.frozenEnumeration.inventorySha256, "isolated inventory differs from frozen proposal");

const writablePaths = new Set(activation.frozenEnumeration.proposedWritePaths);
assertV4(writablePaths.size === 12, "exactly twelve generated paths must be writable");
for (const record of plan.inventory) {
  if (!writablePaths.has(record.path)) continue;
  const proposed = proposedByPath.get(record.path);
  await mkdir(path.dirname(resolve(record.path)), { recursive: true });
  await writeFile(resolve(record.path), proposed.content);
}
for (const record of plan.inventory) {
  const actual = await readBytes(record.path);
  const expected = writablePaths.has(record.path) ? record.proposedSha256 : record.baselineSha256;
  assertV4(sha256(actual) === expected, `${record.path}: post-write generated hash mismatch`);
}

const validationStartedAt = new Date().toISOString();
const validation = spawnSync("npm", ["run", "check"], { cwd: root, encoding: "utf8" });
const validationCompletedAt = new Date().toISOString();
assertV4(validation.status === 0, `complete repository validation failed: ${validation.stderr || validation.stdout}`);
for (const lock of [
  plan.productionMutation.productionDebates,
  ...plan.productionMutation.productionLedgers,
  plan.productionMutation.references,
  plan.productionMutation.validator,
  plan.generator
]) {
  assertV4(sha256(await readBytes(lock.path)) === lock.sha256, `${lock.path}: protected production input changed during correction`);
}
const completedAt = new Date().toISOString();
const writtenOutputs = await Promise.all(plan.proposedWrites.map((record) => lockFile(record.path)));
const execution = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-08-generated-seo-correction-execution",
  protocolId: POST_CANARY_BATCH_08_GENERATED_SEO_CORRECTION_PROTOCOL_ID,
  status: "passed-complete-batch-08-transaction-ready-for-atomic-commit",
  startedAt,
  completedAt,
  activation: await lockFile(activationPath),
  isolatedGeneration: {
    runs: 1,
    outputs: isolated.outputs.length,
    pathSetSha256: isolated.pathSetSha256,
    inventorySha256: generatedInventoryDigest(replayInventory),
    temporaryFilesCleaned: true
  },
  writes: {
    exactGeneratedFiles: writtenOutputs,
    changedFiles: 12,
    unchangedGeneratedFiles: 368,
    otherGeneratedOutputsPreserved: true
  },
  validation: {
    command: "npm run check",
    runs: 1,
    startedAt: validationStartedAt,
    completedAt: validationCompletedAt,
    exitCode: validation.status,
    stdoutSha256: sha256(validation.stdout),
    stderrSha256: sha256(validation.stderr),
    generatedSeoFilesValidated: 380,
    completeRepositoryRegressionPassed: true
  },
  productionTransaction: {
    debatesPublished: 10,
    productionLedgerFiles: 10,
    productionDebates: plan.productionMutation.productionDebates,
    productionLedgers: plan.productionMutation.productionLedgers,
    referencesByteIdentical: true,
    validatorByteIdentical: true,
    generatorByteIdentical: true
  },
  totals: {
    isolatedGeneratorRuns: 1,
    repositoryValidationRuns: 1,
    generatedDerivativeWrites: 12,
    unchangedGeneratedOutputs: 368,
    productionMutationReruns: 0,
    retries: 0,
    reruns: 0,
    automaticRepairs: 0,
    rollbacks: 0,
    scorePasses: 0,
    modelContexts: 0,
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0
  },
  nextAuthorizedAction: "atomic-commit-and-push-complete-validated-batch-08-production-transaction-then-stop-before-batch-9-selection"
};
await writeFile(resolve(executionPath), serializedJson(execution));
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-08-generated-seo-correction-analysis",
  protocolId: POST_CANARY_BATCH_08_GENERATED_SEO_CORRECTION_PROTOCOL_ID,
  status: "batch-08-production-publication-accepted-for-atomic-commit-after-generated-seo-correction",
  analyzedAt: completedAt,
  execution: await lockFile(executionPath),
  decision: {
    generatedSeoCorrectionGatePassed: true,
    batch08ProductionPublicationGatePassed: true,
    singleCorrectionPassAccepted: true,
    generatorOutputCountPassed: true,
    pathSetDigestPassed: true,
    inventoryDigestPassed: true,
    proposedDerivativeHashesPassed: true,
    other368GeneratedOutputsPreserved: true,
    completeRepositoryValidationPassed: true,
    completeTransactionAccepted: true,
    atomicCommitAndPushAuthorized: true,
    retryPerformed: false,
    rerunPerformed: false,
    automaticRepairPerformed: false,
    productionMutationRerunPerformed: false,
    rollbackPerformed: false,
    scorePassPerformed: false,
    modelExecutionPerformed: false,
    paidServiceUsed: false,
    nextBatchSelected: false
  },
  result: {
    generatorRuns: 1,
    generatorOutputs: 380,
    affectedGeneratedFiles: 12,
    unchangedGeneratedFiles: 368,
    repositoryValidationRuns: 1,
    repositoryValidationExitCode: 0,
    fullRepositoryRegressionPassed: true
  },
  totals: execution.totals,
  nextAuthorizedAction: execution.nextAuthorizedAction
};
await writeFile(resolve(analysisPath), serializedJson(analysis));
console.log(serializedJson({ status: execution.status, outputs: 380, written: 12, unchanged: 368, repositoryValidationPassed: true, directIncrementalCostUsd: 0 }));
