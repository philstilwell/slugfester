#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const shouldWrite = process.argv.includes("--write");
const batchRoot = "docs/assessment-production/post-canary-continuation-v1/batch-09";
const stageRoot = `${batchRoot}/audio-verification-debate-183-21`;
const preparationPath = `${stageRoot}/execution-preparation-manifest.json`;
const mediaRoot = "output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-183";
const workPath = `${batchRoot}/disagreement-extraction/audio-work-items.json`;
const standingPath = `${batchRoot}/standing-authorization.json`;
const rangeExecutionPath = `${batchRoot}/disagreement-extraction/audio-source-debate-183-tiekoetter-range-recovery-19/execution.json`;
const referenceExecutionPath = `${batchRoot}/disagreement-extraction/audio-source-debate-183-speaker-reference-range-20/execution.json`;
const priorAuditPath = `${batchRoot}/audio-verification-partial-18/audio-verification.json`;
const priorCostPath = `${batchRoot}/audio-verification-partial-18/cost-control-analysis.json`;
const batch02PreparationPath = "docs/assessment-production/post-canary-continuation-v1/batch-02/audio-verification/execution-preparation-manifest.json";
const batch02CostPath = "docs/assessment-production/post-canary-continuation-v1/batch-02/audio-verification/cost-control-analysis.json";
const transcribeTool = "/Users/philstilwell/.codex/skills/transcribe/scripts/transcribe_diarize.py";
const toolSources = [
  "docs/assessment-production-workflow.md",
  "scripts/lib/v416-audio-verification.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-09-debate-183-audio-verification-21.mjs",
  "scripts/test-assessment-production-post-canary-batch-09-debate-183-audio-verification-21.mjs",
  "scripts/assessment-production-post-canary-batch-09-debate-183-audio-verification-stage-21.mjs",
  transcribeTool
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const readJson = (file) => readFile(file, "utf8").then(JSON.parse);

if (shouldWrite) assert.equal(await exists(preparationPath), false, `${preparationPath} already exists`);
const [work, standing, rangeExecution, referenceExecution, priorAudit, priorCost, batch02Preparation, batch02Cost] = await Promise.all([
  readJson(workPath), readJson(standingPath), readJson(rangeExecutionPath), readJson(referenceExecutionPath),
  readJson(priorAuditPath), readJson(priorCostPath), readJson(batch02PreparationPath), readJson(batch02CostPath)
]);
assert.equal(standing.status, "frozen-active-batch-09-complete-remaining-workflow-standing-authorization");
assert.equal(standing.userAuthorization.conditionalPaidAudioMaximumUsd, 1);
assert.equal(rangeExecution.status, "completed-one-shot-batch-09-debate-183-tiekoetter-range-source-and-two-clips");
assert.equal(referenceExecution.status, "completed-one-shot-batch-09-debate-183-high-attribution-speaker-references");
assert.equal(priorAudit.results.length, 2);
assert(priorAudit.results.every((result) => result.status === "verified"));
assert.equal(priorCost.totals.usageDerivedEstimatedCostUsd, 0.0907725);

const moveKeys = ["con-informed-deliberator-method", "con-foundational-anomaly-significance"];
const calls = moveKeys.map((moveId) => {
  const move = work.moves.find((item) => item.debateNumber === "183" && item.moveId === moveId);
  const clip = rangeExecution.result.clips.find((item) => item.moveId === moveId);
  assert(move, `${moveId}: work item missing`);
  assert(clip, `${moveId}: clip missing`);
  return {
    debateNumber: "183",
    debateId: move.debateId,
    moveId,
    expectedSpeaker: move.expectedSpeaker,
    proposition: move.proposition,
    verificationExcerpt: move.verificationExcerpt,
    trigger: move.trigger,
    clipPath: clip.path,
    clipSha256: clip.sha256,
    durationSeconds: clip.durationSeconds,
    transcriptPath: `${mediaRoot}/transcripts/${moveId}.transcript.json`,
    model: "gpt-4o-transcribe-diarize",
    responseFormat: "diarized_json",
    chunkingStrategy: "auto",
    language: "en",
    knownSpeakers: referenceExecution.result.references.map(({ speaker, path: localPath, sha256: digest, durationSeconds: actualDurationSeconds }) => ({ speaker, localPath, sha256: digest, actualDurationSeconds }))
  };
});
assert.equal(calls.length, 2);
assert(calls.every((call) => call.knownSpeakers.length === 2));
for (const call of calls) {
  assert.equal(sha256(await readFile(call.clipPath)), call.clipSha256, `${call.moveId}: clip hash mismatch`);
  assert((await readFile(call.clipPath)).length < 25 * 1024 * 1024, `${call.moveId}: API size limit exceeded`);
  for (const reference of call.knownSpeakers) assert.equal(sha256(await readFile(reference.localPath)), reference.sha256, `${reference.speaker}: reference hash mismatch`);
}

assert.equal(batch02Preparation.costEstimate.clipSeconds, 802.201938);
assert.equal(batch02Cost.totals.audioInputTokens, 14947);
assert.equal(batch02Cost.totals.textInputTokens, 1140);
assert.equal(batch02Cost.totals.outputTokens, 25310);
assert.equal(batch02Cost.pricing.inputRatePerMillionUsd, 2.5);
assert.equal(batch02Cost.pricing.outputRatePerMillionUsd, 10);
const clipSeconds = calls.reduce((sum, call) => sum + call.durationSeconds, 0);
const projectedUsage = {
  audioInputTokens: Math.ceil(batch02Cost.totals.audioInputTokens / batch02Preparation.costEstimate.clipSeconds * clipSeconds),
  textInputTokens: Math.ceil(batch02Cost.totals.textInputTokens / batch02Cost.calls.length * calls.length),
  outputTokens: Math.ceil(batch02Cost.totals.outputTokens / batch02Preparation.costEstimate.clipSeconds * clipSeconds)
};
projectedUsage.totalInputTokens = projectedUsage.audioInputTokens + projectedUsage.textInputTokens;
const projectedIncrementalCostUsd = projectedUsage.totalInputTokens * 2.5 / 1_000_000 + projectedUsage.outputTokens * 10 / 1_000_000;
const priorActualCostUsd = priorCost.totals.usageDerivedEstimatedCostUsd;
const projectedCumulativeCostUsd = priorActualCostUsd + projectedIncrementalCostUsd;
assert(projectedCumulativeCostUsd <= 1, "projected cumulative Batch 9 audio cost exceeds standing cap");

const sourceFiles = [
  workPath, standingPath, rangeExecutionPath, referenceExecutionPath, priorAuditPath, priorCostPath,
  batch02PreparationPath, batch02CostPath, ...toolSources,
  ...calls.flatMap((call) => [call.clipPath, ...call.knownSpeakers.map((reference) => reference.localPath)])
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(file));

const manifest = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-09-debate-183-audio-verification-21-execution-preparation-manifest",
  protocolId: "assessment-production-post-canary-batch-09-decomposed-consensus",
  status: shouldWrite ? "prepared-exactly-two-batch-09-debate-183-paid-known-speaker-diarizations-conditional-activation-ready" : "preview-exactly-two-batch-09-debate-183-paid-known-speaker-diarizations-conditional-activation-ready",
  preparedAt: shouldWrite ? new Date().toISOString() : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  batchNumber: 9,
  stagingOnly: true,
  AIOnly: true,
  userAuthorization: {
    instruction: "I approve the next section/attempt. Continue as far as you can without needing another approval or confirmation.",
    standingAuthorizationPath: standingPath,
    standingAuthorizationSha256: sha256(await readFile(standingPath)),
    conditionalPaidAudioMaximumUsd: 1,
    verificationCallsConditionallyAuthorized: 2,
    conditionalAdvanceApprovalRecorded: true,
    executionAuthorizedOnlyAfterFrozenEstimateIsReportedAndAtOrBelowOneDollar: true,
    semanticAudioEvaluationAuthorizedOnlyThroughFrozenVerificationCalls: true
  },
  scope: {
    debate: "183",
    moveIds: moveKeys,
    frozenTargetClips: 2,
    verificationCalls: 2,
    sameDebateHighAttributionSpeakerReferences: 2,
    priorAcceptedCalls: 2,
    completeFourClipCohortAfterSuccess: true,
    scoreFieldsAvailable: false,
    legacyAssessmentFieldsAvailable: false
  },
  model: "gpt-4o-transcribe-diarize",
  calls,
  thresholds: {
    minimumFullClipExcerptRecall: 0.8,
    minimumExpectedSpeakerExcerptRecall: 0.8,
    minimumExpectedSpeakerRecallMargin: 0.15,
    minimumExpectedSpeakerDurationSeconds: 5
  },
  referenceContract: {
    requestedDurationSeconds: 8,
    enforcedAcceptedRangeSeconds: [2, 10],
    referencesPerCall: 2,
    highAttributionRequired: true,
    references: referenceExecution.result.references
  },
  costEstimate: {
    preparationDirectIncrementalCostUsdActual: 0,
    clipSeconds: Number(clipSeconds.toFixed(6)),
    clipMinutes: Number((clipSeconds / 60).toFixed(6)),
    durationOnlyPlanningEstimateUsd: Number((clipSeconds / 60 * 0.006).toFixed(7)),
    primaryExpectedFutureIncrementalExecutionCostUsd: Number(projectedIncrementalCostUsd.toFixed(7)),
    priorBatch9UsageDerivedCostUsd: priorActualCostUsd,
    projectedCumulativeBatch9CostUsd: Number(projectedCumulativeCostUsd.toFixed(7)),
    maximumConditionallyAuthorizedCumulativeBatch9CostUsd: 1,
    remainingAuthorizedCostBeforeCallsUsd: Number((1 - priorActualCostUsd).toFixed(7)),
    projectedUsage,
    officialPricePerMillionTokensUsd: { input: 2.5, output: 10 },
    estimateMustBeReportedBeforeFirstCall: true,
    usageBaseline: { batch: 2, calls: 10, clipSeconds: batch02Preparation.costEstimate.clipSeconds, audioInputTokens: batch02Cost.totals.audioInputTokens, textInputTokens: batch02Cost.totals.textInputTokens, outputTokens: batch02Cost.totals.outputTokens, source: batch02CostPath }
  },
  executionPolicy: {
    sequential: true,
    attemptsPerCall: 1,
    retriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
    requestTimeoutMs: 240000,
    stopAfterRequestFailure: true,
    stopRemainingCallsAfterUsageDerivedCumulativeCostCapReachedOrExceeded: true,
    audioPlaybackCallsMaximum: 0,
    directIncrementalCostUsdMaximum: Number((1 - priorActualCostUsd).toFixed(7)),
    cumulativeBatch9CostUsdMaximum: 1
  },
  sourceHashes,
  outputPaths: {
    activation: `${stageRoot}/execution-manifest.json`,
    execution: `${stageRoot}/model-execution.json`,
    audit: `${stageRoot}/audio-verification.json`,
    analysis: `${stageRoot}/analysis.json`,
    cost: `${stageRoot}/cost-control-analysis.json`
  },
  nextAuthorizedAction: "report-the-frozen-incremental-and-cumulative-estimates-then-activate-and-execute-the-two-sequential-calls-if-the-cumulative-estimate-remains-at-or-below-one-dollar"
};
if (shouldWrite) { await mkdir(stageRoot, { recursive: true }); await writeFile(preparationPath, `${JSON.stringify(manifest, null, 2)}\n`); }
console.log(JSON.stringify({ status: manifest.status, calls: calls.length, references: 2, clipSeconds: manifest.costEstimate.clipSeconds, estimatedIncrementalCostUsd: manifest.costEstimate.primaryExpectedFutureIncrementalExecutionCostUsd, projectedCumulativeBatch9CostUsd: manifest.costEstimate.projectedCumulativeBatch9CostUsd }));
