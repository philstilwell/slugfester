#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_08_PUBLICATION_RESUMPTION_3_DEBATES,
  POST_CANARY_BATCH_08_PUBLICATION_RESUMPTION_3_PROTOCOL_ID,
  POST_CANARY_BATCH_08_PUBLICATION_RESUMPTION_3_ROOT } from
  "./lib/assessment-production-post-canary-batch-08-publication-resumption-3.mjs";
const MANIFEST = `${POST_CANARY_BATCH_08_PUBLICATION_RESUMPTION_3_ROOT}/execution-preparation-manifest.json`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
if (!(await exists(MANIFEST))) {
  console.log(JSON.stringify({ status: "batch-08-publication-resumption-3-test-ready" }));
  process.exit(0);
}
const manifest = JSON.parse(await readFile(path.resolve(MANIFEST), "utf8"));
assert.equal(manifest.protocolId, POST_CANARY_BATCH_08_PUBLICATION_RESUMPTION_3_PROTOCOL_ID);
assert.equal(manifest.status,
  "frozen-one-untouched-post-canary-batch-08-publication-resumption-3-context-prepared-not-authorized");
assert.deepEqual(manifest.contexts.map((row) => row.debateNumber),
  [...POST_CANARY_BATCH_08_PUBLICATION_RESUMPTION_3_DEBATES]);
assert.deepEqual(manifest.contexts.map((row) => row.originalContextIndex), [9]);
assert.equal(manifest.contexts.reduce((sum, row) => sum + row.moves, 0), 19);
assert.equal(manifest.acceptedDebates.reduce((sum, row) => sum + row.moves, 0), 163);
assert.deepEqual(manifest.executionPolicy.schedulerRamp, [1]);
assert.deepEqual(manifest.executionPolicy.rampPhases.map((row) => row.contextIndexes),
  [[0]]);
assert.equal(manifest.executionPolicy.attemptsPerContext, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(manifest.executionPolicy.stopLaunchingAfterAnyFailure, true);
assert.deepEqual(manifest.model, { label: "5.6 Sol", slug: "gpt-5.6-sol",
  reasoningEffort: "low", authentication: "ChatGPT subscription" });
for (const [file, digest] of Object.entries(manifest.sourceHashes))
  assert.equal(sha256(await readFile(path.resolve(file))), digest, `${file}: source hash mismatch`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes)
  assert.equal(await exists(future), false, `${future}: future output already exists`);
console.log(JSON.stringify({ status: "batch-08-publication-resumption-3-test-passed",
  contexts: 1, debates: manifest.contexts.map((row) => row.debateNumber),
  cohortMoves: 182, directIncrementalCostUsdMaximum: 0 }));
