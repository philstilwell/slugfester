import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chartSnapshot as snapshot } from "../src/data/chart-snapshot.js";
import { analyzeCharts, chartQuantile, chartState, chartThreshold, chartUrl, chartSnapshotName, renderChartsContent } from "../src/data/charts.js";

const archive = JSON.parse(readFileSync(new URL(`../docs/charts/snapshots/${chartSnapshotName(snapshot)}.json`, import.meta.url), "utf8"));
assert.equal(chartSnapshotName({ date: "2026-10-08" }), "2026-10-08", "Original archive links remain valid");
assert.equal(chartSnapshotName({ date: "2026-10-08", revision: 2 }), "2026-10-08-r2");
if (snapshot.revision !== undefined) assert.ok(Number.isSafeInteger(snapshot.revision) && snapshot.revision >= 1);
for (const exclusion of snapshot.exclusions) {
  assert.ok(exclusion.reason?.trim(), "Every excluded case needs an explanation");
  if (exclusion.status) {
    assert.ok(["reviewed-exclusion", "pending-review"].includes(exclusion.status));
    assert.equal(/awaits review/i.test(exclusion.reason), exclusion.status === "pending-review");
  }
}
assert.deepEqual(snapshot, archive, "The public snapshot must match its dated archive");
assert.equal(snapshot.catalogueCount, snapshot.debates.length + snapshot.exclusions.length);
assert.equal(new Set([...snapshot.debates, ...snapshot.exclusions].map((d) => d.id)).size, snapshot.catalogueCount);
assert.equal(new Set(snapshot.moves.map((m) => `${m.d}:${m.id}`)).size, snapshot.moves.length, "One row per unique assessed move");
const familyIds = snapshot.families.map((f) => f.id);
for (const m of snapshot.moves) {
  assert.ok(snapshot.debates[m.d]);
  assert.ok(snapshot.debates[m.d].sections[m.s]);
  assert.ok(m.p === 0 || m.p === 1);
  assert.ok(["constructive", "reply", "concession"].includes(m.k));
  assert.ok(m.f.length && new Set(m.f).size === m.f.length && m.f.every((f) => familyIds.includes(f)));
  assert.equal(m.x.length, snapshot.dimensions.length);
  for (const score of [m.v, ...m.x]) assert.ok(Number.isFinite(score) && score >= 0 && score <= 100);
  assert.ok(m.speaker && m.q && m.id);
}

// A deliberately unbalanced fixture detects accidental pooling of moves.
const fixture = { scopes: [["god", "God"], ["all", "All"]], dimensions: [["evidence", "Evidence"]], families: [{ id: "a", label: "A" }, { id: "b", label: "B" }], debates: [{ scope: "god", generation: "campaign" }, { scope: "god", generation: "standalone" }], moves: [
  { d: 0, p: 0, f: ["a", "b"], v: 40, x: [40], k: "constructive", speaker: "One" },
  { d: 0, p: 0, f: ["a"], v: 60, x: [60], k: "reply", speaker: "One" },
  { d: 1, p: 0, f: ["a"], v: 100, x: [100], k: "reply", speaker: "Two" }
] };
const result = analyzeCharts(fixture, { scope: "god", family: "all", generation: "all" });
const a = result.families.find((f) => f.id === "a").sides[0];
assert.equal(a.median, 75, "Median of debate means 50 and 100, not pooled move mean");
assert.equal(a.q1, 62.5); assert.equal(a.q3, 87.5);
assert.equal(a.prevalence, 100); assert.equal(a.dimensions[0].rate, 50, "Equal-debate rate, not pooled 2/3");
assert.equal(a.roles[0].score, 40); assert.equal(a.roles[1].score, 80);
assert.equal(result.moves.length, 3, "Overlapping families must not inflate unique moves");
assert.equal(result.families.find((f) => f.id === "b").sides[0].prevalence, 50);
assert.equal(result.families[0].sides[1].median, null, "Missing is not zero");
assert.equal(chartQuantile([], .5), null);
assert.equal(chartQuantile([70], .25), 70);
assert.equal(analyzeCharts(fixture, { scope: "god", family: "missing" }).moves.length, 0);
assert.deepEqual(chartState("?scope=bad&generation=bad&family=bad&page=-12", fixture), { scope: "god", family: "all", page: 1, threshold: 70 });
const thresholds = Array.from({ length: 11 }, (_, i) => 50 + i * 5);
for (const threshold of thresholds) {
  assert.equal(chartThreshold(threshold), threshold);
  const side = analyzeCharts(fixture, { scope: "god", family: "a", threshold }).families[0].sides[0];
  assert.equal(side.dimensions[0].rate, threshold <= 60 ? 25 : 50, "Strict boundary and equal debate weighting, including score 100");
  assert.equal(side.median, 75, "Threshold only changes the dimension chart");
}
for (const invalid of [null, "", "banana", 49, 51, 70.5, 101]) assert.equal(chartThreshold(invalid), 70);
assert.deepEqual(chartState("?generation=standalone", snapshot), chartState("", snapshot), "Legacy generation parameters cannot split the sample");
assert.ok(!chartUrl({ scope: "god", generation: "campaign", threshold: 70 }).includes("generation"));
assert.ok(chartUrl({ scope: "god", threshold: 95 }).includes("threshold=95"));

