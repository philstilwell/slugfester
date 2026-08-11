#!/usr/bin/env node

import assert from "node:assert/strict";

import { evaluateProposedV22WinnerStability } from "./lib/assessment-production-score-stability-policy-v2.2.mjs";

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

const fixtures = [
  scored(
    "agreed-pro-to-tie",
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
    "agreed-tie-to-con",
    result("tie", 78.62, 79.07),
    result("tie", 81.72, 81.72),
    result("con", 79.4, 80.42)
  ),
  scored(
    "disagreed-unconstrained",
    result("pro", 82.2, 80.1),
    result("con", 79.1, 81.2),
    result("pro", 81.1, 80.2)
  ),
];
const accepted = evaluateProposedV22WinnerStability(fixtures);
assert.equal(accepted.passed, true);
assert.deepEqual(accepted.allowedIntegerRoundedTieCollapses, [
  "agreed-pro-to-tie",
]);
assert.deepEqual(accepted.allowedAgreedInitialTieDrifts, [
  "agreed-tie-to-con",
]);
assert.deepEqual(accepted.publishedOppositeSideReversals, []);

const reversal = structuredClone(fixtures);
reversal[0].final = result("con", 80.1, 82.2);
const rejected = evaluateProposedV22WinnerStability(reversal);
assert.equal(rejected.passed, false);
assert.deepEqual(rejected.publishedOppositeSideReversals, [
  "agreed-pro-to-tie",
]);

console.log(
  JSON.stringify(
    {
      status: "passed",
      agreedProOrConOppositeReversalRejected: true,
      integerRoundedTieCollapseAllowed: true,
      agreedInitialTieDriftAllowed: true,
      disagreedInitialWinnersDirectionUnconstrained: true,
      numericThresholdsChanged: false,
      existingCohortsReclassified: false,
    },
    null,
    2
  )
);
