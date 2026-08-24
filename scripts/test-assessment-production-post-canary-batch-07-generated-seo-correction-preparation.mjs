#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_07_GENERATED_SEO_CORRECTION_ROOT,
  generatedInventoryDigest,
  generatedPathSetDigest
} from "./lib/assessment-production-post-canary-batch-07-generated-seo-correction.mjs";
import { serializedJson, sha256 } from "./lib/assessment-production-post-canary-batch-07-production-publication.mjs";

const resolve = (relativePath) => path.resolve(process.cwd(), relativePath);
const readBytes = (relativePath) => readFile(resolve(relativePath));
const readJson = (relativePath) => readFile(resolve(relativePath), "utf8").then(JSON.parse);
const exists = (relativePath) => access(resolve(relativePath)).then(() => true, () => false);
const planPath = `${POST_CANARY_BATCH_07_GENERATED_SEO_CORRECTION_ROOT}/correction-plan.json`;
const analysisPath = `${POST_CANARY_BATCH_07_GENERATED_SEO_CORRECTION_ROOT}/preparation-analysis.json`;
const [plan, analysis] = await Promise.all([readJson(planPath), readJson(analysisPath)]);

assert.equal(plan.status, "frozen-batch-07-generated-seo-derivative-correction-plan-prepared");
assert.equal(plan.planningOnly, true);
assert.equal(plan.directIncrementalCostCapUsd, 0);
assert.equal(plan.isolatedPreparationComparison.generatorRuns, 1);
assert.equal(plan.inventory.length, 380);
assert.equal(plan.proposedWrites.length, 12);
assert.equal(plan.inventory.filter((record) => !record.changed).length, 368);
assert.equal(generatedPathSetDigest(plan.inventory), plan.executionContract.requiredPathSetSha256);
assert.equal(generatedInventoryDigest(plan.inventory), plan.executionContract.requiredInventorySha256);
assert.equal(plan.executionContract.isolatedGeneratorRuns, 1);
assert.equal(plan.executionContract.repositoryValidationRuns, 1);
assert.equal(plan.executionContract.retries, 0);
assert.equal(plan.executionContract.reruns, 0);
assert.equal(plan.executionContract.productionMutationReruns, 0);
assert.equal(plan.executionContract.writeOnlyProposedPaths.length, 12);
assert.ok(plan.executionContract.writeOnlyProposedPaths.includes("index.html") === false);
assert.ok(plan.inventory.some((record) => record.path === "index.html"));
assert.ok(plan.inventory.some((record) => record.path === "search/index.html"));
assert.equal(plan.authorization.correctionPlanPreparation, true);
assert.equal(plan.authorization.correctionActivation, false);
assert.equal(plan.authorization.generatedDerivativeWrites, false);
assert.equal(plan.authorization.repositoryValidation, false);
assert.equal(plan.authorization.modelExecution, false);
assert.equal(plan.authorization.paidServices, false);

for (const lock of [
  plan.productionMutation.manifest,
  plan.productionMutation.activation,
  plan.productionMutation.execution,
  plan.productionMutation.analysis,
  plan.productionMutation.productionDebates,
  ...plan.productionMutation.productionLedgers,
  plan.productionMutation.references,
  plan.productionMutation.validator,
  plan.generator,
  ...plan.generatorInputs,
  ...plan.preparationTools
]) {
  assert.equal(sha256(await readBytes(lock.path)), lock.sha256, lock.path);
}
for (const record of plan.inventory) {
  const baseline = await readBytes(record.path);
  assert.equal(sha256(baseline), record.baselineSha256, record.path);
  assert.equal(baseline.length, record.baselineBytes, record.path);
}
assert.equal(analysis.status, "batch-07-generated-seo-correction-plan-freeze-passed");
assert.equal(analysis.plan.sha256, sha256(serializedJson(plan)));
assert.equal(analysis.checks.generatedProductionFilesWritten, 0);
assert.equal(await exists(plan.outputPaths.activation), false);
assert.equal(await exists(plan.outputPaths.execution), false);

console.log(serializedJson({ status: "passed", generatedOutputs: 380, proposedWrites: 12, generatedProductionFilesWritten: 0 }));
