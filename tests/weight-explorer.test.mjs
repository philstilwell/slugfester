import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { weightExplorerSnapshot as snapshot } from "../src/data/weight-explorer-snapshot.js";
import { defaultWeights, weightDimensions, weightPresets, findWeightPreset, weightTopics, countWeightTopics, parseWeightSettings, buildWeightShareUrl, validateWeights, redistributeWeights, evaluateWeights, scoreScenarioSide } from "../src/data/weight-explorer-model.js";

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
  for (const weights of [[0,100,0,0,0,0], [0,0,100,0,0,0], [10,35,15,10,15,15], ...weightPresets.map(p => p.weights)]) {
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

test("presets are distinct, valid, immutable examples with exact active-state matching", () => {
  assert.deepEqual(weightPresets[0].weights, defaultWeights);
  assert.equal(new Set(weightPresets.map(p => p.id)).size, weightPresets.length);
  assert.equal(new Set(weightPresets.map(p => p.weights.join(","))).size, weightPresets.length);
  for (const preset of weightPresets) {
    validateWeights(preset.weights);
    assert(preset.weights.every(Number.isInteger));
    assert(Object.isFrozen(preset) && Object.isFrozen(preset.weights));
    assert.equal(findWeightPreset([...preset.weights])?.id, preset.id);
    const result = evaluateWeights(snapshot.debates, preset.weights);
    assert.equal(result.count, 234);
    assert.equal(result.proGodAhead + result.conGodAhead + result.ties, result.count);
  }
  assert.equal(weightPresets.find(p => p.id === "evidence").weights[1], 40);
  assert.equal(weightPresets.find(p => p.id === "logic").weights[0], 40);
  assert.equal(weightPresets.find(p => p.id === "replies").weights[2], 40);
  assert.equal(findWeightPreset(redistributeWeights(defaultWeights, 0, 26)), undefined);
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

test("topic and procedure intersections match original reviewed membership and reconcile to all", () => {
  for (const cohort of ["all", "earlier", "later"]) {
    const counts = countWeightTopics(snapshot.debates, cohort);
    const all = evaluateWeights(snapshot.debates, defaultWeights, cohort);
    assert.equal(counts[0].count, all.count);
    assert.equal(counts.slice(1).reduce((n,t) => n+t.count, 0), all.count);
    let weightedGap = 0;
    for (const topic of weightTopics) {
      const expected = originalDebates.filter(d => d.cohort !== "unlocked" && d.theist_side && d.topic === topic.label && (cohort === "all" || d.cohort === cohort));
      const actual = evaluateWeights(snapshot.debates, defaultWeights, cohort, topic.id);
      assert.deepEqual(actual.rows.map(d => d.id).sort(), expected.map(d => d.id).sort());
      assert.equal(counts.find(t => t.id === topic.id).count, actual.count);
      assert.equal(actual.changed, 0);
      weightedGap += actual.gap * actual.count;
    }
    assert(Math.abs(weightedGap / all.count - all.gap) < 1e-12);
  }
  assert.equal(evaluateWeights(snapshot.debates, defaultWeights, "later", "mind-reason-logic").count, 4);
  assert.equal(evaluateWeights([], defaultWeights, "later", "mind-reason-logic").gap, null);
  assert.throws(() => evaluateWeights(snapshot.debates, defaultWeights, "all", "unknown"));
});

test("shared settings round-trip exact weights, intersecting filters and edition without unrelated URL data", () => {
  for (const weights of [...weightPresets.map(p => p.weights), [26,20,20,14,10,10], [100,0,0,0,0,0]]) {
    for (const cohort of ["all", "earlier", "later"]) for (const topic of ["all", ...weightTopics.map(t => t.id)]) {
      const state = { weights: [...weights], cohort, topic };
      const url = new URL(buildWeightShareUrl("https://slugfester.com/other/?private=discard#old", state, snapshot.edition));
      const restored = parseWeightSettings(url.search, snapshot.edition);
      assert.deepEqual(restored, { ...state, warning: "" });
      assert.equal(url.pathname, "/insights/");
      assert.equal(url.hash, "#scoring-weights");
      assert(!url.href.includes("private"));
      assert.deepEqual(evaluateWeights(snapshot.debates, restored.weights, restored.cohort, restored.topic), evaluateWeights(snapshot.debates, weights, cohort, topic));
    }
  }
});

test("unsupported, malformed and different-edition links visibly fall back to defaults", () => {
  const valid = new URL(buildWeightShareUrl("https://slugfester.com", { weights: defaultWeights, cohort: "all", topic: "all" }, snapshot.edition));
  for (const [key,value] of [["sw","2"],["weights","25,20,20,15,10,9"],["weights","25,20,20,15,10,10.0"],["weights","100,-1,1,0,0,0"],["weights","25,20,20,15,10,NaN"],["topic","<script>"],["procedure","future"],["edition","2027-01-01"]]) {
    const url = new URL(valid); url.searchParams.set(key,value);
    const state = parseWeightSettings(url.search, snapshot.edition);
    assert(state.warning.length > 0);
    assert.deepEqual(state.weights, defaultWeights);
    assert.equal(state.cohort, "all"); assert.equal(state.topic, "all");
  }
  const duplicate = new URL(valid); duplicate.searchParams.append("weights", "100,0,0,0,0,0");
  assert(parseWeightSettings(duplicate.search, snapshot.edition).warning);
  const missing = new URL(valid); missing.searchParams.delete("topic");
  assert(parseWeightSettings(missing.search, snapshot.edition).warning);
  assert.equal(parseWeightSettings("?deployment-check=anything", snapshot.edition).warning, "");
  assert.throws(() => buildWeightShareUrl("javascript:alert(1)", { weights: defaultWeights, cohort: "all", topic: "all" }, snapshot.edition));
});
