#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import {
  POST_CANARY_BATCH_05_DEBATE_109_CORRECTION_2_PROTOCOL_ID,
  POST_CANARY_BATCH_05_DEBATE_109_CORRECTION_2_ROOT,
  buildDebate109Correction2Schema
} from "./lib/assessment-production-post-canary-batch-05-publication-resumption-recovery-correction-2.mjs";

const ROOT = POST_CANARY_BATCH_05_DEBATE_109_CORRECTION_2_ROOT;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
if (!(await exists(MANIFEST))) {
  console.log(JSON.stringify({ status: "batch-05-debate-109-correction-2-preparation-test-ready" }));
  process.exit(0);
}
const manifestBytes = await readFile(path.resolve(MANIFEST));
const manifest = JSON.parse(manifestBytes);
assert.equal(manifest.protocolId, POST_CANARY_BATCH_05_DEBATE_109_CORRECTION_2_PROTOCOL_ID);
assert.equal(manifest.contexts.length, 4);
assert.ok(manifest.contexts.every((row) => row.writableFieldCount === 2));
assert.equal(new Set(manifest.contexts.flatMap((row) => row.writableFields)).size, 8);
assert.equal(manifest.model.label, "5.6 Sol");
assert.equal(manifest.model.reasoningEffort, "low");
assert.equal(manifest.model.authentication, "ChatGPT subscription");
assert.deepEqual(manifest.executionPolicy.schedulerRamp, [1, 2]);
assert.equal(manifest.executionPolicy.attemptsPerContext, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(manifest.correctionContract.furtherRecursiveRecoveryMaximum, 0);
assert.ok(Object.values(manifest.stopRules).every(Boolean));
for (const context of manifest.contexts) {
  const [packetBytes, schemaBytes] = await Promise.all([
    readFile(path.resolve(context.packet)), readFile(path.resolve(context.schema))
  ]);
  assert.equal(sha256(packetBytes), context.packetSha256);
  assert.equal(sha256(schemaBytes), context.schemaSha256);
  assert.deepEqual(JSON.parse(schemaBytes), buildDebate109Correction2Schema(JSON.parse(packetBytes)));
}
console.log(JSON.stringify({ status: "batch-05-debate-109-correction-2-preparation-test-passed",
  manifestSha256: sha256(manifestBytes), contexts: 4, writableFields: 8,
  directIncrementalCostUsdMaximum: 0 }, null, 2));
