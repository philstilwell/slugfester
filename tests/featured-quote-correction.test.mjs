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

const shorthandBase = "docs/assessment-production/standalone-debates-v1/debate-290";
const shorthandCandidate = read(`${shorthandBase}/publication/output.json`).candidate;
const shorthandInventory = read(`${shorthandBase}/inventory/inventory.json`);
const shorthandCorrection = read(`${shorthandBase}/publication/featured-quote-correction-1/correction.json`);

test("bracketed shorthand clarification preserves the assessment and the other quote", () => {
  const revised = applyFeaturedQuoteCorrection(shorthandCandidate, shorthandInventory, shorthandCorrection);
  assert.equal(revised.quotes.pro.text, "[suffering] is therefore evidence that favors indifference over theism.");
  assert.match(revised.quotes.pro.context, /Brackets expand Malpass’s “S,”/);
  const restored = structuredClone(revised);
  restored.quotes.pro = shorthandCandidate.quotes.pro;
  assert.deepEqual(restored, shorthandCandidate);
  assert.equal(shorthandCandidate.quotes.pro.text, "s is therefore evidence that favors indifference over theism");
});

test("published Rauser–Malpass data matches only the verified quote correction", async () => {
  const shorthandEntry = read("docs/assessment-production/standalone-debates-v1/registry.json").debates.find(item => item.debateNumber === "290");
  const verified = reviewedFeaturedQuoteCandidate(root, shorthandEntry, shorthandCandidate);
  const { debates } = await import("../src/data/debates.js");
  assert.deepEqual(debates.find(item => item.id === shorthandCandidate.id), verified);
});

test("shorthand clarification requires visible brackets and an explicit explanation", () => {
  const unmarked = structuredClone(shorthandCorrection);
  unmarked.shards[0].fields[0].after = "suffering is therefore evidence that favors indifference over theism.";
  assert.throws(() => applyFeaturedQuoteCorrection(shorthandCandidate, shorthandInventory, unmarked), /shown in brackets/);
  const unexplained = structuredClone(shorthandCorrection);
  unexplained.shards[0].fields.pop();
  assert.throws(() => applyFeaturedQuoteCorrection(shorthandCandidate, shorthandInventory, unexplained), /disclose the bracketed/);
});

test("shorthand clarification cannot invent a definition or change the conclusion", () => {
  const invented = structuredClone(shorthandCorrection);
  invented.sourceReview.pro.shorthand.expansion = "pointless suffering";
  assert.throws(() => applyFeaturedQuoteCorrection(shorthandCandidate, shorthandInventory, invented), /absent from the quote's source/);
  const wrongDefinition = structuredClone(shorthandCorrection);
  wrongDefinition.sourceReview.pro.shorthand.definitionMoveId = "rauser-fallible-testimony-deference";
  assert.throws(() => applyFeaturedQuoteCorrection(shorthandCandidate, shorthandInventory, wrongDefinition), /definition speaker/);
  const alteredDefinition = structuredClone(shorthandCorrection);
  alteredDefinition.sourceReview.pro.shorthand.definitionExactSourceText = "by s i mean pointless suffering";
  assert.throws(() => applyFeaturedQuoteCorrection(shorthandCandidate, shorthandInventory, alteredDefinition), /absent from its locked source/);
  const alteredConclusion = structuredClone(shorthandCorrection);
  alteredConclusion.shards[0].fields[0].after = "[suffering] is therefore evidence that disproves theism.";
  assert.throws(() => applyFeaturedQuoteCorrection(shorthandCandidate, shorthandInventory, alteredConclusion), /changes source words/);
});

const noteBase = "docs/assessment-production/standalone-debates-v1/debate-291";
const noteCandidate = read(`${noteBase}/publication/output.json`).candidate;
const noteCorrection = read(`${noteBase}/publication/source-note-correction-1/correction.json`);
const noteScope = read(`${noteBase}/source/reader-scope-disclosure.json`).requiredReaderDisclosure;
const noteEntry = read("docs/assessment-production/standalone-debates-v1/registry.json").debates.find(item => item.debateNumber === "291");
import { applySourceNoteCorrection, reviewedSourceNoteCandidate } from "../scripts/lib/source-note-correction.mjs";

test("source-note copyediting preserves scope, scores and every other field", async () => {
  const before = structuredClone(noteCandidate);
  const revised = reviewedSourceNoteCandidate(root, noteEntry, noteCandidate);
  assert(revised.sourceNote.includes(noteScope));
  assert.match(revised.sourceNote, /automatic transcription with speaker labels/);
  assert.deepEqual({...revised, sourceNote: noteCandidate.sourceNote}, noteCandidate);
  assert.deepEqual(noteCandidate, before);
  const { debates } = await import("../src/data/debates.js");
  assert.deepEqual(debates.find(item => item.id === noteCandidate.id), revised);
});

test("source-note supplement rejects changed scope, scoring fields, originals and duplicate repairs", () => {
  for (const mutate of [
    c => {c.shards[0].fields[0].after = "Complete recording assessed.";},
    c => {c.shards[0].fields[0].path = "score.pro";},
    c => {c.shards[0].fields[0].before += " altered";},
    c => {c.shards[0].fields.push(c.shards[0].fields[0]);},
    c => {c.shards.push(c.shards[0]);}
  ]) {
    const bad = structuredClone(noteCorrection); mutate(bad);
    assert.throws(() => applySourceNoteCorrection(noteCandidate, bad, noteScope));
  }
  const badEntry = structuredClone(noteEntry);
  badEntry.sourceNoteCorrection.record.sha256 = "0".repeat(64);
  assert.throws(() => reviewedSourceNoteCandidate(root, badEntry, noteCandidate), /hash mismatch/);
  assert.throws(() => reviewedSourceNoteCandidate(root, noteEntry, {...noteCandidate, sourceNote: "altered"}), /base differs/);
});
