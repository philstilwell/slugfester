#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const diagnosisPath =
  "docs/assessment-production/score-stability-v2.1.3-validation-cohort/score-pass/failure-diagnosis.json";
const diagnosis = JSON.parse(await readFile(diagnosisPath, "utf8"));
assert.equal(
  diagnosis.status,
  "confirmed-single-agreed-initial-tie-drift-failure"
);
for (const [file, expected] of Object.entries(diagnosis.sourceHashes)) {
  const actual = createHash("sha256")
    .update(await readFile(file))
    .digest("hex");
  assert.equal(actual, expected, `${file}: diagnosis source hash mismatch`);
}
assert.deepEqual(diagnosis.gateIsolation.failedDebates, ["172"]);
assert(
  Object.values(diagnosis.gateIsolation.numericThresholdsPassed).every(Boolean)
);
assert.equal(diagnosis.debate172.initial.passA.proRoundedScore, 79);
assert.equal(diagnosis.debate172.initial.passA.conRoundedScore, 79);
assert.equal(diagnosis.debate172.initial.passB.proRoundedScore, 82);
assert.equal(diagnosis.debate172.initial.passB.conRoundedScore, 82);
assert.equal(diagnosis.debate172.final.conMinusProAdjustedTotal, 1.02);
assert.equal(diagnosis.debate172.final.proRoundedScore, 79);
assert.equal(diagnosis.debate172.final.conRoundedScore, 80);
assert.equal(diagnosis.debate172.final.winner, "con");
assert.equal(diagnosis.diagnosis.compilerDefectDetected, false);
assert.equal(diagnosis.diagnosis.agreedInitialTieDriftDetected, true);
assert.equal(diagnosis.controlCorrection.analysisAuthorizationDefectDetected, true);
assert.equal(diagnosis.controlCorrection.frozenValue, true);
assert.equal(diagnosis.controlCorrection.effectiveValue, false);
assert.equal(diagnosis.controlCorrection.downstreamActionOccurred, false);
assert.equal(diagnosis.decision.automaticRerunAuthorized, false);
assert.equal(diagnosis.decision.readinessDecisionAuthorized, false);
assert.equal(diagnosis.decision.policyPromotionAuthorized, false);
assert.equal(diagnosis.decision.publicationPacketPreparationAuthorized, false);
assert.equal(diagnosis.decision.productionMutationAuthorized, false);
console.log(
  JSON.stringify(
    {
      status: "passed",
      failedDebate: "172",
      agreedInitialTiesVerified: true,
      finalConAdvantage: 1.02,
      sourceHashesVerified: Object.keys(diagnosis.sourceHashes).length,
      rerunAuthorized: false,
      readinessDecisionAuthorized: false,
      policyPromotionAuthorized: false,
      publicationAuthorized: false,
    },
    null,
    2
  )
);
