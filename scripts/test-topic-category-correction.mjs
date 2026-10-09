import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { reviewedTopicCategoryCandidate } from './lib/topic-category-correction.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'slugfester-topic-test-'));
const write = (name, value) => {
  const bytes = JSON.stringify(value);
  fs.mkdirSync(path.dirname(path.join(root, name)), {recursive: true});
  fs.writeFileSync(path.join(root, name), bytes);
  return {path: name, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: Buffer.byteLength(bytes)};
};
try {
  const candidate = {number: '999', id: 'fixture', topicCategory: 'obsolete', score: {pro: 83, con: 80}, sections: [{words: 'Preserved source text'}]};
  const before = structuredClone(candidate);
  const entry = {debateNumber: '999', debateId: 'fixture', root: 'fixture'};
  assert.deepEqual(reviewedTopicCategoryCandidate(root, entry, candidate), candidate);
  const correction = {
    schemaVersion: '1.0-topic-category-correction', status: 'authorized-metadata-correction',
    debateNumber: '999', debateId: 'fixture', authorization: 'Authorized metadata repair',
    directIncrementalCostUsd: 0, retries: 0,
    basePublication: write('fixture/publication/output.json', {candidate}),
    shards: [{attempts: 1, fields: [{path: 'topicCategory', before: 'obsolete', after: 'resurrection-miracles'}]}],
    editorialReview: 'This fixture verifies that an explicitly reviewed category correction changes only the category. The original publication, source words, scores and section structures remain untouched, and every referenced record must retain its authenticated bytes and identity.'
  };
  const apply = value => reviewedTopicCategoryCandidate(root, {...entry, topicCategoryCorrection: {record: write('correction.json', value)}}, candidate);
  assert.deepEqual(apply(correction), {...candidate, topicCategory: 'resurrection-miracles'});
  assert.deepEqual(candidate, before);
  for (const mutate of [
    c => {c.shards[0].fields[0].after = 'unrecognized';},
    c => {c.shards[0].fields[0].path = 'score';},
    c => {c.shards[0].fields[0].before = 'wrong-original';},
    c => {c.shards[0].attempts = 2;},
    c => {c.debateId = 'another-debate';},
    c => {c.basePublication.sha256 = '0'.repeat(64);},
    c => {c.shards[0].fields.push({...c.shards[0].fields[0]});}
  ]) {
    const invalid = structuredClone(correction); mutate(invalid);
    assert.throws(() => apply(invalid));
  }
  console.log('Topic correction: valid one-field repair, immutable source, and seven invalid alterations checked.');
} finally {
  fs.rmSync(root, {recursive: true, force: true});
}
