#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const ROOT = 'docs/assessment-production/post-canary-continuation-v1/batch-02/audio-verification';
const OUTPUT = `${ROOT}/debate-83-unresolved-diagnosis.json`;
const TOOL =
  'scripts/diagnose-assessment-production-post-canary-batch-02-audio-unresolved-debate-83.mjs';
const TEST =
  'scripts/test-assessment-production-post-canary-batch-02-audio-unresolved-debate-83-diagnosis.mjs';
const shouldWrite = process.argv.includes('--write');
const shouldCheck = process.argv.includes('--check');

const evidence = Object.freeze({
  request: {
    path: `${ROOT}/execution-manifest.json`,
    sha256: '721dc697420d7aab79c5c1e715ebbf4ed67e27e608909e44be49e6526e68e34c',
  },
  execution: {
    path: `${ROOT}/model-execution.json`,
    sha256: 'cdb9921eae444eb525c73f81c633c5b1d1695ed9466c3c44da318f1988f490ec',
  },
  correctionActivation: {
    path: `${ROOT}/correction-1-execution-activation.json`,
    sha256: 'dd34e9bd18e196a73e0c1cde4cfd6d1ecbf59ec2aa2aa745c9791e4ea0c22443',
  },
  correctionExecution: {
    path: `${ROOT}/correction-1-execution.json`,
    sha256: '2830f632ba95dc008930e4a9367c71e5f7c195094be8be79505044dba224575c',
  },
  audit: {
    path: `${ROOT}/audio-verification.json`,
    sha256: '299c3a87952730cc2d5b10ddc9a9e0c6b5939256eee54bbc2dfc011c8855624d',
  },
  analysis: {
    path: `${ROOT}/analysis.json`,
    sha256: 'd6c0e413f7376264a6f3eb9068b9b5e31bb9c07497e341e6e0f5f99e678c9c09',
  },
  transcript: {
    path: 'output/transcribe/assessment-production-post-canary-batch-02-audio-verification/debate-83/transcripts/pro-modality-02.transcript.json',
    sha256: 'fe1a99c87b0d33bc7d51d6d2c12799f1cc1e28639fec9d77456ef2c003c30712',
  },
  validator: {
    path: 'scripts/lib/v416-audio-verification.mjs',
    sha256: '9f7c2a6dc40b33de092503350994b3198588c5e9b7aaf9d547365e81ceb138d7',
  },
});

