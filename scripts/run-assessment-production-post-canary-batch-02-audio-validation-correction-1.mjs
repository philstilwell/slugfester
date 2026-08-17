#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { access, readFile, writeFile } from 'node:fs/promises';

import { evaluateAttributionTranscript } from './lib/v416-audio-verification.mjs';

const ROOT = 'docs/assessment-production/post-canary-continuation-v1/batch-02/audio-verification';
const ACTIVATION_PATH = `${ROOT}/correction-1-execution-activation.json`;
const HARNESS_PATH =
  'scripts/run-assessment-production-post-canary-batch-02-audio-validation-correction-1.mjs';
const checkOnly = process.argv.includes('--check');
const execute = process.argv.includes('--execute');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const hashFile = async (file) => sha256(await readFile(file));
const exists = (file) => access(file).then(() => true, () => false);
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(checkOnly !== execute, 'pass exactly one of --check or --execute');

const activation = JSON.parse(await readFile(ACTIVATION_PATH, 'utf8'));
assert(
  activation.schemaVersion ===
    '1.0-assessment-production-post-canary-batch-02-audio-validation-correction-1-execution-activation',
  'activation schema changed',
);
assert(
  activation.protocolId === 'assessment-production-post-canary-batch-02-decomposed-consensus' &&
    activation.productionCanary === false &&
    activation.batchNumber === 2 &&
    activation.correctionNumber === 1 &&
    activation.stagingOnly === true,
  'activation identity changed',
);
assert(
  activation.target.debateNumber === '99' &&
    activation.target.debateId === 'jones-jump-digital-physics-god-2019' &&
    activation.target.moveId === 'pro-neural-correlation-interface-model' &&
    activation.target.callIndex === 6 &&
    activation.target.segmentIndex === 36,
  'correction target changed',
);
assert(
  activation.executionPolicy.deterministicPassesMaximum === 1 &&
    activation.executionPolicy.rerunsMaximum === 0 &&
    activation.executionPolicy.retriesMaximum === 0 &&
    activation.executionPolicy.automaticRepairsMaximum === 0 &&
    activation.executionPolicy.exactTenTranscriptCohortReplayRequired === true &&
    activation.executionPolicy.transientOverlayApplicationsMaximum === 1 &&
    activation.executionPolicy.persistentTranscriptWritesMaximum === 0,
  'execution limits changed',
);
assert(
  activation.executionPolicy.audioFileAccessAllowed === false &&
    activation.executionPolicy.semanticAudioEvaluationAllowed === false &&
    activation.executionPolicy.transcriptionOrOtherModelExecutionAllowed === false &&
    activation.executionPolicy.paidServiceUseAllowed === false,
  'forbidden execution capability enabled',
);
assert(
  activation.judgmentModelBoundary.label === '5.6 Sol' &&
    activation.judgmentModelBoundary.slug === 'gpt-5.6-sol' &&
    activation.judgmentModelBoundary.reasoningEffort === 'low' &&
    activation.judgmentModelBoundary.authentication === 'ChatGPT subscription' &&
    activation.judgmentModelBoundary.isolatedPassesPreserved === true &&
    activation.judgmentModelBoundary.scoreBlindnessPreserved === true &&
    activation.judgmentModelBoundary.integerRoundedTiesPermitted === true &&
    activation.judgmentModelBoundary.modelContextsThisStage === 0,
  'judgment-model boundary changed',
);
assert(
  (await hashFile(HARNESS_PATH)) === activation.executionHarness.sha256,
  'execution harness hash mismatch',
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assert((await hashFile(file)) === digest, `source hash mismatch: ${file}`);
}
assert(activation.transcriptLocks.length === 10, 'exactly ten transcript locks required');
for (const lock of activation.transcriptLocks) {
  assert((await hashFile(lock.path)) === lock.sha256, `transcript hash mismatch: ${lock.moveId}`);
}
for (const output of activation.futureOutputPaths) {
  assert(!(await exists(output)), `future output already exists: ${output}`);
}

if (checkOnly) {
  assert(
    activation.status ===
      'frozen-debate-99-correction-1-execution-harness-prepared-not-authorized',
    'prepared activation status changed',
  );
  assert(
    Object.values(activation.authorization).every((value) => value === false),
    'prepared activation unexpectedly authorizes execution',
  );
  assert(
    activation.executionBoundary.correctionPassesExecuted === 0 &&
      activation.executionBoundary.cohortValidationPassesExecuted === 0 &&
      activation.executionBoundary.transcriptWrites === 0 &&
      activation.executionBoundary.audioAccesses === 0 &&
      activation.executionBoundary.modelOrApiCalls === 0 &&
      activation.executionBoundary.paidServiceCalls === 0 &&
      activation.executionBoundary.directIncrementalCostUsd === 0,
    'preparation boundary crossed',
  );
  console.log('Batch 2 Debate 99 correction-1 harness and inactive activation manifest are frozen and valid.');
  process.exit(0);
}

