#!/usr/bin/env node

import assert from "node:assert/strict";

import { evaluateProposedV2WinnerStability } from "./lib/assessment-production-score-stability-policy-v2.mjs";

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
const scored = (number, a, b, final) => ({
  debateNumber: number,
  passA: { overall: a.overall, winner: a.winner },
  passB: { overall: b.overall, winner: b.winner },
  final: { overall: final.overall, winner: final.winner },
});
const con = (proMean, conMean, proScore, conScore) => ({
  overall: overall(proMean, conMean, proScore, conScore),
  winner: "con",
});
const pro = (proMean, conMean, proScore, conScore) => ({
  overall: overall(proMean, conMean, proScore, conScore),
  winner: "pro",
});
const tie = (proMean, conMean, score) => ({
  overall: overall(proMean, conMean, score, score),
  winner: "tie",
});

const tieCollapse = scored(
  "tie-collapse",
  con(80.1, 80.7, 80, 81),
  con(81.9, 82.5, 82, 83),
  tie(81.54, 81.62, 82)
);
const collapseResult = evaluateProposedV2WinnerStability([tieCollapse]);
assert.equal(collapseResult.passed, true);
assert.deepEqual(collapseResult.allowedRoundedTieCollapses, ["tie-collapse"]);

const hiddenReversal = structuredClone(tieCollapse);
hiddenReversal.debateNumber = "hidden-reversal";
hiddenReversal.final.overall.pro.weightedSectionMean = 81.63;
hiddenReversal.final.overall.con.weightedSectionMean = 81.62;
const hiddenResult = evaluateProposedV2WinnerStability([hiddenReversal]);
assert.equal(hiddenResult.passed, false);
assert.deepEqual(hiddenResult.oppositeSideReversals, ["hidden-reversal"]);

const publishedReversal = scored(
  "published-reversal",
  pro(82.1, 80.2, 82, 80),
  pro(83.1, 81.2, 83, 81),
  con(80.1, 82.1, 80, 82)
);
assert.equal(
  evaluateProposedV2WinnerStability([publishedReversal]).passed,
  false
);

const initialTieDrift = scored(
  "initial-tie-drift",
  tie(80.1, 80.2, 80),
  tie(81.1, 81.2, 81),
  pro(82.1, 81.2, 82, 81)
);
assert.equal(
  evaluateProposedV2WinnerStability([initialTieDrift]).passed,
  false
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      roundedTieCollapseAllowedWhenDirectionPreserved: true,
      hiddenUnroundedReversalRejected: true,
      publishedReversalRejected: true,
      agreedInitialTieDriftRejected: true,
      realCanaryReclassified: false,
    },
    null,
    2
  )
);
