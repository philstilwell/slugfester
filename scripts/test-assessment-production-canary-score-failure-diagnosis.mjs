#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const path =
  "docs/assessment-production/canary-v1-score-pass/failure-diagnosis.json";
const diagnosis = JSON.parse(await readFile(path, "utf8"));
assert.equal(
  diagnosis.status,
  "confirmed-single-rounding-edge-winner-preservation-failure"
);
for (const [file, expected] of Object.entries(diagnosis.sourceHashes)) {
  const actual = createHash("sha256")
    .update(await readFile(file))
    .digest("hex");
  assert.equal(actual, expected, `${file}: diagnosis source hash mismatch`);
}
assert.deepEqual(diagnosis.gateIsolation.failedDebates, ["64"]);
assert(
  Object.values(diagnosis.gateIsolation.numericThresholdsPassed).every(Boolean)
);
assert.equal(diagnosis.debate64.final.conMinusProWeightedMean, 0.08);
assert.equal(diagnosis.debate64.final.proRoundedScore, 82);
assert.equal(diagnosis.debate64.final.conRoundedScore, 82);
assert.equal(diagnosis.debate64.final.winner, "tie");
assert.equal(diagnosis.diagnosis.compilerDefectDetected, false);
assert.equal(diagnosis.diagnosis.roundedWinnerClassCollapseDetected, true);
assert.equal(diagnosis.decision.automaticRerunAuthorized, false);
assert.equal(diagnosis.decision.publicationPacketPreparationAuthorized, false);
assert.equal(diagnosis.decision.productionMutationAuthorized, false);
console.log(
  JSON.stringify(
    {
      status: "passed",
      failedDebate: "64",
      roundedTieVerified: true,
      unroundedConAdvantage: 0.08,
      sourceHashesVerified: Object.keys(diagnosis.sourceHashes).length,
      rerunAuthorized: false,
      publicationAuthorized: false,
    },
    null,
    2
  )
);
