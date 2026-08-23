#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { access, readFile, writeFile } from 'node:fs/promises';
import { evaluateAttributionTranscript } from './lib/v416-audio-verification.mjs';

const ROOT = 'docs/assessment-production/post-canary-continuation-v1/batch-07/audio-verification';
const ACTIVATION_PATH = `${ROOT}/correction-1-execution-activation.json`;
const checkOnly = process.argv.includes('--check');
const execute = process.argv.includes('--execute');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const hashFile = async (file) => sha256(await readFile(file));
const exists = (file) => access(file).then(() => true, () => false);
assert(checkOnly !== execute, 'pass exactly one of --check or --execute');

const activation = JSON.parse(await readFile(ACTIVATION_PATH, 'utf8'));
assert(activation.schemaVersion === '1.0-assessment-production-post-canary-batch-07-audio-validation-correction-1-execution-activation', 'activation schema changed');
assert((await hashFile(activation.preparationManifest.path)) === activation.preparationManifest.sha256, 'preparation manifest hash mismatch');
for (const [file, digest] of Object.entries(activation.sourceHashes)) assert((await hashFile(file)) === digest, `source hash mismatch: ${file}`);
for (const lock of activation.transcriptLocks) assert((await hashFile(lock.path)) === lock.sha256, `transcript hash mismatch: ${lock.moveId}`);
assert((await hashFile(activation.exactValidator.path)) === activation.exactValidator.sha256, 'validator hash mismatch');
assert(activation.transcriptLocks.length === 5 && activation.executionPolicy.completeFiveTranscriptReplayRequired, 'five-transcript replay boundary changed');
assert(activation.executionPolicy.deterministicPassesMaximum === 1 && activation.executionPolicy.retriesMaximum === 0 && activation.executionPolicy.rerunsMaximum === 0 && activation.executionPolicy.persistentTranscriptWritesMaximum === 0, 'execution controls changed');
for (const output of Object.values(activation.outputs)) assert(!(await exists(output)), `future output already exists: ${output}`);

if (checkOnly) {
  assert(['frozen-batch-07-audio-validation-correction-1-prepared-not-active','frozen-batch-07-audio-validation-correction-1-authorized-under-standing-authorization'].includes(activation.status), 'activation status invalid');
  console.log('Batch 7 audio validation correction-1 runner preflight passed.');
  process.exit(0);
}
assert(activation.status === 'frozen-batch-07-audio-validation-correction-1-authorized-under-standing-authorization', 'correction is not activated');
assert(activation.authorization.correctionExecution && activation.authorization.cohortReplay && !activation.authorization.audioAccess && !activation.authorization.modelExecution && !activation.authorization.paidServiceUse, 'authorization boundary changed');

const request = JSON.parse(await readFile(`${ROOT}/execution-manifest.json`, 'utf8'));
const priorExecution = JSON.parse(await readFile(`${ROOT}/model-execution.json`, 'utf8'));
assert(JSON.stringify(request.thresholds) === JSON.stringify(activation.exactThresholds), 'thresholds changed');
assert(request.calls.length === 5 && priorExecution.results.length === 5 && priorExecution.retries === 0 && !priorExecution.requestFailure, 'preserved execution changed');

