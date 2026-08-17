#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const root =
  'docs/assessment-production/post-canary-continuation-v1/batch-02/audio-verification';
const planPath = `${root}/debate-83-resolution-plan.json`;
const executionPreparationPath =
  `${root}/debate-83-resolution-execution-preparation-manifest.json`;
const [planText, executionPreparationText] = await Promise.all([
  readFile(planPath, 'utf8'),
  readFile(executionPreparationPath, 'utf8'),
]);
const plan = JSON.parse(planText);
const preparation = JSON.parse(executionPreparationText);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(
  plan.status ===
    'frozen-debate-83-speaker-mixed-verification-reference-correction-2-plan-prepared',
  'plan status changed',
);
assert(
  preparation.status ===
    'frozen-debate-83-correction-2-execution-preparation-pending-separate-approval',
  'execution-preparation status changed',
);
assert(
  plan.checkpointCommit === '83e1b146de6ac17d12584d37daf4cd82c02a2e8f',
  'checkpoint changed',
);
assert(plan.target.debateNumber === '83', 'debate changed');
assert(plan.target.moveId === 'pro-modality-02', 'move changed');
assert(plan.target.expectedSpeaker === 'Andrew Loke', 'expected speaker changed');
assert(
  preparation.plan.path === planPath &&
    preparation.plan.sha256 === sha256(Buffer.from(planText)),
  'plan lock changed',
);

for (const [file, digest] of Object.entries(plan.sourceLocks)) {
  assert(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
}
for (const lock of plan.transcriptLocks) {
  assert(
    sha256(await readFile(lock.path)) === lock.sha256,
    `transcript hash mismatch: ${lock.moveId}`,
  );
}
for (const [file, digest] of Object.entries(plan.preparationToolLocks)) {
  assert(sha256(await readFile(file)) === digest, `tool hash mismatch: ${file}`);
}

assert(
  plan.diagnosedMismatch.classification ===
    'single-speaker-validator-received-a-speaker-mixed-verification-reference',
  'mismatch classification changed',
);
assert(
  plan.diagnosedMismatch.semanticSpeakerIdentityIndependentlyProved === false,
  'speaker identity overclaimed',
);
assert(
  plan.proposedCorrection.operation ===
    'replace-only-the-transient-debate-83-verification-reference-with-one-source-exact-expected-speaker-substring',
  'correction operation changed',
);
assert(
  plan.proposedCorrection.field === 'verificationExcerpt',
  'correction field changed',
);
assert(
  plan.proposedCorrection.replacementLexicalTokenCount === 18,
  'replacement token count changed',
);
assert(
  plan.proposedCorrection.replacementIsExactSubstringOfOriginal,
  'replacement source exactness changed',
);
assert(
  plan.proposedCorrection.originalRequestWrite === false &&
    plan.proposedCorrection.originalInventoryWrite === false &&
    plan.proposedCorrection.originalAudioWorkItemWrite === false &&
    plan.proposedCorrection.originalTranscriptWrite === false &&
    plan.proposedCorrection.validatorWrite === false &&
    plan.proposedCorrection.thresholdWrite === false,
  'persistent write allowed',
);
assert(
  plan.proposedCorrection.correctionExecutedThisStage === false &&
    plan.proposedCorrection.prospectiveValidatorEvaluationExecutedThisStage === false,
  'correction executed during preparation',
);
assert(plan.transcriptLocks.length === 10, 'ten transcript locks required');
assert(
  new Set(plan.transcriptLocks.map((lock) => lock.path)).size === 10,
  'transcript locks must be unique',
);
assert(
  plan.futureExecutionContract.deterministicPassesMaximum === 1 &&
    plan.futureExecutionContract.attemptsMaximum === 1 &&
    plan.futureExecutionContract.retriesMaximum === 0 &&
    plan.futureExecutionContract.rerunsMaximum === 0 &&
    plan.futureExecutionContract.automaticRepairsMaximum === 0 &&
    plan.futureExecutionContract.recursiveCorrectionsMaximum === 0,
  'future pass limits changed',
);
assert(
  plan.futureExecutionContract.exactTenTranscriptCohortReplayRequired &&
    plan.futureExecutionContract.originalCallOrderRequired.length === 10,
  'future cohort route changed',
);
assert(
  plan.futureExecutionContract.correction1OverlayMustRemainExact &&
    plan.futureExecutionContract.allOriginalTranscriptsMustRemainByteIdentical &&
    plan.futureExecutionContract.originalRequestManifestMustRemainByteIdentical &&
    plan.futureExecutionContract.lockedInventoryMustRemainByteIdentical &&
    plan.futureExecutionContract.audioWorkItemsMustRemainByteIdentical,
  'protected inputs weakened',
);
assert(
  plan.futureExecutionContract.audioAccessAllowed === false &&
    plan.futureExecutionContract.transcriptionOrOtherModelExecutionAllowed === false &&
    plan.futureExecutionContract.paidServiceUseAllowed === false,
  'forbidden future work allowed',
);
assert(
  plan.judgmentModelBoundary.label === '5.6 Sol' &&
    plan.judgmentModelBoundary.reasoningEffort === 'low' &&
    plan.judgmentModelBoundary.authentication === 'ChatGPT subscription' &&
    plan.judgmentModelBoundary.scoreBlindnessPreserved &&
    plan.judgmentModelBoundary.integerRoundedTiesPermitted,
  'judgment-model boundary changed',
);

for (const [key, value] of Object.entries(plan.authorization)) {
  assert(value === false, `plan authorization unexpectedly true: ${key}`);
}
for (const [key, value] of Object.entries(preparation.authorization)) {
  assert(value === false, `preparation authorization unexpectedly true: ${key}`);
}
for (const [key, value] of Object.entries(plan.executionBoundary)) {
  if (
    key === 'resolutionPlansPrepared' ||
    key === 'executionPreparationManifestsPrepared'
  ) {
    assert(value === 1, `${key} must equal one`);
  } else {
    assert(value === 0, `execution boundary crossed: ${key}`);
  }
}
assert(
  preparation.proposedFutureExecution.executionHarnessExistsThisStage === false &&
    preparation.proposedFutureExecution.activationManifestExistsThisStage === false &&
    preparation.preparationValidation.validatorNotExecutedAgainstReplacement &&
    preparation.preparationValidation.cohortReplayNotExecuted,
  'future execution was prepared beyond authorization',
);
assert(
  plan.nextAuthorizedAction ===
    'user-approval-required-before-preparing-the-exact-debate-83-correction-2-execution-harness-and-activation-manifest' &&
    preparation.nextAuthorizedAction === plan.nextAuthorizedAction,
  'next authorization changed',
);

console.log('Batch 2 Debate 83 resolution plan and execution preparation are frozen and valid.');
