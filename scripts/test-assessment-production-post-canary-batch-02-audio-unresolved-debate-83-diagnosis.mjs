#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const root = 'docs/assessment-production/post-canary-continuation-v1/batch-02/audio-verification';
const diagnosis = JSON.parse(
  await readFile(`${root}/debate-83-unresolved-diagnosis.json`, 'utf8'),
);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(
  diagnosis.status ===
    'frozen-debate-83-pro-modality-02-attribution-threshold-failure-diagnosed',
  'status changed',
);
assert(diagnosis.checkpointCommit === '06a17be543736cadcaac86998c573c7d8255ad95', 'checkpoint changed');
assert(diagnosis.target.debateNumber === '83', 'debate changed');
assert(diagnosis.target.moveId === 'pro-modality-02', 'move changed');
assert(diagnosis.target.validationOverlayApplied === false, 'unexpected overlay');

for (const [role, source] of Object.entries(diagnosis.evidenceBoundary.records)) {
  assert(sha256(await readFile(source.path)) === source.sha256, `${role} evidence hash mismatch`);
}
assert(
  sha256(await readFile(diagnosis.freezing.diagnosisToolPath)) ===
    diagnosis.freezing.diagnosisToolSha256,
  'diagnosis tool hash mismatch',
);
assert(
  sha256(await readFile(diagnosis.freezing.diagnosisTestPath)) ===
    diagnosis.freezing.diagnosisTestSha256,
  'diagnosis test hash mismatch',
);

assert(diagnosis.transportRecord.transportPassed, 'transport did not pass');
assert(diagnosis.transcriptStructure.emptyTextSegmentCount === 0, 'schema defect found');
assert(
  diagnosis.diagnosis.classification ===
    'completed-valid-diarized-response-with-two-attribution-threshold-failures',
  'classification changed',
);
assert(
  JSON.stringify(diagnosis.diagnosis.failedChecks) ===
    JSON.stringify(['expectedSpeakerExcerptRecovered', 'expectedSpeakerRecallDistinct']),
  'failed checks changed',
);
assert(diagnosis.tokenAccounting.referenceLexicalTokens === 75, 'reference token count changed');
assert(diagnosis.tokenAccounting.fullClipMatchedTokens === 74, 'full-clip matches changed');
assert(diagnosis.tokenAccounting.expectedSpeakerMatchedTokens === 56, 'expected matches changed');
assert(diagnosis.tokenAccounting.highestOtherSpeakerMatchedTokens === 46, 'other matches changed');
assert(diagnosis.tokenAccounting.expectedSpeakerTokenDeficit === 4, 'expected deficit changed');
assert(diagnosis.tokenAccounting.actualMarginTokens === 10, 'actual margin changed');
assert(diagnosis.tokenAccounting.requiredMarginTokens === 12, 'required margin changed');
assert(diagnosis.tokenAccounting.marginTokenDeficit === 2, 'margin deficit changed');
assert(diagnosis.diagnosis.speakerLabelErrorEstablished === false, 'speaker error inferred');
assert(diagnosis.diagnosis.clipBoundaryErrorEstablished === false, 'clip error inferred');
assert(diagnosis.diagnosis.providerCauseEstablished === false, 'provider cause inferred');

for (const [key, value] of Object.entries(diagnosis.authorization)) {
  assert(value === false, `authorization unexpectedly true: ${key}`);
}
for (const [key, value] of Object.entries(diagnosis.executionBoundary)) {
  if (key === 'diagnosisRecordsPrepared') {
    assert(value === 1, 'exactly one diagnosis record required');
  } else {
    assert(value === 0, `execution boundary crossed: ${key}`);
  }
}
assert(
  diagnosis.nextAuthorizedAction ===
    'user-approval-required-before-any-batch-02-debate-83-audio-verification-correction-plan-or-audio-access',
  'next authorization changed',
);

console.log('Batch 2 Debate 83 unresolved audio-verification diagnosis is frozen and valid.');
