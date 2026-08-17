#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const shouldWrite = process.argv.includes("--write");
const stageRoot = "docs/assessment-production/post-canary-continuation-v1/batch-02/audio-verification";
const activationPath = `${stageRoot}/execution-manifest.json`;
const executionPath = `${stageRoot}/model-execution.json`;
const failurePath = `${stageRoot}/validation-failure.json`;
const costPath = `${stageRoot}/cost-control-analysis.json`;
const analyzerPath = "scripts/analyze-assessment-production-post-canary-batch-02-audio-verification.mjs";
const validatorPath = "scripts/lib/v416-audio-verification.mjs";
const recorderPath = "scripts/record-assessment-production-post-canary-batch-02-audio-validation-failure.mjs";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const round = (value, places = 7) => Number(value.toFixed(places));

const [activationBytes, executionBytes, analyzerBytes, validatorBytes, recorderBytes] = await Promise.all([
  readFile(activationPath),
  readFile(executionPath),
  readFile(analyzerPath),
  readFile(validatorPath),
  readFile(recorderPath)
]);
const activation = JSON.parse(activationBytes);
const execution = JSON.parse(executionBytes);
assert(activation.status === "frozen-ten-post-canary-batch-02-paid-known-speaker-diarizations-authorized", "activation changed");
assert(execution.status === "ten-post-canary-batch-02-paid-known-speaker-diarizations-completed", "execution did not complete");
assert(execution.callsAttempted === 10 && execution.callsCompleted === 10 && execution.callsSkipped === 0, "ten-call execution population changed");
assert(execution.retries === 0 && execution.correctionCalls === 0, "retry boundary crossed");
assert(execution.requestFailure === false, "request failure disposition changed");
assert(execution.costCapReachedOrExceeded === false, "cost cap event changed");
assert(execution.judgmentModelContexts === 0 && execution.adjudicationModelContexts === 0, "judgment-model boundary crossed");
assert(execution.scoresDerived === 0 && execution.productionMutations === 0, "downstream boundary crossed");
for (const [file, digest] of Object.entries(activation.executionToolHashes)) {
  assert(sha256(await readFile(file)) === digest, `frozen execution tool changed: ${file}`);
}

const failedCallIndex = 6;
const failedCall = activation.calls[failedCallIndex];
assert(failedCall.debateNumber === "99" && failedCall.moveId === "pro-neural-correlation-interface-model", "failed call identity changed");
const failedResult = execution.results[failedCallIndex];
assert(failedResult.status === "completed", "failed-validator transcript was not a completed call");
const failedTranscriptBytes = await readFile(failedCall.transcriptPath);
assert(sha256(failedTranscriptBytes) === failedResult.transcriptSha256, "failed-validator transcript hash changed");
const failedTranscript = JSON.parse(failedTranscriptBytes);
assert(Array.isArray(failedTranscript.segments) && failedTranscript.segments.length === 44, "failed transcript segment population changed");
const invalidSegments = failedTranscript.segments
  .map((segment, index) => ({
    index,
    text: segment?.text,
    speaker: segment?.speaker,
    start: segment?.start,
    end: segment?.end
  }))
  .filter((segment) => typeof segment.text !== "string" || !segment.text.trim() || typeof segment.speaker !== "string" || !segment.speaker.trim() || !Number.isFinite(segment.start) || !Number.isFinite(segment.end) || segment.start < 0 || segment.end < segment.start);
assert(invalidSegments.length === 1, "unexpected invalid-segment population");
assert(invalidSegments[0].index === 36 && invalidSegments[0].text === "" && invalidSegments[0].speaker === "A" && invalidSegments[0].start === 111.982 && invalidSegments[0].end === 112.132, "preserved invalid segment changed");
const expectedError = "pro-neural-correlation-interface-model: segment 36 text invalid";

