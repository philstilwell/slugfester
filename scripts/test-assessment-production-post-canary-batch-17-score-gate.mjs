#!/usr/bin/env node

import assert from "node:assert/strict";

import {
  POST_CANARY_BATCH_17_SCORE_STABILITY_THRESHOLDS,
  evaluatePostCanaryBatch17ScoreStability
} from "./lib/assessment-production-post-canary-batch-17-score-gate.mjs";

const scores = (pro, con, proMean = pro, conMean = con) => ({
  overall: {
    pro: {
      score: pro,
      weightedSectionMean: proMean,
      burdenCompletionAdjustment: 0
    },
    con: {
      score: con,
      weightedSectionMean: conMean,
      burdenCompletionAdjustment: 0
    }
  },
  winner: pro === con ? "tie" : pro > con ? "pro" : "con"
});
const passing = [
  {
    debateNumber: "agreed-pro-to-rounded-tie",
    passA: scores(82, 80, 82.1, 80.2),
    passB: scores(83, 81, 83.1, 81.2),
    final: scores(82, 82, 82.2, 82.1)
  },
  {
    debateNumber: "agreed-con-preserved",
    passA: scores(79, 81, 79.1, 81.2),
    passB: scores(80, 82, 80.1, 82.2),
    final: scores(80, 82, 80.2, 82.1)
  },
  {
    debateNumber: "agreed-initial-tie-to-con",
    passA: scores(79, 79, 78.62, 79.07),
    passB: scores(82, 82, 81.72, 81.72),
    final: scores(79, 80, 79.4, 80.42)
  },
  {
    debateNumber: "disagreed-initial-winners",
    passA: scores(82, 80),
    passB: scores(79, 81),
    final: scores(81, 80)
  }
];
const accepted = evaluatePostCanaryBatch17ScoreStability(passing);
assert.equal(accepted.policyVersion, "v2.2");
assert.equal(accepted.acceptancePassed, true);
assert.deepEqual(accepted.winnerStability.allowedIntegerRoundedTieCollapses, [
  "agreed-pro-to-rounded-tie"
]);
assert.deepEqual(accepted.winnerStability.allowedAgreedInitialTieDrifts, [
  "agreed-initial-tie-to-con"
]);
const winnerMutation = structuredClone(passing);
winnerMutation[0].final = scores(79, 83);
assert.equal(
  evaluatePostCanaryBatch17ScoreStability(winnerMutation).acceptancePassed,
  false
);
const distanceMutation = structuredClone(passing);
distanceMutation[2].final = scores(95, 80);
assert.equal(
  evaluatePostCanaryBatch17ScoreStability(distanceMutation).acceptancePassed,
  false
);
assert.throws(() =>
  evaluatePostCanaryBatch17ScoreStability(passing, {
    ...POST_CANARY_BATCH_17_SCORE_STABILITY_THRESHOLDS,
    maximumOutsideInitialRangeMaximum: 4
  })
);
console.log(
  JSON.stringify(
    {
      status: "passed",
      activePolicy: accepted.policyVersion,
      prospectiveThresholdFixtureAccepted: true,
      everyIntegerRoundedTieCollapseAccepted: true,
      agreedInitialTieDirectionUnconstrained: true,
      disagreedInitialWinnerDirectionUnconstrained: true,
      unroundedDirectionRetainedAsDiagnosticOnly: true,
      publishedOppositeSideMutationRejected: true,
      distanceMutationRejected: true,
      thresholdMutationRejected: true,
      realScoresDerived: 0
    },
    null,
    2
  )
);
