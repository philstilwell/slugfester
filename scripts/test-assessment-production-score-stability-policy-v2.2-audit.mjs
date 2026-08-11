#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const path =
  "docs/assessment-production/score-stability-policy-v2.2-retrospective-audit.json";
const audit = JSON.parse(await readFile(path, "utf8"));
assert.equal(
  audit.status,
  "retrospective-diagnostic-supports-v2.2-fresh-validation-still-required"
);
for (const [file, expected] of Object.entries(audit.sourceHashes)) {
  const actual = createHash("sha256")
    .update(await readFile(file))
    .digest("hex");
  assert.equal(actual, expected, `${file}: v2.2 audit source hash mismatch`);
}
assert.equal(audit.resultIntegrity.v213FailurePreserved, true);
assert.equal(audit.resultIntegrity.scoresRecomputed, false);
assert.equal(audit.retrospectiveCohort.numericPassed, true);
assert.equal(
  audit.retrospectiveCohort.proposedV22WinnerStabilityPassed,
  true
);
assert.deepEqual(
  audit.retrospectiveCohort.winnerStability.allowedAgreedInitialTieDrifts,
  ["172"]
);
assert.equal(audit.authorization.freshDisjointCohortSelection, true);
assert.equal(audit.authorization.scoreRerun, false);
assert.equal(audit.authorization.v213Reclassification, false);
assert.equal(audit.authorization.policyPromotion, false);
assert.equal(audit.authorization.productionMutation, false);
console.log(
  JSON.stringify(
    {
      status: "passed",
      v213FailurePreserved: true,
      retrospectiveTieDrift: "172",
      sourceHashesVerified: Object.keys(audit.sourceHashes).length,
      nextAuthorized: "fresh-disjoint-v2.2-cohort-selection-only",
    },
    null,
    2
  )
);
