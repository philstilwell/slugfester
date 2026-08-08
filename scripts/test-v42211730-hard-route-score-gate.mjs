#!/usr/bin/env node

import assert from "node:assert/strict";
import { evaluateV42211730Stability } from "./lib/v42211730-hard-route-score-gate.mjs";

const scores = (pro, con) => ({ overall: { pro: { score: pro }, con: { score: con } }, winner: pro === con ? "tie" : pro > con ? "pro" : "con" });
const passing = [
  { debateNumber: "a", passA: scores(78, 82), passB: scores(80, 81), final: scores(79, 82) },
  { debateNumber: "b", passA: scores(85, 80), passB: scores(83, 81), final: scores(84, 81) },
  { debateNumber: "c", passA: scores(75, 75), passB: scores(74, 76), final: scores(75, 76) },
  { debateNumber: "d", passA: scores(72, 76), passB: scores(73, 77), final: scores(73, 77) },
  { debateNumber: "e", passA: scores(88, 84), passB: scores(86, 83), final: scores(87, 84) }
];
const accepted = evaluateV42211730Stability(passing);
assert.equal(accepted.acceptancePassed, true);
assert.equal(accepted.agreedWinnerDebates, 4);
assert.equal(accepted.agreedWinnersPreserved, 4);
const winnerMutation = structuredClone(passing);
winnerMutation[0].final = scores(83, 79);
assert.equal(evaluateV42211730Stability(winnerMutation).acceptancePassed, false);
const distanceMutation = structuredClone(passing);
distanceMutation[2].final = scores(90, 76);
assert.equal(evaluateV42211730Stability(distanceMutation).acceptancePassed, false);
console.log(JSON.stringify({ status: "passed", prospectiveThresholdFixtureAccepted: true, agreedWinnerMutationRejected: true, distanceMutationRejected: true, realScoresDerived: 0 }, null, 2));