const sourceHashes = {
  [activationPath]: sha256(activationBytes),
  [executionPath]: sha256(executionBytes),
  [failedCall.transcriptPath]: sha256(failedTranscriptBytes),
  [analyzerPath]: sha256(analyzerBytes),
  [validatorPath]: sha256(validatorBytes),
  [recorderPath]: sha256(recorderBytes)
};
const failure = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-02-audio-verification-validation-failure",
  protocolId: activation.protocolId,
  status: "post-canary-batch-02-audio-verification-deterministic-validation-failed",
  recordedAt: new Date().toISOString(),
  productionCanary: false,
  batchNumber: 2,
  stagingOnly: true,
  executionGate: {
    callsPlanned: 10,
    callsAttempted: 10,
    callsCompleted: 10,
    callsSkipped: 0,
    attemptsPerCallMaximum: 1,
    retries: 0,
    requestFailure: false,
    model: "gpt-4o-transcribe-diarize"
  },
  deterministicValidationFailure: {
    command: "node scripts/analyze-assessment-production-post-canary-batch-02-audio-verification.mjs",
    exitCode: 1,
    completedCallsValidatedBeforeFailure: 6,
    failedCallIndex,
    failedCallOrdinal: failedCallIndex + 1,
    debateNumber: failedCall.debateNumber,
    debateId: failedCall.debateId,
    moveId: failedCall.moveId,
    expectedSpeaker: failedCall.expectedSpeaker,
    transcriptPath: failedCall.transcriptPath,
    transcriptSha256: failedResult.transcriptSha256,
    errorName: "Error",
    errorMessage: expectedError,
    invalidSegments,
    originalTranscriptPreserved: true,
    validatorPreserved: true,
    thresholdMutationPerformed: false,
    emptySegmentFiltered: false,
    speakerRelabelingPerformed: false,
    deterministicAttributionResultAvailable: false
  },
  stopRuleDisposition: {
    batchAudioGatePassed: false,
    remainingTranscriptValidationPerformedAfterFailure: false,
    retryPerformed: false,
    correctionPerformed: false,
    repairPrepared: false,
    adjudicationPacketPreparationPerformed: false,
    downstreamWorkflowBlocked: true
  },
  executionBoundary: {
    paidCallsAddedByFailureRecording: 0,
    modelCallsAddedByFailureRecording: 0,
    audioPlaybackCalls: 0,
    semanticAudioEvaluations: 0,
    retries: 0,
    judgmentModelContexts: 0,
    adjudicationModelContexts: 0,
    scoresDerived: 0,
    publicationReconstructions: 0,
    productionMutations: 0,
    nextBatchSelections: 0
  },
  authorization: {
    paidTranscription: false,
    audioVerificationExecution: false,
    failureDiagnosis: false,
    retry: false,
    correctionCall: false,
    adjudicationPacketPreparation: false,
    judgmentModelExecution: false,
    adjudicationModelExecution: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    publicationModelExecution: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  sourceHashes,
  nextAuthorizedAction: "user-approval-required-before-batch-02-audio-verification-failure-diagnosis"
};

