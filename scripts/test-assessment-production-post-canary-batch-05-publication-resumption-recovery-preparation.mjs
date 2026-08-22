#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_RECOVERY_PROTOCOL_ID,
  POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_RECOVERY_ROOT,
  buildDebate109ShardSchema,
  buildDebate189RepairSchema
} from "./lib/assessment-production-post-canary-batch-05-publication-resumption-recovery.mjs";

const ROOT = POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_RECOVERY_ROOT;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
if (!(await exists(MANIFEST))) {
  console.log(JSON.stringify({ status: "batch-05-publication-resumption-recovery-preparation-test-ready" }));
  process.exit(0);
}
const manifestBytes = await readFile(path.resolve(MANIFEST));
const manifest = JSON.parse(manifestBytes);
assert.equal(manifest.protocolId, POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_RECOVERY_PROTOCOL_ID);
assert.equal(manifest.contexts.length, 6);
assert.deepEqual(manifest.contexts.map((row) => row.contextIndex), [0, 1, 2, 3, 4, 5]);
assert.deepEqual(manifest.contexts.map((row) => row.debateNumber),
  ["189", "189", "189", "189", "109", "109"]);
assert.ok(manifest.contexts.slice(0, 4).every((row) => row.writableFieldCount === 2));
assert.ok(manifest.contexts.slice(4).every((row) => row.writableFieldCount === 13));
assert.equal(new Set(manifest.contexts.slice(0, 4).flatMap((row) => row.writableFields)).size, 8);
assert.equal(new Set(manifest.contexts.slice(4).flatMap((row) => row.writableFields)).size, 26);
assert.equal(manifest.model.label, "5.6 Sol");
assert.equal(manifest.model.slug, "gpt-5.6-sol");
assert.equal(manifest.model.reasoningEffort, "low");
assert.equal(manifest.model.authentication, "ChatGPT subscription");
assert.deepEqual(manifest.executionPolicy.schedulerRamp, [1, 2]);
assert.equal(manifest.executionPolicy.attemptsPerContext, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(manifest.executionPolicy.recursiveCorrectionContextsMaximum, 0);
assert.equal(manifest.executionPolicy.directIncrementalCostUsdMaximum, 0);
assert.ok(Object.values(manifest.stopRules).every(Boolean));
for (const context of manifest.contexts) {
  const [packetBytes, schemaBytes] = await Promise.all([
    readFile(path.resolve(context.packet)), readFile(path.resolve(context.schema))
  ]);
  assert.equal(sha256(packetBytes), context.packetSha256);
  assert.equal(sha256(schemaBytes), context.schemaSha256);
  const packet = JSON.parse(packetBytes);
  const expectedSchema = context.debateNumber === "189"
    ? buildDebate189RepairSchema(packet)
    : buildDebate109ShardSchema(packet);
  assert.deepEqual(JSON.parse(schemaBytes), expectedSchema);
}
console.log(JSON.stringify({
  status: "batch-05-publication-resumption-recovery-preparation-test-passed",
  manifestSha256: sha256(manifestBytes), contexts: 6,
  debate189WritableFields: 8, debate109WritableFields: 26,
  directIncrementalCostUsdMaximum: 0
}, null, 2));
