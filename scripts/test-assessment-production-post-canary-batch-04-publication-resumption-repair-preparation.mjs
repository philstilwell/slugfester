#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

import {
  POST_CANARY_BATCH_04_DEBATE_49_REPAIR_ROOT,
  buildDebate49RepairSchema
} from "./lib/assessment-production-post-canary-batch-04-publication-resumption-repair.mjs";
import {
  loadAndValidatePostCanaryBatch04StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-04-standing-authorization.mjs";

const MANIFEST = `${POST_CANARY_BATCH_04_DEBATE_49_REPAIR_ROOT}/execution-preparation-manifest.json`;
const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
assert.equal(manifest.status,
  "frozen-eleven-isolated-twenty-two-field-batch-04-debate-49-publication-resumption-repair-contexts-prepared-under-standing-authorization");
assert.equal(manifest.batchNumber, 4);
assert.deepEqual(manifest.model, { label: "5.6 Sol", slug: "gpt-5.6-sol",
  reasoningEffort: "low", authentication: "ChatGPT subscription" });
assert.equal(manifest.contexts.length, 11);
assert.deepEqual(manifest.contexts.map((context) => context.contextIndex),
  [0,1,2,3,4,5,6,7,8,9,10]);
assert(manifest.contexts.every((context) => context.writableFieldCount === 2));
assert.equal(new Set(manifest.contexts.flatMap((context) => context.writableFields)).size, 22);
assert.equal(manifest.executionPolicy.attemptsPerContext, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(manifest.executionPolicy.recursiveCorrectionContextsMaximum, 0);
assert.equal(manifest.executionPolicy.maximumParallelContexts, 2);
assert.deepEqual(manifest.executionPolicy.schedulerRamp, [1, 2]);
assert.deepEqual(manifest.executionPolicy.rampPhases.map((phase) => phase.contextIndexes),
  [[0], [1,2], [3,4,5,6,7,8,9,10]]);
assert.equal(manifest.authorization.executionActivationPreparation, true);
assert.equal(manifest.authorization.standingAuthorizationPermitsActivation, true);
for (const [key, value] of Object.entries(manifest.authorization)) {
  if (!["executionActivationPreparation", "standingAuthorizationPermitsActivation"].includes(key)) {
    assert.equal(value, false, `${key}: must remain unauthorized`);
  }
}
assert.equal(Object.values(manifest.stopRules).every(Boolean), true);
assert.equal(manifest.totals.contexts, 11);
assert.equal(manifest.totals.writableFields, 22);
assert.equal(manifest.totals.modelContextsExecuted, 0);
assert.equal(manifest.totals.directIncrementalCostUsd, 0);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source drift`);
}
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) {
  assert.equal(Object.hasOwn(manifest.sourceHashes, future), false);
  assert.equal(await exists(future), false, `${future}: future output exists`);
}
for (const context of manifest.contexts) {
  const [packetBytes, schemaBytes] = await Promise.all([
    readFile(context.packet), readFile(context.schema)
  ]);
  assert.equal(sha256(packetBytes), context.packetSha256);
  assert.equal(sha256(schemaBytes), context.schemaSha256);
  const packet = JSON.parse(packetBytes);
  assert.equal(packet.debateNumber, "49");
  assert.equal(packet.corrections.length, 2);
  assert.deepEqual(JSON.parse(schemaBytes), buildDebate49RepairSchema(packet));
  assert(packet.corrections.every((correction) => correction.originalWords > 130));
}
const standing = await loadAndValidatePostCanaryBatch04StandingAuthorization();
assert.equal(manifest.userAuthorization.standingAuthorizationSha256, standing.sha256);
console.log(JSON.stringify({ status: "passed", debateNumber: "49",
  repairContexts: 11, writableFields: 22, syntheticCompleteValidation: true,
  modelContextsExecuted: 0, paidServiceCalls: 0, directIncrementalCostUsd: 0 }, null, 2));
