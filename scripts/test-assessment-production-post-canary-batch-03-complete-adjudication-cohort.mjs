#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
const file = "docs/assessment-production/post-canary-continuation-v1/batch-03/dispute-only-adjudication/failure-recovery/cohort-analysis.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const record = JSON.parse(await readFile(file));
assert.equal(record.gate.passed, true);
assert.equal(record.gate.debateOutputsAccepted, 10);
assert.equal(record.gate.correctedDebates, 2);
assert.equal(record.gate.disputedMovesDecided, 190);
assert.equal(record.gate.candidateSelections, 586);
assert.equal(record.gate.calculatedScores, 0);
assert.equal(record.gate.retries, 0);
assert.equal(record.correctionAccounting.secondFailuresOfCorrectedContexts, 0);
assert.equal(record.correctionAccounting.debate124.failedPartialOutputReused, false);
assert.equal(record.correctionAccounting.debate27.failedPartialOutputReused, false);
for (const [source, digest] of Object.entries(record.sourceHashes))
  assert.equal(sha256(await readFile(source)), digest, `source drift: ${source}`);
console.log(JSON.stringify({ status: "passed-complete-batch-03-adjudication-cohort",
  debateOutputsAccepted: 10, disputedMoves: 190, candidateSelections: 586,
  retries: 0, scoresDerived: 0, directIncrementalCostUsd: 0 }, null, 2));
