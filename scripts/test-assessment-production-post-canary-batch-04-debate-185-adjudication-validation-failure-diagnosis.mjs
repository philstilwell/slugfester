#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const path =
  "docs/assessment-production/post-canary-continuation-v1/batch-04/dispute-only-adjudication/failure-recovery/debate-185-correction/diagnosis.json";
const diagnosis = JSON.parse(await readFile(path, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(
  diagnosis.status,
  "frozen-diagnosed-batch-04-debate-185-missing-required-importance-choice"
);
assert.equal(diagnosis.preservedFailure.moveId, "con-reasons-without-desert-freedom");
assert.equal(diagnosis.preservedFailure.field, "importancePairChoice");
assert.equal(diagnosis.preservedFailure.returnedValue, null);
assert.deepEqual(diagnosis.preservedFailure.requiredValues, [1, 2]);
assert.equal(diagnosis.preservedFailure.invalidOutputReusable, false);
assert.equal(diagnosis.deterministicDiagnosisOverlay.persistentMutation, false);
assert.equal(diagnosis.deterministicDiagnosisOverlay.placeholderEntries, 1);
assert.equal(diagnosis.deterministicDiagnosisOverlay.validationAfterOverlay, "passed");
assert.equal(diagnosis.deterministicDiagnosisOverlay.candidateSelectionsAfterOverlay, 60);
assert.equal(diagnosis.deterministicDiagnosisOverlay.additionalValidationDefectsExposed, 0);
assert.equal(diagnosis.deterministicDiagnosisOverlay.overlayDecisionAccepted, false);
assert.equal(diagnosis.boundedCorrection.contexts, 1);
assert.equal(diagnosis.boundedCorrection.disputedMoves, 18);
assert.equal(diagnosis.boundedCorrection.candidateSelections, 60);
assert.equal(diagnosis.boundedCorrection.failedPartialOutputReusable, false);
assert.equal(diagnosis.authorization.correctionModelExecution, false);
assert.equal(diagnosis.directIncrementalCostUsd, 0);
for (const [file, digest] of Object.entries(diagnosis.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `source drift: ${file}`);
}
console.log(
  JSON.stringify(
    {
      status: "passed",
      debateNumber: "185",
      failedField: diagnosis.preservedFailure.field,
      correctionContexts: 1,
      candidateSelections: 60,
      failedPartialOutputReusable: false,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