const expected = Object.freeze({
  checkpointCommit: '06a17be543736cadcaac86998c573c7d8255ad95',
  protocolId: 'assessment-production-post-canary-batch-02-decomposed-consensus',
  callIndex: 0,
  debateNumber: '83',
  debateId: 'loke-oppy-kalam-causal-principle-2020',
  moveId: 'pro-modality-02',
  expectedSpeaker: 'Andrew Loke',
  highestOtherSpeaker: 'Graham Oppy',
  referenceLexicalTokens: 75,
  segmentCount: 35,
});

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const hashFile = async (file) => sha256(await readFile(file));
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const round = (value, places = 15) => Number(value.toFixed(places));
const lexicalTokens = (value) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .match(/[a-z0-9]+(?:'[a-z0-9]+)?/g) ?? [];

async function buildDiagnosis() {
  for (const [role, source] of Object.entries(evidence)) {
    assert((await hashFile(source.path)) === source.sha256, `${role} evidence hash mismatch`);
  }

  const [request, execution, activation, correction, audit, analysis, transcript] =
    await Promise.all([
      readJson(evidence.request.path),
      readJson(evidence.execution.path),
      readJson(evidence.correctionActivation.path),
      readJson(evidence.correctionExecution.path),
      readJson(evidence.audit.path),
      readJson(evidence.analysis.path),
      readJson(evidence.transcript.path),
    ]);

  assert(request.protocolId === expected.protocolId, 'request protocol changed');
  assert(execution.protocolId === expected.protocolId, 'execution protocol changed');
  assert(correction.protocolId === expected.protocolId, 'correction protocol changed');
  assert(audit.protocolId === expected.protocolId, 'audit protocol changed');
  assert(analysis.protocolId === expected.protocolId, 'analysis protocol changed');
  assert(
    activation.status === 'frozen-debate-99-correction-1-deterministic-replay-authorized',
    'correction activation changed',
  );
  assert(
    correction.status === 'post-canary-batch-02-audio-verification-unresolved-after-correction-1-overlay' &&
      correction.deterministicPassesAttempted === 1 &&
      correction.deterministicPassesCompleted === 1 &&
      correction.retries === 0 &&
      correction.reruns === 0 &&
      correction.verified === 9 &&
      correction.unresolved === 1,
    'preserved correction outcome changed',
  );
  assert(
    correction.audioAccesses === 0 &&
      correction.modelOrApiCalls === 0 &&
      correction.paidServiceCalls === 0 &&
      correction.directIncrementalCostUsd === 0,
    'correction execution boundary changed',
  );
  assert(
    analysis.gate.passed === false &&
      analysis.gate.deterministicReplayComplete === true &&
      analysis.gate.verified === 9 &&
      analysis.gate.unresolved === 1,
    'analysis gate changed',
  );

  const matchingCalls = request.calls
    .map((call, index) => ({ call, index }))
    .filter(
      ({ call }) =>
        call.debateNumber === expected.debateNumber && call.moveId === expected.moveId,
    );
  assert(matchingCalls.length === 1, 'exact request call missing');
  const { call, index: callIndex } = matchingCalls[0];
  assert(callIndex === expected.callIndex, 'request call index changed');
  assert(call.debateId === expected.debateId, 'request debate id changed');
  assert(call.expectedSpeaker === expected.expectedSpeaker, 'expected speaker changed');
  assert(call.transcriptPath === evidence.transcript.path, 'transcript path changed');
  assert(lexicalTokens(call.verificationExcerpt).length === expected.referenceLexicalTokens, 'reference token count changed');

  const matchingResults = execution.results.filter(
    (result) =>
      result.debateNumber === expected.debateNumber && result.moveId === expected.moveId,
  );
  assert(matchingResults.length === 1, 'exact execution result missing');
  const result = matchingResults[0];
  assert(
    result.status === 'completed' &&
      result.attemptCount === 1 &&
      result.retryCount === 0 &&
      result.commandExitCode === 0 &&
      result.terminationSignal === null &&
      result.transcriptWritten === true &&
      result.transcriptJsonValid === true &&
      result.usageValid === true &&
      result.failureMessage === null,
    'request transport record changed',
  );
  assert(result.transcriptSha256 === evidence.transcript.sha256, 'execution transcript hash changed');

  const moves = audit.debates.flatMap((debate) => debate.moves);
  const unresolvedMoves = moves.filter((move) => move.status !== 'verified');
  assert(unresolvedMoves.length === 1, 'exactly one unresolved move required');
  const move = unresolvedMoves[0];
  assert(
    move.debateNumber === expected.debateNumber &&
      move.debateId === expected.debateId &&
      move.moveId === expected.moveId &&
      move.expectedSpeaker === expected.expectedSpeaker &&
      move.resolvedSpeaker === null &&
      move.validationOverlay === null,
    'unresolved move identity changed',
  );
  assert(move.transcript.sha256 === evidence.transcript.sha256, 'audit transcript hash changed');

  const thresholds = request.thresholds;
  const deterministic = move.deterministicEvidence;
  assert(deterministic.status === 'unresolved', 'deterministic status changed');
  assert(deterministic.expectedSpeaker === expected.expectedSpeaker, 'deterministic expected speaker changed');
  assert(deterministic.highestOtherSpeaker === expected.highestOtherSpeaker, 'highest other speaker changed');
  assert(
    deterministic.checks.fullClipExcerptRecovered === true &&
      deterministic.checks.expectedSpeakerExcerptRecovered === false &&
      deterministic.checks.expectedSpeakerRecallDistinct === false &&
      deterministic.checks.expectedSpeakerDurationSufficient === true,
    'deterministic check disposition changed',
  );

  const referenceTokenCount = expected.referenceLexicalTokens;
  const fullClipMatchedTokens = Math.round(
    deterministic.fullClipExcerptRecall * referenceTokenCount,
  );
  const expectedSpeakerMatchedTokens = Math.round(
    deterministic.expectedSpeakerExcerptRecall * referenceTokenCount,
  );
  const highestOtherMatchedTokens = Math.round(
    deterministic.highestOtherSpeakerExcerptRecall * referenceTokenCount,
  );
  const expectedSpeakerRequiredTokens = Math.ceil(
    thresholds.minimumExpectedSpeakerExcerptRecall * referenceTokenCount,
  );
  const requiredMarginTokens = Math.ceil(
    thresholds.minimumExpectedSpeakerRecallMargin * referenceTokenCount,
  );
  const actualMarginTokens = expectedSpeakerMatchedTokens - highestOtherMatchedTokens;
  assert(fullClipMatchedTokens === 74, 'full-clip matched-token count changed');
  assert(expectedSpeakerMatchedTokens === 56, 'expected-speaker matched-token count changed');
  assert(highestOtherMatchedTokens === 46, 'other-speaker matched-token count changed');
  assert(expectedSpeakerRequiredTokens === 60, 'expected-speaker token threshold changed');
  assert(requiredMarginTokens === 12, 'margin token threshold changed');
  assert(actualMarginTokens === 10, 'actual margin token count changed');

  assert(Array.isArray(transcript.segments) && transcript.segments.length === expected.segmentCount, 'transcript segment count changed');
  assert(typeof transcript.text === 'string' && transcript.text.trim().length > 0, 'top-level transcript text missing');
  assert(
    transcript.segments.every(
      (segment) => typeof segment.text === 'string' && segment.text.trim().length > 0,
    ),
    'transcript has an empty-text segment',
  );
  const speakerLabels = [...new Set(transcript.segments.map((segment) => segment.speaker))].sort();
  assert(
    JSON.stringify(speakerLabels) === JSON.stringify(['A', 'Andrew Loke', 'Graham Oppy']),
    'speaker-label inventory changed',
  );

  const speakerEvidence = deterministic.speakerEvidence.map((speaker) => ({ ...speaker }));
  const expectedEvidence = speakerEvidence.find(
    (speaker) => speaker.speaker === expected.expectedSpeaker,
  );
  const otherEvidence = speakerEvidence.find(
    (speaker) => speaker.speaker === expected.highestOtherSpeaker,
  );
  const anonymousEvidence = speakerEvidence.find((speaker) => speaker.speaker === 'A');
  assert(
    expectedEvidence?.segmentCount === 25 &&
      expectedEvidence.durationSeconds === 59.55 &&
      expectedEvidence.wordCount === 222,
    'expected-speaker structural evidence changed',
  );
  assert(
    otherEvidence?.segmentCount === 9 &&
      otherEvidence.durationSeconds === 32.1 &&
      otherEvidence.wordCount === 93,
    'other-speaker structural evidence changed',
  );
  assert(
    anonymousEvidence?.segmentCount === 1 &&
      anonymousEvidence.durationSeconds === 1 &&
      anonymousEvidence.wordCount === 6,
    'anonymous-speaker structural evidence changed',
  );

  return {
    schemaVersion:
      '1.0-assessment-production-post-canary-batch-02-audio-unresolved-diagnosis',
    protocolId: expected.protocolId,
    status: 'frozen-debate-83-pro-modality-02-attribution-threshold-failure-diagnosed',
    diagnosedAt: '2026-08-17T19:10:30Z',
    checkpointCommit: expected.checkpointCommit,
    productionCanary: false,
    batchNumber: 2,
    stagingOnly: true,
    userAuthorization: {
      instruction: 'I approve.',
      interpretedScope:
        'Deterministically diagnose, validate, freeze, commit, and push the preserved Debate 83 pro-modality-02 unresolved audio-verification result only.',
      directIncrementalCostUsdMaximum: 0,
      diagnosisAuthorized: true,
      correctionPreparationAuthorized: false,
      correctionExecutionAuthorized: false,
      cohortRerunAuthorized: false,
      audioAccessAuthorized: false,
      modelExecutionAuthorized: false,
      paidServiceUseAuthorized: false,
    },
    evidenceBoundary: {
      records: Object.fromEntries(
        Object.entries(evidence).map(([role, source]) => [role, { ...source }]),
      ),
      recordCount: Object.keys(evidence).length,
      transcriptTextIncludedInDiagnosis: false,
      transcriptTextSemanticallyEvaluated: false,
      audioFilesAccessed: 0,
      audioFilesDownloaded: 0,
      audioPlaybackCalls: 0,
      semanticAudioEvaluations: 0,
      modelOrApiCalls: 0,
      paidServiceCalls: 0,
    },
    target: {
      callIndex,
      debateNumber: expected.debateNumber,
      debateId: expected.debateId,
      moveId: expected.moveId,
      expectedSpeaker: expected.expectedSpeaker,
      highestOtherSpeaker: expected.highestOtherSpeaker,
      transcriptPath: evidence.transcript.path,
      transcriptSha256: evidence.transcript.sha256,
      validationOverlayApplied: false,
    },
    transportRecord: {
      status: result.status,
      attemptCount: result.attemptCount,
      retryCount: result.retryCount,
      commandExitCode: result.commandExitCode,
      terminationSignal: result.terminationSignal,
      transcriptWritten: result.transcriptWritten,
      transcriptJsonValid: result.transcriptJsonValid,
      usageValid: result.usageValid,
      failureMessage: result.failureMessage,
      transcriptSha256: result.transcriptSha256,
      transportPassed: true,
    },
    transcriptStructure: {
      jsonParsed: true,
      durationSeconds: transcript.duration,
      segmentCount: transcript.segments.length,
      nonemptyTextSegmentCount: transcript.segments.length,
      emptyTextSegmentCount: 0,
      speakerLabels,
      speakerEvidence,
      transcriptSchemaFailureEstablished: false,
    },
    thresholds: { ...thresholds },
    deterministicEvidence: {
      fullClipExcerptRecall: deterministic.fullClipExcerptRecall,
      expectedSpeakerExcerptRecall: deterministic.expectedSpeakerExcerptRecall,
      highestOtherSpeakerExcerptRecall:
        deterministic.highestOtherSpeakerExcerptRecall,
      expectedSpeakerRecallMargin: deterministic.expectedSpeakerRecallMargin,
      expectedSpeakerDurationSeconds:
        deterministic.expectedSpeakerDurationSeconds,
      checks: { ...deterministic.checks },
    },
    tokenAccounting: {
      referenceLexicalTokens: referenceTokenCount,
      fullClipMatchedTokens,
      expectedSpeakerMatchedTokens,
      highestOtherSpeakerMatchedTokens: highestOtherMatchedTokens,
      expectedSpeakerRequiredTokens,
      expectedSpeakerTokenDeficit:
        expectedSpeakerRequiredTokens - expectedSpeakerMatchedTokens,
      actualMarginTokens,
      requiredMarginTokens,
      marginTokenDeficit: requiredMarginTokens - actualMarginTokens,
    },
    numericalAccounting: {
      fullClipRecallSurplus: round(
        deterministic.fullClipExcerptRecall -
          thresholds.minimumFullClipExcerptRecall,
      ),
      expectedSpeakerRecallDeficit: round(
        thresholds.minimumExpectedSpeakerExcerptRecall -
          deterministic.expectedSpeakerExcerptRecall,
      ),
      recallMarginDeficit: round(
        thresholds.minimumExpectedSpeakerRecallMargin -
          deterministic.expectedSpeakerRecallMargin,
      ),
      expectedSpeakerDurationSurplusSeconds: round(
        deterministic.expectedSpeakerDurationSeconds -
          thresholds.minimumExpectedSpeakerDurationSeconds,
        3,
      ),
    },
    diagnosis: {
      classification:
        'completed-valid-diarized-response-with-two-attribution-threshold-failures',
      exactCause:
        'The unchanged deterministic validator rejected the move because expected-speaker excerpt recall and expected-speaker recall margin were below their frozen thresholds. Full-clip excerpt recall and expected-speaker duration passed.',
      failedChecks: [
        'expectedSpeakerExcerptRecovered',
        'expectedSpeakerRecallDistinct',
      ],
      passedChecks: [
        'fullClipExcerptRecovered',
        'expectedSpeakerDurationSufficient',
      ],
      transportFailureEstablished: false,
      responseSchemaFailureEstablished: false,
      transcriptMutationEstablished: false,
      validatorOrThresholdMutationEstablished: false,
      correctionOverlayContributionEstablished: false,
      speakerLabelErrorEstablished: false,
      clipBoundaryErrorEstablished: false,
      knownSpeakerReferenceErrorEstablished: false,
      providerCauseEstablished: false,
      audioContentOrSpeakerIdentityAccuracyDetermined: false,
      scopeConclusion:
        'The preserved records establish the two numerical threshold failures and their exact deficits. They do not establish why substantial reference-token overlap appears under both named speaker labels or whether any label, clip boundary, known-speaker reference, or transcript wording is semantically correct.',
    },
    preservedStopDisposition: {
      batchAudioGatePassed: false,
      downstreamWorkflowBlocked: true,
      correctionPrepared: false,
      correctionExecuted: false,
      retryPerformed: false,
      cohortRerunPerformed: false,
      transcriptMutated: false,
      validatorAltered: false,
      thresholdsAltered: false,
    },
    executionBoundary: {
      directIncrementalCostUsdMaximum: 0,
      directIncrementalCostUsdActual: 0,
      diagnosisRecordsPrepared: 1,
      correctionPlansPrepared: 0,
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
    authorization: {
      correctionPreparation: false,
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
    freezing: {
      evidenceHashesLocked: true,
      exactTargetLocked: true,
      diagnosisToolPath: TOOL,
      diagnosisToolSha256: await hashFile(TOOL),
      diagnosisTestPath: TEST,
      diagnosisTestSha256: await hashFile(TEST),
    },
    nextAuthorizedAction:
      'user-approval-required-before-any-batch-02-debate-83-audio-verification-correction-plan-or-audio-access',
  };
}

assert(shouldWrite !== shouldCheck, 'pass exactly one of --write or --check');
const diagnosis = await buildDiagnosis();
const rendered = `${JSON.stringify(diagnosis, null, 2)}\n`;

if (shouldWrite) {
  await writeFile(OUTPUT, rendered);
  console.log(`wrote ${OUTPUT}`);
} else {
  assert((await readFile(OUTPUT, 'utf8')) === rendered, 'diagnosis replay mismatch');
  console.log(`validated ${OUTPUT}`);
}
