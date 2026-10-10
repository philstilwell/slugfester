import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { weightExplorerSnapshot as snapshot } from "../src/data/weight-explorer-snapshot.js";
import { defaultWeights, weightDimensions, redistributeWeights, evaluateWeights, scoreScenarioSide } from "../src/data/weight-explorer-model.js";

const root = new URL("../", import.meta.url);
const load = path => JSON.parse(readFileSync(new URL(path, root), "utf8"));
const originalDebates = load(`${snapshot.source}/debates.json`);
const originalMoves = load(`${snapshot.source}/moves.json`);
const moveLookup = new Map(originalMoves.map(m => [`${m.number}:${m.move_id}`, m]));

test("default weights reproduce every published score and the existing study", () => {
  const result = evaluateWeights(snapshot.debates);
  assert.equal(result.count, 234);
  assert.equal(snapshot.counts.moves, 5652);
  for (const r of result.rows) assert.deepEqual([r.proGod, r.conGod], r.published, r.id);
  assert.equal(result.gap.toFixed(2), "5.74");
  assert.equal(result.proGodAhead, 33);
  assert.equal(result.conGodAhead, 193);
  assert.equal(result.ties, 8);
  assert.equal(result.changed, 0);
});

test("reweighting agrees with an independent calculation from original research moves and section records", () => {
  // Deliberately do not call the browser's scoring helper to get expected scores.
  for (const weights of [[0,100,0,0,0,0], [0,0,100,0,0,0], [10,35,15,10,15,15]]) {
    const actual = evaluateWeights(snapshot.debates, weights);
    for (const row of actual.rows) {
      const original = originalDebates.find(d => d.number === row.number);
      const ledger = load(`docs/assessment-ledgers/${row.id}.json`);
      for (const [side, score] of [[original.theist_side, row.proGod], [original.non_side, row.conGod]]) {
        let overall = 0;
        for (const section of ledger.calculated.sections) {
          let sum = 0, importance = 0;
          for (const move of section.sides[side].moves) {
            const dims = moveLookup.get(`${row.number}:${move.moveId}`).dimensions;
            let score = 0;
            for (let i=0; i<6; i++) score += dims[weightDimensions[i].key] * (weights[i] / 100);
            sum += Math.round(score) * move.importance;
            importance += move.importance;
          }
          overall += Math.round(sum / importance) * section.weightPercent / 100;
        }
        const expected = Math.max(0, Math.min(100, Math.round(overall + original.adjustments[side])));
        assert.equal(score, expected, `${row.id} ${side}`);
      }
    }
    assert.equal(actual.proGodAhead + actual.conGodAhead + actual.ties, actual.count);
  }
});

test("sliders keep whole-number percentages totaling 100 at every boundary", () => {
  for (let i=0; i<6; i++) for (let value=0; value<=100; value++) {
    const next = redistributeWeights(defaultWeights, i, value);
    assert.equal(next[i], value);
    assert.equal(next.reduce((a,b) => a+b, 0), 100);
    assert(next.every(w => Number.isInteger(w) && w>=0 && w<=100));
  }
  const allLogic = redistributeWeights(defaultWeights, 0, 100);
  assert.deepEqual(allLogic, [100,0,0,0,0,0]);
  assert.deepEqual(redistributeWeights(allLogic, 0, 25), defaultWeights);
  for (const invalid of [[0,0,0,0,0,0], [25,20,20,15,10,NaN], [101,-1,0,0,0,0]]) {
    assert.throws(() => evaluateWeights(snapshot.debates, invalid));
  }
});

test("assessment-group filters preserve paired populations and correct baselines", () => {
  const all = evaluateWeights(snapshot.debates);
  const earlier = evaluateWeights(snapshot.debates, defaultWeights, "earlier");
  const later = evaluateWeights(snapshot.debates, defaultWeights, "later");
  assert.equal(earlier.count, 146); assert.equal(later.count, 88);
  assert(Math.abs((earlier.gap*146 + later.gap*88)/234 - all.gap) < 1e-12);
  assert.equal(earlier.changed + later.changed, 0);
  assert.equal(evaluateWeights([], defaultWeights).gap, null);
  assert.throws(() => evaluateWeights(snapshot.debates, defaultWeights, "unknown"));
});

test("extreme scores stay bounded after the retained adjustment", () => {
  const section = n => [{weight:100, proGod:[[1,n,n,n,n,n,n]]}];
  assert.equal(scoreScenarioSide("proGod", section(100), defaultWeights, 5), 100);
  assert.equal(scoreScenarioSide("proGod", section(0), defaultWeights, -5), 0);
});
