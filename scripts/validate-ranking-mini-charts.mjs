import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { publishedDebates as debates } from "../src/data/debates.js";
import { avatarsForSpeakerText } from "../src/data/interlocutors.js";

// Exercise the shipped renderer without booting the browser or importing its app.
const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const names = ["scoreMedian", "profileScoreDistribution", "renderRankingMiniHistogram"];
const functions = names.map((name) => {
  const source = app.match(new RegExp(`^function ${name}\\([\\s\\S]*?^}`, "m"))?.[0];
  assert.ok(source, `Missing chart dependency: ${name}`);
  return source;
}).join("\n");
const constants = app.match(/^const PROFILE_SCORE_.*$/gm).join("\n");
const escaping = app.match(/^const escapeHtml =[\s\S]*?;\n/m)?.[0];
assert.ok(escaping, "Missing HTML escaping helper");
const render = new Function(`${constants}\n${escaping}\n${functions}\nreturn renderRankingMiniHistogram;`)();

const people = new Map();
for (const debate of debates) {
  const sides = ["pro", "con"].map((key) => avatarsForSpeakerText(debate.sides[key].speaker));
  if (debate.interlocutorRankingEligible === false || sides.some((side) => side.length !== 1)) continue;
  for (const [index, key] of ["pro", "con"].entries()) {
    const name = sides[index][0].name;
    const scores = people.get(name) || [];
    scores.push(debate.score[key]);
    people.set(name, scores);
  }
}
function verify(name, scores) {
  const html = render({ name, rank: 1, appearances: scores.length, records: scores.map((score) => ({ score })) });
  if (scores.length < 3) {
    assert.equal(html, "", `${name}: fewer than three records must not show a chart`);
    return;
  }
  const expected = Array(10).fill(0);
  scores.forEach((score) => {
    assert.ok(Number.isFinite(score) && score >= 50 && score <= 100, `${name}: score outside chart range`);
    expected[Math.min(9, Math.floor((score - 50) / 5))] += 1;
  });
  const counts = [...html.matchAll(/data-score-count="(\d+)"/g)].map((match) => Number(match[1]));
  const shares = [...html.matchAll(/data-score-share="([^"]+)"/g)].map((match) => Number(match[1]));
  assert.deepEqual(counts, expected, `${name}: bins must match published overall scores`);
  assert.equal(counts.reduce((total, count) => total + count, 0), scores.length);
  shares.forEach((share, index) => assert.ok(Math.abs(share - expected[index] / scores.length * 100) < 1e-9));
  assert.ok(Math.abs(shares.reduce((total, share) => total + share, 0) - 100) < 1e-8);
  assert.ok(html.includes("0–100% of debates"), "Shared percentage scale must be visible");
}
for (const [name, scores] of people) verify(name, scores);
for (const scores of [[], [80], [80, 85], [50, 55, 100], [74.9, 75, 79.9, 80], [90, 90, 90]]) verify("Boundary example", scores);
const qualifying = [...people.values()].filter((scores) => scores.length >= 3).length;
console.log(`Validated ${qualifying} ranking mini charts against eligible overall scores, plus eligibility and bucket boundaries.`);
