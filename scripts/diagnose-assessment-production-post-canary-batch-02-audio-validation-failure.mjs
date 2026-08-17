import crypto from 'node:crypto';
import fs from 'node:fs';

const ROOT = process.cwd();
const OUTPUT_PATH =
  'docs/assessment-production/post-canary-continuation-v1/batch-02/audio-verification/failure-diagnosis.json';
const TOOL_PATH =
  'scripts/diagnose-assessment-production-post-canary-batch-02-audio-validation-failure.mjs';

const EVIDENCE = Object.freeze({
  request: {
    path: 'docs/assessment-production/post-canary-continuation-v1/batch-02/audio-verification/execution-manifest.json',
    sha256: '721dc697420d7aab79c5c1e715ebbf4ed67e27e608909e44be49e6526e68e34c',
  },
  transcript: {
    path: 'output/transcribe/assessment-production-post-canary-batch-02-audio-verification/debate-99/transcripts/pro-neural-correlation-interface-model.transcript.json',
    sha256: 'd74a06138cb65fca68b862f52447a2a09e6876722dca68a6cf44c02f22c312f1',
  },
  execution: {
    path: 'docs/assessment-production/post-canary-continuation-v1/batch-02/audio-verification/model-execution.json',
    sha256: 'cdb9921eae444eb525c73f81c633c5b1d1695ed9466c3c44da318f1988f490ec',
  },
  error: {
    path: 'docs/assessment-production/post-canary-continuation-v1/batch-02/audio-verification/validation-failure.json',
    sha256: '46091700f8fe40eb01070990b93acc37f60bbfa52cedfe4997ebc6ae9645121c',
  },
});

const EXPECTED = Object.freeze({
  checkpointCommit: '59483c04feeff2c785b46ebb84c7085e297f9799',
  sourceCheckpointCommit: '23677b333ee12df2b83d40599fdef045beb5e4c4',
  protocolId: 'assessment-production-post-canary-batch-02-decomposed-consensus',
  failedCallIndex: 6,
  failedCallOrdinal: 7,
  debateNumber: '99',
  debateId: 'jones-jump-digital-physics-god-2019',
  moveId: 'pro-neural-correlation-interface-model',
  expectedSpeaker: 'Michael Jones',
  model: 'gpt-4o-transcribe-diarize',
  responseFormat: 'diarized_json',
  chunkingStrategy: 'auto',
  language: 'en',
  segmentCount: 44,
  invalidSegmentIndex: 36,
  invalidSegmentId: 'seg_36',
  invalidSegmentType: 'transcript.text.segment',
  invalidSegmentSpeaker: 'A',
  invalidSegmentStart: 111.982,
  invalidSegmentEnd: 112.132,
  invalidSegmentDuration: 0.15,
  errorMessage: 'pro-neural-correlation-interface-model: segment 36 text invalid',
});

function absolute(relativePath) {
  return `${ROOT}/${relativePath}`;
}