// Independently count observed debates and recompute mean-of-debate role scores
// for every available scope/family/position combination.
let groups = 0;
for (const [scope] of snapshot.scopes) {
  const analysis = analyzeCharts(snapshot, { scope, family: "all" });
  const thresholdViews = new Map(thresholds.map((threshold) => [threshold, analyzeCharts(snapshot, { scope, family: "all", threshold })]));
  for (const family of analysis.families) for (const [p, side] of family.sides.entries()) {
    const eligible = snapshot.debates.map((d, i) => ({ d, i })).filter(({ d }) => (scope === "all" || d.scope === scope));
    const selected = snapshot.moves.filter((m) => m.p === p && m.f.includes(family.id) && eligible.some(({ i }) => m.d === i));
    assert.equal(side.moves, selected.length);
    assert.equal(side.debates, new Set(selected.map((m) => m.d)).size);
    assert.equal(side.prevalence, eligible.length ? side.debates / eligible.length * 100 : null);
    for (const threshold of thresholds) {
      const dimensions = thresholdViews.get(threshold).families.find((f) => f.id === family.id).sides[p].dimensions;
      const byDebate = new Map();
      for (const move of selected) {
        if (!byDebate.has(move.d)) byDebate.set(move.d, []);
        byDebate.get(move.d).push(move);
      }
      snapshot.dimensions.forEach((_, i) => {
        const shares = [...byDebate.values()].map((moves) => 100 * moves.filter((m) => m.x[i] < threshold).length / moves.length);
        const expected = shares.length ? shares.reduce((a, b) => a + b, 0) / shares.length : null;
        assert.ok(expected === null ? dimensions[i].rate === null : Math.abs(expected - dimensions[i].rate) < 1e-9);
        assert.equal(dimensions[i].flagged, selected.filter((m) => m.x[i] < threshold).length);
      });
    }
    for (const [kindIndex, kind] of ["constructive", "reply"].entries()) {
      let sum = 0, n = 0;
      for (const { i } of eligible) {
        const matches = selected.filter((m) => m.d === i && m.k === kind);
        if (!matches.length) continue;
        sum += matches.reduce((total, m) => total + m.v, 0) / matches.length; n++;
      }
      const expected = n ? sum / n : null;
      assert.ok(expected === null ? side.roles[kindIndex].score === null : Math.abs(expected - side.roles[kindIndex].score) < 1e-9);
    }
    groups++;
  }
}
const html = renderChartsContent(snapshot);
assert.ok(!/>NaN<|>undefined<|NaN%|undefined%|width:Infinity/.test(html));
assert.ok(html.includes(`/docs/charts/snapshots/${chartSnapshotName(snapshot)}.json`), "Downloads must identify the published revision");
const pendingFixture = { ...snapshot, exclusions: [{ id: "pending", number: "new", status: "pending-review", reason: "Position classification awaits review." }] };
assert.ok(renderChartsContent(pendingFixture).includes("1 case awaits classification review"), "Unreviewed future cases must remain visibly pending");
const resolvedFixture = { ...snapshot, exclusions: [{ id: "resolved", number: "old", status: "reviewed-exclusion", reason: "Grouped legacy assessment." }] };
assert.ok(renderChartsContent(resolvedFixture).includes("No cases awaiting review."));
for (const id of ["chart-frequency", "chart-scores", "chart-roles", "chart-dimensions", "chart-evidence", "chart-methods"]) assert.ok(html.includes(`id="${id}"`));
const generator = readFileSync(new URL("./generate-seo-pages.mjs", import.meta.url), "utf8");
assert.ok(!generator.includes("build-chart-snapshot"), "Routine site builds must not refresh the snapshot");
console.log(`Validated frozen snapshot: ${snapshot.debates.length} debates, ${snapshot.moves.length} moves, ${groups} independent comparison groups across all 11 thresholds, overlap/weighting/missing-data fixtures.`);
