#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  BATCH_11_REPOSITORY_DEPENDENT_CORRECTION_ROOT
} from "./lib/assessment-production-post-canary-batch-11-repository-dependent-correction-1.mjs";
import { sha256 } from "./lib/assessment-production-post-canary-batch-11-production-publication.mjs";

const resolve = (relativePath) => path.resolve(process.cwd(), relativePath);
const readBytes = (relativePath) => readFile(resolve(relativePath));
const readJson = (relativePath) => readFile(resolve(relativePath), "utf8").then(JSON.parse);
const planPath = `${BATCH_11_REPOSITORY_DEPENDENT_CORRECTION_ROOT}/correction-plan.json`;
const activationPath = `${BATCH_11_REPOSITORY_DEPENDENT_CORRECTION_ROOT}/execution-activation.json`;
const [plan, activation] = await Promise.all([
  readJson(planPath),
  readJson(activationPath)
]);

assert.equal(
  activation.status,
  "frozen-batch-11-repository-dependent-correction-1-activated"
);
assert.equal(activation.batchNumber, 11);
assert.equal(activation.directIncrementalCostCapUsd, 0);
assert.equal(activation.proposedOutputs.length, 4);
assert.equal(activation.executionDiscipline.attempts, 1);
assert.equal(activation.executionDiscipline.retries, 0);
assert.equal(activation.executionDiscipline.reruns, 0);
assert.equal(activation.executionDiscipline.completeRepositoryValidationRuns, 1);
assert.equal(activation.executionDiscipline.productionMutationReruns, 0);
assert.equal(activation.executionDiscipline.seoGeneratorWriteRuns, 0);
assert.equal(activation.authorization.exactFourDependentWrites, true);
assert.equal(activation.authorization.completeRepositoryValidation, true);
assert.equal(activation.authorization.additionalWrites, false);
assert.equal(activation.authorization.modelExecution, false);
assert.equal(activation.authorization.paidServices, false);
assert.equal(sha256(await readBytes(planPath)), activation.plan.sha256);
for (const lock of activation.executionTools) {
  assert.equal(sha256(await readBytes(lock.path)), lock.sha256, lock.path);
}
for (const lock of plan.preservedState.generatedOutputs) {
  assert.equal(sha256(await readBytes(lock.path)), lock.sha256, lock.path);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      proposedWrites: 4,
      attempts: 1,
      retries: 0,
      completeRepositoryValidationRuns: 1
    },
    null,
    2
  )
);
