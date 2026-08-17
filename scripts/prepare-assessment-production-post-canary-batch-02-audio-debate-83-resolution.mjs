#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const ROOT =
  'docs/assessment-production/post-canary-continuation-v1/batch-02/audio-verification';
const PLAN = `${ROOT}/debate-83-resolution-plan.json`;
const EXECUTION_PREPARATION =
  `${ROOT}/debate-83-resolution-execution-preparation-manifest.json`;
const PREPARATION_TOOL =
  'scripts/prepare-assessment-production-post-canary-batch-02-audio-debate-83-resolution.mjs';
const TEST_TOOL =
  'scripts/test-assessment-production-post-canary-batch-02-audio-debate-83-resolution-preparation.mjs';
const shouldWrite = process.argv.includes('--write');
const shouldCheck = process.argv.includes('--check');

const paths = Object.freeze({
  diagnosis: `${ROOT}/debate-83-unresolved-diagnosis.json`,
  request: `${ROOT}/execution-manifest.json`,
  execution: `${ROOT}/model-execution.json`,
  correction1Preparation: `${ROOT}/correction-1-preparation-manifest.json`,
  correction1Activation: `${ROOT}/correction-1-execution-activation.json`,
  correction1Execution: `${ROOT}/correction-1-execution.json`,
  audit: `${ROOT}/audio-verification.json`,
  analysis: `${ROOT}/analysis.json`,
  inventory:
    'docs/assessment-production/post-canary-continuation-v1/batch-02/inventory-candidate-sharded/locked-inventories/debate-83.json',
  audioWorkItems:
    'docs/assessment-production/post-canary-continuation-v1/batch-02/disagreement-extraction/audio-work-items.json',
  validator: 'scripts/lib/v416-audio-verification.mjs',
  workflow: 'docs/assessment-production-workflow.md',
  activeScorePolicy:
    'docs/assessment-production/score-stability-policy-v2.2-promotion.json',
  productionManifest: 'docs/assessment-production/manifest-v1.json',
});

const expectedHashes = Object.freeze({
  [paths.diagnosis]:
    '607e5f51630de224d9bf1d26f2c4dcb21a0a7889f12c578d7d2432ec82909c13',
  [paths.request]:
    '721dc697420d7aab79c5c1e715ebbf4ed67e27e608909e44be49e6526e68e34c',
  [paths.execution]:
    'cdb9921eae444eb525c73f81c633c5b1d1695ed9466c3c44da318f1988f490ec',
  [paths.correction1Preparation]:
    '92907f6c4140b1b6aff8750daef1d2a9d4d002b2a54297cc65fae83a34e78edb',
  [paths.correction1Activation]:
    'dd34e9bd18e196a73e0c1cde4cfd6d1ecbf59ec2aa2aa745c9791e4ea0c22443',
  [paths.correction1Execution]:
    '2830f632ba95dc008930e4a9367c71e5f7c195094be8be79505044dba224575c',
  [paths.audit]:
    '299c3a87952730cc2d5b10ddc9a9e0c6b5939256eee54bbc2dfc011c8855624d',
  [paths.analysis]:
    'd6c0e413f7376264a6f3eb9068b9b5e31bb9c07497e341e6e0f5f99e678c9c09',
  [paths.inventory]:
    '8571cb81426f2c2004e3439ea546132947fdd5b87aff34866febf06b57c0cf95',
  [paths.audioWorkItems]:
    'f72b3d23f889b8dee65b51d6b96e504efeb72e3519ac22dc78679aa5eee6d4ff',
  [paths.validator]:
    '9f7c2a6dc40b33de092503350994b3198588c5e9b7aaf9d547365e81ceb138d7',
  [paths.workflow]:
    '41a61ee605bc1dfd4f21a5738c709560a98c9598fe16c2b385d013cdbb43a3ee',
  [paths.activeScorePolicy]:
    '2a018107434edb8a31020e441a2088e2d259596d49bedd8ccc89eaee0880f666',
  [paths.productionManifest]:
    '1359a7b39718aaa85f914d27ad743efa50c60370ad0f6aec061423f7cd4f08ec',
});

