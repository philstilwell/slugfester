#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const selectionPath =
  "docs/assessment-production/score-stability-v2-validation-cohort/selection.json";
const selection = JSON.parse(await readFile(selectionPath, "utf8"));
assert.equal(
  selection.status,
  "fresh-disjoint-ten-debate-cohort-source-gate-passed"
);
assert.equal(selection.selected.length, 10);
assert(selection.selectionPolicy.eligibleCandidateCount >= 10);
assert(selection.selectionPolicy.calibrationObservedDebateNumbers.length > 5);
assert.equal(new Set(selection.selected.map((item) => item.debateNumber)).size, 10);
assert(
  selection.selected.every(
    (item) =>
      item.speakerCount === 2 &&
      !selection.selectionPolicy.observedDebateNumbers.includes(
        item.debateNumber
      ) &&
      Object.values(item.sourceGate).every(Boolean)
  )
);
for (const [file, expected] of Object.entries(selection.sourceHashes)) {
  const actual = createHash("sha256")
    .update(await readFile(file))
    .digest("hex");
  assert.equal(actual, expected, `${file}: cohort source hash mismatch`);
}
assert.equal(selection.totals.sourceGateFailures, 0);
assert.equal(selection.totals.modelContexts, 0);
assert.equal(selection.totals.paidTranscriptionCalls, 0);
assert.equal(selection.totals.scoresDerived, 0);
assert.equal(selection.authorization.freshValidationManifestPreparation, true);
assert.equal(selection.authorization.inventoryModelExecution, false);
assert.equal(selection.authorization.judgmentModelExecution, false);
assert.equal(selection.authorization.paidTranscription, false);
assert.equal(selection.authorization.productionMutation, false);
console.log(
  JSON.stringify(
    {
      status: "passed",
      selectedDebates: selection.selected.map((item) => item.debateNumber),
      sourceHashesVerified: Object.keys(selection.sourceHashes).length,
      durationHours: selection.totals.durationHours,
      modelContexts: 0,
      paidTranscriptionCalls: 0,
      nextAuthorized: "fresh-validation-manifest-preparation",
    },
    null,
    2
  )
);
