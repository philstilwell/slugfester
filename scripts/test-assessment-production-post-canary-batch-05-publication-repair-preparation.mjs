#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_05_DEBATE_64_REPAIR_FIELDS,
  POST_CANARY_BATCH_05_DEBATE_64_REPAIR_PROTOCOL_ID,
  POST_CANARY_BATCH_05_DEBATE_64_REPAIR_ROOT,
  buildDebate64RepairSchema
} from "./lib/assessment-production-post-canary-batch-05-publication-repair.mjs";

const ROOT = POST_CANARY_BATCH_05_DEBATE_64_REPAIR_ROOT;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
if (!(await exists(MANIFEST))) {
  console.log(JSON.stringify({ status: "batch-05-debate-64-publication-repair-preparation-test-ready" }));
  process.exit(0);
}
const manifestBytes = await readFile(path.resolve(MANIFEST));
const manifest = JSON.parse(manifestBytes);
assert.equal(manifest.protocolId, POST_CANARY_BATCH_05_DEBATE_64_REPAIR_PROTOCOL_ID);
assert.equal(manifest.contexts.length, 1);
assert.equal(manifest.contexts[0].writableFieldCount, 2);
assert.deepEqual(manifest.contexts[0].writableFields, POST_CANARY_BATCH_05_DEBATE_64_REPAIR_FIELDS);
assert.equal(manifest.model.label, "5.6 Sol");
assert.equal(manifest.model.reasoningEffort, "low");
assert.equal(manifest.model.authentication, "ChatGPT subscription");
assert.equal(manifest.executionPolicy.attemptsPerContext, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(manifest.executionPolicy.recursiveCorrectionContextsMaximum, 0);
assert.equal(manifest.executionPolicy.directIncrementalCostUsdMaximum, 0);
assert.ok(Object.values(manifest.stopRules).every(Boolean));
const context = manifest.contexts[0];
const [packetBytes, schemaBytes] = await Promise.all([
  readFile(path.resolve(context.packet)), readFile(path.resolve(context.schema))
]);
assert.equal(sha256(packetBytes), context.packetSha256);
assert.equal(sha256(schemaBytes), context.schemaSha256);
const packet = JSON.parse(packetBytes);
assert.deepEqual(JSON.parse(schemaBytes), buildDebate64RepairSchema(packet));
assert.equal(packet.corrections.length, 2);
assert.deepEqual(packet.constraints.writableFields, POST_CANARY_BATCH_05_DEBATE_64_REPAIR_FIELDS);
console.log(JSON.stringify({
  status: "batch-05-debate-64-publication-repair-preparation-test-passed",
  manifestSha256: sha256(manifestBytes), contexts: 1, writableFields: 2,
  directIncrementalCostUsdMaximum: 0
}, null, 2));
