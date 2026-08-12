#!/usr/bin/env node

import assert from "node:assert/strict";

import {
  ACTIVE_SCORE_STABILITY_POLICY_VERSION,
  ACTIVE_SCORE_STABILITY_THRESHOLDS,
  evaluateActiveProductionScoreStability,
} from "./lib/assessment-production-score-stability-policy-active.mjs";

const result = (winner, pro, con) => ({
  overall: {
    pro: { weightedSectionMean: pro, burdenCompletionAdjustment: 0 },
    con: { weightedSectionMean: con, burdenCompletionAdjustment: 0 },
  },
  winner,
});
const scored = (debateNumber, passA, passB, final) => ({
  debateNumber,
  passA,
  passB,
  final,
});
const passingDebates = [
  scored(
    "agreed-pro-to-rounded-tie",
    result("pro", 82.1, 80.2),
    result("pro", 83.1, 81.2),
    result("tie", 82.2, 82.1)
  ),
  scored(
    "agreed-con-preserved",
    result("con", 79.1, 81.2),
    result("con", 80.1, 82.2),
    result("con", 80.2, 82.1)
  ),
  scored(
    "agreed-initial-tie-to-con",
    result("tie", 78.62, 79.07),
    result("tie", 81.72, 81.72),
    result("con", 79.4, 80.42)
  ),
  scored(
    "disagreed-initial-winners",
    result("pro", 82.2, 80.1),
    result("con", 79.1, 81.2),
    result("pro", 81.1, 80.2)
  ),
];
const passingStability = {
  scoreBoundsPassed: true,
  meanAbsoluteDistanceToInitialPasses: 4,
  maximumAbsoluteDistanceToEitherInitialPass: 8,
  maximumOutsideInitialRange: 3,
  thresholds: structuredClone(ACTIVE_SCORE_STABILITY_THRESHOLDS),
};
const accepted = evaluateActiveProductionScoreStability(
  passingDebates,
  passingStability
);
assert.equal(accepted.policyVersion, "v2.2");
assert.equal(accepted.numericPassed, true);
assert.equal(accepted.winnerStability.passed, true);
assert.equal(accepted.acceptancePassed, true);
assert.deepEqual(accepted.winnerStability.allowedIntegerRoundedTieCollapses, [
  "agreed-pro-to-rounded-tie",
]);
assert.deepEqual(accepted.winnerStability.allowedAgreedInitialTieDrifts, [
  "agreed-initial-tie-to-con",
]);

const oppositeReversal = structuredClone(passingDebates);
oppositeReversal[0].final = result("con", 80.1, 82.2);
assert.equal(
  evaluateActiveProductionScoreStability(
    oppositeReversal,
    passingStability
  ).acceptancePassed,
  false
);

const numericFailure = {
  ...passingStability,
  meanAbsoluteDistanceToInitialPasses: 4.01,
};
assert.equal(
  evaluateActiveProductionScoreStability(
    passingDebates,
    numericFailure
  ).acceptancePassed,
  false
);

assert.throws(
  () =>
    evaluateActiveProductionScoreStability(passingDebates, {
      ...passingStability,
      thresholds: {
        ...passingStability.thresholds,
        maximumOutsideInitialRangeMaximum: 4,
      },
    }),
  /thresholds changed/
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      activePolicy: ACTIVE_SCORE_STABILITY_POLICY_VERSION,
      integerRoundedTieCollapseAllowed: true,
      agreedInitialTieDirectionUnconstrained: true,
      oppositeSideReversalRejected: true,
      unchangedNumericThresholdsEnforced: true,
      thresholdMutationRejected: true,
    },
    null,
    2
  )
);
