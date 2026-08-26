#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  BATCH_11_REPOSITORY_DEPENDENT_CORRECTION_ROOT,
  BATCH_11_REPOSITORY_DEPENDENT_WRITABLE_PATHS
} from "./lib/assessment-production-post-canary-batch-11-repository-dependent-correction-1.mjs";
import {
  serializedJson,
  sha256
} from "./lib/assessment-production-post-canary-batch-11-production-publication.mjs";

const resolve = (relativePath) => path.resolve(process.cwd(), relativePath);
const readBytes = (relativePath) => readFile(resolve(relativePath));
const readJson = (relativePath) => readFile(resolve(relativePath), "utf8").then(JSON.parse);
const exists = (relativePath) => access(resolve(relativePath)).then(() => true, () => false);
const planPath = `${BATCH_11_REPOSITORY_DEPENDENT_CORRECTION_ROOT}/correction-plan.json`;
const analysisPath = `${BATCH_11_REPOSITORY_DEPENDENT_CORRECTION_ROOT}/preparation-analysis.json`;
const [plan, analysis] = await Promise.all([
  readJson(planPath),
  readJson(analysisPath)
]);

assert.equal(
  plan.status,
  "frozen-batch-11-four-file-repository-dependent-correction-prepared"
);
assert.equal(plan.batchNumber, 11);
assert.equal(plan.directIncrementalCostCapUsd, 0);
assert.equal(plan.failureDiagnosis.productionOrScoreDefect, false);
assert.equal(plan.failureDiagnosis.generatedSeoDefect, false);
assert.equal(plan.failureDiagnosis.omittedDeterministicDependencies, true);
assert.equal(plan.preservedState.generatedOutputs.length, 380);
assert.equal(plan.isolatedPreparationPreview.scoringTestExitCode, 0);
assert.equal(plan.isolatedPreparationPreview.pilotGeneratorRuns, 1);
assert.equal(plan.isolatedPreparationPreview.temporaryFilesCleaned, true);
assert.equal(plan.isolatedPreparationPreview.proposedOutputs.length, 4);
assert.equal(plan.correctionContract.attemptsMaximum, 1);
assert.equal(plan.correctionContract.retriesMaximum, 0);
assert.equal(plan.correctionContract.rerunsMaximum, 0);
assert.equal(plan.correctionContract.completeRepositoryValidationRuns, 1);
assert.equal(plan.correctionContract.productionMutationReruns, 0);
assert.equal(plan.correctionContract.seoGeneratorWriteRuns, 0);
assert.deepEqual(
  plan.correctionContract.writablePaths,
  BATCH_11_REPOSITORY_DEPENDENT_WRITABLE_PATHS
);
assert.equal(plan.authorization.correctionExecution, false);
assert.equal(plan.authorization.modelExecution, false);
assert.equal(plan.authorization.paidServiceUse, false);

for (const lock of [
  plan.preservedState.seoPlan,
  plan.preservedState.productionDebates,
  ...plan.preservedState.productionLedgers,
  plan.preservedState.references,
  plan.preservedState.validator,
  plan.preservedState.generator,
  ...plan.preservedState.generatedOutputs,
  ...plan.preparationTools
]) {
  assert.equal(sha256(await readBytes(lock.path)), lock.sha256, lock.path);
}
assert.equal(
  analysis.status,
  "batch-11-repository-dependent-correction-plan-freeze-passed"
);
assert.equal(analysis.plan.sha256, sha256(serializedJson(plan)));
assert.equal(analysis.checks.persistentWrites, 0);
assert.equal(await exists(plan.outputPaths.activation), false);
assert.equal(await exists(plan.outputPaths.execution), false);
assert.equal(await exists(plan.outputPaths.seoExecution), false);

console.log(
  JSON.stringify(
    {
      status: "passed",
      generatedOutputsPreserved: 380,
      proposedWrites: 4,
      productionMutationReruns: 0,
      seoGeneratorWriteRuns: 0,
      persistentWrites: 0
    },
    null,
    2
  )
);
