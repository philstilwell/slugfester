#!/usr/bin/env node

import assert from "node:assert/strict";

import { evaluateProposedV21WinnerStability } from "./lib/assessment-production-score-stability-policy-v2.1.mjs";

const overall = (proMean, conMean, proScore, conScore) => ({
  pro: {
    weightedSectionMean: proMean,
    burdenCompletionAdjustment: 0,
    score: proScore,
  },
  con: {
    weightedSectionMean: conMean,
    burdenCompletionAdjustment: 0,
    score: conScore,
  },
});
const result = (winner, proMean, conMean, proScore, conScore) => ({
  overall: overall(proMean, conMean, proScore, conScore),
  winner,
});
const scored = (debateNumber, passA, passB, final) => ({
  debateNumber,
  passA,
  passB,
  final,
});

const canaryTie = scored(
  "64",
  result("con", 80.1, 80.7, 80, 81),
  result("con", 81.9, 82.5, 82, 83),
  result("tie", 81.54, 81.62, 82, 82)
);
const canaryResult = evaluateProposedV21WinnerStability([canaryTie]);
assert.equal(canaryResult.passed, true);
assert.deepEqual(canaryResult.allowedIntegerRoundedTieCollapses, ["64"]);
assert.deepEqual(canaryResult.publishedOppositeSideReversals, []);

const hiddenDirectionChange = structuredClone(canaryTie);
hiddenDirectionChange.debateNumber = "hidden-direction-change";
hiddenDirectionChange.final.overall.pro.weightedSectionMean = 81.63;
hiddenDirectionChange.final.overall.con.weightedSectionMean = 81.62;
const hiddenResult = evaluateProposedV21WinnerStability([
  hiddenDirectionChange,
]);
assert.equal(hiddenResult.passed, true);
assert.deepEqual(hiddenResult.allowedIntegerRoundedTieCollapses, [
  "hidden-direction-change",
]);
assert.deepEqual(hiddenResult.unroundedOppositeSideDirections, [
  "hidden-direction-change",
]);
assert.deepEqual(hiddenResult.publishedOppositeSideReversals, []);

const publishedReversal = scored(
  "published-reversal",
  result("pro", 82.1, 80.2, 82, 80),
  result("pro", 83.1, 81.2, 83, 81),
  result("con", 80.1, 82.1, 80, 82)
);
const publishedResult = evaluateProposedV21WinnerStability([
  publishedReversal,
]);
assert.equal(publishedResult.passed, false);
assert.deepEqual(publishedResult.publishedOppositeSideReversals, [
  "published-reversal",
]);

const initialTieDrift = scored(
  "initial-tie-drift",
  result("tie", 80.1, 80.2, 80, 80),
  result("tie", 81.1, 81.2, 81, 81),
  result("pro", 82.1, 81.2, 82, 81)
);
assert.equal(
  evaluateProposedV21WinnerStability([initialTieDrift]).passed,
  false
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      everyIntegerRoundedTieCollapseAllowed: true,
      unroundedDirectionRetainedAsDiagnosticOnly: true,
      publishedOppositeSideReversalRejected: true,
      agreedInitialTieDriftRejected: true,
      failedV1CanaryReclassified: false,
    },
    null,
    2
  )
);
