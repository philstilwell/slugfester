#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { access, readFile, writeFile } from 'node:fs/promises';

const ROOT = 'docs/assessment-production/post-canary-continuation-v1/batch-07/audio-verification';
const PLAN_PATH = `${ROOT}/correction-1-preparation-manifest.json`;
const ACTIVATION_PATH = `${ROOT}/correction-1-execution-activation.json`;
const PREP_TOOL = 'scripts/prepare-assessment-production-post-canary-batch-07-audio-validation-correction-1.mjs';
const ACTIVATE_TOOL = 'scripts/activate-assessment-production-post-canary-batch-07-audio-validation-correction-1.mjs';
const RUN_TOOL = 'scripts/run-assessment-production-post-canary-batch-07-audio-validation-correction-1.mjs';
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
  standingAuthorization: 'docs/assessment-production/post-canary-continuation-v1/batch-07/standing-authorization.json',
  validator: VALIDATOR,
  originalStage: 'scripts/assessment-production-post-canary-batch-07-audio-verification-stage.mjs',
});

const expectedHashes = Object.freeze({
  [paths.preparation]: '7edeed842310f0340b6e9eb9c344fe37ee00064278fb3248f972fcad0695878a',
  [paths.request]: 'dbecc27d144d7cdc75a227f0a6f36591e1f951777945ff295d6f03506e3da39b',
  [paths.execution]: '26dee875410b47b5962cfca7cd41b95c2c6dddcd36b6d2c0060794b02bcbe05f',
  [paths.diagnosis]: '563539c5192be41162d352f20fc262a133bdec009c767e6b0e716b963948f31e',
  [paths.standingAuthorization]: '94204c49b4f7f05a9c8928f3c91122e3725670b7481dab96d1922548d223b7b2',
  [paths.validator]: '9f7c2a6dc40b33de092503350994b3198588c5e9b7aaf9d547365e81ceb138d7',
  [paths.originalStage]: '7022f21d798b988a233c3879fa1eaaafe76b25a0eec793e40195afbaf67f2cda',
});

const target = Object.freeze({
  callIndex: 2,
  debateNumber: '78',
  debateId: 'albrecht-oppy-resurrection-ancient-christianity-2023',
  moveId: 'con-selective-hostile-source-survival',
  transcriptPath: 'output/transcribe/assessment-production-post-canary-batch-07-audio-verification/debate-78/transcripts/con-selective-hostile-source-survival.transcript.json',
  transcriptSha256: '02aafbb90409a66166dc67c643ed347b30a1135e12a530d1f2bae398426b5d62',
  originalSegmentCount: 46,
  overlaySegmentCount: 45,
  emptySegments: [
    { index: 10, id: 'seg_10', type: 'transcript.text.segment', speaker: 'Graham Oppy', start: 31.328000000000003, end: 31.378, text: '' },
  ],
});

async function build() {
  for (const [file, digest] of Object.entries(expectedHashes)) {
    assert((await hashFile(file)) === digest, `source hash mismatch: ${file}`);
  }
  const [preparation, request, execution, diagnosis, standingAuthorization] = await Promise.all([
    readJson(paths.preparation), readJson(paths.request), readJson(paths.execution), readJson(paths.diagnosis), readJson(paths.standingAuthorization),
  ]);
  assert(request.calls.length === 5 && execution.results.length === 5, 'exactly five completed calls required');
  assert(execution.callsAttempted === 5 && execution.callsCompleted === 5 && execution.retries === 0 && !execution.requestFailure, 'preserved paid execution boundary changed');
  assert(execution.usageDerivedEstimatedCostUsd === 0.162855 && execution.maximumAuthorizedCostUsd === 1, 'preserved cost boundary changed');
  assert(diagnosis.affectedTranscript.emptyTextSegments.length === 1 && diagnosis.boundedCorrection.operation === 'omit-exactly-the-one-frozen-empty-segment-object-from-an-in-memory-validation-copy', 'frozen diagnosis changed');
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
  assert(transcript.segments.filter((segment) => typeof segment.text !== 'string' || segment.text.trim().length === 0).length === 1, 'exactly one empty-text segment required');

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
    name: 'omit-exactly-one-frozen-empty-segment-object-from-transient-validation-copy',
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
    schemaVersion: '1.0-assessment-production-post-canary-batch-07-audio-validation-correction-1-preparation',
    protocolId: request.protocolId,
    status: 'frozen-batch-07-one-empty-segment-validation-overlay-plan-prepared',
    preparedAt,
    productionCanary: false,
    batchNumber: 7,
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
    preservedPaidExecution: { callsAttempted: 5, callsCompleted: 5, retries: 0, usageDerivedEstimatedCostUsd: 0.162855, maximumAuthorizedCostUsd: 1, newCallsAuthorized: 0 },
    executionPolicy: { deterministicPassesMaximum: 1, retriesMaximum: 0, rerunsMaximum: 0, automaticRepairsMaximum: 0, audioAccessAllowed: false, modelExecutionAllowed: false, paidServiceUseAllowed: false, persistentTranscriptWritesMaximum: 0, completeFiveTranscriptReplayRequired: true },
    outputs,
    judgmentModelBoundary: { label: '5.6 Sol', slug: 'gpt-5.6-sol', reasoningEffort: 'low', authentication: 'ChatGPT subscription', scoreBlindnessPreserved: true, isolatedPassesPreserved: true, integerRoundedTiesPermitted: true, modelContextsThisStage: 0 },
    stopRules: { sourceHashMismatchBlocks: true, transcriptHashMismatchBlocks: true, targetShapeMismatchBlocks: true, overlayDeltaBeyondExactOmissionBlocks: true, validatorHashMismatchBlocks: true, thresholdMismatchBlocks: true, validationExceptionBlocks: true, unresolvedAttributionBlocks: true, paidOrModelCallBlocks: true, downstreamWorkBlocksUntilReplayPasses: true },
  };
  const activation = {
    schemaVersion: '1.0-assessment-production-post-canary-batch-07-audio-validation-correction-1-execution-activation',
    protocolId: request.protocolId,
    status: 'frozen-batch-07-audio-validation-correction-1-prepared-not-active',
    preparedAt,
    activatedAt: null,
    productionCanary: false,
    batchNumber: 7,
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
    nextAuthorizedAction: 'activate-one-frozen-batch-07-deterministic-audio-validation-correction-pass',
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
  console.log('Batch 7 audio validation correction-1 preparation is frozen and valid.');
}
