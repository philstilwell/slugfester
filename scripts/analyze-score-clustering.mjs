// Retrospective consistency check of frozen published scores; no new scoring.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function clusteringStatistic(records, speakers, flips = []) {
  const groups = new Map(speakers.map((name) => [name, []]));
  records.forEach((record, i) => {
    groups.get(record.speakers.pro)?.push(record[flips[i] ? "con" : "pro"]);
    groups.get(record.speakers.con)?.push(record[flips[i] ? "pro" : "con"]);
  });
  let squared = 0;
  let degrees = 0;
  for (const scores of groups.values()) {
    assert(scores.length > 1);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    squared += scores.reduce((sum, score) => sum + (score - mean) ** 2, 0);
    degrees += scores.length - 1;
  }
  return Math.sqrt(squared / degrees);
}

// Mulberry32, with a fixed seed for reproducibility; not used for security.
function randomGenerator(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function analyzeClustering(snapshot, { repetitions = 100_000, seed = 20261022 } = {}) {
  const records = snapshot.filter((row) => row.ranking_eligible && row.cohort !== "unlocked");
  assert.equal(new Set(records.map((row) => row.id)).size, records.length);
  assert.equal(new Set(records.map((row) => row.youtube)).size, records.length);
  const appearances = new Map();
  for (const row of records) {
    assert.notEqual(row.speakers.pro, row.speakers.con);
    for (const side of ["pro", "con"]) {
      assert(Number.isFinite(row[side]) && row[side] >= 0 && row[side] <= 100);
      const name = row.speakers[side];
      if (!appearances.has(name)) appearances.set(name, []);
      appearances.get(name).push(row[side]);
    }
  }
  const speakers = [...appearances.keys()].filter((name) => appearances.get(name).length >= 6).sort();
  const observed = clusteringStatistic(records, speakers);
  const random = randomGenerator(seed);
  const simulations = [];
  let asOrMoreClustered = 0;
  for (let i = 0; i < repetitions; i++) {
    // Each debate keeps both awarded scores and both participants. Independently
    // flip which participant receives which score, each assignment equally likely.
    const flips = records.map(() => random() < 0.5);
    const statistic = clusteringStatistic(records, speakers, flips);
    simulations.push(statistic);
    if (statistic <= observed + 1e-10) asOrMoreClustered++;
  }
  simulations.sort((a, b) => a - b);
  const quantile = (p) => {
    const position = (simulations.length - 1) * p;
    const lo = Math.floor(position), hi = Math.ceil(position);
    return simulations[lo] + (simulations[hi] - simulations[lo]) * (position - lo);
  };
  return {
    analysisDate: "2026-10-22",
    snapshotDate: "2026-10-09",
    question: "Are a speaker's scores more tightly clustered than random within-debate score assignments would produce?",
    nullModel: "Independently swap or retain each debate's pair of scores with probability one half, keeping participants, matchups, both awarded scores and assessment procedure attached to that debate.",
    eligibility: "Same locked, ranking-eligible one-on-one sample as the October ranking study; include every speaker with at least six appearances, selected by count alone.",
    statistic: "Pooled within-speaker standard deviation: sqrt(sum of squared deviations from each speaker's own mean / (appearances - speakers)); lower means tighter clustering.",
    debates: records.length,
    speakers: speakers.length,
    appearances: speakers.reduce((sum, name) => sum + appearances.get(name).length, 0),
    observedPooledSd: observed,
    repetitions,
    seed,
    randomPooledSd: { minimum: simulations[0], median: quantile(0.5), middle95: [quantile(0.025), quantile(0.975)] },
    asOrMoreClustered,
    plusOnePermutationP: (asOrMoreClustered + 1) / (repetitions + 1),
    // Exact one-sided binomial 95% upper bound when no simulation is as extreme.
    zeroHit95UpperBound: asOrMoreClustered === 0 ? -Math.expm1(Math.log(0.05) / repetitions) : null,
    participants: speakers.map((speaker) => ({ speaker, appearances: appearances.get(speaker).length })),
    limitations: [
      "Conditional on this explicit random-assignment model, not all possible meanings of arbitrary scoring.",
      "The randomization preserves debate-level paired scores and opponent schedules, but assumes either participant is equally likely to receive either score under the null; stable position or identity bias can violate that assumption without accurate judging.",
      "This retrospective comparison tests the combined sample, not each participant separately, and is not an independent replication of the ranking study.",
      "Selection is curated and historical methods differ; this does not verify historical blindness, current accuracy, future performance, or the truth of a worldview.",
      "Zero extreme simulations is not zero probability. The 95% upper bound quantifies simulation uncertainty under the null, not uncertainty about the null's assumptions or the likelihood the site is correct."
    ]
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sourcePath = "docs/analysis/corpus-papers-2026-10-09/debates.json";
  const source = readFileSync(new URL(`../${sourcePath}`, import.meta.url));
  const result = { sourcePath, sourceSha256: createHash("sha256").update(source).digest("hex"), ...analyzeClustering(JSON.parse(source)) };
  const destination = new URL("../docs/qa-support/score-clustering-2026-10-22/results.json", import.meta.url);
  const output = JSON.stringify(result, null, 2) + "\n";
  if (process.argv.includes("--check")) assert.equal(readFileSync(destination, "utf8"), output, "Saved clustering results must reproduce exactly");
  else writeFileSync(destination, output);
  console.log(JSON.stringify({ speakers: result.speakers, appearances: result.appearances, observedPooledSd: result.observedPooledSd, randomPooledSd: result.randomPooledSd, repetitions: result.repetitions, asOrMoreClustered: result.asOrMoreClustered, plusOnePermutationP: result.plusOnePermutationP, zeroHit95UpperBound: result.zeroHit95UpperBound }, null, 2));
}
