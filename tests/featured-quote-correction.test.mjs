import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applyFeaturedQuoteCorrection, reviewedFeaturedQuoteCandidate, readVerifiedQuoteRecord } from "../scripts/lib/featured-quote-correction.mjs";

const root = process.cwd();
const base = "docs/assessment-production/standalone-debates-v1/debate-284";
const read = file => JSON.parse(readFileSync(file, "utf8"));
const candidate = read(`${base}/publication/output.json`).candidate;
const inventory = read(`${base}/inventory/inventory.json`);
const correction = read(`${base}/publication/featured-quote-correction-1/correction.json`);
const entry = read("docs/assessment-production/standalone-debates-v1/registry.json").debates.find(item => item.debateNumber === candidate.number);

test("reviewed quote completion preserves all other publication content and the frozen inputs", () => {
  const before = structuredClone(candidate);
  const revised = reviewedFeaturedQuoteCandidate(root, entry, candidate);
  assert.notDeepEqual(revised.quotes, candidate.quotes);
  const restored = structuredClone(revised);
  restored.quotes = candidate.quotes;
  assert.deepEqual(restored, candidate);
  assert.deepEqual(candidate, before);
  assert.match(revised.quotes.pro.text, /does not exist\.$/);
  assert.match(revised.quotes.con.text, /Were they true\?$/);
});

test("quote supplement cannot change an assessed score", () => {
  const bad = structuredClone(correction);
  bad.shards[0].fields[0] = {path: "score.pro", before: candidate.score.pro, after: 99};
  assert.throws(() => applyFeaturedQuoteCorrection(candidate, inventory, bad), /another publication field/);
});

test("quote completion rejects invented wording and the wrong speaker", () => {
  const invented = structuredClone(correction);
  invented.shards[0].fields[0].after = "The absence of evidence proves that God does not exist.";
  assert.throws(() => applyFeaturedQuoteCorrection(candidate, inventory, invented), /changes source words/);
  const wrongSide = structuredClone(correction);
  wrongSide.sourceReview.pro.moveId = wrongSide.sourceReview.con.moveId;
  assert.throws(() => applyFeaturedQuoteCorrection(candidate, inventory, wrongSide), /speaker\/source mismatch/);
});

test("quote correction refuses a changed original or tampered evidence reference", () => {
  const altered = structuredClone(candidate);
  altered.quotes.pro.text += " altered";
  assert.throws(() => reviewedFeaturedQuoteCandidate(root, entry, altered), /base differs/);
  assert.throws(() => readVerifiedQuoteRecord(root, {...entry.featuredQuoteCorrection.record, sha256: "0".repeat(64)}), /hash mismatch/);
  assert.throws(() => readVerifiedQuoteRecord(root, {...entry.featuredQuoteCorrection.record, path: "../outside.json"}), /inside the repository/);
});
