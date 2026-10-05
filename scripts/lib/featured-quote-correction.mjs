import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const words = value => value.trim().split(/\s+/);
const tokens = value => value.toLowerCase().match(/[\p{L}\p{N}]+(?:[’'][\p{L}\p{N}]+)*/gu) ?? [];
const keys = (value, expected) => assert.deepEqual(Object.keys(value).sort(), [...expected].sort());

export function readVerifiedQuoteRecord(root, record) {
  assert(record && typeof record.path === "string", "Missing quote correction evidence reference");
  assert(!path.isAbsolute(record.path) && !record.path.split("/").includes(".."), "Quote evidence must stay inside the repository");
  const bytes = readFileSync(path.join(root, record.path));
  assert.equal(hash(bytes), record.sha256, `Quote evidence hash mismatch: ${record.path}`);
  assert.equal(bytes.length, record.bytes, `Quote evidence size mismatch: ${record.path}`);
  return JSON.parse(bytes);
}

// A publication supplement may replace only these four strings. The frozen
// submission and scoring inputs remain the authority for every other field.
export function applyFeaturedQuoteCorrection(candidate, inventory, correction) {
  assert.equal(correction.schemaVersion, "1.0-featured-quote-correction");
  assert.equal(correction.status, "user-authorized-copyedit");
  assert.equal(correction.debateNumber, candidate.number);
  assert.equal(correction.debateId, candidate.id);
  assert.equal(inventory.debateNumber, candidate.number);
  assert.equal(inventory.debateId, candidate.id);
  assert(correction.authorization?.request?.trim(), "Missing user authorization");
  assert.equal(correction.normalization, "capitalization-and-punctuation-only");
  assert.equal(correction.directIncrementalCostUsd, 0);
  assert(Array.isArray(correction.shards) && correction.shards.length > 0);
  const result = structuredClone(candidate);
  const changed = new Set();
  for (const shard of correction.shards) {
    assert.equal(shard.attempts, 1);
    assert(shard.fields.length > 0 && shard.fields.length <= 2, "Quote repair exceeds two fields per shard");
    for (const field of shard.fields) {
      keys(field, ["path", "before", "after"]);
      const match = /^quotes\.(pro|con)\.(text|context)$/.exec(field.path);
      assert(match, "Quote correction attempted to change another publication field");
      assert(!changed.has(field.path), "Duplicate quote correction field");
      changed.add(field.path);
      const [, side, leaf] = match;
      assert.equal(result.quotes[side][leaf], field.before, "Quote correction does not match its frozen original");
      assert.equal(typeof field.after, "string");
      assert.notEqual(field.before, field.after);
      const length = words(field.after).length;
      assert(length >= (leaf === "text" ? 3 : 12) && length <= (leaf === "text" ? 18 : 55));
      result.quotes[side][leaf] = field.after;
    }
  }
  keys(correction.sourceReview, ["pro", "con"]);
  for (const side of ["pro", "con"]) {
    const review = correction.sourceReview[side];
    const move = inventory.moves.find(item => item.moveId === review.moveId);
    assert(move && move.side === side && move.speaker === candidate.sides[side].speaker, "Quote speaker/source mismatch");
    assert(typeof review.exactSourceText === "string" && review.exactSourceText.trim());
    assert(move.sourceSpan.excerpt.includes(review.exactSourceText), "Quote is absent from its locked full source span");
    assert.deepEqual(tokens(result.quotes[side].text), tokens(review.exactSourceText), "Quote changes source words");
    assert(/[.!?]$/.test(result.quotes[side].text), "Featured quote ends mid-sentence");
    assert(typeof review.completeThoughtReview === "string" && words(review.completeThoughtReview).length >= 12, "Missing source-specific complete-thought review");
  }
  return result;
}

export function reviewedFeaturedQuoteCandidate(root, entry, candidate) {
  if (!entry.featuredQuoteCorrection) return candidate;
  const correction = readVerifiedQuoteRecord(root, entry.featuredQuoteCorrection.record);
  assert.equal(correction.debateNumber, entry.debateNumber);
  assert.equal(correction.debateId, entry.debateId);
  assert.equal(correction.basePublication.path, `${entry.root}/publication/output.json`);
  assert.equal(correction.inventory.path, `${entry.root}/inventory/inventory.json`);
  const publication = readVerifiedQuoteRecord(root, correction.basePublication);
  assert.deepEqual(candidate, publication.candidate, "Quote correction base differs from frozen publication");
  const inventory = readVerifiedQuoteRecord(root, correction.inventory);
  readVerifiedQuoteRecord(root, entry.featuredQuoteCorrection.contentParityAudit);
  return applyFeaturedQuoteCorrection(candidate, inventory, correction);
}
