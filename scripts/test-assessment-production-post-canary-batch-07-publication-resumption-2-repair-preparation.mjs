#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_07_RESUMPTION_2_REPAIR_PROTOCOL_ID,
  POST_CANARY_BATCH_07_RESUMPTION_2_REPAIR_ROOT, buildResumption2RepairSchema } from
  "./lib/assessment-production-post-canary-batch-07-publication-resumption-2-repair.mjs";
import { canonicalJson } from "./lib/v4-lean-production.mjs";
const MANIFEST = `${POST_CANARY_BATCH_07_RESUMPTION_2_REPAIR_ROOT}/execution-preparation-manifest.json`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
if (!(await exists(MANIFEST))) {
  console.log(JSON.stringify({ status: "batch-07-publication-resumption-2-repair-test-ready" }));
  process.exit(0);
}
const manifest = JSON.parse(await readFile(path.resolve(MANIFEST), "utf8"));
assert.equal(manifest.protocolId, POST_CANARY_BATCH_07_RESUMPTION_2_REPAIR_PROTOCOL_ID);
assert.equal(manifest.status,
  "frozen-twelve-context-batch-07-publication-resumption-2-repair-prepared-not-activated");
assert.equal(manifest.contexts.length, 12);
assert.deepEqual(manifest.contexts.map((row) => row.debateNumber),
  ["100", "100", "100", "100", "78", "78", "78", "78", "78", "78", "78", "78"]);
assert.deepEqual(manifest.contexts.map((row) => row.writableFieldCount),
  [2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 1]);
assert.equal(new Set(manifest.contexts.flatMap((row) => row.writableFields)).size, 22);
assert.deepEqual(manifest.executionPolicy.schedulerRamp, [1, 2]);
assert.deepEqual(manifest.executionPolicy.rampPhases.map((row) => row.contextIndexes),
  [[0], [1, 2], [3, 4, 5, 6, 7, 8, 9, 10, 11]]);
assert.equal(manifest.executionPolicy.attemptsPerContext, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(manifest.repairContract.maximumWritableFieldsPerPacket, 2);
assert.equal(manifest.repairContract.completeRejectedOutputsImmutableMergeBasesOnly, true);
assert.equal(manifest.repairContract.modelAuthoredScoresMaximum, 0);
assert.deepEqual(manifest.model, { label: "5.6 Sol", slug: "gpt-5.6-sol",
  reasoningEffort: "low", authentication: "ChatGPT subscription" });
for (const context of manifest.contexts) {
  const packetBytes = await readFile(path.resolve(context.packet));
  const schemaBytes = await readFile(path.resolve(context.schema));
  assert.equal(sha256(packetBytes), context.packetSha256);
  assert.equal(sha256(schemaBytes), context.schemaSha256);
  assert.equal(manifest.sourceHashes[context.packet], context.packetSha256);
  assert.equal(manifest.sourceHashes[context.schema], context.schemaSha256);
  assert.equal(canonicalJson(JSON.parse(schemaBytes)),
    canonicalJson(buildResumption2RepairSchema(JSON.parse(packetBytes))));
  assert.ok(context.writableFieldCount >= 1 && context.writableFieldCount <= 2);
}
for (const [file, digest] of Object.entries(manifest.sourceHashes))
  assert.equal(sha256(await readFile(path.resolve(file))), digest, `${file}: source hash mismatch`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes)
  assert.equal(await exists(future), false, `${future}: future output already exists`);
console.log(JSON.stringify({ status: "batch-07-publication-resumption-2-repair-test-passed",
  contexts: 12, writableFields: 22, debate100Packets: 4, debate78Packets: 8,
  directIncrementalCostUsdMaximum: 0 }));
