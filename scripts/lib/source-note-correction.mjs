import assert from "node:assert/strict";
import { readVerifiedQuoteRecord } from "./featured-quote-correction.mjs";

// Source-note supplements preserve the frozen assessment and its scope notice.
export function applySourceNoteCorrection(candidate, correction, requiredDisclosure) {
  assert.equal(correction.schemaVersion, "1.0-source-note-correction");
  assert.equal(correction.status, "user-authorized-copyedit");
  assert.equal(correction.debateNumber, candidate.number);
  assert.equal(correction.debateId, candidate.id);
  assert(correction.authorization?.request?.trim(), "Missing source-note authorization");
  assert.equal(correction.directIncrementalCostUsd, 0);
  assert.equal(correction.retries, 0);
  assert.equal(correction.shards.length, 1, "Source-note repair requires one shard");
  const shard = correction.shards[0];
  assert.equal(shard.attempts, 1);
  assert.equal(shard.fields.length, 1, "Source-note repair must change exactly one field");
  const field = shard.fields[0];
  assert.deepEqual(Object.keys(field).sort(), ["after", "before", "path"]);
  assert.equal(field.path, "sourceNote", "Source-note correction cannot change another publication field");
  assert.equal(candidate.sourceNote, field.before, "Source-note correction differs from its frozen original");
  assert.equal(typeof field.after, "string");
  assert.notEqual(field.after, field.before);
  assert(requiredDisclosure?.trim(), "Missing required source-scope disclosure");
  assert(field.before.includes(requiredDisclosure) && field.after.includes(requiredDisclosure), "Source-note correction changed the required scope disclosure");
  assert(typeof correction.sourceReview === "string" && correction.sourceReview.trim().split(/\s+/).length >= 30, "Missing source-specific review");
  return {...structuredClone(candidate), sourceNote: field.after};
}

export function reviewedSourceNoteCandidate(root, entry, candidate) {
  if (!entry.sourceNoteCorrection) return candidate;
  const correction = readVerifiedQuoteRecord(root, entry.sourceNoteCorrection.record);
  assert.equal(correction.debateNumber, entry.debateNumber);
  assert.equal(correction.debateId, entry.debateId);
  assert.equal(correction.basePublication.path, `${entry.root}/publication/output.json`);
  assert.equal(correction.scope.path, entry.readerScopeDisclosurePath);
  const publication = readVerifiedQuoteRecord(root, correction.basePublication);
  const scope = readVerifiedQuoteRecord(root, correction.scope);
  assert.equal(candidate.id, publication.candidate.id);
  assert.equal(candidate.number, publication.candidate.number);
  assert.equal(candidate.sourceNote, publication.candidate.sourceNote, "Source-note base differs from frozen publication");
  return applySourceNoteCorrection(candidate, correction, scope.requiredReaderDisclosure);
}