const startedAt = new Date().toISOString();
const start = Date.now();
const originalHashesBefore = Object.fromEntries(await Promise.all(activation.transcriptLocks.map(async (lock) => [lock.path, await hashFile(lock.path)])));
const moves = [];
let overlayApplications = 0;
let validationFailure = null;
try {
  for (const [callIndex, call] of request.calls.entries()) {
    const lock = activation.transcriptLocks[callIndex];
    assert(lock.callIndex === callIndex && lock.moveId === call.moveId && lock.path === call.transcriptPath, `${call.moveId}: frozen call order changed`);
    const result = priorExecution.results.find((item) => item.debateNumber === call.debateNumber && item.moveId === call.moveId);
    assert(result?.status === 'completed' && result.transcriptSha256 === lock.sha256, `${call.moveId}: completed result missing`);
    const originalBytes = await readFile(lock.path);
    let transcript = JSON.parse(originalBytes);
    let validationOverlay = null;
    if (call.moveId === activation.target.moveId) {
      const originalTopLevel = Object.fromEntries(Object.entries(transcript).filter(([key]) => key !== 'segments'));
      assert(transcript.segments.length === activation.correction.originalSegmentCount, 'target segment count changed');
      const frozenIndexes = activation.correction.omittedSegments.map((item) => item.index);
      assert(JSON.stringify(frozenIndexes) === JSON.stringify([10]), 'omission indexes changed');
      for (const frozen of activation.correction.omittedSegments) {
        const segment = transcript.segments[frozen.index];
        assert(segment.id === frozen.id && segment.type === frozen.type && segment.speaker === frozen.speaker && segment.start === frozen.start && segment.end === frozen.end && segment.text === '', `frozen empty segment ${frozen.index} changed`);
      }
      assert(transcript.segments.filter((segment) => typeof segment.text !== 'string' || segment.text.trim().length === 0).length === 1, 'exactly one empty-text segment required');
      const overlay = structuredClone(transcript);
      overlay.segments = transcript.segments.filter((_segment, index) => !frozenIndexes.includes(index));
      assert(overlay.segments.length === activation.correction.transientSegmentCount, 'overlay segment count changed');
      assert(JSON.stringify(Object.fromEntries(Object.entries(overlay).filter(([key]) => key !== 'segments'))) === JSON.stringify(originalTopLevel), 'overlay changed top-level transcript data');
      assert(JSON.stringify(overlay.segments) === JSON.stringify(transcript.segments.filter((_segment, index) => !frozenIndexes.includes(index))), 'overlay changed more than the exact omissions');
      transcript = overlay;
      overlayApplications += 1;
      validationOverlay = { operation: activation.correction.name, omittedSegmentIndexes: frozenIndexes, originalSegmentCount: activation.correction.originalSegmentCount, validationSegmentCount: activation.correction.transientSegmentCount, persistentTranscriptWritten: false };
    }
    const deterministicEvidence = evaluateAttributionTranscript(transcript, { moveId: call.moveId, expectedSpeaker: call.expectedSpeaker, verificationExcerpt: call.verificationExcerpt }, activation.exactThresholds);
    moves.push({
      debateNumber: call.debateNumber, debateId: call.debateId, moveId: call.moveId, expectedSpeaker: call.expectedSpeaker, trigger: call.trigger,
      executionStatus: result.status, status: deterministicEvidence.status, resolvedSpeaker: deterministicEvidence.status === 'verified' ? call.expectedSpeaker : null,
      clip: { path: call.clipPath, sha256: call.clipSha256, durationSeconds: call.durationSeconds },
      transcript: { path: lock.path, sha256: lock.sha256, model: call.model, responseFormat: call.responseFormat, persistentMutation: false },
      validationOverlay, deterministicEvidence,
    });
  }
  assert(overlayApplications === 1, 'exactly one transcript overlay required');
  for (const lock of activation.transcriptLocks) assert((await hashFile(lock.path)) === originalHashesBefore[lock.path], `original transcript changed: ${lock.moveId}`);
} catch (error) {
  validationFailure = error.stack ?? String(error);
}

