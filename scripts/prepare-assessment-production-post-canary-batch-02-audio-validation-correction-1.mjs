#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const ROOT = 'docs/assessment-production/post-canary-continuation-v1/batch-02/audio-verification';
const OUTPUT = `${ROOT}/correction-1-preparation-manifest.json`;
const PREPARATION_TOOL =
  'scripts/prepare-assessment-production-post-canary-batch-02-audio-validation-correction-1.mjs';
const TEST_TOOL =
  'scripts/test-assessment-production-post-canary-batch-02-audio-validation-correction-1-preparation.mjs';
const shouldWrite = process.argv.includes('--write');
const shouldCheck = process.argv.includes('--check');

const paths = Object.freeze({
  request: `${ROOT}/execution-manifest.json`,
  execution: `${ROOT}/model-execution.json`,
  error: `${ROOT}/validation-failure.json`,
  diagnosis: `${ROOT}/failure-diagnosis.json`,
  validator: 'scripts/lib/v416-audio-verification.mjs',
  originalAnalyzer: 'scripts/analyze-assessment-production-post-canary-batch-02-audio-verification.mjs',
  workflow: 'docs/assessment-production-workflow.md',
  activeScorePolicy: 'docs/assessment-production/score-stability-policy-v2.2-promotion.json',
  productionManifest: 'docs/assessment-production/manifest-v1.json',
});

const expectedHashes = Object.freeze({
  [paths.request]: '721dc697420d7aab79c5c1e715ebbf4ed67e27e608909e44be49e6526e68e34c',
  [paths.execution]: 'cdb9921eae444eb525c73f81c633c5b1d1695ed9466c3c44da318f1988f490ec',
  [paths.error]: '46091700f8fe40eb01070990b93acc37f60bbfa52cedfe4997ebc6ae9645121c',
  [paths.diagnosis]: 'f2f6eae4c43cf2bd15be097c5aa1d9f6e0a463dfbad3dbfe0b3ca929339927da',
  [paths.validator]: '9f7c2a6dc40b33de092503350994b3198588c5e9b7aaf9d547365e81ceb138d7',
  [paths.originalAnalyzer]: 'e33d7c88e12b79a36168c84e863deb808fc39126885db22443cc25f3bdd3e4e8',
});

const target = Object.freeze({
  callIndex: 6,
  callOrdinal: 7,
  debateNumber: '99',
  debateId: 'jones-jump-digital-physics-god-2019',
  moveId: 'pro-neural-correlation-interface-model',
  expectedSpeaker: 'Michael Jones',
  transcriptPath:
    'output/transcribe/assessment-production-post-canary-batch-02-audio-verification/debate-99/transcripts/pro-neural-correlation-interface-model.transcript.json',
  transcriptSha256: 'd74a06138cb65fca68b862f52447a2a09e6876722dca68a6cf44c02f22c312f1',
  segmentIndex: 36,
  segmentId: 'seg_36',
  segmentType: 'transcript.text.segment',
  speaker: 'A',
  start: 111.982,
  end: 112.132,
  text: '',
});

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const hashFile = async (file) => sha256(await readFile(file));