assert(
  activation.status === 'frozen-debate-99-correction-1-deterministic-replay-authorized',
  'correction execution is not activated',
);
assert(
  activation.authorization.correctionExecution === true &&
    activation.authorization.cohortValidationResumption === true &&
    activation.authorization.deterministicAnalysis === true,
  'correction execution authorization missing',
);
for (const key of [
  'audioAccess',
  'transcriptionOrModelExecution',
  'paidServiceUse',
  'retry',
  'rerun',
  'automaticRepair',
  'adjudicationPacketPreparation',
  'adjudicationModelExecution',
  'finalLedgerAssembly',
  'scoreDerivation',
  'publicationReconstruction',
  'productionMutation',
  'nextBatchSelection',
]) {
  assert(activation.authorization[key] === false, `forbidden authorization enabled: ${key}`);
}
assert(
  activation.userExecutionAuthorization?.instruction ===
    'I approve activation and execution of exactly one frozen Batch 2 Debate 99 correction-1 deterministic validation-overlay pass and one complete ten-transcript cohort replay, with a direct incremental cost cap of $0. Use one attempt, no retries, no reruns, and no automatic repairs. Preserve all ten original transcripts byte-identically, omit only the frozen empty segment from an in-memory validation copy, and use the exact frozen validator and thresholds. Stop after deterministic validation, analysis, committing, and pushing. Do not access audio, execute transcription or other models, use paid services, adjudicate, derive scores, reconstruct publication, mutate production, or select the next batch.',
  'exact user execution authorization missing',
);

const request = JSON.parse(await readFile(activation.records.request.path, 'utf8'));
const priorExecution = JSON.parse(await readFile(activation.records.execution.path, 'utf8'));
assert(request.calls.length === 10, 'request call count changed');
assert(priorExecution.results.length === 10, 'execution result count changed');
assert(priorExecution.retries === 0 && priorExecution.requestFailure === false, 'prior execution boundary changed');
assert(
  JSON.stringify(request.thresholds) === JSON.stringify(activation.executionPolicy.exactThresholds),
  'thresholds changed',
);

const startedAt = new Date().toISOString();
const started = Date.now();
const moves = [];
let overlayApplications = 0;
let completedValidations = 0;
let validationFailure = null;
let originalTargetHashBefore = null;
let originalTargetHashAfter = null;

