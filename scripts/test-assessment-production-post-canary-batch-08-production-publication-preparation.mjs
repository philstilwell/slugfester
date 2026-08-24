#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_08_PRODUCTION_PUBLICATION_ORDER,
  POST_CANARY_BATCH_08_PRODUCTION_PUBLICATION_PROTOCOL_ID,
  POST_CANARY_BATCH_08_PRODUCTION_PUBLICATION_ROOT,
  extractProductionDebateRecords,
  inventoryDigest,
  serializedJson,
  sha256
} from "./lib/assessment-production-post-canary-batch-08-production-publication.mjs";

const resolve = (relativePath) => path.resolve(process.cwd(), relativePath);
const readBytes = (relativePath) => readFile(resolve(relativePath));
const readJson = (relativePath) => readFile(resolve(relativePath), "utf8").then(JSON.parse);
const exists = (relativePath) => access(resolve(relativePath)).then(() => true, () => false);
const manifestPath = `${POST_CANARY_BATCH_08_PRODUCTION_PUBLICATION_ROOT}/mutation-manifest.json`;
const analysisPath = `${POST_CANARY_BATCH_08_PRODUCTION_PUBLICATION_ROOT}/preparation-analysis.json`;
const [manifest, analysis] = await Promise.all([readJson(manifestPath), readJson(analysisPath)]);

assert.equal(manifest.protocolId, POST_CANARY_BATCH_08_PRODUCTION_PUBLICATION_PROTOCOL_ID);
assert.equal(manifest.status, "frozen-batch-08-production-publication-mutation-manifest-prepared");
assert.equal(manifest.productionCanary, false);
assert.equal(manifest.preparationOnly, true);
assert.equal(manifest.directIncrementalCostCapUsd, 0);
assert.deepEqual(manifest.explicitOrder, POST_CANARY_BATCH_08_PRODUCTION_PUBLICATION_ORDER);
assert.equal(manifest.invariants.assessmentModel, "5.6 Sol");
assert.equal(manifest.invariants.reasoningEffort, "low");
assert.equal(manifest.invariants.authentication, "ChatGPT subscription");
assert.equal(manifest.invariants.completedModelPassesWereIsolated, true);
assert.equal(manifest.invariants.scoreBlindnessPreserved, true);
assert.equal(manifest.invariants.roundedIntegerScoreTiesPermitted, true);
assert.equal(manifest.invariants.activeScoreStabilityPolicy, "v2.2");
assert.equal(manifest.invariants.scorePassesAlreadyCompleted, 1);
assert.equal(manifest.invariants.futureScorePassesAuthorized, 0);
assert.equal(manifest.productionBaseline.debates.debateCount, 195);
assert.equal(manifest.productionBaseline.existingProductionLedgers.count, 81);
assert.equal(manifest.productionBaseline.batchProductionLedgersAbsent, 10);
assert.equal(manifest.debates.length, 10);
assert.equal(manifest.executionContract.mutationPasses, 1);
assert.equal(manifest.executionContract.retriesMaximum, 0);
assert.equal(manifest.executionContract.rerunsMaximum, 0);
assert.equal(manifest.executionContract.generatedDerivativeWrites, 0);
assert.equal(manifest.authorization.mutationManifestPreparation, true);
assert.equal(manifest.authorization.executionActivation, false);
assert.equal(manifest.authorization.productionMutation, false);
assert.equal(manifest.authorization.modelExecution, false);
assert.equal(manifest.authorization.paidServices, false);

const productionBytes = await readBytes(manifest.productionBaseline.debates.path);
assert.equal(sha256(productionBytes), manifest.productionBaseline.debates.sha256);
const records = extractProductionDebateRecords(productionBytes.toString("utf8"));
const byNumber = new Map(records.map((record) => [record.number, record]));
for (const debate of manifest.debates) {
  const record = byNumber.get(debate.debateNumber);
  assert.equal(record.id, debate.debateId);
  assert.equal(record.index, debate.productionRecordIndex);
  assert.equal(sha256(record.text), debate.currentProductionRecordSha256);
  assert.equal(await exists(debate.productionLedgerPath), false);
  for (const lock of [debate.candidate, debate.stagedLedger, debate.compatibilityPacket]) {
    assert.equal(sha256(await readBytes(lock.path)), lock.sha256, lock.path);
  }
}
for (const lock of [
  manifest.validator,
  manifest.productionBaseline.references,
  manifest.compatibilityAcceptance.analysis,
  manifest.compatibilityAcceptance.execution,
  manifest.compatibilityAcceptance.activation,
  manifest.compatibilityAcceptance.preparation,
  manifest.scorePolicy.promotion,
  manifest.scorePolicy.activeControl,
  manifest.scorePolicy.activeControlTest,
  manifest.standingAuthorization,
  ...manifest.preparationTools
]) {
  assert.equal(sha256(await readBytes(lock.path)), lock.sha256, lock.path);
}
assert.equal(
  inventoryDigest(manifest.productionBaseline.existingProductionLedgers.files),
  manifest.productionBaseline.existingProductionLedgers.inventorySha256
);
assert.equal(analysis.status, "batch-08-production-publication-mutation-manifest-freeze-passed");
assert.equal(analysis.manifest.sha256, sha256(serializedJson(manifest)));
assert.equal(analysis.checks.productionMutationPerformed, false);
assert.equal(await exists(`${POST_CANARY_BATCH_08_PRODUCTION_PUBLICATION_ROOT}/execution-activation.json`), false);
assert.equal(await exists(`${POST_CANARY_BATCH_08_PRODUCTION_PUBLICATION_ROOT}/execution.json`), false);

console.log(serializedJson({ status: "passed", debates: manifest.debates.length, lockedProductionRecords: 10, productionMutationPerformed: false }));