const target = Object.freeze({
  callIndex: 0,
  debateNumber: '83',
  debateId: 'loke-oppy-kalam-causal-principle-2020',
  moveId: 'pro-modality-02',
  expectedSpeaker: 'Andrew Loke',
  highestOtherSpeaker: 'Graham Oppy',
  transcriptPath:
    'output/transcribe/assessment-production-post-canary-batch-02-audio-verification/debate-83/transcripts/pro-modality-02.transcript.json',
  transcriptSha256:
    'fe1a99c87b0d33bc7d51d6d2c12799f1cc1e28639fec9d77456ef2c003c30712',
  supportSegmentIndex: 27,
  supportSegmentId: 'seg_27',
  supportSegmentStart: 86.548,
  supportSegmentEnd: 91.048,
});

const replacementExcerpt =
  "well i'm not claiming the second thing right i'm not claiming that god exists in all logical possible";

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const hashFile = async (file) => sha256(await readFile(file));
const lexicalTokens = (value) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .match(/[a-z0-9]+(?:'[a-z0-9]+)?/g) ?? [];

async function authenticateSources() {
  for (const [file, digest] of Object.entries(expectedHashes)) {
    assert((await hashFile(file)) === digest, `source hash mismatch: ${file}`);
  }

  const [
    diagnosis,
    request,
    execution,
    correction1Preparation,
    correction1Activation,
    correction1Execution,
    audit,
    analysis,
    inventory,
    audioWorkItems,
    transcript,
  ] = await Promise.all([
    readJson(paths.diagnosis),
    readJson(paths.request),
    readJson(paths.execution),
    readJson(paths.correction1Preparation),
    readJson(paths.correction1Activation),
    readJson(paths.correction1Execution),
    readJson(paths.audit),
    readJson(paths.analysis),
    readJson(paths.inventory),
    readJson(paths.audioWorkItems),
    readJson(target.transcriptPath),
  ]);

  assert(
    diagnosis.status ===
      'frozen-debate-83-pro-modality-02-attribution-threshold-failure-diagnosed',
    'Debate 83 diagnosis changed',
  );
  assert(
    diagnosis.target.debateNumber === target.debateNumber &&
      diagnosis.target.moveId === target.moveId &&
      diagnosis.target.transcriptSha256 === target.transcriptSha256,
    'diagnosed target changed',
  );
  assert(
    diagnosis.diagnosis.transportFailureEstablished === false &&
      diagnosis.diagnosis.responseSchemaFailureEstablished === false &&
      diagnosis.diagnosis.speakerLabelErrorEstablished === false &&
      diagnosis.diagnosis.clipBoundaryErrorEstablished === false &&
      diagnosis.diagnosis.providerCauseEstablished === false,
    'diagnosis scope changed',
  );
  assert(
    request.status ===
      'frozen-ten-post-canary-batch-02-paid-known-speaker-diarizations-authorized' &&
      request.calls.length === 10,
    'original request changed',
  );
  assert(
    execution.status ===
      'ten-post-canary-batch-02-paid-known-speaker-diarizations-completed' &&
      execution.callsCompleted === 10 &&
      execution.callsAttempted === 10 &&
      execution.retries === 0,
    'original execution changed',
  );
  assert(
    correction1Preparation.status ===
      'frozen-debate-99-empty-segment-validation-overlay-plan-prepared',
    'Debate 99 correction-1 plan changed',
  );
  assert(
    correction1Activation.status ===
      'frozen-debate-99-correction-1-deterministic-replay-authorized',
    'Debate 99 correction-1 activation changed',
  );
  assert(
    correction1Execution.status ===
      'post-canary-batch-02-audio-verification-unresolved-after-correction-1-overlay' &&
      correction1Execution.deterministicPassesAttempted === 1 &&
      correction1Execution.deterministicPassesCompleted === 1 &&
      correction1Execution.verified === 9 &&
      correction1Execution.unresolved === 1 &&
      correction1Execution.retries === 0 &&
      correction1Execution.reruns === 0,
    'correction-1 outcome changed',
  );
  assert(
    correction1Execution.audioAccesses === 0 &&
      correction1Execution.modelOrApiCalls === 0 &&
      correction1Execution.paidServiceCalls === 0,
    'correction-1 execution boundary changed',
  );
  assert(
    analysis.gate.passed === false &&
      analysis.gate.verified === 9 &&
      analysis.gate.unresolved === 1,
    'current audio gate changed',
  );

  const call = request.calls[target.callIndex];
  assert(
    call.debateNumber === target.debateNumber &&
      call.debateId === target.debateId &&
      call.moveId === target.moveId &&
      call.expectedSpeaker === target.expectedSpeaker &&
      call.transcriptPath === target.transcriptPath,
    'exact target call changed',
  );
  assert(call.model === 'gpt-4o-transcribe-diarize', 'audio model record changed');
  assert(
    call.knownSpeakers.length === 2 &&
      call.knownSpeakers[0].speaker === target.expectedSpeaker &&
      call.knownSpeakers[1].speaker === target.highestOtherSpeaker,
    'known-speaker references changed',
  );
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

  const inventoryMove = inventory.moves.find(
    (move) => move.moveId === target.moveId,
  );
  const workItem = audioWorkItems.moves.find(
    (move) =>
      move.debateNumber === target.debateNumber && move.moveId === target.moveId,
  );
  assert(inventoryMove, 'locked inventory move missing');
  assert(workItem, 'audio work item missing');
  assert(
    inventoryMove.speaker === target.expectedSpeaker &&
      workItem.expectedSpeaker === target.expectedSpeaker,
    'locked expected speaker changed',
  );
  assert(
    call.verificationExcerpt === inventoryMove.finalSelectedEvidence.excerpt &&
      call.verificationExcerpt === workItem.verificationExcerpt,
    'original verification excerpt route changed',
  );
  assert(
    lexicalTokens(call.verificationExcerpt).length === 75,
    'original verification excerpt token count changed',
  );
  assert(
    call.verificationExcerpt.includes(replacementExcerpt),
    'replacement is not an exact substring of the frozen verification excerpt',
  );
  assert(
    lexicalTokens(replacementExcerpt).length === 18,
    'replacement excerpt must have exactly 18 lexical tokens',
  );

  assert((await hashFile(target.transcriptPath)) === target.transcriptSha256, 'target transcript hash changed');
  assert(
    Array.isArray(transcript.segments) && transcript.segments.length === 35,
    'target transcript structure changed',
  );
  const supportSegment = transcript.segments[target.supportSegmentIndex];
  assert(
    supportSegment.id === target.supportSegmentId &&
      supportSegment.speaker === target.expectedSpeaker &&
      supportSegment.start === target.supportSegmentStart &&
      supportSegment.end === target.supportSegmentEnd,
    'speaker-support segment changed',
  );
  assert(
    lexicalTokens(supportSegment.text).slice(0, 18).join(' ') ===
      replacementExcerpt,
    'replacement is not the frozen expected-speaker segment prefix',
  );

  const unresolvedMoves = audit.debates
    .flatMap((debate) => debate.moves)
    .filter((move) => move.status !== 'verified');
  assert(unresolvedMoves.length === 1, 'exactly one unresolved move required');
  const unresolved = unresolvedMoves[0];
  assert(
    unresolved.debateNumber === target.debateNumber &&
      unresolved.moveId === target.moveId &&
      unresolved.validationOverlay === null &&
      unresolved.deterministicEvidence.expectedSpeakerExcerptRecall ===
        0.7466666666666667 &&
      unresolved.deterministicEvidence.expectedSpeakerRecallMargin ===
        0.13333333333333341,
    'preserved unresolved evidence changed',
  );

  const transcriptLocks = [];
  for (const [callIndex, requestCall] of request.calls.entries()) {
    const result = execution.results.find(
      (item) =>
        item.debateNumber === requestCall.debateNumber &&
        item.moveId === requestCall.moveId,
    );
    assert(result?.status === 'completed', `${requestCall.moveId}: completed result missing`);
    assert(
      result.attemptCount === 1 && result.retryCount === 0,
      `${requestCall.moveId}: attempt policy changed`,
    );
    assert(
      result.transcriptWritten && result.transcriptJsonValid && result.usageValid,
      `${requestCall.moveId}: preserved transcript record invalid`,
    );
    assert(
      (await hashFile(requestCall.transcriptPath)) === result.transcriptSha256,
      `${requestCall.moveId}: transcript hash mismatch`,
    );
    transcriptLocks.push({
      callIndex,
      debateNumber: requestCall.debateNumber,
      debateId: requestCall.debateId,
      moveId: requestCall.moveId,
      path: requestCall.transcriptPath,
      sha256: result.transcriptSha256,
    });
  }

  return {
    diagnosis,
    request,
    call,
    inventoryMove,
    workItem,
    unresolved,
    supportSegment,
    transcriptLocks,
  };
}

async function buildArtifacts() {
  const authenticated = await authenticateSources();
  const sourceLocks = Object.fromEntries(
    await Promise.all(
      Object.values(paths).map(async (file) => [file, await hashFile(file)]),
    ),
  );
  const toolLocks = {
    [PREPARATION_TOOL]: await hashFile(PREPARATION_TOOL),
    [TEST_TOOL]: await hashFile(TEST_TOOL),
  };
  const originalExcerptSha256 = sha256(
    Buffer.from(authenticated.call.verificationExcerpt),
  );
  const replacementExcerptSha256 = sha256(Buffer.from(replacementExcerpt));
  const proposedDelta = {
    operation:
      'replace-only-the-transient-debate-83-verification-reference-with-one-source-exact-expected-speaker-substring',
    targetCallIndex: target.callIndex,
    targetDebateNumber: target.debateNumber,
    targetMoveId: target.moveId,
    field: 'verificationExcerpt',
    originalValueSha256: originalExcerptSha256,
    originalLexicalTokenCount: 75,
    replacementValue: replacementExcerpt,
    replacementValueSha256: replacementExcerptSha256,
    replacementLexicalTokenCount: 18,
    replacementStartCharacter:
      authenticated.call.verificationExcerpt.indexOf(replacementExcerpt),
    replacementIsExactSubstringOfOriginal: true,
    replacementSupport: {
      transcriptPath: target.transcriptPath,
      transcriptSha256: target.transcriptSha256,
      segmentIndex: target.supportSegmentIndex,
      segmentId: target.supportSegmentId,
      speaker: target.expectedSpeaker,
      start: target.supportSegmentStart,
      end: target.supportSegmentEnd,
      lexicalPrefixTokensUsed: 18,
    },
    originalRequestWrite: false,
    originalInventoryWrite: false,
    originalAudioWorkItemWrite: false,
    originalTranscriptWrite: false,
    validatorWrite: false,
    thresholdWrite: false,
  };
  const deltaSha256 = sha256(Buffer.from(JSON.stringify(proposedDelta)));

  const plan = {
    schemaVersion:
      '1.0-assessment-production-post-canary-batch-02-debate-83-audio-resolution-plan',
    protocolId: authenticated.request.protocolId,
    status:
      'frozen-debate-83-speaker-mixed-verification-reference-correction-2-plan-prepared',
    preparedAt: '2026-08-17T19:20:52Z',
    checkpointCommit: '83e1b146de6ac17d12584d37daf4cd82c02a2e8f',
    productionCanary: false,
    batchNumber: 2,
    stagingOnly: true,
    userAuthorization: {
      instruction: 'I approve.',
      interpretedScope:
        'Prepare, validate, freeze, commit, and push one zero-cost Debate 83 audio-verification resolution plan and its execution-preparation manifest only.',
      directIncrementalCostUsdMaximum: 0,
      resolutionPlanPreparationAuthorized: true,
      executionPreparationManifestAuthorized: true,
      executionHarnessPreparationAuthorized: false,
      correctionExecutionAuthorized: false,
      cohortReplayAuthorized: false,
      audioAccessAuthorized: false,
      modelExecutionAuthorized: false,
      paidServiceUseAuthorized: false,
    },
    sourceLocks,
    transcriptLocks: authenticated.transcriptLocks,
    target: {
      callIndex: target.callIndex,
      debateNumber: target.debateNumber,
      debateId: target.debateId,
      moveId: target.moveId,
      expectedSpeaker: target.expectedSpeaker,
      highestOtherSpeaker: target.highestOtherSpeaker,
      transcriptPath: target.transcriptPath,
      transcriptSha256: target.transcriptSha256,
      clipPath: authenticated.call.clipPath,
      clipSha256: authenticated.call.clipSha256,
      clipDurationSeconds: authenticated.call.durationSeconds,
      knownSpeakerReferences: authenticated.call.knownSpeakers.map((speaker) => ({
        speaker: speaker.speaker,
        path: speaker.localPath,
        sha256: speaker.sha256,
        durationSeconds: speaker.actualDurationSeconds,
      })),
      audioFilesReadDuringPreparation: 0,
    },
    diagnosedMismatch: {
      classification:
        'single-speaker-validator-received-a-speaker-mixed-verification-reference',
      preservedReferenceLexicalTokens: 75,
      preservedFullClipMatchedTokens: 74,
      preservedExpectedSpeakerMatchedTokens: 56,
      preservedHighestOtherSpeakerMatchedTokens: 46,
      expectedSpeakerRequiredTokens: 60,
      requiredMarginTokens: 12,
      actualMarginTokens: 10,
      failedChecks: [
        'expectedSpeakerExcerptRecovered',
        'expectedSpeakerRecallDistinct',
      ],
      structuralBasis:
        'The frozen 75-token reference is the complete selected evidence excerpt. In the preserved diarized transcript, portions of that reference occur under both named speakers. The proposed substring is an exact part of the frozen reference and the lexical prefix of one preserved segment labeled Andrew Loke.',
      semanticSpeakerIdentityIndependentlyProved: false,
      providerLabelCorrectnessEstablished: false,
      clipBoundaryErrorEstablished: false,
      validatorDefectEstablished: false,
      thresholdDefectEstablished: false,
      planningConclusion:
        'The reference violates the validator input assumption that the verification text should identify one expected speaker. Repairing only that transient reference is narrower than changing the transcript, validator, thresholds, speaker labels, or audio inputs.',
    },
    proposedCorrection: {
      ...proposedDelta,
      deltaSha256,
      correctionExecutedThisStage: false,
      prospectiveValidatorEvaluationExecutedThisStage: false,
      proposedPersistentOutputPath: null,
      proposedPersistentOutputSha256: null,
    },
    preservedDebate99Overlay: {
      requiredForFutureCohortReplay: true,
      preparationPath: paths.correction1Preparation,
      preparationSha256: sourceLocks[paths.correction1Preparation],
      activationPath: paths.correction1Activation,
      activationSha256: sourceLocks[paths.correction1Activation],
      executionPath: paths.correction1Execution,
      executionSha256: sourceLocks[paths.correction1Execution],
      operation:
        'omit-one-exact-empty-text-segment-from-transient-validation-overlay',
      targetMoveId: 'pro-neural-correlation-interface-model',
      persistentTranscriptWrite: false,
      unchanged: true,
    },
    futureExecutionContract: {
      separateExplicitUserApprovalRequired: true,
      executionHarnessMustBePreparedAndHashLockedBeforeExecution: true,
      activationManifestRequired: true,
      deterministicPassesMaximum: 1,
      attemptsMaximum: 1,
      retriesMaximum: 0,
      rerunsMaximum: 0,
      automaticRepairsMaximum: 0,
      recursiveCorrectionsMaximum: 0,
      exactTenTranscriptCohortReplayRequired: true,
      originalCallOrderRequired: authenticated.request.calls.map((call) => ({
        debateNumber: call.debateNumber,
        moveId: call.moveId,
      })),
      correction2AllowedOnlyFor: {
        debateNumber: target.debateNumber,
        moveId: target.moveId,
        field: 'verificationExcerpt',
        deltaSha256,
      },
      correction1OverlayMustRemainExact: true,
      allOriginalTranscriptsMustRemainByteIdentical: true,
      originalRequestManifestMustRemainByteIdentical: true,
      lockedInventoryMustRemainByteIdentical: true,
      audioWorkItemsMustRemainByteIdentical: true,
      exactValidatorPath: paths.validator,
      exactValidatorSha256: sourceLocks[paths.validator],
      exactThresholds: { ...authenticated.request.thresholds },
      audioAccessAllowed: false,
      semanticAudioEvaluationAllowed: false,
      transcriptionOrOtherModelExecutionAllowed: false,
      paidServiceUseAllowed: false,
      adjudicationAllowed: false,
      scoreDerivationAllowed: false,
      publicationReconstructionAllowed: false,
      productionMutationAllowed: false,
      nextBatchSelectionAllowed: false,
    },
    futureAcceptanceRequirements: {
      allSourceAndTranscriptHashesMatch: true,
      exactCorrection1OverlayAuthenticated: true,
      exactCorrection2DeltaAuthenticated: true,
      onlyTransientMoveCopyChanged: true,
      originalRequestAndInventoryHashesUnchangedBeforeAndAfter: true,
      allTranscriptHashesUnchangedBeforeAndAfter: true,
      unchangedValidatorHash: true,
      unchangedThresholds: true,
      exactlyOneCompleteCohortReplay: true,
      allTenAttributionResultsVerified: true,
      noUnresolvedResult: true,
      noValidationException: true,
      noAudioAccess: true,
      noModelOrPaidServiceCall: true,
      directIncrementalCostUsd: 0,
    },
    stopRules: {
      sourceOrTranscriptHashMismatchBlocks: true,
      correction1OverlayMismatchBlocks: true,
      correction2DeltaMismatchBlocks: true,
      targetShapeMismatchBlocks: true,
      persistentSourceOrTranscriptWriteBlocks: true,
      validatorHashMismatchBlocks: true,
      thresholdMismatchBlocks: true,
      validationExceptionBlocks: true,
      unresolvedAttributionBlocks: true,
      audioAccessBlocks: true,
      modelOrPaidServiceCallBlocks: true,
      retryBlocks: true,
      rerunBlocks: true,
      automaticRepairBlocks: true,
      recursiveCorrectionBlocks: true,
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
      resolutionPlansPrepared: 1,
      executionPreparationManifestsPrepared: 1,
      executionHarnessesPrepared: 0,
      correctionPassesExecuted: 0,
      cohortValidationPassesExecuted: 0,
      persistentSourceWrites: 0,
      persistentTranscriptWrites: 0,
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
    preparationToolLocks: toolLocks,
    authorization: {
      executionHarnessPreparation: false,
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
      'user-approval-required-before-preparing-the-exact-debate-83-correction-2-execution-harness-and-activation-manifest',
  };

  const planText = `${JSON.stringify(plan, null, 2)}\n`;
  const planSha256 = sha256(Buffer.from(planText));
  const executionPreparation = {
    schemaVersion:
      '1.0-assessment-production-post-canary-batch-02-debate-83-audio-resolution-execution-preparation',
    protocolId: authenticated.request.protocolId,
    status:
      'frozen-debate-83-correction-2-execution-preparation-pending-separate-approval',
    preparedAt: plan.preparedAt,
    checkpointCommit: plan.checkpointCommit,
    productionCanary: false,
    batchNumber: 2,
    stagingOnly: true,
    directIncrementalCostUsdMaximum: 0,
    directIncrementalCostUsdEstimated: 0,
    plan: {
      path: PLAN,
      sha256: planSha256,
      status: plan.status,
    },
    frozenExecutionCandidate: {
      operation: proposedDelta.operation,
      deltaSha256,
      targetCallIndex: target.callIndex,
      debateNumber: target.debateNumber,
      debateId: target.debateId,
      moveId: target.moveId,
      field: 'verificationExcerpt',
      replacementValueSha256: replacementExcerptSha256,
      replacementLexicalTokenCount: 18,
      originalPersistentRecordsChanged: 0,
    },
    routeLocks: {
      sourceLocks,
      transcriptLocks: authenticated.transcriptLocks,
      validator: {
        path: paths.validator,
        sha256: sourceLocks[paths.validator],
      },
      thresholds: { ...authenticated.request.thresholds },
      priorCorrection: {
        path: paths.correction1Execution,
        sha256: sourceLocks[paths.correction1Execution],
      },
    },
    proposedFutureExecution: {
      executionHarnessPath:
        'scripts/run-assessment-production-post-canary-batch-02-audio-validation-correction-2.mjs',
      executionHarnessExistsThisStage: false,
      executionHarnessSha256: null,
      activationManifestPath: `${ROOT}/correction-2-execution-activation.json`,
      activationManifestExistsThisStage: false,
      activationManifestSha256: null,
      executionRecordPath: `${ROOT}/correction-2-execution.json`,
      cohortAuditPath: paths.audit,
      cohortAnalysisPath: paths.analysis,
      deterministicPassesMaximum: 1,
      attemptsMaximum: 1,
      retriesMaximum: 0,
      rerunsMaximum: 0,
      automaticRepairsMaximum: 0,
      recursiveCorrectionsMaximum: 0,
      transcriptCount: 10,
      originalCallOrderRequired:
        plan.futureExecutionContract.originalCallOrderRequired,
      correction1OverlayRequired: true,
      correction2ReferenceOverlayRequired: true,
      noAudioOrModelExecution: true,
      directIncrementalCostUsd: 0,
    },
    preparationValidation: {
      exactPlanHashLocked: true,
      exactDeltaHashLocked: true,
      allSourceHashesAuthenticated: true,
      allTranscriptHashesAuthenticated: true,
      originalReferenceRouteAuthenticated: true,
      replacementIsExactOriginalSubstring: true,
      replacementMatchesPreservedExpectedSpeakerSegmentPrefix: true,
      validatorNotExecutedAgainstReplacement: true,
      cohortReplayNotExecuted: true,
      audioFilesAccessed: 0,
      modelOrApiCalls: 0,
      paidServiceCalls: 0,
    },
    authorization: {
      executionHarnessPreparation: false,
      activationManifestPreparation: false,
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
    stopRules: { ...plan.stopRules },
    nextAuthorizedAction: plan.nextAuthorizedAction,
  };

  return {
    planText,
    executionPreparationText: `${JSON.stringify(executionPreparation, null, 2)}\n`,
  };
}

assert(shouldWrite !== shouldCheck, 'pass exactly one of --write or --check');
const artifacts = await buildArtifacts();

if (shouldWrite) {
  await writeFile(PLAN, artifacts.planText);
  await writeFile(EXECUTION_PREPARATION, artifacts.executionPreparationText);
  console.log(`wrote ${PLAN}`);
  console.log(`wrote ${EXECUTION_PREPARATION}`);
} else {
  assert((await readFile(PLAN, 'utf8')) === artifacts.planText, 'resolution plan replay mismatch');
  assert(
    (await readFile(EXECUTION_PREPARATION, 'utf8')) ===
      artifacts.executionPreparationText,
    'execution-preparation manifest replay mismatch',
  );
  console.log(`validated ${PLAN}`);
  console.log(`validated ${EXECUTION_PREPARATION}`);
}
