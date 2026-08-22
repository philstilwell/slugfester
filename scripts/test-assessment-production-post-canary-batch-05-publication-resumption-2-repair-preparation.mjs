#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_05_DEBATE_42_REPAIR_PROTOCOL_ID,
  POST_CANARY_BATCH_05_DEBATE_42_REPAIR_ROOT, buildDebate42RepairSchema } from
  "./lib/assessment-production-post-canary-batch-05-publication-resumption-2-repair.mjs";
const MANIFEST = `${POST_CANARY_BATCH_05_DEBATE_42_REPAIR_ROOT}/execution-preparation-manifest.json`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
if (!(await exists(MANIFEST))) { console.log(JSON.stringify({ status: "batch-05-debate-42-repair-test-ready" })); process.exit(0); }
const bytes = await readFile(path.resolve(MANIFEST)); const manifest = JSON.parse(bytes);
assert.equal(manifest.protocolId, POST_CANARY_BATCH_05_DEBATE_42_REPAIR_PROTOCOL_ID);
assert.equal(manifest.contexts.length, 2); assert.ok(manifest.contexts.every((row) => row.writableFieldCount === 2));
assert.equal(new Set(manifest.contexts.flatMap((row) => row.writableFields)).size, 4);
assert.equal(manifest.model.label, "5.6 Sol"); assert.equal(manifest.model.reasoningEffort, "low");
assert.equal(manifest.executionPolicy.attemptsPerContext, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(manifest.repairContract.recursiveRecoveryMaximum, 0);
assert.ok(Object.values(manifest.stopRules).every(Boolean));
for (const context of manifest.contexts) { const packetBytes = await readFile(path.resolve(context.packet));
  const schemaBytes = await readFile(path.resolve(context.schema));
  assert.equal(sha256(packetBytes), context.packetSha256); assert.equal(sha256(schemaBytes), context.schemaSha256);
  assert.deepEqual(JSON.parse(schemaBytes), buildDebate42RepairSchema(JSON.parse(packetBytes))); }
console.log(JSON.stringify({ status: "batch-05-debate-42-repair-test-passed",
  manifestSha256: sha256(bytes), contexts: 2, writableFields: 4,
  directIncrementalCostUsdMaximum: 0 }, null, 2));
