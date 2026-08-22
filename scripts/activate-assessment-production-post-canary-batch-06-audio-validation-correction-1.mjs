#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const PATH = 'docs/assessment-production/post-canary-continuation-v1/batch-06/audio-verification/correction-1-execution-activation.json';
const shouldWrite = process.argv.includes('--write');
const shouldCheck = process.argv.includes('--check');
const frozenAtIndex = process.argv.indexOf('--frozen-at');
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : null;
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const hashFile = async (file) => sha256(await readFile(file));
assert(shouldWrite !== shouldCheck, 'pass exactly one of --write or --check');
if (shouldWrite) assert(frozenAt && !Number.isNaN(Date.parse(frozenAt)), '--frozen-at requires an ISO timestamp');

const activation = JSON.parse(await readFile(PATH, 'utf8'));
assert(activation.schemaVersion === '1.0-assessment-production-post-canary-batch-06-audio-validation-correction-1-execution-activation', 'activation schema changed');
assert((await hashFile(activation.preparationManifest.path)) === activation.preparationManifest.sha256, 'preparation manifest hash mismatch');
for (const [file, digest] of Object.entries(activation.sourceHashes)) assert((await hashFile(file)) === digest, `source hash mismatch: ${file}`);
for (const lock of activation.transcriptLocks) assert((await hashFile(lock.path)) === lock.sha256, `transcript hash mismatch: ${lock.moveId}`);

if (shouldWrite) {
  assert(activation.status === 'frozen-batch-06-audio-validation-correction-1-prepared-not-active', 'inactive activation unavailable');
  activation.status = 'frozen-batch-06-audio-validation-correction-1-authorized-under-standing-authorization';
  activation.activatedAt = frozenAt;
  activation.authorization.correctionExecution = true;
  activation.authorization.cohortReplay = true;
  activation.authorization.downstreamWork = true;
  activation.nextAuthorizedAction = 'execute-exactly-one-batch-06-audio-validation-correction-1-pass';
  await writeFile(PATH, `${JSON.stringify(activation, null, 2)}\n`);
  console.log(`activated ${PATH}`);
} else {
  assert(activation.status === 'frozen-batch-06-audio-validation-correction-1-authorized-under-standing-authorization', 'correction activation is not active');
  assert(activation.authorization.correctionExecution && activation.authorization.cohortReplay && activation.authorization.downstreamWork, 'deterministic execution authorization missing');
  assert(!activation.authorization.audioAccess && !activation.authorization.modelExecution && !activation.authorization.paidServiceUse, 'forbidden authorization enabled');
  console.log('Batch 6 audio validation correction-1 activation is valid.');
}
