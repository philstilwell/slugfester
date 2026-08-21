#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const shouldWrite = process.argv.includes("--write");
const stageRoot = "docs/assessment-production/post-canary-continuation-v1/batch-04/audio-verification";
const outputPath = `${stageRoot}/cost-control-analysis.json`;
const files = {
  preparation: `${stageRoot}/execution-preparation-manifest.json`,
  activation: `${stageRoot}/execution-manifest.json`,
  execution: `${stageRoot}/model-execution.json`,
  audit: `${stageRoot}/audio-verification.json`,
  analysis: `${stageRoot}/analysis.json`
};
const toolFiles = [
  "scripts/activate-assessment-production-post-canary-batch-04-audio-verification.mjs",
  "scripts/run-assessment-production-post-canary-batch-04-audio-verification.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-04-audio-verification.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-04-audio-cost-control.mjs",
  "scripts/test-assessment-production-post-canary-batch-04-audio-verification.mjs"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const round = (value, places = 7) => Number(value.toFixed(places));
const entries = await Promise.all(Object.entries(files).map(async ([key, file]) => [key, await readFile(file)]));
const bytes = Object.fromEntries(entries);
const documents = Object.fromEntries(entries.map(([key, value]) => [key, JSON.parse(value)]));

assert(documents.activation.calls.length === 4, "exactly four calls required");
assert(documents.execution.callsAttempted <= 4, "attempt count exceeds authorization");
assert(documents.execution.callsCompleted <= documents.execution.callsAttempted, "completed call count invalid");
assert(documents.execution.retries === 0, "retries are prohibited");
assert(documents.execution.correctionCalls === 0, "correction calls are prohibited");
assert(documents.analysis.gate.requiredMoves === 4, "four required moves changed");
assert(documents.activation.costEstimate.maximumAuthorizedCostUsd === 1, "approved cap changed");

const inputRatePerMillionUsd = documents.activation.costEstimate.officialPricePerMillionTokensUsd.input;
const outputRatePerMillionUsd = documents.activation.costEstimate.officialPricePerMillionTokensUsd.output;
const perCall = [];
for (const call of documents.activation.calls) {
  const result = documents.execution.results.find((item) => item.debateNumber === call.debateNumber && item.moveId === call.moveId);
  assert(result, `${call.moveId}: execution result missing`);
  if (result.status !== "completed") continue;
  const transcriptBytes = await readFile(call.transcriptPath);
  assert(sha256(transcriptBytes) === result.transcriptSha256, `${call.moveId}: transcript hash mismatch`);
  const transcript = JSON.parse(transcriptBytes);
  const usage = transcript.usage;
  assert(usage?.type === "tokens", `${call.moveId}: token usage missing`);
  assert(Number.isInteger(usage.input_tokens), `${call.moveId}: input usage missing`);
  assert(Number.isInteger(usage.output_tokens), `${call.moveId}: output usage missing`);
  assert(usage.total_tokens === usage.input_tokens + usage.output_tokens, `${call.moveId}: total usage mismatch`);
  const inputCostUsd = usage.input_tokens / 1_000_000 * inputRatePerMillionUsd;
  const outputCostUsd = usage.output_tokens / 1_000_000 * outputRatePerMillionUsd;
  perCall.push({
    debateNumber: call.debateNumber,
    moveId: call.moveId,
    transcriptPath: call.transcriptPath,
    transcriptSha256: sha256(transcriptBytes),
    inputTokens: usage.input_tokens,
    audioInputTokens: usage.input_token_details?.audio_tokens ?? null,
    textInputTokens: usage.input_token_details?.text_tokens ?? null,
    outputTokens: usage.output_tokens,
    totalTokens: usage.total_tokens,
    inputCostUsd,
    outputCostUsd,
    usageDerivedEstimatedCostUsd: inputCostUsd + outputCostUsd
  });
}

const totals = {
  inputTokens: perCall.reduce((sum, item) => sum + item.inputTokens, 0),
  audioInputTokens: perCall.reduce((sum, item) => sum + (item.audioInputTokens ?? 0), 0),
  textInputTokens: perCall.reduce((sum, item) => sum + (item.textInputTokens ?? 0), 0),
  outputTokens: perCall.reduce((sum, item) => sum + item.outputTokens, 0),
  totalTokens: perCall.reduce((sum, item) => sum + item.totalTokens, 0),
  usageDerivedEstimatedCostUsd: perCall.reduce((sum, item) => sum + item.usageDerivedEstimatedCostUsd, 0)
};
const planningEstimateUsd = documents.activation.costEstimate.primaryExpectedFutureExecutionCostUsd;
const approvedMaximumCostUsd = documents.activation.costEstimate.maximumAuthorizedCostUsd;
const amountAboveApprovedCapUsd = totals.usageDerivedEstimatedCostUsd - approvedMaximumCostUsd;
const approvedCapExceeded = amountAboveApprovedCapUsd > 0;
const executionComplete = documents.execution.callsCompleted === 4;
const allCompletedUsageRecorded = perCall.length === documents.execution.callsCompleted;
assert(round(totals.usageDerivedEstimatedCostUsd) === documents.execution.usageDerivedEstimatedCostUsd, "execution cost total changed");
assert(documents.execution.directIncrementalCostCapControlPassed === !approvedCapExceeded, "execution cap disposition changed");

const sourceHashes = {};
for (const [key, file] of Object.entries(files)) sourceHashes[file] = sha256(bytes[key]);
for (const item of perCall) sourceHashes[item.transcriptPath] = item.transcriptSha256;
for (const file of toolFiles) sourceHashes[file] = sha256(await readFile(file));

const gateLabel = documents.analysis.gate.passed
  ? "audio-attribution-passed"
  : executionComplete
    ? "audio-attribution-unresolved"
    : "audio-verification-incomplete";
const costLabel = approvedCapExceeded
  ? "usage-derived-cost-exceeded-approved-cap"
  : "usage-derived-cost-within-approved-cap";
const analysis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-04-audio-cost-control-analysis",
  protocolId: documents.activation.protocolId,
  status: `${gateLabel}-${costLabel}`,
  analyzedAt: new Date().toISOString(),
  productionCanary: false,
  batchNumber: 4,
  stagingOnly: true,
  audioAttributionGate: {
    passed: documents.analysis.gate.passed,
    executionComplete,
    verified: documents.analysis.gate.verified,
    unresolved: documents.analysis.gate.unresolved,
    resultPreserved: true,
    resultPath: files.analysis,
    resultSha256: sourceHashes[files.analysis]
  },
  pricing: {
    provider: "OpenAI",
    model: "gpt-4o-transcribe-diarize",
    officialPricingUrl: documents.activation.costEstimate.officialModelPricingUrl,
    officialPricingCheckedAt: documents.activation.costEstimate.officialPricingCheckedAt,
    inputRatePerMillionUsd,
    outputRatePerMillionUsd,
    billingBasis: "returned-token-usage-times-frozen-official-model-rates",
    actualInvoiceChargeAvailable: false,
    usageDerivedEstimateNotInvoice: true
  },
  costControl: {
    originalDurationOnlyPlanningEstimateUsd: documents.activation.costEstimate.durationOnlyPlanningEstimateUsd,
    usageDerivedPlanningEstimateUsd: planningEstimateUsd,
    approvedMaximumCostUsd,
    usageDerivedEstimatedCostUsd: totals.usageDerivedEstimatedCostUsd,
    estimateDifferenceUsd: totals.usageDerivedEstimatedCostUsd - planningEstimateUsd,
    amountAboveApprovedCapUsd,
    approvedCapExceeded,
    allCompletedUsageRecorded,
    requestFailure: documents.execution.requestFailure,
    costCapReachedOrExceededDuringExecution: documents.execution.costCapReachedOrExceeded,
    stopReason: documents.execution.stopReason,
    noFurtherPaidCallsAfterExecution: true,
    directIncrementalCostCapControlPassed: !approvedCapExceeded
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
    downstreamWorkflowBlocked: !documents.analysis.gate.passed || approvedCapExceeded,
    userReviewRequired: approvedCapExceeded || !documents.analysis.gate.passed
  },
  authorization: {
    paidTranscription: false,
    audioVerificationExecution: false,
    retry: false,
    correctionCall: false,
    adjudicationPacketPreparation:
      documents.analysis.gate.passed && !approvedCapExceeded,
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
  nextAuthorizedAction: documents.analysis.nextAuthorizedAction
};

if (shouldWrite) await writeFile(outputPath, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({
  status: analysis.status,
  callsCompleted: documents.execution.callsCompleted,
  inputTokens: totals.inputTokens,
  outputTokens: totals.outputTokens,
  durationOnlyPlanningEstimateUsd: documents.activation.costEstimate.durationOnlyPlanningEstimateUsd,
  usageDerivedPlanningEstimateUsd: planningEstimateUsd,
  approvedMaximumCostUsd,
  usageDerivedEstimatedCostUsd: totals.usageDerivedEstimatedCostUsd,
  estimateDifferenceUsd: analysis.costControl.estimateDifferenceUsd,
  amountAboveApprovedCapUsd,
  approvedCapExceeded,
  audioAttributionPassed: documents.analysis.gate.passed,
  downstreamWorkflowBlocked: analysis.workflowDisposition.downstreamWorkflowBlocked,
  paidCallsAddedByCostAnalysis: 0,
  nextAuthorizedAction: analysis.nextAuthorizedAction
}, null, 2));
