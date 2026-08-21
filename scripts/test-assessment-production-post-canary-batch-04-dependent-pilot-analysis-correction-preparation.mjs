#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

import { BATCH_04_DEPENDENT_PILOT_CORRECTION_ROOT } from "./lib/assessment-production-post-canary-batch-04-dependent-pilot-analysis-correction.mjs";
import { serializedJson, sha256 } from "./lib/assessment-production-post-canary-batch-04-production-publication.mjs";

const readJson = (relativePath) => readFile(relativePath, "utf8").then(JSON.parse);
const exists = (relativePath) => access(relativePath).then(() => true, () => false);
const planPath = `${BATCH_04_DEPENDENT_PILOT_CORRECTION_ROOT}/correction-plan.json`;
const analysisPath = `${BATCH_04_DEPENDENT_PILOT_CORRECTION_ROOT}/preparation-analysis.json`;
const [plan, analysis] = await Promise.all([readJson(planPath), readJson(analysisPath)]);
assert.equal(plan.status, "frozen-batch-04-dependent-pilot-analysis-two-file-correction-plan-prepared");
assert.equal(plan.correctionContract.attemptsMaximum, 1);
assert.equal(plan.correctionContract.retriesMaximum, 0);
assert.equal(plan.correctionContract.rerunsMaximum, 0);
assert.equal(plan.correctionContract.recursiveCorrectionsMaximum, 0);
assert.equal(plan.correctionContract.writablePathsMaximum, 2);
assert.deepEqual(plan.correctionContract.writablePaths, ["docs/calibration/v2.1/pilot-analysis.json", "docs/calibration/v2.1/pilot-analysis.md"]);
assert.equal(plan.correctionContract.productionMutationReruns, 0);
assert.equal(plan.correctionContract.seoGeneratorWriteRuns, 0);
assert.equal(plan.correctionContract.scorePasses, 0);
assert.equal(plan.isolatedPreparationPreview.proposedOutputs.length, 2);
assert.ok(plan.isolatedPreparationPreview.changedJsonLeafCount > 0);
assert.equal(plan.authorization.correctionExecution, false);
assert.equal(plan.authorization.modelExecution, false);
assert.equal(plan.authorization.paidServiceUse, false);
assert.equal(plan.protectedProduction.generatedOutputs.length, 380);
for (const lock of [...plan.dependentInputs, ...plan.preparationTools, plan.diagnosis]) {
  assert.equal(sha256(await readFile(lock.path)), lock.sha256, lock.path);
}
assert.equal(analysis.status, "batch-04-dependent-pilot-analysis-correction-plan-freeze-passed");
assert.equal(analysis.plan.sha256, sha256(serializedJson(plan)));
assert.equal(await exists(plan.outputPaths.activation), false);
assert.equal(await exists(plan.outputPaths.execution), false);
console.log(serializedJson({ status: "passed", proposedWrites: 2, completeRepositoryValidationRuns: 0 }));
