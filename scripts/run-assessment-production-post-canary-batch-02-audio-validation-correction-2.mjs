#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { access, readFile, writeFile } from 'node:fs/promises';

import { evaluateAttributionTranscript } from './lib/v416-audio-verification.mjs';

const ROOT =
  'docs/assessment-production/post-canary-continuation-v1/batch-02/audio-verification';
const ACTIVATION_PATH = `${ROOT}/correction-2-execution-activation.json`;
const HARNESS_PATH =
  'scripts/run-assessment-production-post-canary-batch-02-audio-validation-correction-2.mjs';
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
    '1.0-assessment-production-post-canary-batch-02-audio-validation-correction-2-execution-activation',
  'activation schema changed',
);
assert(
  activation.protocolId ===
    'assessment-production-post-canary-batch-02-decomposed-consensus' &&
    activation.productionCanary === false &&
    activation.batchNumber === 2 &&
    activation.correctionNumber === 2 &&
    activation.stagingOnly === true,
  'activation identity changed',
);
assert(
  activation.target.callIndex === 0 &&
    activation.target.debateNumber === '83' &&
    activation.target.debateId ===
      'loke-oppy-kalam-causal-principle-2020' &&
    activation.target.moveId === 'pro-modality-02' &&
    activation.target.expectedSpeaker === 'Andrew Loke' &&
    activation.target.field === 'verificationExcerpt',
  'correction-2 target changed',
);
assert(
  activation.correction2.operation ===
    'replace-only-the-transient-debate-83-verification-reference-with-one-source-exact-expected-speaker-substring' &&
    activation.correction2.originalLexicalTokenCount === 75 &&
    activation.correction2.replacementLexicalTokenCount === 18 &&
    activation.correction2.originalPersistentRecordWritesMaximum === 0,
  'correction-2 delta changed',
);
assert(
  sha256(Buffer.from(activation.correction2.replacementValue)) ===
    activation.correction2.replacementValueSha256,
  'correction-2 replacement hash mismatch',
);
assert(
  activation.correction1.operation ===
    'omit-one-exact-empty-text-segment-from-transient-validation-overlay' &&
    activation.correction1.debateNumber === '99' &&
    activation.correction1.moveId ===
      'pro-neural-correlation-interface-model' &&
    activation.correction1.segmentIndex === 36 &&
    activation.correction1.persistentTranscriptWrite === false,
  'preserved correction-1 overlay changed',
);
assert(
  activation.executionPolicy.deterministicPassesMaximum === 1 &&
    activation.executionPolicy.attemptsMaximum === 1 &&
    activation.executionPolicy.retriesMaximum === 0 &&
    activation.executionPolicy.rerunsMaximum === 0 &&
    activation.executionPolicy.automaticRepairsMaximum === 0 &&
    activation.executionPolicy.recursiveCorrectionsMaximum === 0 &&
    activation.executionPolicy.exactTenTranscriptCohortReplayRequired ===
      true &&
    activation.executionPolicy.correction1OverlayApplicationsRequired === 1 &&
    activation.executionPolicy.correction2OverlayApplicationsRequired === 1 &&
    activation.executionPolicy.persistentSourceWritesMaximum === 0 &&
    activation.executionPolicy.persistentTranscriptWritesMaximum === 0,
  'execution limits changed',
);
assert(
  activation.executionPolicy.audioFileAccessAllowed === false &&
    activation.executionPolicy.semanticAudioEvaluationAllowed === false &&
    activation.executionPolicy.transcriptionOrOtherModelExecutionAllowed ===
      false &&
    activation.executionPolicy.paidServiceUseAllowed === false &&
    activation.executionPolicy.adjudicationAllowed === false &&
    activation.executionPolicy.scoreDerivationAllowed === false &&
    activation.executionPolicy.publicationReconstructionAllowed === false &&
    activation.executionPolicy.productionMutationAllowed === false &&
    activation.executionPolicy.nextBatchSelectionAllowed === false,
  'forbidden execution capability enabled',
);
assert(
  activation.judgmentModelBoundary.label === '5.6 Sol' &&
    activation.judgmentModelBoundary.slug === 'gpt-5.6-sol' &&
    activation.judgmentModelBoundary.reasoningEffort === 'low' &&
    activation.judgmentModelBoundary.authentication ===
      'ChatGPT subscription' &&
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
assert(
  activation.transcriptLocks.length === 10,
  'exactly ten transcript locks required',
);
for (const lock of activation.transcriptLocks) {
  assert(
    (await hashFile(lock.path)) === lock.sha256,
    `transcript hash mismatch: ${lock.moveId}`,
  );
}
assert(
  !(await exists(activation.outputs.execution)),
  'correction-2 execution record already exists',
);
assert(
  (await hashFile(activation.outputs.audit)) ===
    activation.preExecutionOutputLocks.auditSha256,
  'pre-execution audit changed',
);
assert(
  (await hashFile(activation.outputs.analysis)) ===
    activation.preExecutionOutputLocks.analysisSha256,
  'pre-execution analysis changed',
);

const frozenPlan = JSON.parse(
  await readFile(activation.records.plan.path, 'utf8'),
);
const frozenExecutionPreparation = JSON.parse(
  await readFile(activation.records.executionPreparation.path, 'utf8'),
);
const frozenRequest = JSON.parse(
  await readFile(activation.records.request.path, 'utf8'),
);
const frozenCorrection1Execution = JSON.parse(
  await readFile(activation.records.correction1Execution.path, 'utf8'),
);
assert(
  frozenPlan.status ===
    'frozen-debate-83-speaker-mixed-verification-reference-correction-2-plan-prepared' &&
    frozenPlan.proposedCorrection.deltaSha256 ===
      activation.correction2.deltaSha256 &&
    frozenPlan.proposedCorrection.originalValueSha256 ===
      activation.correction2.originalValueSha256 &&
    frozenPlan.proposedCorrection.replacementValue ===
      activation.correction2.replacementValue &&
    frozenPlan.proposedCorrection.replacementValueSha256 ===
      activation.correction2.replacementValueSha256 &&
    frozenPlan.proposedCorrection.correctionExecutedThisStage === false &&
    frozenPlan.proposedCorrection
      .prospectiveValidatorEvaluationExecutedThisStage === false,
  'frozen correction-2 plan route changed',
);
assert(
  frozenExecutionPreparation.status ===
    'frozen-debate-83-correction-2-execution-preparation-pending-separate-approval' &&
    frozenExecutionPreparation.plan.sha256 ===
      activation.resolutionPlan.sha256 &&
    frozenExecutionPreparation.frozenExecutionCandidate.deltaSha256 ===
      activation.correction2.deltaSha256 &&
    frozenExecutionPreparation.preparationValidation
      .validatorNotExecutedAgainstReplacement === true &&
    frozenExecutionPreparation.preparationValidation.cohortReplayNotExecuted ===
      true,
  'frozen execution-preparation route changed',
);
assert(frozenRequest.calls.length === 10, 'frozen request call count changed');
const frozenTargetCall = frozenRequest.calls[activation.target.callIndex];
assert(
  frozenTargetCall.debateNumber === activation.target.debateNumber &&
    frozenTargetCall.debateId === activation.target.debateId &&
    frozenTargetCall.moveId === activation.target.moveId &&
    frozenTargetCall.expectedSpeaker === activation.target.expectedSpeaker &&
    sha256(Buffer.from(frozenTargetCall.verificationExcerpt)) ===
      activation.correction2.originalValueSha256 &&
    frozenTargetCall.verificationExcerpt.includes(
      activation.correction2.replacementValue,
    ),
  'frozen target call or replacement route changed',
);
assert(
  JSON.stringify(frozenRequest.thresholds) ===
    JSON.stringify(activation.executionPolicy.exactThresholds),
  'frozen thresholds changed',
);
assert(
  frozenCorrection1Execution.status ===
    'post-canary-batch-02-audio-verification-unresolved-after-correction-1-overlay' &&
    frozenCorrection1Execution.verified === 9 &&
    frozenCorrection1Execution.unresolved === 1 &&
    frozenCorrection1Execution.retries === 0 &&
    frozenCorrection1Execution.reruns === 0,
  'preserved correction-1 execution changed',
);

if (checkOnly) {
  assert(
    activation.status ===
      'frozen-debate-83-correction-2-execution-harness-prepared-not-authorized',
    'prepared activation status changed',
  );
  assert(
    Object.values(activation.authorization).every((value) => value === false),
    'prepared activation unexpectedly authorizes execution',
  );
  assert(activation.authorizedAt === null, 'prepared activation has an authorization time');
  assert(
    activation.userExecutionAuthorization === null,
    'prepared activation has execution authorization',
  );
  assert(
    activation.executionBoundary.executionHarnessesPrepared === 1 &&
      activation.executionBoundary.activationManifestsPrepared === 1 &&
      activation.executionBoundary.correctionPassesExecuted === 0 &&
      activation.executionBoundary.cohortValidationPassesExecuted === 0 &&
      activation.executionBoundary.persistentSourceWrites === 0 &&
      activation.executionBoundary.persistentTranscriptWrites === 0 &&
      activation.executionBoundary.audioAccesses === 0 &&
      activation.executionBoundary.modelOrApiCalls === 0 &&
      activation.executionBoundary.paidServiceCalls === 0 &&
      activation.executionBoundary.directIncrementalCostUsd === 0,
    'preparation boundary crossed',
  );
  console.log(
    'Batch 2 Debate 83 correction-2 harness and inactive activation manifest are frozen and valid.',
  );
  process.exit(0);
}

assert(
  activation.status ===
    'frozen-debate-83-correction-2-deterministic-replay-authorized',
  'correction-2 execution is not activated',
);
assert(
  activation.authorization.correctionExecution === true &&
    activation.authorization.cohortValidationResumption === true &&
    activation.authorization.deterministicAnalysis === true,
  'correction-2 execution authorization missing',
);
for (const key of [
  'audioAccess',
  'transcriptionOrModelExecution',
  'paidServiceUse',
  'retry',
  'rerun',
  'automaticRepair',
  'recursiveCorrection',
  'adjudicationPacketPreparation',
  'adjudicationModelExecution',
  'finalLedgerAssembly',
  'scoreDerivation',
  'publicationReconstruction',
  'productionMutation',
  'nextBatchSelection',
]) {
  assert(
    activation.authorization[key] === false,
    `forbidden authorization enabled: ${key}`,
  );
}
assert(
  activation.userExecutionAuthorization?.instruction ===
    activation.executionAuthorizationTemplate.instruction,
  'exact user execution authorization missing',
);
assert(
  activation.userExecutionAuthorization.correctionPasses === 1 &&
    activation.userExecutionAuthorization.cohortReplayPasses === 1 &&
    activation.userExecutionAuthorization.transcripts === 10 &&
    activation.userExecutionAuthorization.attempts === 1 &&
    activation.userExecutionAuthorization.retriesMaximum === 0 &&
    activation.userExecutionAuthorization.rerunsMaximum === 0 &&
    activation.userExecutionAuthorization.automaticRepairsMaximum === 0 &&
    activation.userExecutionAuthorization.recursiveCorrectionsMaximum === 0 &&
    activation.userExecutionAuthorization.directIncrementalCostUsdMaximum === 0,
  'execution authorization limits changed',
);

const request = JSON.parse(
  await readFile(activation.records.request.path, 'utf8'),
);
const priorExecution = JSON.parse(
  await readFile(activation.records.execution.path, 'utf8'),
);
const plan = frozenPlan;
assert(request.calls.length === 10, 'request call count changed');
assert(priorExecution.results.length === 10, 'execution result count changed');
assert(
  priorExecution.retries === 0 && priorExecution.requestFailure === false,
  'prior execution boundary changed',
);
assert(
  JSON.stringify(request.thresholds) ===
    JSON.stringify(activation.executionPolicy.exactThresholds),
  'thresholds changed',
);
assert(
  plan.proposedCorrection.deltaSha256 === activation.correction2.deltaSha256 &&
    plan.proposedCorrection.replacementValue ===
      activation.correction2.replacementValue &&
    plan.proposedCorrection.replacementValueSha256 ===
      activation.correction2.replacementValueSha256,
  'frozen correction-2 plan changed',
);

const startedAt = new Date().toISOString();
const started = Date.now();
const moves = [];
let correction1OverlayApplications = 0;
let correction2OverlayApplications = 0;
let completedValidations = 0;
let validationFailure = null;

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
      (item) =>
        item.debateNumber === call.debateNumber &&
        item.moveId === call.moveId,
    );
    assert(
      result?.status === 'completed',
      `${call.moveId}: completed execution result missing`,
    );
    assert(
      result.transcriptSha256 === lock.sha256,
      `${call.moveId}: execution/transcript lock mismatch`,
    );
    const transcriptBytes = await readFile(lock.path);
    assert(
      sha256(transcriptBytes) === lock.sha256,
      `${call.moveId}: transcript changed before validation`,
    );
    let transcript = JSON.parse(transcriptBytes);
    let verificationExcerpt = call.verificationExcerpt;
    let validationOverlay = null;

    if (call.moveId === activation.correction1.moveId) {
      const originalTopLevel = Object.fromEntries(
        Object.entries(transcript).filter(([key]) => key !== 'segments'),
      );
      assert(
        transcript.segments.length ===
          activation.correction1.originalSegmentCount,
        'correction-1 target segment count changed',
      );
      const segment =
        transcript.segments[activation.correction1.segmentIndex];
      assert(
        segment.id === activation.correction1.segmentId &&
          segment.type === activation.correction1.segmentType &&
          segment.speaker === activation.correction1.segmentSpeaker &&
          segment.start === activation.correction1.segmentStart &&
          segment.end === activation.correction1.segmentEnd &&
          segment.text === '',
        'frozen correction-1 empty segment changed',
      );
      assert(
        transcript.segments.filter(
          (item) =>
            typeof item.text !== 'string' || item.text.trim().length === 0,
        ).length === 1,
        'exactly one correction-1 empty-text segment required',
      );
      const overlay = structuredClone(transcript);
      overlay.segments = transcript.segments.filter(
        (_segment, index) => index !== activation.correction1.segmentIndex,
      );
      assert(
        overlay.segments.length ===
          activation.correction1.transientOverlaySegmentCount,
        'correction-1 overlay segment count changed',
      );
      assert(
        JSON.stringify(
          Object.fromEntries(
            Object.entries(overlay).filter(([key]) => key !== 'segments'),
          ),
        ) === JSON.stringify(originalTopLevel),
        'correction-1 overlay changed a top-level transcript field',
      );
      assert(
        JSON.stringify(overlay.segments) ===
          JSON.stringify([
            ...transcript.segments.slice(
              0,
              activation.correction1.segmentIndex,
            ),
            ...transcript.segments.slice(
              activation.correction1.segmentIndex + 1,
            ),
          ]),
        'correction-1 overlay changed more than the exact empty segment',
      );
      transcript = overlay;
      correction1OverlayApplications += 1;
      validationOverlay = {
        correctionNumber: 1,
        operation: activation.correction1.operation,
        sourceTranscriptPath: lock.path,
        sourceTranscriptSha256: lock.sha256,
        omittedSegmentIndex: activation.correction1.segmentIndex,
        omittedSegmentId: activation.correction1.segmentId,
        originalSegmentCount: activation.correction1.originalSegmentCount,
        validationSegmentCount:
          activation.correction1.transientOverlaySegmentCount,
        persistentTranscriptWritten: false,
      };
    }

    if (call.moveId === activation.target.moveId) {
      assert(
        callIndex === activation.target.callIndex &&
          call.debateNumber === activation.target.debateNumber &&
          call.debateId === activation.target.debateId &&
          call.expectedSpeaker === activation.target.expectedSpeaker,
        'correction-2 target route changed',
      );
      assert(
        sha256(Buffer.from(call.verificationExcerpt)) ===
          activation.correction2.originalValueSha256,
        'correction-2 original reference changed',
      );
      assert(
        call.verificationExcerpt.includes(
          activation.correction2.replacementValue,
        ),
        'correction-2 replacement is no longer source-exact',
      );
      verificationExcerpt = activation.correction2.replacementValue;
      correction2OverlayApplications += 1;
      validationOverlay = {
        correctionNumber: 2,
        operation: activation.correction2.operation,
        field: activation.target.field,
        originalValueSha256: activation.correction2.originalValueSha256,
        originalLexicalTokenCount:
          activation.correction2.originalLexicalTokenCount,
        replacementValueSha256:
          activation.correction2.replacementValueSha256,
        replacementLexicalTokenCount:
          activation.correction2.replacementLexicalTokenCount,
        deltaSha256: activation.correction2.deltaSha256,
        persistentSourceWritten: false,
        persistentTranscriptWritten: false,
      };
    }

    const deterministicEvidence = evaluateAttributionTranscript(
      transcript,
      {
        moveId: call.moveId,
        expectedSpeaker: call.expectedSpeaker,
        verificationExcerpt,
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
        deterministicEvidence.status === 'verified'
          ? call.expectedSpeaker
          : null,
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
  assert(
    correction1OverlayApplications === 1,
    'exactly one correction-1 overlay required',
  );
  assert(
    correction2OverlayApplications === 1,
    'exactly one correction-2 overlay required',
  );
  for (const lock of activation.transcriptLocks) {
    assert(
      (await hashFile(lock.path)) === lock.sha256,
      `transcript changed after validation: ${lock.moveId}`,
    );
  }
  for (const [file, digest] of Object.entries(
    activation.protectedPersistentSourceHashes,
  )) {
    assert(
      (await hashFile(file)) === digest,
      `protected persistent source changed: ${file}`,
    );
  }
} catch (error) {
  validationFailure = error.stack ?? String(error);
}

const completedAt = new Date().toISOString();
const verified = moves.filter((move) => move.status === 'verified').length;
const unresolved = moves.length - verified;
const replayCompleted =
  validationFailure === null && completedValidations === 10;
const passed = replayCompleted && verified === 10;
const status = passed
  ? 'passed-all-ten-post-canary-batch-02-confidence-moves-audio-verified-after-correction-2-reference-overlay'
  : replayCompleted
    ? 'post-canary-batch-02-audio-verification-unresolved-after-correction-2-reference-overlay'
    : 'post-canary-batch-02-audio-verification-validation-failed-during-correction-2-replay';
const nextAuthorizedAction = passed
  ? 'user-approval-required-before-batch-02-dispute-only-adjudication-packet-preparation'
  : 'user-approval-required-before-any-further-batch-02-audio-verification-diagnosis-or-correction';

const executionRecord = {
  schemaVersion:
    '1.0-assessment-production-post-canary-batch-02-audio-validation-correction-2-execution',
  protocolId: activation.protocolId,
  status,
  startedAt,
  completedAt,
  elapsedMs: Date.now() - started,
  productionCanary: false,
  batchNumber: 2,
  correctionNumber: 2,
  deterministicPassesAttempted: 1,
  deterministicPassesCompleted: replayCompleted ? 1 : 0,
  reruns: 0,
  retries: 0,
  automaticRepairs: 0,
  recursiveCorrections: 0,
  completedValidations,
  requiredValidations: 10,
  verified,
  unresolved: replayCompleted ? unresolved : null,
  correction1OverlayApplications,
  correction2OverlayApplications,
  persistentSourceWrites: 0,
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
      debateId: moves.find((move) => move.debateNumber === debateNumber)
        .debateId,
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
    schemaVersion:
      '1.0-assessment-production-post-canary-batch-02-audio-verification-audit',
    protocolId: activation.protocolId,
    status,
    productionCanary: false,
    batchNumber: 2,
    stagingOnly: true,
    corrections: [
      {
        number: 1,
        operation: activation.correction1.operation,
        targetMoveId: activation.correction1.moveId,
        transientOverlayApplications: 1,
        persistentTranscriptWrites: 0,
        unchanged: true,
      },
      {
        number: 2,
        operation: activation.correction2.operation,
        targetMoveId: activation.target.moveId,
        field: activation.target.field,
        deltaSha256: activation.correction2.deltaSha256,
        transientOverlayApplications: 1,
        persistentSourceWrites: 0,
        persistentTranscriptWrites: 0,
      },
    ],
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
      corrections: 2,
      deterministicReplayPasses: 2,
      correction2ReplayPasses: 1,
      clipMinutes: request.costEstimate.clipMinutes,
      durationOnlyPlanningExposureUsd:
        priorExecution.durationOnlyPlanningExposureUsd,
      usageDerivedEstimatedCostUsd:
        priorExecution.usageDerivedEstimatedCostUsd,
      actualBilledCostUsdAvailable:
        priorExecution.actualBilledCostUsdAvailable,
      maximumAuthorizedCostUsd: priorExecution.maximumAuthorizedCostUsd,
      directIncrementalCostCapControlPassed:
        priorExecution.directIncrementalCostCapControlPassed,
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
    schemaVersion:
      '1.0-assessment-production-post-canary-batch-02-audio-verification-analysis',
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
      originalRequestAndInventoryPreserved: true,
      correction1OverlayApplications: 1,
      correction2ReferenceOverlayApplications: 1,
      persistentSourceWrites: 0,
      persistentTranscriptWrites: 0,
    },
    costs: {
      preservedPaidDiarizationCallsAttempted: priorExecution.attempts,
      preservedUsageDerivedEstimatedCostUsd:
        priorExecution.usageDerivedEstimatedCostUsd,
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
    writeFile(
      activation.outputs.analysis,
      `${JSON.stringify(analysis, null, 2)}\n`,
    ),
  ]);
}

await writeFile(
  activation.outputs.execution,
  `${JSON.stringify(executionRecord, null, 2)}\n`,
);
console.log(
  JSON.stringify(
    {
      status,
      replayCompleted,
      completedValidations,
      verified,
      unresolved: replayCompleted ? unresolved : null,
      correction1OverlayApplications,
      correction2OverlayApplications,
      persistentSourceWrites: 0,
      persistentTranscriptWrites: 0,
      retries: 0,
      reruns: 0,
      automaticRepairs: 0,
      recursiveCorrections: 0,
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
