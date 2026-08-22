#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { access, readFile, writeFile } from 'node:fs/promises';

const ROOT = 'docs/assessment-production/post-canary-continuation-v1/batch-06/audio-verification';
const PLAN_PATH = `${ROOT}/correction-1-preparation-manifest.json`;
const ACTIVATION_PATH = `${ROOT}/correction-1-execution-activation.json`;
const PREP_TOOL = 'scripts/prepare-assessment-production-post-canary-batch-06-audio-validation-correction-1.mjs';
const ACTIVATE_TOOL = 'scripts/activate-assessment-production-post-canary-batch-06-audio-validation-correction-1.mjs';
const RUN_TOOL = 'scripts/run-assessment-production-post-canary-batch-06-audio-validation-correction-1.mjs';
const VALIDATOR = 'scripts/lib/v416-audio-verification.mjs';
const shouldWrite = process.argv.includes('--write');
const shouldCheck = process.argv.includes('--check');
const frozenAtIndex = process.argv.indexOf('--frozen-at');
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : null;

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const hashFile = async (file) => sha256(await readFile(file));
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const exists = (file) => access(file).then(() => true, () => false);

assert(shouldWrite !== shouldCheck, 'pass exactly one of --write or --check');
if (shouldWrite) assert(frozenAt && !Number.isNaN(Date.parse(frozenAt)), '--frozen-at requires an ISO timestamp');

const paths = Object.freeze({
  preparation: `${ROOT}/execution-preparation-manifest.json`,
  request: `${ROOT}/execution-manifest.json`,
  execution: `${ROOT}/model-execution.json`,
  diagnosis: `${ROOT}/failure-diagnosis.json`,
  standingAuthorization: 'docs/assessment-production/post-canary-continuation-v1/batch-06/standing-authorization.json',
  validator: VALIDATOR,
  originalStage: 'scripts/assessment-production-post-canary-batch-06-audio-verification-stage.mjs',
});

const expectedHashes = Object.freeze({
  [paths.preparation]: '6c2df34a13f25da9a024dccc050aaedeecaa6044614d8691f8767c40f6dcc920',
  [paths.request]: '8af85a4b992e2f6678887524352a1d9e52b3039f3d7b1ae3307942a2a5acc9d7',
  [paths.execution]: 'f3ea6695f90a6b58c862c9fdd5c45ceacc252bec563688a3121ac6ed1d02ac10',
  [paths.diagnosis]: 'c40a2433d1de301bfe16eb7a6a9ea753117c42014348459e63e997164520066f',
  [paths.standingAuthorization]: 'b6d7f27c77d76fbdf609d22e0b60b0314b0b8d58c1905d8f84bdcebba58e13f2',
  [paths.validator]: '9f7c2a6dc40b33de092503350994b3198588c5e9b7aaf9d547365e81ceb138d7',
  [paths.originalStage]: '3d0a37a793fb967b037a0e56547422e5714580daabb2b26b16f851166fd9af0f',
});

const target = Object.freeze({
  callIndex: 0,
  debateNumber: '97',
  debateId: 'holland-grayling-christianity-human-values-2019',
  moveId: 'con-classical-suppression-and-absorption',
  transcriptPath: 'output/transcribe/assessment-production-post-canary-batch-06-audio-verification/debate-97/transcripts/con-classical-suppression-and-absorption.transcript.json',
  transcriptSha256: '2d707c9dfd5683a6ebf4b3ad6a3274dd415c0516efd80d094b9e9fa1e665c785',
  originalSegmentCount: 123,
  overlaySegmentCount: 121,
  emptySegments: [
    { index: 52, id: 'seg_52', type: 'transcript.text.segment', speaker: 'A. C. Grayling', start: 105.16799999999999, end: 105.56799999999998, text: '' },
    { index: 110, id: 'seg_110', type: 'transcript.text.segment', speaker: 'Tom Holland', start: 245.662, end: 245.71200000000002, text: '' },
  ],
});