const inputRatePerMillionUsd = activation.costEstimate.officialPricePerMillionTokensUsd.input;
const outputRatePerMillionUsd = activation.costEstimate.officialPricePerMillionTokensUsd.output;
const perCall = [];
for (const call of activation.calls) {
  const result = execution.results.find((item) => item.debateNumber === call.debateNumber && item.moveId === call.moveId);
  assert(result?.status === "completed" && result.usageValid, `${call.moveId}: completed usage record missing`);
  const transcriptBytes = await readFile(call.transcriptPath);
  assert(sha256(transcriptBytes) === result.transcriptSha256, `${call.moveId}: transcript hash changed`);
  const transcript = JSON.parse(transcriptBytes);
  const usage = transcript.usage;
  assert(usage?.type === "tokens" && usage.total_tokens === usage.input_tokens + usage.output_tokens, `${call.moveId}: returned usage changed`);
  const inputCostUsd = usage.input_tokens / 1_000_000 * inputRatePerMillionUsd;
  const outputCostUsd = usage.output_tokens / 1_000_000 * outputRatePerMillionUsd;
  perCall.push({
    debateNumber: call.debateNumber,
    moveId: call.moveId,
    transcriptPath: call.transcriptPath,
    transcriptSha256: result.transcriptSha256,
    inputTokens: usage.input_tokens,
    audioInputTokens: usage.input_token_details?.audio_tokens ?? null,
    textInputTokens: usage.input_token_details?.text_tokens ?? null,
    outputTokens: usage.output_tokens,
    totalTokens: usage.total_tokens,
    inputCostUsd,
    outputCostUsd,
    usageDerivedEstimatedCostUsd: inputCostUsd + outputCostUsd
  });
  sourceHashes[call.transcriptPath] = result.transcriptSha256;
}
const totals = {
  inputTokens: perCall.reduce((sum, item) => sum + item.inputTokens, 0),
  audioInputTokens: perCall.reduce((sum, item) => sum + (item.audioInputTokens ?? 0), 0),
  textInputTokens: perCall.reduce((sum, item) => sum + (item.textInputTokens ?? 0), 0),
  outputTokens: perCall.reduce((sum, item) => sum + item.outputTokens, 0),
  totalTokens: perCall.reduce((sum, item) => sum + item.totalTokens, 0),
  usageDerivedEstimatedCostUsd: perCall.reduce((sum, item) => sum + item.usageDerivedEstimatedCostUsd, 0)
};
assert(round(totals.usageDerivedEstimatedCostUsd) === execution.usageDerivedEstimatedCostUsd, "usage-derived execution cost changed");
const planningEstimateUsd = activation.costEstimate.primaryExpectedFutureExecutionCostUsd;
const approvedMaximumCostUsd = activation.costEstimate.maximumAuthorizedCostUsd;
const estimateDifferenceUsd = totals.usageDerivedEstimatedCostUsd - planningEstimateUsd;
const amountBelowApprovedCapUsd = approvedMaximumCostUsd - totals.usageDerivedEstimatedCostUsd;
assert(amountBelowApprovedCapUsd > 0, "approved cost cap exceeded");
const cost = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-02-audio-cost-control-analysis",
  protocolId: activation.protocolId,
  status: "audio-validation-blocked-usage-derived-cost-within-approved-cap",
  analyzedAt: new Date().toISOString(),
  productionCanary: false,
  batchNumber: 2,
  stagingOnly: true,
  audioAttributionGate: {
    passed: false,
    validationBlocked: true,
    deterministicValidationFailurePath: failurePath,
    deterministicValidationFailureSha256: shouldWrite ? null : null
  },
  pricing: {
    provider: "OpenAI",
    model: "gpt-4o-transcribe-diarize",
    officialPricingUrl: activation.costEstimate.officialModelPricingUrl,
    officialPricingCheckedAt: activation.costEstimate.officialPricingCheckedAt,
    inputRatePerMillionUsd,
    outputRatePerMillionUsd,
    billingBasis: "returned-token-usage-times-frozen-official-model-rates",
    actualInvoiceChargeAvailable: false,
    usageDerivedEstimateNotInvoice: true
  },
  costControl: {
    originalDurationOnlyPlanningEstimateUsd: activation.costEstimate.durationOnlyPlanningEstimateUsd,
    usageDerivedPlanningEstimateUsd: planningEstimateUsd,
    approvedMaximumCostUsd,
    usageDerivedEstimatedCostUsd: totals.usageDerivedEstimatedCostUsd,
    estimateDifferenceUsd,
    amountBelowApprovedCapUsd,
    amountAboveApprovedCapUsd: totals.usageDerivedEstimatedCostUsd - approvedMaximumCostUsd,
    approvedCapExceeded: false,
    allCompletedUsageRecorded: true,
    requestFailure: false,
    costCapReachedOrExceededDuringExecution: false,
    stopReason: null,
    noFurtherPaidCallsAfterExecution: true,
    directIncrementalCostCapControlPassed: true
  },
  calls: perCall,
  totals,
  executionBoundary: {
    paidCallsAddedByCostAnalysis: 0,
    modelCallsAddedByCostAnalysis: 0,
    audioPlaybackCalls: 0,
    semanticAudioEvaluations: 0,
    retries: 0,
    judgmentModelContexts: 0,
    adjudicationModelContexts: 0,
    scoresDerived: 0,
    publicationReconstructions: 0,
    productionMutations: 0,
    nextBatchSelections: 0
  },
  workflowDisposition: {
    deterministicAudioAttributionResultInvalidated: false,
    deterministicAudioAttributionResultUnavailable: true,
    downstreamWorkflowBlocked: true,
    userReviewRequired: true
  },
  authorization: failure.authorization,
  sourceHashes,
  nextAuthorizedAction: failure.nextAuthorizedAction
};

if (shouldWrite) {
  await writeFile(failurePath, `${JSON.stringify(failure, null, 2)}\n`);
  const failureBytes = await readFile(failurePath);
  cost.audioAttributionGate.deterministicValidationFailureSha256 = sha256(failureBytes);
  cost.sourceHashes[failurePath] = sha256(failureBytes);
  await writeFile(costPath, `${JSON.stringify(cost, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: failure.status,
  failedCallOrdinal: 7,
  debateNumber: failedCall.debateNumber,
  moveId: failedCall.moveId,
  errorMessage: expectedError,
  originalTranscriptPreserved: true,
  callsCompleted: 10,
  retries: 0,
  usageDerivedPlanningEstimateUsd: planningEstimateUsd,
  usageDerivedEstimatedCostUsd: totals.usageDerivedEstimatedCostUsd,
  estimateDifferenceUsd,
  approvedMaximumCostUsd,
  amountBelowApprovedCapUsd,
  approvedCapExceeded: false,
  paidCallsAddedByAnalysis: 0,
  downstreamWorkflowBlocked: true,
  nextAuthorizedAction: failure.nextAuthorizedAction
}, null, 2));