try {
  for (const [callIndex, call] of request.calls.entries()) {
    const lock = activation.transcriptLocks[callIndex];
    assert(
      lock.callIndex === callIndex &&
        lock.debateNumber === call.debateNumber &&
        lock.debateId === call.debateId &&
        lock.moveId === call.moveId &&
        lock.path === call.transcriptPath,
      `${call.moveId}: frozen call order changed`,
    );
    const result = priorExecution.results.find(
      (item) => item.debateNumber === call.debateNumber && item.moveId === call.moveId,
    );
    assert(result?.status === 'completed', `${call.moveId}: completed execution result missing`);
    assert(result.transcriptSha256 === lock.sha256, `${call.moveId}: execution/transcript lock mismatch`);
    const transcriptBytes = await readFile(lock.path);
    assert(sha256(transcriptBytes) === lock.sha256, `${call.moveId}: transcript changed before validation`);
    let transcript = JSON.parse(transcriptBytes);
    let validationOverlay = null;

    if (call.moveId === activation.target.moveId) {
      originalTargetHashBefore = sha256(transcriptBytes);
      const originalTopLevel = Object.fromEntries(
        Object.entries(transcript).filter(([key]) => key !== 'segments'),
      );
      assert(transcript.segments.length === activation.correction.originalSegmentCount, 'target segment count changed');
      const segment = transcript.segments[activation.target.segmentIndex];
      assert(
        segment.id === activation.target.segmentId &&
          segment.type === activation.target.segmentType &&
          segment.speaker === activation.target.segmentSpeaker &&
          segment.start === activation.target.segmentStart &&
          segment.end === activation.target.segmentEnd &&
          segment.text === '',
        'frozen empty segment changed',
      );
      assert(
        transcript.segments.filter(
          (item) => typeof item.text !== 'string' || item.text.trim().length === 0,
        ).length === 1,
        'exactly one empty-text segment required',
      );
      const overlay = structuredClone(transcript);
      overlay.segments = transcript.segments.filter(
        (_segment, index) => index !== activation.target.segmentIndex,
      );
      assert(overlay.segments.length === activation.correction.transientOverlaySegmentCount, 'overlay segment count changed');
      assert(
        JSON.stringify(Object.fromEntries(Object.entries(overlay).filter(([key]) => key !== 'segments'))) ===
          JSON.stringify(originalTopLevel),
        'overlay changed a top-level transcript field',
      );
      assert(
        JSON.stringify(overlay.segments) ===
          JSON.stringify([
            ...transcript.segments.slice(0, activation.target.segmentIndex),
            ...transcript.segments.slice(activation.target.segmentIndex + 1),
          ]),
        'overlay changed more than the exact empty segment',
      );
      transcript = overlay;
      overlayApplications += 1;
      validationOverlay = {
        operation: activation.correction.operation,
        sourceTranscriptPath: lock.path,
        sourceTranscriptSha256: lock.sha256,
        omittedSegmentIndex: activation.target.segmentIndex,
        omittedSegmentId: activation.target.segmentId,
        originalSegmentCount: activation.correction.originalSegmentCount,
        validationSegmentCount: activation.correction.transientOverlaySegmentCount,
        persistentTranscriptWritten: false,
      };
    }

    const deterministicEvidence = evaluateAttributionTranscript(
      transcript,
      {
        moveId: call.moveId,
        expectedSpeaker: call.expectedSpeaker,
        verificationExcerpt: call.verificationExcerpt,
      },
      activation.executionPolicy.exactThresholds,
    );
    completedValidations += 1;
    moves.push({
      debateNumber: call.debateNumber,
      debateId: call.debateId,
      moveId: call.moveId,
      expectedSpeaker: call.expectedSpeaker,
      trigger: call.trigger,
      executionStatus: result.status,
      status: deterministicEvidence.status,
      resolvedSpeaker:
        deterministicEvidence.status === 'verified' ? call.expectedSpeaker : null,
      clip: {
        path: call.clipPath,
        sha256: call.clipSha256,
        durationSeconds: call.durationSeconds,
        accessedThisPass: false,
      },
      transcript: {
        path: lock.path,
        sha256: lock.sha256,
        model: call.model,
        responseFormat: call.responseFormat,
        persistentMutation: false,
      },
      validationOverlay,
      deterministicEvidence,
    });
  }
  assert(overlayApplications === 1, 'exactly one validation overlay required');
  originalTargetHashAfter = await hashFile(activation.target.transcriptPath);
  assert(originalTargetHashAfter === originalTargetHashBefore, 'original target transcript changed');
  for (const lock of activation.transcriptLocks) {
    assert((await hashFile(lock.path)) === lock.sha256, `transcript changed after validation: ${lock.moveId}`);
  }
} catch (error) {
  validationFailure = error.stack ?? String(error);
}

const completedAt = new Date().toISOString();
const verified = moves.filter((move) => move.status === 'verified').length;
const unresolved = moves.length - verified;
const replayCompleted = validationFailure === null && completedValidations === 10;
const passed = replayCompleted && verified === 10;
const status = passed
  ? 'passed-all-ten-post-canary-batch-02-confidence-moves-audio-verified-after-correction-1-overlay'
  : replayCompleted
    ? 'post-canary-batch-02-audio-verification-unresolved-after-correction-1-overlay'
    : 'post-canary-batch-02-audio-verification-validation-failed-during-correction-1-replay';
const nextAuthorizedAction = passed
  ? 'user-approval-required-before-batch-02-dispute-only-adjudication-packet-preparation'
  : 'user-approval-required-before-any-further-batch-02-audio-verification-diagnosis-or-correction';

const executionRecord = {
  schemaVersion:
    '1.0-assessment-production-post-canary-batch-02-audio-validation-correction-1-execution',
  protocolId: activation.protocolId,
  status,
  startedAt,
  completedAt,
  elapsedMs: Date.now() - started,
  productionCanary: false,
  batchNumber: 2,
  correctionNumber: 1,
  deterministicPassesAttempted: 1,
  deterministicPassesCompleted: replayCompleted ? 1 : 0,
  reruns: 0,
  retries: 0,
  automaticRepairs: 0,
  completedValidations,
  requiredValidations: 10,
  verified,
  unresolved: replayCompleted ? unresolved : null,
  overlayApplications,
  originalTargetTranscriptSha256Before: originalTargetHashBefore,
  originalTargetTranscriptSha256After: originalTargetHashAfter,
  originalTargetTranscriptUnchanged:
    originalTargetHashBefore !== null && originalTargetHashBefore === originalTargetHashAfter,
  persistentTranscriptWrites: 0,
  validationFailure: validationFailure?.slice(-12000) ?? null,
  gateAcceptancePassed: passed,
  audioAccesses: 0,
  semanticAudioEvaluations: 0,
  transcriptionCalls: 0,
  modelOrApiCalls: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0,
  adjudications: 0,
  scoresDerived: 0,
  publicationReconstructions: 0,
  productionMutations: 0,
  nextBatchSelections: 0,
  nextAuthorizedAction,
};

