import assert from 'node:assert/strict';
import { topicCategoryIds } from '../../src/data/topics.js';
import { readVerifiedQuoteRecord } from './featured-quote-correction.mjs';

// A reviewed metadata supplement leaves the frozen publication and scoring intact.
export function reviewedTopicCategoryCandidate(root, entry, candidate) {
  if (!entry.topicCategoryCorrection) return candidate;
  const correction = readVerifiedQuoteRecord(root, entry.topicCategoryCorrection.record);
  assert.equal(correction.schemaVersion, '1.0-topic-category-correction');
  assert.equal(correction.status, 'authorized-metadata-correction');
  assert.equal(correction.debateNumber, entry.debateNumber);
  assert.equal(correction.debateId, entry.debateId);
  assert.equal(candidate.number, entry.debateNumber);
  assert.equal(candidate.id, entry.debateId);
  assert(correction.authorization?.trim());
  assert.equal(correction.directIncrementalCostUsd, 0);
  assert.equal(correction.retries, 0);
  assert.equal(correction.basePublication.path, `${entry.root}/publication/output.json`);
  const publication = readVerifiedQuoteRecord(root, correction.basePublication);
  assert.equal(correction.shards.length, 1);
  const shard = correction.shards[0];
  assert.equal(shard.attempts, 1);
  assert.equal(shard.fields.length, 1);
  const field = shard.fields[0];
  assert.deepEqual(Object.keys(field).sort(), ['after', 'before', 'path']);
  assert.equal(field.path, 'topicCategory');
  assert.equal(field.before, publication.candidate.topicCategory);
  assert.equal(field.before, candidate.topicCategory);
  assert.notEqual(field.after, field.before);
  assert(topicCategoryIds.has(field.after), 'Unrecognized corrected topic category');
  assert(correction.editorialReview?.trim().split(/\s+/).length >= 30);
  return {...structuredClone(candidate), topicCategory: field.after};
}
