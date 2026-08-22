#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_2_DEBATES,
  POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_2_PROTOCOL_ID,
  POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_2_ROOT } from
  "./lib/assessment-production-post-canary-batch-05-publication-resumption-2.mjs";
const MANIFEST = `${POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_2_ROOT}/execution-preparation-manifest.json`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
if (!(await exists(MANIFEST))) { console.log(JSON.stringify({ status: "batch-05-publication-resumption-2-test-ready" })); process.exit(0); }
const bytes = await readFile(path.resolve(MANIFEST)); const manifest = JSON.parse(bytes);
assert.equal(manifest.protocolId, POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_2_PROTOCOL_ID);
assert.deepEqual(manifest.contexts.map((row) => row.debateNumber), POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_2_DEBATES);
assert.deepEqual(manifest.contexts.map((row) => row.originalContextIndex), [6, 7, 8, 9]);
assert.equal(manifest.contexts.length, 4); assert.equal(manifest.totals.resumptionMoves, 75);
assert.equal(manifest.totals.acceptedMoves, 112); assert.equal(manifest.totals.cohortMoves, 187);
assert.equal(manifest.model.label, "5.6 Sol"); assert.equal(manifest.model.reasoningEffort, "low");
assert.equal(manifest.model.authentication, "ChatGPT subscription");
assert.deepEqual(manifest.executionPolicy.schedulerRamp, [1, 2]);
assert.equal(manifest.executionPolicy.attemptsPerContext, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutExtensionsMaximum, 0);
assert.ok(Object.values(manifest.stopRules).every(Boolean));
for (const context of manifest.contexts) {
  assert.equal(sha256(await readFile(path.resolve(context.packet))), context.packetSha256);
  assert.equal(sha256(await readFile(path.resolve(context.schema))), context.schemaSha256);
}
console.log(JSON.stringify({ status: "batch-05-publication-resumption-2-test-passed",
  manifestSha256: sha256(bytes), debates: POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_2_DEBATES,
  contexts: 4, cohortMoves: 187, directIncrementalCostUsdMaximum: 0 }, null, 2));
