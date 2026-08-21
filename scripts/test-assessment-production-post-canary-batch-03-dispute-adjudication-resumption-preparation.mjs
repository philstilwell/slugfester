#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
const root = "docs/assessment-production/post-canary-continuation-v1/batch-03/dispute-only-adjudication/failure-recovery/resumption";
const manifest = JSON.parse(await readFile(`${root}/execution-preparation-manifest.json`));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assert.equal(manifest.status,
  "frozen-nine-post-canary-batch-03-dispute-only-adjudication-resumption-contexts-prepared");
assert.deepEqual(manifest.contexts.map((item) => item.debateNumber),
  ["14","58","150","157","102","09","181","138","27"]);
assert.equal(manifest.contexts.reduce((sum, item) => sum + item.disputedMoves, 0), 167);
assert.equal(manifest.contexts.reduce((sum, item) => sum + item.candidateSelections, 0), 519);
assert.equal(manifest.contexts.reduce((sum, item) => sum + item.audioTranscriptInputs.length, 0), 6);
assert.deepEqual(manifest.executionPolicy.schedulerRamp, [1,2]);
assert.equal(manifest.executionPolicy.attemptsPerContext, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.acceptedCorrection.candidateSelections, 67);
for (const [file, digest] of Object.entries(manifest.sourceHashes))
  assert.equal(sha256(await readFile(file)), digest, `source drift: ${file}`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes)
  await assert.rejects(access(future));
console.log(JSON.stringify({ status: "passed-batch-03-adjudication-resumption-preparation",
  contexts: 9, candidateSelections: 519, directIncrementalCostUsdMaximum: 0 }, null, 2));