const verified = moves.filter((move) => move.status === 'verified').length;
const unresolved = moves.length - verified;
const replayComplete = validationFailure === null && moves.length === 5;
const passed = replayComplete && verified === 5;
const status = passed ? 'passed-all-five-batch-07-audio-attributions-after-empty-segment-overlay' : replayComplete ? 'batch-07-audio-verification-unresolved-after-empty-segment-overlay' : 'batch-07-audio-validation-correction-1-failed';
const debates = replayComplete ? [...new Set(moves.map((move) => move.debateNumber))].map((debateNumber) => ({
  debateNumber,
  debateId: moves.find((move) => move.debateNumber === debateNumber).debateId,
  moves: moves.filter((move) => move.debateNumber === debateNumber),
})) : [];
const totals = {
  requiredMoves: 5, verified, unresolved: replayComplete ? unresolved : null,
  paidDiarizationCallsAttempted: priorExecution.callsAttempted, paidDiarizationCallsCompleted: priorExecution.callsCompleted, callsSkipped: priorExecution.callsSkipped,
  retries: 0, corrections: 1, deterministicReplayPasses: replayComplete ? 1 : 0, clipMinutes: request.costEstimate.clipMinutes,
  durationOnlyPlanningExposureUsd: priorExecution.durationOnlyPlanningExposureUsd, usageDerivedEstimatedCostUsd: priorExecution.usageDerivedEstimatedCostUsd,
  actualBilledCostUsdAvailable: priorExecution.actualBilledCostUsdAvailable, maximumAuthorizedCostUsd: priorExecution.maximumAuthorizedCostUsd,
  directIncrementalCostCapControlPassed: priorExecution.directIncrementalCostCapControlPassed, directIncrementalCostUsdThisStage: 0,
  judgmentModelContexts: 0, adjudicationModelContexts: 0, scoresDerived: 0, productionMutations: 0, nextBatchSelections: 0, audioPlaybackCalls: 0, semanticAudioEvaluations: 0,
};
const executionRecord = {
  schemaVersion: '1.0-assessment-production-post-canary-batch-07-audio-validation-correction-1-execution', protocolId: request.protocolId, status,
  startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - start, productionCanary: false, batchNumber: 7, correctionNumber: 1,
  deterministicPassesAttempted: 1, deterministicPassesCompleted: replayComplete ? 1 : 0, retries: 0, reruns: 0, automaticRepairs: 0,
  completedValidations: moves.length, requiredValidations: 5, verified, unresolved: replayComplete ? unresolved : null, overlayApplications,
  originalTranscriptsUnchanged: Object.entries(originalHashesBefore).every(([file, digest]) => activation.transcriptLocks.some((lock) => lock.path === file && lock.sha256 === digest)),
  persistentTranscriptWrites: 0, validationFailure: validationFailure?.slice(-12000) ?? null, gateAcceptancePassed: passed,
  audioAccesses: 0, transcriptionCalls: 0, modelOrApiCalls: 0, paidServiceCalls: 0, directIncrementalCostUsd: 0, scoresDerived: 0, productionMutations: 0, nextBatchSelections: 0,
  nextAuthorizedAction: passed ? 'resume-batch-07-standing-authorization-with-dispute-only-adjudication-preparation' : 'preserve-and-diagnose-batch-07-audio-correction-result',
};
await writeFile(activation.outputs.execution, `${JSON.stringify(executionRecord, null, 2)}\n`);
if (replayComplete) {
  const audit = {
    schemaVersion: '1.0-assessment-production-post-canary-batch-07-audio-verification-audit', protocolId: request.protocolId, status, productionCanary: false, batchNumber: 7, stagingOnly: true,
    correction: { number: 1, operation: activation.correction.name, targetMoveId: activation.target.moveId, omittedSegmentIndexes: [10], transientOverlayApplications: 1, persistentTranscriptWrites: 0, allOriginalTranscriptsUnchanged: true },
    debates, thresholds: activation.exactThresholds, referenceContract: request.referenceContract, totals,
    authorization: { adjudicationPacketPreparation: passed, paidTranscription: false, retry: false, correctionCall: false, judgmentModelExecution: false, adjudicationModelExecution: false, finalLedgerAssembly: false, scoreDerivation: false, productionMutation: false, nextBatchSelection: false },
  };
  const analysis = {
    schemaVersion: '1.0-assessment-production-post-canary-batch-07-audio-verification-analysis', protocolId: request.protocolId, status, productionCanary: false, batchNumber: 7, stagingOnly: true,
    gate: { passed, executionComplete: true, deterministicReplayComplete: true, requiredMoves: 5, verified, unresolved, deterministicThresholdsApplied: true, exactValidatorPreserved: true, originalTranscriptsPreserved: true, transientCorrectionOverlayApplications: 1, persistentTranscriptWrites: 0 },
    costs: totals, judgmentModelBoundary: { judgmentModel: '5.6 Sol', modelSlug: 'gpt-5.6-sol', reasoningEffort: 'low', authentication: 'ChatGPT subscription', judgmentModelCallsThisStage: 0, scoreBlind: true, roundedIntegerScoreTiesPermitted: true, unchanged: true },
    standingAuthorization: { path: 'docs/assessment-production/post-canary-continuation-v1/batch-07/standing-authorization.json', sha256: activation.sourceHashes['docs/assessment-production/post-canary-continuation-v1/batch-07/standing-authorization.json'], automaticContinuationWhileGatesPass: true },
    authorization: audit.authorization,
    nextAuthorizedAction: executionRecord.nextAuthorizedAction,
  };
  await writeFile(activation.outputs.audit, `${JSON.stringify(audit, null, 2)}\n`);
  await writeFile(activation.outputs.analysis, `${JSON.stringify(analysis, null, 2)}\n`);
  const inputRate = request.costEstimate.officialPricePerMillionTokensUsd.input;
  const outputRate = request.costEstimate.officialPricePerMillionTokensUsd.output;
  const calls = priorExecution.results.map((result, index) => ({
    debateNumber: result.debateNumber, moveId: result.moveId, transcriptPath: request.calls[index].transcriptPath, transcriptSha256: result.transcriptSha256,
    ...result.usage, inputCostUsd: result.usage.inputTokens * inputRate / 1_000_000, outputCostUsd: result.usage.outputTokens * outputRate / 1_000_000,
    usageDerivedEstimatedCostUsd: result.usage.inputTokens * inputRate / 1_000_000 + result.usage.outputTokens * outputRate / 1_000_000,
  }));
  const cost = {
    schemaVersion: '1.0-assessment-production-post-canary-batch-07-audio-cost-control-analysis', protocolId: request.protocolId,
    status: passed ? 'audio-attribution-passed-usage-derived-cost-within-approved-cap' : 'audio-attribution-unresolved-usage-derived-cost-within-approved-cap',
    analyzedAt: new Date().toISOString(), productionCanary: false, batchNumber: 7, stagingOnly: true,
    audioAttributionGate: { passed, executionComplete: true, verified, unresolved, resultPreserved: true, resultPath: activation.outputs.analysis, resultSha256: await hashFile(activation.outputs.analysis) },
    pricing: { provider: 'OpenAI', model: request.model, officialPricingUrl: request.costEstimate.officialModelPricingUrl, officialPricingCheckedAt: request.costEstimate.officialPricingCheckedAt, inputRatePerMillionUsd: inputRate, outputRatePerMillionUsd: outputRate, billingBasis: 'returned-token-usage-times-frozen-official-model-rates', actualInvoiceChargeAvailable: false, usageDerivedEstimateNotInvoice: true },
    costControl: { originalDurationOnlyPlanningEstimateUsd: request.costEstimate.durationOnlyPlanningEstimateUsd, usageDerivedPlanningEstimateUsd: request.costEstimate.primaryExpectedFutureExecutionCostUsd, approvedMaximumCostUsd: priorExecution.maximumAuthorizedCostUsd, usageDerivedEstimatedCostUsd: priorExecution.usageDerivedEstimatedCostUsd, estimateDifferenceUsd: priorExecution.usageDerivedEstimatedCostUsd - request.costEstimate.primaryExpectedFutureExecutionCostUsd, amountAboveApprovedCapUsd: priorExecution.usageDerivedEstimatedCostUsd - priorExecution.maximumAuthorizedCostUsd, approvedCapExceeded: priorExecution.usageDerivedEstimatedCostUsd > priorExecution.maximumAuthorizedCostUsd, allCompletedUsageRecorded: true, requestFailure: false, costCapReachedOrExceededDuringExecution: false, stopReason: null, noFurtherPaidCallsAfterExecution: true, directIncrementalCostCapControlPassed: true },
    calls, totals: priorExecution.usage,
    executionBoundary: { paidCallsAddedByCorrection: 0, modelCallsAddedByCorrection: 0, audioPlaybackCalls: 0, semanticAudioEvaluations: 0, retries: 0, judgmentModelContexts: 0, adjudicationModelContexts: 0, scoresDerived: 0 },
    workflowDisposition: { deterministicAudioAttributionResultInvalidated: false, downstreamWorkflowBlocked: !passed },
    authorization: audit.authorization,
    sourceHashes: { [ACTIVATION_PATH]: await hashFile(ACTIVATION_PATH), [`${ROOT}/execution-manifest.json`]: await hashFile(`${ROOT}/execution-manifest.json`), [`${ROOT}/model-execution.json`]: await hashFile(`${ROOT}/model-execution.json`), [activation.outputs.audit]: await hashFile(activation.outputs.audit), [activation.outputs.analysis]: await hashFile(activation.outputs.analysis), [activation.exactValidator.path]: await hashFile(activation.exactValidator.path), ...Object.fromEntries(activation.transcriptLocks.map((lock) => [lock.path, lock.sha256])) },
    nextAuthorizedAction: executionRecord.nextAuthorizedAction,
  };
  await writeFile(activation.outputs.cost, `${JSON.stringify(cost, null, 2)}\n`);
}
console.log(JSON.stringify({ status, replayComplete, verified, unresolved: replayComplete ? unresolved : null, overlayApplications, persistentTranscriptWrites: 0, modelOrApiCalls: 0, paidServiceCalls: 0, directIncrementalCostUsd: 0 }, null, 2));
if (!passed) process.exitCode = 1;
