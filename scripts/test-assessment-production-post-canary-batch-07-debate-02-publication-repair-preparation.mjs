#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_FIELD,
  POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_PROTOCOL_ID,
  POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_ROOT,
  buildDebate02PublicationRepairSchema } from
  "./lib/assessment-production-post-canary-batch-07-debate-02-publication-repair.mjs";
import { canonicalJson } from "./lib/v4-lean-production.mjs";
const MANIFEST = `${POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_ROOT}/execution-preparation-manifest.json`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
if (!(await exists(MANIFEST))) {
  console.log(JSON.stringify({ status: "batch-07-debate-02-publication-repair-test-ready" }));
  process.exit(0);
}
const manifest = JSON.parse(await readFile(path.resolve(MANIFEST), "utf8"));
assert.equal(manifest.protocolId, POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_PROTOCOL_ID);
assert.equal(manifest.status,
  "frozen-one-context-batch-07-debate-02-publication-repair-prepared-not-activated");
assert.equal(manifest.context.debateNumber, "02");
assert.equal(manifest.context.writableFieldCount, 1);
assert.deepEqual(manifest.context.writableFields,
  [POST_CANARY_BATCH_07_DEBATE_02_PUBLICATION_REPAIR_FIELD]);
assert.equal(manifest.repairContract.maximumWritableFieldsPerPacket, 1);
assert.equal(manifest.repairContract.allOtherFieldsImmutable, true);
assert.equal(manifest.repairContract.modelAuthoredScoresMaximum, 0);
assert.deepEqual(manifest.model, { label: "5.6 Sol", slug: "gpt-5.6-sol",
  reasoningEffort: "low", authentication: "ChatGPT subscription" });
assert.equal(manifest.executionPolicy.attemptsPerContext, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutExtensionsMaximum, 0);
assert.deepEqual(manifest.executionPolicy.schedulerRamp, [1]);
const packetBytes = await readFile(path.resolve(manifest.context.packet));
const schemaBytes = await readFile(path.resolve(manifest.context.schema));
assert.equal(sha256(packetBytes), manifest.context.packetSha256);
assert.equal(sha256(schemaBytes), manifest.context.schemaSha256);
assert.equal(canonicalJson(JSON.parse(schemaBytes)),
  canonicalJson(buildDebate02PublicationRepairSchema(JSON.parse(packetBytes))));
for (const [file, digest] of Object.entries(manifest.sourceHashes))
  assert.equal(sha256(await readFile(path.resolve(file))), digest, `${file}: source hash mismatch`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes)
  assert.equal(await exists(future), false, `${future}: future output exists`);
console.log(JSON.stringify({ status: "batch-07-debate-02-publication-repair-test-passed",
  contexts: 1, writableFields: 1, debateNumber: "02",
  directIncrementalCostUsdMaximum: 0 }));
