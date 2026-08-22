#!/usr/bin/env node
import assert from "node:assert/strict"; import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises"; import path from "node:path";
import { POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_3_PROTOCOL_ID,
  POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_3_ROOT } from
  "./lib/assessment-production-post-canary-batch-05-publication-resumption-3.mjs";
const MANIFEST = `${POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_3_ROOT}/execution-preparation-manifest.json`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
if (!(await exists(MANIFEST))) { console.log(JSON.stringify({ status: "batch-05-resumption-3-test-ready" })); process.exit(0); }
const bytes = await readFile(path.resolve(MANIFEST)); const p = JSON.parse(bytes); const c = p.contexts[0];
assert.equal(p.protocolId, POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_3_PROTOCOL_ID);
assert.equal(p.contexts.length, 1); assert.equal(c.debateNumber, "59"); assert.equal(c.originalContextIndex, 9);
assert.equal(p.totals.acceptedMoves, 167); assert.equal(p.totals.cohortMoves, 187);
assert.equal(p.model.label, "5.6 Sol"); assert.equal(p.model.reasoningEffort, "low");
assert.equal(p.executionPolicy.attemptsPerContext, 1); assert.equal(p.executionPolicy.retriesMaximum, 0);
assert.equal(p.executionPolicy.timeoutExtensionsMaximum, 0); assert.ok(Object.values(p.stopRules).every(Boolean));
assert.equal(sha256(await readFile(path.resolve(c.packet))), c.packetSha256);
assert.equal(sha256(await readFile(path.resolve(c.schema))), c.schemaSha256);
console.log(JSON.stringify({ status: "batch-05-resumption-3-test-passed",
  manifestSha256: sha256(bytes), debate: "59", contexts: 1,
  cohortMoves: 187, directIncrementalCostUsdMaximum: 0 }, null, 2));