async function build() {
  for (const [file, digest] of Object.entries(expectedHashes)) {
    assert((await hashFile(file)) === digest, `source hash mismatch: ${file}`);
  }
  const [preparation, request, execution, diagnosis, standingAuthorization] = await Promise.all([
    readJson(paths.preparation), readJson(paths.request), readJson(paths.execution), readJson(paths.diagnosis), readJson(paths.standingAuthorization),
  ]);
  assert(request.calls.length === 2 && execution.results.length === 2, 'exactly two completed calls required');
  assert(execution.callsAttempted === 2 && execution.callsCompleted === 2 && execution.retries === 0 && !execution.requestFailure, 'preserved paid execution boundary changed');
  assert(execution.usageDerivedEstimatedCostUsd === 0.1127375 && execution.maximumAuthorizedCostUsd === 1, 'preserved cost boundary changed');
  assert(diagnosis.affectedTranscript.emptyTextSegments.length === 2 && diagnosis.boundedCorrection.operation === 'omit-exactly-the-two-frozen-empty-segment-objects-from-an-in-memory-validation-copy', 'frozen diagnosis changed');
  assert(standingAuthorization.recoveryControls.boundedFirstRecoveryAuthorized === true && standingAuthorization.recoveryControls.recursiveCorrectionsMaximum === 1, 'standing recovery authorization changed');
  assert(request.model === 'gpt-4o-transcribe-diarize' && JSON.stringify(request.thresholds) === JSON.stringify(preparation.thresholds), 'request or thresholds changed');

  const transcriptLocks = [];
  for (const [callIndex, call] of request.calls.entries()) {
    const result = execution.results.find((item) => item.debateNumber === call.debateNumber && item.moveId === call.moveId);
    assert(result?.status === 'completed' && result.attemptCount === 1 && result.retryCount === 0, `${call.moveId}: completed one-attempt result missing`);
    assert((await hashFile(call.transcriptPath)) === result.transcriptSha256, `${call.moveId}: transcript hash mismatch`);
    transcriptLocks.push({ callIndex, debateNumber: call.debateNumber, debateId: call.debateId, moveId: call.moveId, path: call.transcriptPath, sha256: result.transcriptSha256 });
  }
  const transcript = await readJson(target.transcriptPath);
  assert(transcript.segments.length === target.originalSegmentCount, 'target segment count changed');
  for (const frozen of target.emptySegments) assert(JSON.stringify(transcript.segments[frozen.index]) === JSON.stringify({ id: frozen.id, end: frozen.end, speaker: frozen.speaker, start: frozen.start, text: frozen.text, type: frozen.type }), `empty segment ${frozen.index} changed`);
  assert(transcript.segments.filter((segment) => typeof segment.text !== 'string' || segment.text.trim().length === 0).length === 2, 'exactly two empty-text segments required');

  const toolHashes = Object.fromEntries(await Promise.all([PREP_TOOL, ACTIVATE_TOOL, RUN_TOOL].map(async (file) => [file, await hashFile(file)])));
  const sourceHashes = { ...expectedHashes, ...toolHashes };
  const outputs = {
    execution: `${ROOT}/correction-1-execution.json`,
    audit: `${ROOT}/audio-verification.json`,
    analysis: `${ROOT}/analysis.json`,
    cost: `${ROOT}/cost-control-analysis.json`,
  };
  for (const file of Object.values(outputs)) assert(!(await exists(file)), `future output already exists: ${file}`);

  const operation = {
    name: 'omit-exactly-two-frozen-empty-segment-objects-from-transient-validation-copy',
    targetTranscriptPath: target.transcriptPath,
    targetTranscriptSha256: target.transcriptSha256,
    omittedSegments: target.emptySegments,
    originalSegmentCount: target.originalSegmentCount,
    transientSegmentCount: target.overlaySegmentCount,
    persistentTranscriptWrite: false,
    remainingSegmentsReindexed: false,
    topLevelFieldsChanged: [], speakerLabelsChanged: [], textFieldsAuthoredOrReplaced: [], timingFieldsChanged: [], thresholdsChanged: false,
  };
  const preparedAt = shouldWrite ? frozenAt : (await readJson(PLAN_PATH)).preparedAt;
  const plan = {
    schemaVersion: '1.0-assessment-production-post-canary-batch-06-audio-validation-correction-1-preparation',
    protocolId: request.protocolId,
    status: 'frozen-batch-06-two-empty-segment-validation-overlay-plan-prepared',
    preparedAt,
    productionCanary: false,
    batchNumber: 6,
    correctionNumber: 1,
    stagingOnly: true,
    directIncrementalCostUsdMaximum: 0,
    standingAuthorization: { path: paths.standingAuthorization, sha256: expectedHashes[paths.standingAuthorization], boundedInitialCorrectionAuthorized: true },
    sourceHashes,
    transcriptLocks,
    target,
    correction: { ...operation, deltaSha256: sha256(Buffer.from(JSON.stringify(operation))) },
    exactValidator: { path: VALIDATOR, sha256: expectedHashes[VALIDATOR] },
    exactThresholds: request.thresholds,
    preservedPaidExecution: { callsAttempted: 2, callsCompleted: 2, retries: 0, usageDerivedEstimatedCostUsd: 0.1127375, maximumAuthorizedCostUsd: 1, newCallsAuthorized: 0 },
    executionPolicy: { deterministicPassesMaximum: 1, retriesMaximum: 0, rerunsMaximum: 0, automaticRepairsMaximum: 0, audioAccessAllowed: false, modelExecutionAllowed: false, paidServiceUseAllowed: false, persistentTranscriptWritesMaximum: 0, completeTwoTranscriptReplayRequired: true },
    outputs,
    judgmentModelBoundary: { label: '5.6 Sol', slug: 'gpt-5.6-sol', reasoningEffort: 'low', authentication: 'ChatGPT subscription', scoreBlindnessPreserved: true, isolatedPassesPreserved: true, integerRoundedTiesPermitted: true, modelContextsThisStage: 0 },
    stopRules: { sourceHashMismatchBlocks: true, transcriptHashMismatchBlocks: true, targetShapeMismatchBlocks: true, overlayDeltaBeyondExactOmissionBlocks: true, validatorHashMismatchBlocks: true, thresholdMismatchBlocks: true, validationExceptionBlocks: true, unresolvedAttributionBlocks: true, paidOrModelCallBlocks: true, downstreamWorkBlocksUntilReplayPasses: true },
  };
  const activation = {
    schemaVersion: '1.0-assessment-production-post-canary-batch-06-audio-validation-correction-1-execution-activation',
    protocolId: request.protocolId,
    status: 'frozen-batch-06-audio-validation-correction-1-prepared-not-active',
    preparedAt,
    activatedAt: null,
    productionCanary: false,
    batchNumber: 6,
    correctionNumber: 1,
    stagingOnly: true,
    preparationManifest: { path: PLAN_PATH, sha256: sha256(Buffer.from(`${JSON.stringify(plan, null, 2)}\n`)) },
    sourceHashes,
    transcriptLocks,
    target,
    correction: plan.correction,
    exactValidator: plan.exactValidator,
    exactThresholds: plan.exactThresholds,
    preservedPaidExecution: plan.preservedPaidExecution,
    executionPolicy: plan.executionPolicy,
    outputs,
    authorization: { correctionExecution: false, cohortReplay: false, audioAccess: false, modelExecution: false, paidServiceUse: false, downstreamWork: false },
    nextAuthorizedAction: 'activate-one-frozen-batch-06-deterministic-audio-validation-correction-pass',
  };
  return { plan, activation };
}

const { plan, activation } = await build();
const planBytes = `${JSON.stringify(plan, null, 2)}\n`;
const activationBytes = `${JSON.stringify(activation, null, 2)}\n`;
if (shouldWrite) {
  await Promise.all([writeFile(PLAN_PATH, planBytes), writeFile(ACTIVATION_PATH, activationBytes)]);
  console.log(`wrote ${PLAN_PATH}`);
  console.log(`wrote ${ACTIVATION_PATH}`);
} else {
  assert((await readFile(PLAN_PATH, 'utf8')) === planBytes, 'preparation manifest replay mismatch');
  assert((await readFile(ACTIVATION_PATH, 'utf8')) === activationBytes, 'inactive activation replay mismatch');
  console.log('Batch 6 audio validation correction-1 preparation is frozen and valid.');
}
