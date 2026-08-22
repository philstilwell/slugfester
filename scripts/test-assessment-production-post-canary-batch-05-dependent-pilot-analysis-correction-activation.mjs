#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

import { BATCH_05_DEPENDENT_PILOT_CORRECTION_ROOT } from "./lib/assessment-production-post-canary-batch-05-dependent-pilot-analysis-correction.mjs";
import { sha256 } from "./lib/assessment-production-post-canary-batch-05-production-publication.mjs";

const readJson = (relativePath) => readFile(relativePath, "utf8").then(JSON.parse);
const exists = (relativePath) => access(relativePath).then(() => true, () => false);
const planPath = `${BATCH_05_DEPENDENT_PILOT_CORRECTION_ROOT}/correction-plan.json`;
const activationPath = `${BATCH_05_DEPENDENT_PILOT_CORRECTION_ROOT}/execution-activation.json`;
const [plan, activation] = await Promise.all([readJson(planPath), readJson(activationPath)]);
assert.equal(activation.status, "frozen-batch-05-dependent-pilot-analysis-correction-activated");
assert.equal(activation.plan.sha256, sha256(await readFile(planPath)));
assert.equal(activation.correctionContract.attemptsMaximum, 1);
assert.equal(activation.correctionContract.retriesMaximum, 0);
assert.equal(activation.correctionContract.rerunsMaximum, 0);
assert.equal(activation.correctionContract.writablePathsMaximum, 2);
assert.equal(activation.proposedOutputs.length, 2);
assert.equal(activation.authorization.productionMutationRerun, false);
assert.equal(activation.authorization.seoGeneratorWrite, false);
assert.equal(activation.authorization.scorePass, false);
assert.equal(activation.authorization.modelExecution, false);
assert.equal(activation.authorization.paidServiceUse, false);
assert.equal(await exists(activation.outputPaths.execution), false);
assert.equal(await exists(activation.outputPaths.analysis), false);
for (const lock of [...plan.protectedProduction.generatedOutputs, ...plan.staleOutputs]) {
  assert.equal(sha256(await readFile(lock.path)), lock.sha256, lock.path);
}
console.log(JSON.stringify({ status: "passed", attemptsMaximum: 1, proposedWrites: 2, completeRepositoryValidationRuns: 1 }, null, 2));