async function buildManifest() {
  for (const [file, expected] of Object.entries(expectedHashes)) {
    assert((await hashFile(file)) === expected, `source hash mismatch: ${file}`);
  }

  const [request, execution, error, diagnosis] = await Promise.all([
    readJson(paths.request),
    readJson(paths.execution),
    readJson(paths.error),
    readJson(paths.diagnosis),
  ]);

  assert(
    request.status === 'frozen-ten-post-canary-batch-02-paid-known-speaker-diarizations-authorized',
    'frozen request unavailable',
  );
  assert(request.calls.length === 10, 'exactly ten frozen calls required');
  assert(request.model === 'gpt-4o-transcribe-diarize', 'audio model record changed');
  assert(request.executionPolicy.attemptsPerCall === 1, 'original one-attempt policy changed');
  assert(request.executionPolicy.retriesMaximum === 0, 'original retry policy changed');
  assert(request.executionPolicy.sequentialExecution, 'original sequential policy changed');
  assert(
    request.thresholds.minimumFullClipExcerptRecall === 0.8 &&
      request.thresholds.minimumExpectedSpeakerExcerptRecall === 0.8 &&
      request.thresholds.minimumExpectedSpeakerRecallMargin === 0.15 &&
      request.thresholds.minimumExpectedSpeakerDurationSeconds === 5,
    'frozen thresholds changed',
  );
  assert(
    request.judgmentModelBoundary.judgmentModel === '5.6 Sol' &&
      request.judgmentModelBoundary.modelSlug === 'gpt-5.6-sol' &&
      request.judgmentModelBoundary.reasoningEffort === 'low' &&
      request.judgmentModelBoundary.authentication === 'ChatGPT subscription' &&
      request.judgmentModelBoundary.scoreBlind &&
      request.judgmentModelBoundary.roundedIntegerScoreTiesPermitted &&
      request.judgmentModelBoundary.isolatedPassesPreserved,
    'judgment-model boundary changed',
  );
  assert(
    execution.status === 'ten-post-canary-batch-02-paid-known-speaker-diarizations-completed' &&
      execution.callsCompleted === 10 &&
      execution.callsAttempted === 10 &&
      execution.retries === 0 &&
      execution.requestFailure === false,
    'preserved execution is not the completed ten-call run',
  );
  assert(
    diagnosis.status === 'frozen-debate-99-response-schema-failure-diagnosed' &&
      diagnosis.target.moveId === target.moveId &&
      diagnosis.diagnosis.invalidField === 'segments[36].text' &&
      diagnosis.executionBoundary.directIncrementalCostUsdActual === 0,
    'frozen diagnosis changed',
  );
  assert(
    error.deterministicValidationFailure.failedCallIndex === target.callIndex &&
      error.deterministicValidationFailure.failedCallOrdinal === target.callOrdinal &&
      error.deterministicValidationFailure.moveId === target.moveId &&
      error.deterministicValidationFailure.transcriptSha256 === target.transcriptSha256,
    'preserved failure target changed',
  );

  const transcriptLocks = [];
  for (const [callIndex, call] of request.calls.entries()) {
    const matches = execution.results.filter(
      (result) =>
        result.debateNumber === call.debateNumber && result.moveId === call.moveId,
    );
    assert(matches.length === 1, `${call.moveId}: exact execution result missing`);
    const result = matches[0];
    assert(result.status === 'completed', `${call.moveId}: execution was not completed`);
    assert(result.attemptCount === 1 && result.retryCount === 0, `${call.moveId}: attempt policy changed`);
    assert(result.transcriptWritten && result.transcriptJsonValid, `${call.moveId}: transcript record invalid`);
    assert((await hashFile(call.transcriptPath)) === result.transcriptSha256, `${call.moveId}: transcript hash mismatch`);
    transcriptLocks.push({
      callIndex,
      debateNumber: call.debateNumber,
      debateId: call.debateId,
      moveId: call.moveId,
      path: call.transcriptPath,
      sha256: result.transcriptSha256,
    });
  }

  const targetCall = request.calls[target.callIndex];
  assert(
    targetCall.debateNumber === target.debateNumber &&
      targetCall.debateId === target.debateId &&
      targetCall.moveId === target.moveId &&
      targetCall.expectedSpeaker === target.expectedSpeaker &&
      targetCall.transcriptPath === target.transcriptPath,
    'target request identity changed',
  );
  const transcript = await readJson(target.transcriptPath);
  assert(transcript.segments.length === 44, 'target segment count changed');
  const invalid = transcript.segments[target.segmentIndex];
  assert(
    invalid.id === target.segmentId &&
      invalid.type === target.segmentType &&
      invalid.speaker === target.speaker &&
      invalid.start === target.start &&
      invalid.end === target.end &&
      invalid.text === target.text,
    'exact empty segment changed',
  );
  assert(
    transcript.segments.filter(
      (segment) => typeof segment.text !== 'string' || segment.text.trim().length === 0,
    ).length === 1,
    'target must contain exactly one empty-text segment',
  );

  const proposedDelta = {
    operation: 'omit-one-exact-empty-text-segment-from-transient-validation-overlay',
    persistentTranscriptWrite: false,
    sourceTranscriptPath: target.transcriptPath,
    sourceTranscriptSha256: target.transcriptSha256,
    target: {
      segmentIndex: target.segmentIndex,
      segmentId: target.segmentId,
      segmentType: target.segmentType,
      speaker: target.speaker,
      start: target.start,
      end: target.end,
      textType: 'string',
      textLength: 0,
    },
    originalSegmentCount: 44,
    transientOverlaySegmentCount: 43,
    remainingSegmentIdsReindexed: false,
    topLevelFieldsChanged: [],
    speakerLabelsChanged: [],
    textFieldsAuthoredOrReplaced: [],
    timingFieldsChanged: [],
    usageFieldsChanged: [],
  };

  const sourceHashes = Object.fromEntries(
    await Promise.all(
      Object.values(paths).map(async (file) => [file, await hashFile(file)]),
    ),
  );

  return {
    schemaVersion:
      '1.0-assessment-production-post-canary-batch-02-audio-validation-correction-1-preparation',
    protocolId: request.protocolId,
    status: 'frozen-debate-99-empty-segment-validation-overlay-plan-prepared',
    preparedAt: '2026-08-17T18:38:19Z',
    checkpointCommit: '30fab8f796afc72c6b954fd34c72396c757425ce',
    productionCanary: false,
    batchNumber: 2,
    stagingOnly: true,
    userAuthorization: {
      instruction: 'I approve.',
      interpretedScope:
        'Prepare, validate, freeze, commit, and push a zero-cost deterministic Debate 99 correction-and-validation-resumption plan only.',
      maximumDirectIncrementalCostUsd: 0,
      correctionPlanPreparationAuthorized: true,
      correctionExecutionAuthorized: false,
      cohortValidationResumptionAuthorized: false,
      transcriptMutationAuthorized: false,
      modelExecutionAuthorized: false,
      paidServiceUseAuthorized: false,
    },
    sourceLocks: sourceHashes,
    transcriptLocks,
    target: {
      callIndex: target.callIndex,
      callOrdinal: target.callOrdinal,
      debateNumber: target.debateNumber,
      debateId: target.debateId,
      moveId: target.moveId,
      expectedSpeaker: target.expectedSpeaker,
      transcriptPath: target.transcriptPath,
      transcriptSha256: target.transcriptSha256,
      invalidField: 'segments[36].text',
      preservedErrorMessage:
        error.deterministicValidationFailure.errorMessage,
    },
    proposedCorrection: {
      ...proposedDelta,
      deltaSha256: sha256(Buffer.from(JSON.stringify(proposedDelta))),
      rationale:
        'The empty segment contains no transcript wording that could be preserved or replaced. Omitting only that exact object from a transient validation copy permits the unchanged segment validator to evaluate the remaining provider response without inventing text, changing a speaker label, changing timing, or overwriting the preserved transcript.',
      proposedOutputTranscriptPath: null,
      proposedOutputTranscriptSha256: null,
      correctionPerformedThisStage: false,
    },
    futureExecutionPolicy: {
      activationManifestRequired: true,
      deterministicPassesMaximum: 1,
      rerunsMaximum: 0,
      retriesMaximum: 0,
      automaticRepairsMaximum: 0,
      exactTenTranscriptCohortReplayRequired: true,
      originalCallOrderRequired: request.calls.map((call) => ({
        debateNumber: call.debateNumber,
        moveId: call.moveId,
      })),
      transientOverlayAllowedOnlyForMoveId: target.moveId,
      originalTranscriptMustRemainByteIdentical: true,
      otherNineTranscriptsMustRemainByteIdentical: true,
      exactValidatorPath: paths.validator,
      exactValidatorSha256: sourceHashes[paths.validator],
      exactThresholds: request.thresholds,
      originalAnalyzerPreservedAsReference: {
        path: paths.originalAnalyzer,
        sha256: sourceHashes[paths.originalAnalyzer],
      },
      audioFileAccessAllowed: false,
      semanticAudioEvaluationAllowed: false,
      transcriptionOrOtherModelExecutionAllowed: false,
      paidServiceUseAllowed: false,
      adjudicationAllowed: false,
      scoreDerivationAllowed: false,
      publicationReconstructionAllowed: false,
      productionMutationAllowed: false,
      nextBatchSelectionAllowed: false,
    },
    acceptanceRequirements: {
      allSourceAndTranscriptHashesMatch: true,
      exactEmptySegmentMatches: true,
      originalTranscriptHashUnchangedBeforeAndAfter: true,
      exactlyOneTransientSegmentOmitted: true,
      noRemainingSegmentMutation: true,
      noTopLevelTranscriptMutation: true,
      unchangedValidatorHash: true,
      unchangedThresholds: true,
      exactTenCallReplayCompletes: true,
      allTenAttributionResultsVerified: true,
      noUnresolvedResult: true,
      noValidationException: true,
      noAudioAccess: true,
      noModelOrPaidServiceCall: true,
      directIncrementalCostUsd: 0,
    },
    stopRules: {
      sourceHashMismatchBlocks: true,
      transcriptHashMismatchBlocks: true,
      targetShapeMismatchBlocks: true,
      emptySegmentCountOtherThanOneBlocks: true,
      persistentTranscriptWriteBlocks: true,
      overlayDeltaBeyondExactOmissionBlocks: true,
      validatorHashMismatchBlocks: true,
      thresholdMismatchBlocks: true,
      validationExceptionBlocks: true,
      unresolvedAttributionBlocks: true,
      audioAccessBlocks: true,
      modelOrPaidServiceCallBlocks: true,
      retryBlocks: true,
      rerunBlocks: true,
      downstreamWorkBlocksUntilReplayPasses: true,
    },
    judgmentModelBoundary: {
      label: '5.6 Sol',
      slug: 'gpt-5.6-sol',
      reasoningEffort: 'low',
      authentication: 'ChatGPT subscription',
      isolatedPassesPreserved: true,
      scoreBlindnessPreserved: true,
      integerRoundedTiesPermitted: true,
      modelContextsThisStage: 0,
      unchanged: true,
    },
    executionBoundary: {
      correctionPlansPrepared: 1,
      correctionPassesExecuted: 0,
      cohortValidationPassesExecuted: 0,
      transcriptWrites: 0,
      audioAccesses: 0,
      audioDownloads: 0,
      audioPlaybackCalls: 0,
      semanticAudioEvaluations: 0,
      transcriptionCalls: 0,
      modelOrApiCalls: 0,
      paidServiceCalls: 0,
      retries: 0,
      reruns: 0,
      adjudications: 0,
      scoresDerived: 0,
      publicationReconstructions: 0,
      productionMutations: 0,
      nextBatchSelections: 0,
      directIncrementalCostUsd: 0,
    },
    preparationToolLocks: {
      [PREPARATION_TOOL]: await hashFile(PREPARATION_TOOL),
      [TEST_TOOL]: await hashFile(TEST_TOOL),
    },
    authorization: {
      correctionExecution: false,
      cohortValidationResumption: false,
      audioAccess: false,
      transcriptionOrModelExecution: false,
      paidServiceUse: false,
      adjudicationPacketPreparation: false,
      adjudicationModelExecution: false,
      finalLedgerAssembly: false,
      scoreDerivation: false,
      publicationReconstruction: false,
      productionMutation: false,
      nextBatchSelection: false,
    },
    nextAuthorizedAction:
      'user-approval-required-before-preparing-the-exact-correction-1-execution-harness-and-activation-manifest',
  };
}

assert(shouldWrite !== shouldCheck, 'pass exactly one of --write or --check');
const manifest = await buildManifest();
const rendered = `${JSON.stringify(manifest, null, 2)}\n`;

if (shouldWrite) {
  await writeFile(OUTPUT, rendered);
  console.log(`wrote ${OUTPUT}`);
} else {
  assert((await readFile(OUTPUT, 'utf8')) === rendered, 'frozen preparation manifest replay mismatch');
  console.log(`validated ${OUTPUT}`);
}
