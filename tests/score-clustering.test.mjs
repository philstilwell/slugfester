import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { clusteringStatistic } from "../scripts/analyze-score-clustering.mjs";
import { createHash } from "node:crypto";

const row = (pro, con) => ({ speakers: { pro: "A", con: "B" }, pro, con });
test("pooled within-person spread ignores differences between person means", () => {
  assert.equal(clusteringStatistic([row(10, 20), row(12, 22)], ["A", "B"]), Math.sqrt(2));
});
test("within-debate assignment works when only one participant is in the sample", () => {
  assert.equal(clusteringStatistic([row(10, 20), row(12, 24)], ["A"], [true, false]), Math.sqrt(32));
});
test("exhaustive six-debate fixture has exactly two perfectly clustered assignments out of 64", () => {
  const records = Array.from({ length: 6 }, () => row(10, 20));
  let extreme = 0;
  for (let mask = 0; mask < 64; mask++) {
    const flips = records.map((_, i) => Boolean(mask & (1 << i)));
    if (clusteringStatistic(records, ["A", "B"], flips) === 0) extreme++;
  }
  assert.equal(extreme, 2);
});
test("the saved result identifies the frozen source and eligible sample", () => {
  const input = readFileSync(new URL("../docs/analysis/corpus-papers-2026-10-09/debates.json", import.meta.url));
  const result = JSON.parse(readFileSync(new URL("../docs/qa-support/score-clustering-2026-10-22/results.json", import.meta.url)));
  assert.equal(createHash("sha256").update(input).digest("hex"), result.sourceSha256);
  const records = JSON.parse(input).filter((row) => row.ranking_eligible && row.cohort !== "unlocked");
  assert.equal(records.length, 291);
  const counts = new Map();
  for (const record of records) for (const name of Object.values(record.speakers)) counts.set(name, (counts.get(name) || 0) + 1);
  const eligible = [...counts].filter(([, count]) => count >= 6);
  assert.equal(eligible.length, 31);
  assert.equal(eligible.reduce((sum, [, count]) => sum + count, 0), 314);
  assert.deepEqual(result.participants.map(({ speaker, appearances }) => [speaker, appearances]), eligible.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
});
