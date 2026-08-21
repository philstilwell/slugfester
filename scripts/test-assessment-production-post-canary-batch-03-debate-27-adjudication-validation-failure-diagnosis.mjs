#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
const file = "docs/assessment-production/post-canary-continuation-v1/batch-03/dispute-only-adjudication/failure-recovery/debate-27-correction/diagnosis.json";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const record = JSON.parse(await readFile(file));
assert.equal(record.status,
  "frozen-diagnosed-batch-03-debate-27-missing-burden-adjustment-decisions");
assert.equal(record.preservedFailure.moveDecisionsReturned, 19);
assert.equal(record.preservedFailure.burdenAdjustmentDecisionsReturned, 0);
assert.equal(record.preservedFailure.burdenAdjustmentDecisionsRequired, 2);
assert.equal(record.preservedFailure.invalidOutputReusable, false);
assert.equal(record.deterministicDiagnosisOverlay.additionalValidationDefectsExposed, 0);
assert.equal(record.boundedCorrection.contexts, 1);
assert.equal(record.boundedCorrection.candidateSelections, 70);
assert.equal(record.boundedCorrection.attempts, 1);
for (const [source, digest] of Object.entries(record.sourceHashes))
  assert.equal(sha256(await readFile(source)), digest, `source drift: ${source}`);
console.log(JSON.stringify({ status: "passed-batch-03-debate-27-validation-failure-diagnosis",
  correctionContexts: 1, candidateSelections: 70,
  directIncrementalCostUsd: 0 }, null, 2));
