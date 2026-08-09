#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const auditPath =
  "docs/assessment-production/score-stability-policy-v2-retrospective-audit.json";
const audit = JSON.parse(await readFile(auditPath, "utf8"));
assert.equal(
  audit.status,
  "retrospective-diagnostic-supports-v2-fresh-validation-still-required"
);
for (const [file, expected] of Object.entries(audit.sourceHashes)) {
  const actual = createHash("sha256")
    .update(await readFile(file))
    .digest("hex");
  assert.equal(actual, expected, `${file}: policy audit source hash mismatch`);
}
assert.equal(audit.aggregate.debatesObserved, 15);
assert.equal(audit.aggregate.v1PassingCohorts, 1);
assert.equal(audit.aggregate.proposedV2PassingCohorts, 2);
assert.deepEqual(audit.aggregate.allowedRoundedTieCollapses, ["64"]);
assert.deepEqual(audit.aggregate.oppositeSideReversals, []);
assert.equal(audit.resultIntegrity.scoresRecomputed, false);
assert.equal(audit.resultIntegrity.currentCanaryReclassified, false);
assert.equal(audit.authorization.freshDisjointCohortSelection, true);
assert.equal(audit.authorization.modelExecution, false);
assert.equal(audit.authorization.paidTranscription, false);
assert.equal(audit.authorization.scoreRerun, false);
assert.equal(audit.authorization.publicationPreparation, false);
assert.equal(audit.authorization.productionMutation, false);
console.log(
  JSON.stringify(
    {
      status: "passed",
      debatesObserved: 15,
      roundedTieCollapse: "64",
      currentCanaryReclassified: false,
      sourceHashesVerified: Object.keys(audit.sourceHashes).length,
      nextAuthorized: "fresh-disjoint-cohort-selection-only",
    },
    null,
    2
  )
);