function sha256File(relativePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(absolute(relativePath))).digest('hex');
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, label) {
  assert(Object.is(actual, expected), `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function assertDeepEqual(actual, expected, label) {
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), label);
}

function roundedDuration(start, end) {
  return Number((end - start).toFixed(6));
}

function safeSegmentShape(segment, index) {
  return {
    index,
    id: segment.id,
    type: segment.type,
    speaker: segment.speaker,
    start: segment.start,
    end: segment.end,
    durationSeconds:
      Number.isFinite(segment.start) && Number.isFinite(segment.end)
        ? roundedDuration(segment.start, segment.end)
        : null,
    textType: typeof segment.text,
    textLength: typeof segment.text === 'string' ? segment.text.length : null,
    trimmedTextLength: typeof segment.text === 'string' ? segment.text.trim().length : null,
  };
}

function hasNonemptyText(segment) {
  return typeof segment.text === 'string' && segment.text.trim().length > 0;
}

function buildDiagnosis() {
  for (const [role, source] of Object.entries(EVIDENCE)) {
    assertEqual(sha256File(source.path), source.sha256, `${role} evidence hash`);
  }

  const request = readJson(EVIDENCE.request.path);
  const transcript = readJson(EVIDENCE.transcript.path);
  const execution = readJson(EVIDENCE.execution.path);
  const error = readJson(EVIDENCE.error.path);
  const failure = error.deterministicValidationFailure;

  assertEqual(request.protocolId, EXPECTED.protocolId, 'request protocol');
  assertEqual(execution.protocolId, EXPECTED.protocolId, 'execution protocol');
  assertEqual(error.protocolId, EXPECTED.protocolId, 'error protocol');
  assertEqual(request.checkpointCommit, EXPECTED.sourceCheckpointCommit, 'request checkpoint');
  assertEqual(failure.failedCallIndex, EXPECTED.failedCallIndex, 'failed call index');
  assertEqual(failure.failedCallOrdinal, EXPECTED.failedCallOrdinal, 'failed call ordinal');
  assertEqual(failure.debateNumber, EXPECTED.debateNumber, 'failed debate number');
  assertEqual(failure.debateId, EXPECTED.debateId, 'failed debate id');
  assertEqual(failure.moveId, EXPECTED.moveId, 'failed move id');
  assertEqual(failure.expectedSpeaker, EXPECTED.expectedSpeaker, 'failed expected speaker');
  assertEqual(failure.transcriptPath, EVIDENCE.transcript.path, 'failed transcript path');
  assertEqual(failure.transcriptSha256, EVIDENCE.transcript.sha256, 'failed transcript hash');
  assertEqual(failure.errorMessage, EXPECTED.errorMessage, 'preserved error message');

  const matchingCalls = request.calls
    .map((call, index) => ({ call, index }))
    .filter(({ call }) => call.debateNumber === EXPECTED.debateNumber && call.moveId === EXPECTED.moveId);
  assertEqual(matchingCalls.length, 1, 'matching request call count');
  const { call, index: requestCallIndex } = matchingCalls[0];
  assertEqual(requestCallIndex, EXPECTED.failedCallIndex, 'request call index');
  assertEqual(call.debateId, EXPECTED.debateId, 'request debate id');
  assertEqual(call.expectedSpeaker, EXPECTED.expectedSpeaker, 'request expected speaker');
  assertEqual(call.transcriptPath, EVIDENCE.transcript.path, 'request transcript path');
  assertEqual(call.model, EXPECTED.model, 'request model');
  assertEqual(call.responseFormat, EXPECTED.responseFormat, 'request response format');
  assertEqual(call.chunkingStrategy, EXPECTED.chunkingStrategy, 'request chunking strategy');
  assertEqual(call.language, EXPECTED.language, 'request language');
  assertEqual(call.knownSpeakers.length, 2, 'known-speaker reference count');

  const matchingResults = execution.results
    .map((result, index) => ({ result, index }))
    .filter(({ result }) => result.debateNumber === EXPECTED.debateNumber && result.moveId === EXPECTED.moveId);
  assertEqual(matchingResults.length, 1, 'matching execution result count');
  const { result, index: executionResultIndex } = matchingResults[0];
  assertEqual(executionResultIndex, EXPECTED.failedCallIndex, 'execution result index');
  assertEqual(result.status, 'completed', 'execution result status');
  assertEqual(result.attemptCount, 1, 'execution attempt count');
  assertEqual(result.retryCount, 0, 'execution retry count');
  assertEqual(result.commandExitCode, 0, 'execution command exit code');
  assertEqual(result.terminationSignal, null, 'execution termination signal');
  assertEqual(result.transcriptWritten, true, 'transcript written');
  assertEqual(result.transcriptJsonValid, true, 'transport JSON validation');
  assertEqual(result.usageValid, true, 'usage validation');
  assertEqual(result.transcriptSha256, EVIDENCE.transcript.sha256, 'execution transcript hash');
  assertEqual(result.failureMessage, null, 'request failure message');
  assertEqual(execution.requestFailure, false, 'batch request failure');
  assertEqual(execution.retries, 0, 'batch retry count');

  assert(Array.isArray(transcript.segments), 'transcript segments must be an array');
  assertEqual(transcript.segments.length, EXPECTED.segmentCount, 'transcript segment count');
  assertEqual(transcript.duration, call.durationSeconds, 'request/transcript duration');
  assertEqual(result.durationSeconds, call.durationSeconds, 'request/execution duration');
  assert(typeof transcript.text === 'string' && transcript.text.length > 0, 'top-level transcript text must be nonempty');

  const emptyTextSegments = transcript.segments
    .map((segment, index) => ({ segment, index }))
    .filter(({ segment }) => !hasNonemptyText(segment));
  assertEqual(emptyTextSegments.length, 1, 'empty-text segment count');
  const invalid = emptyTextSegments[0];
  const invalidShape = safeSegmentShape(invalid.segment, invalid.index);
  assertDeepEqual(invalidShape, {
    index: EXPECTED.invalidSegmentIndex,
    id: EXPECTED.invalidSegmentId,
    type: EXPECTED.invalidSegmentType,
    speaker: EXPECTED.invalidSegmentSpeaker,
    start: EXPECTED.invalidSegmentStart,
    end: EXPECTED.invalidSegmentEnd,
    durationSeconds: EXPECTED.invalidSegmentDuration,
    textType: 'string',
    textLength: 0,
    trimmedTextLength: 0,
  }, 'invalid segment shape');
  assertDeepEqual(failure.invalidSegments, [{
    index: EXPECTED.invalidSegmentIndex,
    text: '',
    speaker: EXPECTED.invalidSegmentSpeaker,
    start: EXPECTED.invalidSegmentStart,
    end: EXPECTED.invalidSegmentEnd,
  }], 'preserved invalid segment');

  const nonemptyTextSegments = transcript.segments.filter(hasNonemptyText);
  assertEqual(nonemptyTextSegments.length, 43, 'nonempty-text segment count');
  const returnedSpeakerLabelCounts = Object.fromEntries(
    [...new Set(transcript.segments.map((segment) => segment.speaker))]
      .sort()
      .map((speaker) => [speaker, transcript.segments.filter((segment) => segment.speaker === speaker).length]),
  );
  assertDeepEqual(returnedSpeakerLabelCounts, { A: 13, 'Michael Jones': 31 }, 'returned speaker-label counts');

  const previousShape = safeSegmentShape(transcript.segments[35], 35);
  const nextShape = safeSegmentShape(transcript.segments[37], 37);
  assertEqual(previousShape.end, invalidShape.start, 'preceding boundary');
  assertEqual(invalidShape.end, nextShape.start, 'following boundary');

  const usageMatches =
    transcript.usage.input_tokens === result.usage.inputTokens &&
    transcript.usage.output_tokens === result.usage.outputTokens &&
    transcript.usage.total_tokens === result.usage.totalTokens &&
    transcript.usage.input_token_details.audio_tokens === result.usage.audioInputTokens &&
    transcript.usage.input_token_details.text_tokens === result.usage.textInputTokens;
  assertEqual(usageMatches, true, 'transcript/execution usage match');

  return {
    schemaVersion: '1.0-assessment-production-post-canary-batch-02-audio-validation-failure-diagnosis',
    protocolId: EXPECTED.protocolId,
    status: 'frozen-debate-99-response-schema-failure-diagnosed',
    diagnosedAt: '2026-08-17T17:45:29Z',
    checkpointCommit: EXPECTED.checkpointCommit,
    sourceCheckpointCommit: EXPECTED.sourceCheckpointCommit,
    productionCanary: false,
    batchNumber: 2,
    stagingOnly: true,
    userAuthorization: {
      instruction:
        'I approve deterministic diagnosis, validation, freezing, committing, and pushing of the preserved Batch 2 Debate 99 audio-verification validation failure only, with a direct incremental cost cap of $0. Use only the preserved request, transcript, execution, and error records. Do not access, download, play, or semantically evaluate audio; execute or retry transcription or other models; use paid services; filter, repair, normalize, or merge the transcript; alter the validator or thresholds; adjudicate; derive scores; reconstruct publication; mutate production; or select the next batch.',
      maximumDirectIncrementalCostUsd: 0,
      deterministicFailureDiagnosisAuthorized: true,
      deterministicValidationAuthorized: true,
      freezingAuthorized: true,
      commitAndPushAuthorized: true,
      transcriptMutationAuthorized: false,
      validatorOrThresholdMutationAuthorized: false,
      modelExecutionAuthorized: false,
      paidServiceAuthorized: false,
    },
    evidenceBoundary: {
      authorizedRecords: Object.fromEntries(
        Object.entries(EVIDENCE).map(([role, source]) => [role, { ...source }]),
      ),
      authorizedRecordCount: 4,
      audioFilesAccessed: 0,
      audioFilesDownloaded: 0,
      audioPlaybackCalls: 0,
      semanticAudioEvaluations: 0,
      transcriptTextIncludedInDiagnosis: false,
      transcriptTextSemanticallyEvaluated: false,
      modelOrApiCalls: 0,
      paidServiceCalls: 0,
    },
    target: {
      failedCallIndex: EXPECTED.failedCallIndex,
      failedCallOrdinal: EXPECTED.failedCallOrdinal,
      debateNumber: EXPECTED.debateNumber,
      debateId: EXPECTED.debateId,
      moveId: EXPECTED.moveId,
      expectedSpeaker: EXPECTED.expectedSpeaker,
      transcriptPath: EVIDENCE.transcript.path,
      transcriptSha256: EVIDENCE.transcript.sha256,
    },
    requestRecord: {
      exactTargetCallLocated: true,
      callIndex: requestCallIndex,
      model: call.model,
      responseFormat: call.responseFormat,
      chunkingStrategy: call.chunkingStrategy,
      language: call.language,
      clipSha256: call.clipSha256,
      durationSeconds: call.durationSeconds,
      knownSpeakerReferences: call.knownSpeakers.map((speaker) => ({
        speaker: speaker.speaker,
        sha256: speaker.sha256,
        durationSeconds: speaker.actualDurationSeconds,
      })),
      attemptsPerCallMaximum: request.executionPolicy.attemptsPerCall,
      retriesMaximum: request.executionPolicy.retriesMaximum,
    },
    executionRecord: {
      exactTargetResultLocated: true,
      resultIndex: executionResultIndex,
      status: result.status,
      attemptCount: result.attemptCount,
      retryCount: result.retryCount,
      commandExitCode: result.commandExitCode,
      terminationSignal: result.terminationSignal,
      transcriptWritten: result.transcriptWritten,
      transcriptJsonValid: result.transcriptJsonValid,
      usageValid: result.usageValid,
      transcriptSha256: result.transcriptSha256,
      failureMessage: result.failureMessage,
      requestFailure: execution.requestFailure,
      usageMatchesPreservedTranscript: usageMatches,
      preservedUsageDerivedEstimatedCostUsd: result.usageDerivedEstimatedCostUsd,
    },
    transcriptStructure: {
      jsonParsed: true,
      topLevelTextPresent: true,
      topLevelTextIncludedInDiagnosis: false,
      durationSeconds: transcript.duration,
      segmentCount: transcript.segments.length,
      segmentTypeCounts: {
        'transcript.text.segment': transcript.segments.filter(
          (segment) => segment.type === 'transcript.text.segment',
        ).length,
      },
      segmentIdsUnique:
        new Set(transcript.segments.map((segment) => segment.id)).size === transcript.segments.length,
      segmentStartsNondecreasing: transcript.segments.every(
        (segment, index, segments) => index === 0 || segment.start >= segments[index - 1].start,
      ),
      segmentEndsNondecreasing: transcript.segments.every(
        (segment, index, segments) => index === 0 || segment.end >= segments[index - 1].end,
      ),
      nonemptyTextSegmentCount: nonemptyTextSegments.length,
      emptyTextSegmentCount: emptyTextSegments.length,
      invalidSegment: invalidShape,
      adjacentBoundaries: {
        precedingSegmentEnd: previousShape.end,
        invalidSegmentStart: invalidShape.start,
        invalidSegmentEnd: invalidShape.end,
        followingSegmentStart: nextShape.start,
      },
      returnedSpeakerLabelCounts,
    },
    diagnosis: {
      classification: 'completed-transport-with-response-schema-invalid-empty-segment-text',
      transportLayerPassed: true,
      responseJsonParsed: true,
      segmentLevelValidationPassed: false,
      exactFailure:
        'The preserved diarized JSON has exactly one segment whose text is an empty string. The preserved error record identifies the same segment index and rejects that field under the unchanged validation gate.',
      invalidField: 'segments[36].text',
      invalidValueType: 'string',
      invalidValueLength: 0,
      invalidValueTrimmedLength: 0,
      invalidSegmentDurationSeconds: invalidShape.durationSeconds,
      otherSegmentsWithNonemptyText: nonemptyTextSegments.length,
      transcriptHashAgreement: {
        evidenceHash: EVIDENCE.transcript.sha256,
        executionResultHash: result.transcriptSha256,
        errorRecordHash: failure.transcriptSha256,
        allEqual: true,
      },
      requestConstructionFailureEstablished: false,
      transportFailureEstablished: false,
      localTranscriptMutationEstablished: false,
      retryOrRepairFailureEstablished: false,
      validatorOrThresholdMutationEstablished: false,
      providerReasonForEmptySegmentDetermined: false,
      audioContentOrSpeakerIdentityAccuracyDetermined: false,
      scopeConclusion:
        'The allowed records establish the exact structural reason for rejection, but they do not establish why the response contained the empty segment or whether any speaker label or transcript wording is semantically correct.',
    },
    preservedStopDisposition: {
      batchAudioGatePassed: false,
      remainingTranscriptValidationPerformedAfterFailure: false,
      downstreamWorkflowBlocked: true,
      originalTranscriptPreserved: true,
      transcriptFiltered: false,
      transcriptRepaired: false,
      transcriptNormalized: false,
      transcriptMerged: false,
      retryPerformed: false,
      validatorAltered: false,
      thresholdsAltered: false,
    },
    executionBoundary: {
      directIncrementalCostUsdMaximum: 0,
      directIncrementalCostUsdActual: 0,
      audioAccesses: 0,
      audioDownloads: 0,
      audioPlaybackCalls: 0,
      semanticAudioEvaluations: 0,
      transcriptionCalls: 0,
      modelOrApiCalls: 0,
      paidServiceCalls: 0,
      retries: 0,
      transcriptFilters: 0,
      transcriptRepairs: 0,
      transcriptNormalizations: 0,
      transcriptMerges: 0,
      validatorChanges: 0,
      thresholdChanges: 0,
      adjudications: 0,
      scoresDerived: 0,
      publicationReconstructions: 0,
      productionMutations: 0,
      nextBatchSelections: 0,
    },
    authorization: {
      correctionPreparation: false,
      correctionExecution: false,
      transcriptMutation: false,
      validatorOrThresholdMutation: false,
      audioAccess: false,
      transcriptionOrModelExecution: false,
      paidServiceUse: false,
      cohortValidationResumption: false,
      adjudication: false,
      scoreDerivation: false,
      publicationReconstruction: false,
      productionMutation: false,
      nextBatchSelection: false,
    },
    freezing: {
      evidenceHashesLocked: true,
      exactTargetLocked: true,
      diagnosisToolPath: TOOL_PATH,
      diagnosisToolSha256: sha256File(TOOL_PATH),
    },
    nextAuthorizedAction:
      'user-approval-required-before-any-batch-02-debate-99-audio-verification-correction-preparation-or-cohort-validation-resumption',
  };
}

const diagnosis = buildDiagnosis();
const rendered = `${JSON.stringify(diagnosis, null, 2)}\n`;
const checkOnly = process.argv.includes('--check');
const write = process.argv.includes('--write');

assert(checkOnly !== write, 'pass exactly one of --check or --write');

if (write) {
  fs.writeFileSync(absolute(OUTPUT_PATH), rendered);
  console.log(`wrote ${OUTPUT_PATH}`);
} else {
  assert(fs.existsSync(absolute(OUTPUT_PATH)), `${OUTPUT_PATH} is missing`);
  assertEqual(fs.readFileSync(absolute(OUTPUT_PATH), 'utf8'), rendered, `${OUTPUT_PATH} replay`);
  console.log(`validated ${OUTPUT_PATH}`);
}
