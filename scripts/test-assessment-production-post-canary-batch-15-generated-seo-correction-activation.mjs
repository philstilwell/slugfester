#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_15_GENERATED_SEO_CORRECTION_ROOT,
  generatedInventoryDigest,
  generatedPathSetDigest
} from "./lib/assessment-production-post-canary-batch-15-generated-seo-correction.mjs";
import { sha256 } from "./lib/assessment-production-post-canary-batch-15-production-publication.mjs";

const resolve = (relativePath) => path.resolve(process.cwd(), relativePath);
const readBytes = (relativePath) => readFile(resolve(relativePath));
const readJson = (relativePath) => readFile(resolve(relativePath), "utf8").then(JSON.parse);
const exists = (relativePath) => access(resolve(relativePath)).then(() => true, () => false);
const planPath = `${POST_CANARY_BATCH_15_GENERATED_SEO_CORRECTION_ROOT}/correction-plan.json`;
const activationPath = `${POST_CANARY_BATCH_15_GENERATED_SEO_CORRECTION_ROOT}/execution-activation.json`;
const [plan, activation] = await Promise.all([readJson(planPath), readJson(activationPath)]);

assert.equal(activation.status, "frozen-batch-15-generated-seo-correction-pass-activated");
assert.equal(activation.directIncrementalCostCapUsd, 0);
assert.equal(activation.frozenEnumeration.outputCount, 380);
assert.equal(activation.frozenEnumeration.proposedWrites.length, 12);
assert.equal(activation.executionDiscipline.isolatedGeneratorRuns, 1);
assert.equal(activation.executionDiscipline.generatorAttempts, 1);
assert.equal(activation.executionDiscipline.repositoryValidationRuns, 1);
assert.equal(activation.executionDiscipline.retries, 0);
assert.equal(activation.executionDiscipline.reruns, 0);
assert.equal(activation.executionDiscipline.automaticRepairs, 0);
assert.equal(activation.executionDiscipline.productionMutationReruns, 0);
assert.equal(activation.executionDiscipline.rollbacks, 0);
assert.equal(activation.executionDiscipline.modelContexts, 0);
assert.equal(activation.executionDiscipline.paidServiceCalls, 0);
assert.equal(activation.authorization.exactTwelveGeneratedDerivativeWrites, true);
assert.equal(activation.authorization.completeRepositoryValidation, true);
assert.equal(activation.authorization.atomicTransactionCommitAndPush, true);
assert.equal(activation.authorization.additionalGeneratedWrites, false);
assert.equal(activation.authorization.modelExecution, false);
assert.equal(activation.authorization.paidServices, false);
assert.equal(sha256(await readBytes(planPath)), activation.plan.sha256);
assert.equal(generatedPathSetDigest(plan.inventory), activation.frozenEnumeration.pathSetSha256);
assert.equal(generatedInventoryDigest(plan.inventory), activation.frozenEnumeration.inventorySha256);
for (const lock of activation.executionTools) {
  assert.equal(sha256(await readBytes(lock.path)), lock.sha256, lock.path);
}
for (const record of plan.inventory) {
  assert.equal(sha256(await readBytes(record.path)), record.baselineSha256, record.path);
}
assert.equal(await exists(activation.outputPaths.execution), false);
assert.equal(await exists(activation.outputPaths.analysis), false);

console.log(JSON.stringify({ status: "passed", isolatedGeneratorRuns: 1, proposedWrites: 12, completeRepositoryValidationRuns: 1 }, null, 2));


