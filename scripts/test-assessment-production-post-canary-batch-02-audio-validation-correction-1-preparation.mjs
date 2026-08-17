#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const root = 'docs/assessment-production/post-canary-continuation-v1/batch-02/audio-verification';
const plan = JSON.parse(await readFile(`${root}/correction-1-preparation-manifest.json`, 'utf8'));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(plan.status === 'frozen-debate-99-empty-segment-validation-overlay-plan-prepared', 'status changed');
assert(plan.checkpointCommit === '30fab8f796afc72c6b954fd34c72396c757425ce', 'checkpoint changed');
assert(plan.target.debateNumber === '99', 'debate changed');
assert(plan.target.moveId === 'pro-neural-correlation-interface-model', 'move changed');
assert(plan.target.invalidField === 'segments[36].text', 'invalid field changed');
assert(plan.transcriptLocks.length === 10, 'ten transcript locks required');
assert(new Set(plan.transcriptLocks.map((lock) => lock.path)).size === 10, 'transcript paths must be unique');

for (const [file, digest] of Object.entries(plan.sourceLocks)) {
  assert(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
}
for (const lock of plan.transcriptLocks) {
  assert(sha256(await readFile(lock.path)) === lock.sha256, `transcript hash mismatch: ${lock.moveId}`);
}
for (const [file, digest] of Object.entries(plan.preparationToolLocks)) {
  assert(sha256(await readFile(file)) === digest, `preparation tool hash mismatch: ${file}`);
}

assert(
  plan.proposedCorrection.operation ===
    'omit-one-exact-empty-text-segment-from-transient-validation-overlay',
  'correction operation changed',
);
assert(plan.proposedCorrection.persistentTranscriptWrite === false, 'persistent write allowed');
assert(plan.proposedCorrection.originalSegmentCount === 44, 'original segment count changed');
assert(plan.proposedCorrection.transientOverlaySegmentCount === 43, 'overlay segment count changed');
assert(plan.proposedCorrection.correctionPerformedThisStage === false, 'correction executed during preparation');
assert(plan.futureExecutionPolicy.deterministicPassesMaximum === 1, 'pass limit changed');
assert(plan.futureExecutionPolicy.rerunsMaximum === 0, 'rerun limit changed');
assert(plan.futureExecutionPolicy.retriesMaximum === 0, 'retry limit changed');
assert(plan.futureExecutionPolicy.exactTenTranscriptCohortReplayRequired, 'cohort replay changed');
assert(plan.futureExecutionPolicy.originalTranscriptMustRemainByteIdentical, 'original transcript not protected');
assert(plan.futureExecutionPolicy.otherNineTranscriptsMustRemainByteIdentical, 'other transcripts not protected');
assert(plan.futureExecutionPolicy.audioFileAccessAllowed === false, 'audio access allowed');
assert(plan.futureExecutionPolicy.transcriptionOrOtherModelExecutionAllowed === false, 'model execution allowed');
assert(plan.acceptanceRequirements.allTenAttributionResultsVerified, 'acceptance weakened');
assert(plan.acceptanceRequirements.noUnresolvedResult, 'unresolved result allowed');
assert(plan.judgmentModelBoundary.label === '5.6 Sol', 'model label changed');
assert(plan.judgmentModelBoundary.reasoningEffort === 'low', 'reasoning effort changed');
assert(plan.judgmentModelBoundary.authentication === 'ChatGPT subscription', 'authentication changed');
assert(plan.judgmentModelBoundary.integerRoundedTiesPermitted, 'integer-rounded ties changed');

for (const [key, value] of Object.entries(plan.authorization)) {
  assert(value === false, `authorization unexpectedly true: ${key}`);
}
for (const [key, value] of Object.entries(plan.executionBoundary)) {
  if (key === 'correctionPlansPrepared') {
    assert(value === 1, 'exactly one correction plan required');
  } else {
    assert(value === 0, `execution boundary crossed: ${key}`);
  }
}

assert(
  plan.nextAuthorizedAction ===
    'user-approval-required-before-preparing-the-exact-correction-1-execution-harness-and-activation-manifest',
  'next authorization changed',
);

console.log('Batch 2 Debate 99 correction-1 preparation is frozen and valid.');
