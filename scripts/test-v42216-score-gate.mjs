#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { evaluateV42216Stability } from "./lib/v42216-score-gate.mjs";

function scores(pro, con) {
  return { overall: { pro: { score: pro }, con: { score: con } }, winner: pro === con ? "tie" : pro > con ? "pro" : "con" };
}

const passing = [
  { debateNumber: "a", passA: scores(78, 82), passB: scores(80, 81), final: scores(79, 82) },
  { debateNumber: "b", passA: scores(85, 80), passB: scores(83, 81), final: scores(84, 81) },
  { debateNumber: "c", passA: scores(75, 75), passB: scores(74, 76), final: scores(75, 76) }
];
const accepted = evaluateV42216Stability(passing);
assert.equal(accepted.acceptancePassed, true);
assert.equal(accepted.agreedWinnerDebates, 2);
assert.equal(accepted.agreedWinnersPreserved, 2);

const winnerMutation = structuredClone(passing);
winnerMutation[0].final = scores(83, 79);
assert.equal(evaluateV42216Stability(winnerMutation).acceptancePassed, false);

const distanceMutation = structuredClone(passing);
distanceMutation[2].final = scores(90, 76);
assert.equal(evaluateV42216Stability(distanceMutation).acceptancePassed, false);

console.log(
  JSON.stringify(
    {
      status: "passed",
      prospectiveThresholdFixtureAccepted: true,
      agreedWinnerMutationRejected: true,
      distanceMutationRejected: true,
      realScoresDerived: 0
    },
    null,
    2
  )
);
