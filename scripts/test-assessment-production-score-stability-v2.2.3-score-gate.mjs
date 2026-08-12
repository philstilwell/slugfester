#!/usr/bin/env node

import assert from "node:assert/strict";

import { evaluateV223ScoreStability } from "./lib/assessment-production-score-stability-v2.2.3-score-gate.mjs";

const scores = (pro, con, proMean = pro, conMean = con) => ({
  overall: {
    pro: {
      score: pro,
      weightedSectionMean: proMean,
      burdenCompletionAdjustment: 0,
    },
    con: {
      score: con,
      weightedSectionMean: conMean,
      burdenCompletionAdjustment: 0,
    },
  },
  winner: pro === con ? "tie" : pro > con ? "pro" : "con",
});
const passing = [
  { debateNumber: "a", passA: scores(78, 82), passB: scores(80, 81), final: scores(79, 82) },
  { debateNumber: "b", passA: scores(85, 80), passB: scores(83, 81), final: scores(84, 81) },
  { debateNumber: "c", passA: scores(75, 75), passB: scores(74, 76), final: scores(75, 76) },
  { debateNumber: "d", passA: scores(72, 76), passB: scores(73, 77), final: scores(73, 77) },
  { debateNumber: "e", passA: scores(88, 84), passB: scores(86, 83), final: scores(87, 84) },
  { debateNumber: "f", passA: scores(68, 72), passB: scores(69, 73), final: scores(69, 72) },
  { debateNumber: "g", passA: scores(81, 79), passB: scores(82, 78), final: scores(82, 79) },
  { debateNumber: "h", passA: scores(76, 76), passB: scores(77, 75), final: scores(76, 75) },
  { debateNumber: "i", passA: scores(90, 87), passB: scores(88, 86), final: scores(89, 87) },
  { debateNumber: "j", passA: scores(70, 74), passB: scores(71, 75), final: scores(71, 74) },
];
const accepted = evaluateV223ScoreStability(passing);
assert.equal(accepted.acceptancePassed, true);

const tieCollapse = structuredClone(passing);
tieCollapse[0] = {
  debateNumber: "tie-collapse",
  passA: scores(80, 81, 80.1, 80.7),
  passB: scores(82, 83, 81.9, 82.5),
  final: scores(82, 82, 81.63, 81.62),
};
const tieAccepted = evaluateV223ScoreStability(tieCollapse);
assert.equal(tieAccepted.acceptancePassed, true);
assert.deepEqual(
  tieAccepted.winnerStability.allowedIntegerRoundedTieCollapses,
  ["tie-collapse"]
);
assert.deepEqual(
  tieAccepted.winnerStability.unroundedOppositeSideDirections,
  ["tie-collapse"]
);
const winnerMutation = structuredClone(passing);
winnerMutation[0].final = scores(83, 79);
assert.equal(
  evaluateV223ScoreStability(winnerMutation).acceptancePassed,
  false
);
const distanceMutation = structuredClone(passing);
distanceMutation[2].final = scores(90, 76);
assert.equal(
  evaluateV223ScoreStability(distanceMutation).acceptancePassed,
  false
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      prospectiveThresholdFixtureAccepted: true,
      everyIntegerRoundedTieCollapseAccepted: true,
      unroundedDirectionRetainedAsDiagnosticOnly: true,
      publishedOppositeSideMutationRejected: true,
      distanceMutationRejected: true,
      realScoresDerived: 0,
    },
    null,
    2
  )
);
