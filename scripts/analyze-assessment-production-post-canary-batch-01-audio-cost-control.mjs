#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const shouldWrite = process.argv.includes("--write");
const stageRoot =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/audio-verification";
const outputPath = `${stageRoot}/cost-control-analysis.json`;
const files = {
  preparation: `${stageRoot}/execution-preparation-manifest.json`,
  activation: `${stageRoot}/execution-manifest.json`,
  execution: `${stageRoot}/model-execution.json`,
  audit: `${stageRoot}/audio-verification.json`,
  analysis: `${stageRoot}/analysis.json`
};
const tools = [
  "scripts/analyze-assessment-production-post-canary-batch-01-audio-cost-control.mjs",
  "scripts/test-assessment-production-post-canary-batch-01-audio-cost-control.mjs"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const entries = await Promise.all(
  Object.entries(files).map(async ([key, file]) => [key, await readFile(file)])
);
const bytes = Object.fromEntries(entries);
const documents = Object.fromEntries(
  entries.map(([key, value]) => [key, JSON.parse(value)])
);

assert(documents.activation.calls.length === 3, "exactly three calls required");
assert(documents.execution.callsAttempted === 3, "exactly three attempts required");
assert(documents.execution.callsCompleted === 3, "all three calls must have completed");
assert(documents.execution.retries === 0, "retries are prohibited");
assert(documents.analysis.gate.passed, "audio-attribution gate did not pass");
assert(documents.analysis.gate.verified === 3, "three verified moves required");

const inputRatePerMillionUsd = 2.5;
const outputRatePerMillionUsd = 10;
const perCall = [];
for (const call of documents.activation.calls) {
  const transcriptBytes = await readFile(call.transcriptPath);
  const transcript = JSON.parse(transcriptBytes);
  const usage = transcript.usage;
  assert(usage?.type === "tokens", `${call.moveId}: token usage missing`);
  assert(Number.isInteger(usage.input_tokens), `${call.moveId}: input usage missing`);
  assert(Number.isInteger(usage.output_tokens), `${call.moveId}: output usage missing`);
  assert(
    usage.total_tokens === usage.input_tokens + usage.output_tokens,
    `${call.moveId}: total usage mismatch`
  );
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
  audioInputTokens: perCall.reduce((sum, item) => sum + item.audioInputTokens, 0),
  textInputTokens: perCall.reduce((sum, item) => sum + item.textInputTokens, 0),
  outputTokens: perCall.reduce((sum, item) => sum + item.outputTokens, 0),
  totalTokens: perCall.reduce((sum, item) => sum + item.totalTokens, 0),
  usageDerivedEstimatedCostUsd: perCall.reduce(
    (sum, item) => sum + item.usageDerivedEstimatedCostUsd,
    0
  )
};
const approvedMaximumCostUsd = documents.activation.costEstimate.maximumAuthorizedCostUsd;
const planningEstimateUsd = documents.activation.costEstimate.expectedFutureExecutionCostUsd;
const amountAboveApprovedCapUsd =
  totals.usageDerivedEstimatedCostUsd - approvedMaximumCostUsd;
assert(totals.inputTokens === 6657, "input-token total changed");
assert(totals.outputTokens === 10240, "output-token total changed");
assert(totals.usageDerivedEstimatedCostUsd === 0.1190425, "usage-derived cost changed");
assert(amountAboveApprovedCapUsd === 0.01904249999999999, "cap delta changed");

const sourceHashes = {};
for (const [key, file] of Object.entries(files)) sourceHashes[file] = sha256(bytes[key]);
for (const item of perCall) sourceHashes[item.transcriptPath] = item.transcriptSha256;
for (const file of tools) sourceHashes[file] = sha256(await readFile(file));

const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-audio-cost-control-analysis",
  protocolId: documents.activation.protocolId,
  status:
    "audio-attribution-passed-usage-derived-cost-estimate-exceeded-approved-cap",
  analyzedAt: new Date().toISOString(),
  productionCanary: false,
  batchNumber: 1,
  stagingOnly: true,
  audioAttributionGate: {
    passed: true,
    verified: 3,
    unresolved: 0,
    resultPreserved: true,
    resultPath: files.analysis,
    resultSha256: sourceHashes[files.analysis]
  },
  pricing: {
    provider: "OpenAI",
    model: "gpt-4o-transcribe-diarize",
    officialPricingUrl:
      "https://developers.openai.com/api/docs/models/gpt-4o-transcribe-diarize",
    officialPricingCheckedAt: "2026-08-14",
    inputRatePerMillionUsd,
    outputRatePerMillionUsd,
    billingBasis: "returned-token-usage-times-current-official-model-rates",
    actualInvoiceChargeAvailable: false,
    usageDerivedEstimateNotInvoice: true
  },
  costControl: {
    originalPlanningRatePerMinuteUsd:
      documents.activation.costEstimate.planningPricePerMinuteUsd,
    originalPlanningEstimateUsd: planningEstimateUsd,
    approvedMaximumCostUsd,
    usageDerivedEstimatedCostUsd: totals.usageDerivedEstimatedCostUsd,
    amountAboveApprovedCapUsd,
    approvedCapExceeded: true,
    planningEstimateUnderstatedUsageDerivedEstimate: true,
    noFurtherPaidCallsAfterDiscovery: true,
    directIncrementalCostCapControlPassed: false
  },
  calls: perCall,
  totals,
  executionBoundary: {
    paidCallsAddedByCostAnalysis: 0,
    modelCallsAddedByCostAnalysis: 0,
    audioPlaybackCalls: 0,
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
    downstreamWorkflowBlocked: true,
    priorAnalysisNextAuthorizedActionSuperseded: true,
    userReviewRequired: true
  },
  authorization: {
    paidTranscription: false,
    audioVerificationExecution: false,
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
  nextAuthorizedAction:
    "user-review-required-before-any-batch-01-downstream-work-after-usage-derived-cost-cap-exceedance"
};

if (shouldWrite) await writeFile(outputPath, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({
  status: analysis.status,
  inputTokens: totals.inputTokens,
  outputTokens: totals.outputTokens,
  planningEstimateUsd,
  approvedMaximumCostUsd,
  usageDerivedEstimatedCostUsd: totals.usageDerivedEstimatedCostUsd,
  amountAboveApprovedCapUsd,
  audioAttributionPassed: true,
  downstreamWorkflowBlocked: true,
  paidCallsAddedByCostAnalysis: 0
}, null, 2));