if (replayCompleted) {
  const debates = [...new Set(moves.map((move) => move.debateNumber))].map(
    (debateNumber) => ({
      debateNumber,
      debateId: moves.find((move) => move.debateNumber === debateNumber).debateId,
      moves: moves.filter((move) => move.debateNumber === debateNumber),
    }),
  );
  const downstreamAuthorization = {
    adjudicationPacketPreparation: false,
    paidTranscription: false,
    audioVerificationExecution: false,
    retry: false,
    correctionCall: false,
    judgmentModelExecution: false,
    adjudicationModelExecution: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    publicationModelExecution: false,
    productionMutation: false,
    nextBatchSelection: false,
  };
  const audit = {
    schemaVersion: '1.0-assessment-production-post-canary-batch-02-audio-verification-audit',
    protocolId: activation.protocolId,
    status,
    productionCanary: false,
    batchNumber: 2,
    stagingOnly: true,
    correction: {
      number: 1,
      operation: activation.correction.operation,
      targetMoveId: activation.target.moveId,
      transientOverlayApplications: 1,
      persistentTranscriptWrites: 0,
      allOriginalTranscriptsUnchanged: true,
    },
    debates,
    thresholds: activation.executionPolicy.exactThresholds,
    referenceContract: request.referenceContract,
    totals: {
      requiredMoves: 10,
      verified,
      unresolved,
      paidDiarizationCallsAttempted: priorExecution.attempts,
      paidDiarizationCallsCompleted: priorExecution.callsCompleted,
      callsSkipped: priorExecution.callsSkipped,
      retries: 0,
      corrections: 1,
      deterministicReplayPasses: 1,
      clipMinutes: request.costEstimate.clipMinutes,
      durationOnlyPlanningExposureUsd: priorExecution.durationOnlyPlanningExposureUsd,
      usageDerivedEstimatedCostUsd: priorExecution.usageDerivedEstimatedCostUsd,
      actualBilledCostUsdAvailable: priorExecution.actualBilledCostUsdAvailable,
      maximumAuthorizedCostUsd: priorExecution.maximumAuthorizedCostUsd,
      directIncrementalCostCapControlPassed: priorExecution.directIncrementalCostCapControlPassed,
      directIncrementalCostUsdThisStage: 0,
      meteredJudgmentModelApiCostUsd: 0,
      judgmentModelContexts: 0,
      adjudicationModelContexts: 0,
      scoresDerived: 0,
      publicationReconstructions: 0,
      productionMutations: 0,
      nextBatchSelections: 0,
      audioPlaybackCalls: 0,
      semanticAudioEvaluations: 0,
    },
    authorization: downstreamAuthorization,
  };
  const analysis = {
    schemaVersion: '1.0-assessment-production-post-canary-batch-02-audio-verification-analysis',
    protocolId: activation.protocolId,
    status,
    productionCanary: false,
    batchNumber: 2,
    stagingOnly: true,
    gate: {
      passed,
      executionComplete: true,
      deterministicReplayComplete: true,
      requiredMoves: 10,
      verified,
      unresolved,
      deterministicThresholdsApplied: true,
      exactValidatorPreserved: true,
      originalTranscriptsPreserved: true,
      transientCorrectionOverlayApplications: 1,
      persistentTranscriptWrites: 0,
    },
    costs: {
      preservedPaidDiarizationCallsAttempted: priorExecution.attempts,
      preservedUsageDerivedEstimatedCostUsd: priorExecution.usageDerivedEstimatedCostUsd,
      directIncrementalCostUsdThisStage: 0,
      paidServiceCallsThisStage: 0,
      modelOrApiCallsThisStage: 0,
    },
    judgmentModelBoundary: activation.judgmentModelBoundary,
    authorization: downstreamAuthorization,
    nextAuthorizedAction,
  };
  await Promise.all([
    writeFile(activation.outputs.audit, `${JSON.stringify(audit, null, 2)}\n`),
    writeFile(activation.outputs.analysis, `${JSON.stringify(analysis, null, 2)}\n`),
  ]);
}

await writeFile(activation.outputs.execution, `${JSON.stringify(executionRecord, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      status,
      replayCompleted,
      completedValidations,
      verified,
      unresolved: replayCompleted ? unresolved : null,
      overlayApplications,
      persistentTranscriptWrites: 0,
      retries: 0,
      reruns: 0,
      audioAccesses: 0,
      modelOrApiCalls: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0,
      nextAuthorizedAction,
    },
    null,
    2,
  ),
);

if (!replayCompleted || !passed) process.exitCode = 1;
