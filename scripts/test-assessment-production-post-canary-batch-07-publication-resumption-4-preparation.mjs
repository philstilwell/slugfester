#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_07_PUBLICATION_RESUMPTION_4_PROTOCOL_ID,
  POST_CANARY_BATCH_07_PUBLICATION_RESUMPTION_4_ROOT } from
  "./lib/assessment-production-post-canary-batch-07-publication-resumption-4.mjs";
const MANIFEST = `${POST_CANARY_BATCH_07_PUBLICATION_RESUMPTION_4_ROOT}/execution-preparation-manifest.json`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
if (!(await exists(MANIFEST))) {
  console.log(JSON.stringify({ status: "batch-07-publication-resumption-4-test-ready" }));
  process.exit(0);
}
const manifest = JSON.parse(await readFile(path.resolve(MANIFEST), "utf8"));
assert.equal(manifest.protocolId, POST_CANARY_BATCH_07_PUBLICATION_RESUMPTION_4_PROTOCOL_ID);
assert.equal(manifest.status,
  "frozen-two-untouched-post-canary-batch-07-publication-resumption-4-contexts-prepared-not-authorized");
assert.deepEqual(manifest.contexts.map((row) => row.debateNumber), ["182", "56"]);
assert.deepEqual(manifest.contexts.map((row) => row.originalContextIndex), [8, 9]);
assert.equal(manifest.contexts.reduce((sum, row) => sum + row.moves, 0), 39);
assert.equal(manifest.acceptedDebates.reduce((sum, row) => sum + row.validationSummary.moves, 0), 148);
assert.deepEqual(manifest.executionPolicy.schedulerRamp, [1, 2]);
assert.deepEqual(manifest.executionPolicy.rampPhases.map((row) => row.contextIndexes), [[0], [1]]);
assert.equal(manifest.executionPolicy.attemptsPerContext, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(manifest.executionPolicy.stopLaunchingAfterAnyFailure, true);
assert.deepEqual(manifest.model, { label: "5.6 Sol", slug: "gpt-5.6-sol",
  reasoningEffort: "low", authentication: "ChatGPT subscription" });
for (const [file, digest] of Object.entries(manifest.sourceHashes))
  assert.equal(sha256(await readFile(path.resolve(file))), digest, `${file}: source hash mismatch`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes)
  assert.equal(await exists(future), false, `${future}: future output exists`);
console.log(JSON.stringify({ status: "batch-07-publication-resumption-4-test-passed",
  contexts: 2, debates: ["182", "56"], cohortMoves: 187,
  directIncrementalCostUsdMaximum: 0 }));
