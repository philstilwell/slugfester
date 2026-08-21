#!/usr/bin/env node

import assert from "node:assert/strict";

import {
  POST_CANARY_BATCH_03_SCORE_STABILITY_THRESHOLDS,
  evaluatePostCanaryBatch03ScoreStability
} from "./lib/assessment-production-post-canary-batch-03-score-gate.mjs";

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
  },
  {
    debateNumber: "fixture-5",
    passA: scores(88, 84),
    passB: scores(86, 83),
    final: scores(87, 84)
  },
  {
    debateNumber: "fixture-6",
    passA: scores(68, 72),
    passB: scores(69, 73),
    final: scores(69, 72)
  },
  {
    debateNumber: "fixture-7",
    passA: scores(81, 79),
    passB: scores(82, 78),
    final: scores(82, 79)
  },
  {
    debateNumber: "fixture-8",
    passA: scores(76, 76),
    passB: scores(77, 75),
    final: scores(76, 75)
  },
  {
    debateNumber: "fixture-9",
    passA: scores(90, 87),
    passB: scores(88, 86),
    final: scores(89, 87)
  },
  {
    debateNumber: "fixture-10",
    passA: scores(70, 74),
    passB: scores(71, 75),
    final: scores(71, 74)
  }
];
const accepted = evaluatePostCanaryBatch03ScoreStability(passing);
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
  evaluatePostCanaryBatch03ScoreStability(winnerMutation).acceptancePassed,
  false
);
const distanceMutation = structuredClone(passing);
distanceMutation[2].final = scores(95, 80);
assert.equal(
  evaluatePostCanaryBatch03ScoreStability(distanceMutation).acceptancePassed,
  false
);
assert.throws(() =>
  evaluatePostCanaryBatch03ScoreStability(passing, {
    ...POST_CANARY_BATCH_03_SCORE_STABILITY_THRESHOLDS,
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
