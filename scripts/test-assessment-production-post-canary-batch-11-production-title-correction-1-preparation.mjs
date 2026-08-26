#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  BATCH_11_TITLE_CORRECTION_AFTER,
  BATCH_11_TITLE_CORRECTION_BEFORE,
  buildBatch11TitleCorrectedCompatibilityLibrary,
  buildBatch11TitleCorrectedProductionSource,
  sha256
} from "./lib/assessment-production-post-canary-batch-11-production-title-correction-1.mjs";

const resolve = (relativePath) => path.resolve(process.cwd(), relativePath);
const readBytes = (relativePath) => readFile(resolve(relativePath));
const readJson = (relativePath) => readFile(resolve(relativePath), "utf8").then(JSON.parse);
const exists = (relativePath) => access(resolve(relativePath)).then(() => true, () => false);
const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-11/production-publication/title-correction-1";
const preparation = await readJson(`${root}/preparation.json`);

assert.equal(
  preparation.status,
  "frozen-batch-11-production-title-correction-1-prepared"
);
assert.equal(preparation.batchNumber, 11);
assert.equal(preparation.directIncrementalCostCapUsd, 0);
assert.equal(preparation.diagnosedFailure.issueCount, 1);
assert.equal(preparation.correction.before, BATCH_11_TITLE_CORRECTION_BEFORE);
assert.equal(preparation.correction.after, BATCH_11_TITLE_CORRECTION_AFTER);
assert.equal(preparation.correction.beforeWords, 11);
assert.equal(preparation.correction.afterWords, 9);
assert.equal(preparation.correction.semanticFieldsChanged, 1);
assert.equal(preparation.correction.scoreChanges, 0);
assert.equal(preparation.correction.ledgerChanges, 0);
assert.equal(preparation.executionDiscipline.attempts, 1);
assert.equal(preparation.executionDiscipline.retries, 0);
assert.equal(preparation.executionDiscipline.exactWritableFiles.length, 2);
assert.equal(preparation.authorization.scoreChange, false);
assert.equal(preparation.authorization.ledgerChange, false);
assert.equal(preparation.authorization.modelExecution, false);
assert.equal(preparation.authorization.paidServices, false);

for (const lock of [
  preparation.inputs.mutationManifest,
  preparation.inputs.publicationActivation,
  preparation.inputs.compatibilityActivation,
  preparation.inputs.productionDebates,
  preparation.inputs.compatibilityLibrary,
  ...preparation.preparationTools
]) {
  assert.equal(sha256(await readBytes(lock.path)), lock.sha256, lock.path);
}
for (const lock of preparation.inputs.productionLedgerOutputs) {
  assert.equal(sha256(await readBytes(lock.path)), lock.sha256, lock.path);
}

const proposedDebates = buildBatch11TitleCorrectedProductionSource(
  (await readBytes(preparation.inputs.productionDebates.path)).toString("utf8")
);
assert.equal(
  sha256(proposedDebates),
  preparation.proposedOutputs.productionDebates.sha256
);
const proposedLibrary = buildBatch11TitleCorrectedCompatibilityLibrary(
  (await readBytes(preparation.inputs.compatibilityLibrary.path)).toString(
    "utf8"
  )
);
assert.equal(
  sha256(proposedLibrary),
  preparation.proposedOutputs.compatibilityLibrary.sha256
);
assert.equal(await exists(`${root}/execution-activation.json`), false);
assert.equal(await exists(`${root}/execution.json`), false);

console.log(
  JSON.stringify(
    {
      status: "passed",
      semanticFields: 1,
      writableFiles: 2,
      scoreChanges: 0,
      ledgerChanges: 0,
      productionMutationPerformed: false
    },
    null,
    2
  )
);
