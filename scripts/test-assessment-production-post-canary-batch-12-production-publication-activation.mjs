#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_12_PRODUCTION_PUBLICATION_ORDER,
  POST_CANARY_BATCH_12_PRODUCTION_PUBLICATION_ROOT,
  buildProductionDebatesSource,
  inventoryDigest,
  sha256
} from "./lib/assessment-production-post-canary-batch-12-production-publication.mjs";

const resolve = (relativePath) => path.resolve(process.cwd(), relativePath);
const readBytes = (relativePath) => readFile(resolve(relativePath));
const readJson = (relativePath) => readFile(resolve(relativePath), "utf8").then(JSON.parse);
const exists = (relativePath) => access(resolve(relativePath)).then(() => true, () => false);
const manifestPath = `${POST_CANARY_BATCH_12_PRODUCTION_PUBLICATION_ROOT}/mutation-manifest.json`;
const activationPath = `${POST_CANARY_BATCH_12_PRODUCTION_PUBLICATION_ROOT}/execution-activation.json`;
const [manifest, activation] = await Promise.all([readJson(manifestPath), readJson(activationPath)]);

assert.equal(activation.status, "frozen-batch-12-production-publication-mutation-pass-activated");
assert.equal(activation.directIncrementalCostCapUsd, 0);
assert.deepEqual(activation.frozenOutput.changedDebateNumbers, POST_CANARY_BATCH_12_PRODUCTION_PUBLICATION_ORDER);
assert.equal(activation.frozenOutput.productionLedgerOutputs.length, 10);
assert.equal(activation.executionDiscipline.attempts, 1);
assert.equal(activation.executionDiscipline.retries, 0);
assert.equal(activation.executionDiscipline.reruns, 0);
assert.equal(activation.executionDiscipline.automaticRepairs, 0);
assert.equal(activation.executionDiscipline.rollbacks, 0);
assert.equal(activation.executionDiscipline.scorePasses, 0);
assert.equal(activation.executionDiscipline.models, 0);
assert.equal(activation.executionDiscipline.paidServices, 0);
assert.equal(activation.executionDiscipline.generatedDerivativeWrites, 0);
assert.equal(activation.authorization.productionLedgerPublication, true);
assert.equal(activation.authorization.productionMutation, true);
assert.equal(activation.authorization.referenceRewrite, false);
assert.equal(activation.authorization.validatorRewrite, false);
assert.equal(activation.authorization.generatedDerivativeMutation, false);
assert.equal(activation.authorization.modelExecution, false);
assert.equal(activation.authorization.paidServices, false);

assert.equal(sha256(await readBytes(manifestPath)), activation.manifest.sha256);
for (const lock of activation.executionTools) {
  assert.equal(sha256(await readBytes(lock.path)), lock.sha256, lock.path);
}
assert.equal(
  inventoryDigest(manifest.productionBaseline.existingProductionLedgers.files),
  manifest.productionBaseline.existingProductionLedgers.inventorySha256
);
const baselineBytes = await readBytes(manifest.productionBaseline.debates.path);
assert.equal(sha256(baselineBytes), manifest.productionBaseline.debates.sha256);
const replacements = [];
for (const debate of manifest.debates) {
  assert.equal(
    await exists(debate.productionLedgerPath),
    debate.productionLedgerBaseline.exists
  );
  if (debate.productionLedgerBaseline.exists) {
    assert.equal(
      sha256(await readBytes(debate.productionLedgerPath)),
      debate.productionLedgerBaseline.sha256
    );
  }
  const candidateBytes = await readBytes(debate.candidate.path);
  replacements.push({ ...debate, candidate: JSON.parse(candidateBytes) });
}
const proposed = buildProductionDebatesSource({ baselineSource: baselineBytes.toString("utf8"), replacements });
assert.equal(sha256(proposed), activation.frozenOutput.proposedSha256);
assert.equal(Buffer.byteLength(proposed), activation.frozenOutput.proposedBytes);
assert.equal(await exists(activation.outputPaths.execution), false);
assert.equal(await exists(activation.outputPaths.analysis), false);

console.log(JSON.stringify({ status: "passed", activatedMutationPasses: 1, exactProductionWrites: 12 }, null, 2));
