#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const shouldWrite = process.argv.includes("--write");
const batchRoot = "docs/assessment-production/post-canary-continuation-v1/batch-09";
const stageRoot = `${batchRoot}/audio-verification-partial-18`;
const preparationPath = `${stageRoot}/execution-preparation-manifest.json`;
const mediaRoot = "output/transcribe/assessment-production-post-canary-batch-09-audio-verification";
const workPath = `${batchRoot}/disagreement-extraction/audio-work-items.json`;
const judgmentPreparationPath = `${batchRoot}/independent-judgments/execution-preparation-manifest.json`;
const standingAuthorizationPath = `${batchRoot}/standing-authorization.json`;
const debate170ExecutionPath = `${batchRoot}/disagreement-extraction/audio-source-archive-mirror-recovery-12/execution.json`;
const debate19ExecutionPath = `${batchRoot}/disagreement-extraction/audio-source-debate-19-official-podcast-recovery-17/execution.json`;
const debate19PlanPath = `${batchRoot}/disagreement-extraction/audio-source-debate-19-official-podcast-recovery-17/recovery-plan.json`;
const debate183FailurePath = `${batchRoot}/disagreement-extraction/audio-source-tiekoetter-proxy-recovery-16/failure-diagnosis.json`;
const batch02PreparationPath = "docs/assessment-production/post-canary-continuation-v1/batch-02/audio-verification/execution-preparation-manifest.json";
const batch02CostPath = "docs/assessment-production/post-canary-continuation-v1/batch-02/audio-verification/cost-control-analysis.json";
const ffmpeg = "/opt/homebrew/bin/ffmpeg";
const ffprobe = "/opt/homebrew/bin/ffprobe";
const transcribeTool = "/Users/philstilwell/.codex/skills/transcribe/scripts/transcribe_diarize.py";
const toolSources = [
  "docs/assessment-production-workflow.md",
  "scripts/lib/v416-audio-verification.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-09-partial-audio-verification-18.mjs",
  "scripts/test-assessment-production-post-canary-batch-09-partial-audio-verification-18.mjs",
  "scripts/assessment-production-post-canary-batch-09-partial-audio-verification-stage-18.mjs",
  transcribeTool
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const readJson = (file) => readFile(file, "utf8").then(JSON.parse);

if (shouldWrite) assert.equal(await exists(preparationPath), false, `${preparationPath} already exists`);

const [work, judgmentPreparation, standingAuthorization, debate170Execution, debate19Execution, debate19Plan, debate183Failure, batch02Preparation, batch02Cost] = await Promise.all([
  readJson(workPath),
  readJson(judgmentPreparationPath),
  readJson(standingAuthorizationPath),
  readJson(debate170ExecutionPath),
  readJson(debate19ExecutionPath),
  readJson(debate19PlanPath),
  readJson(debate183FailurePath),
  readJson(batch02PreparationPath),
  readJson(batch02CostPath)
]);

assert.equal(standingAuthorization.status, "frozen-active-batch-09-complete-remaining-workflow-standing-authorization");
assert.equal(standingAuthorization.userAuthorization.conditionalPaidAudioMaximumUsd, 1);
assert.equal(debate170Execution.status, "completed-one-shot-batch-09-debate-170-canonical-archive-mirror-source-and-clip-recovery");
assert.equal(debate19Execution.status, "completed-one-shot-batch-09-debate-19-official-podcast-source-and-frozen-aligned-clip");
assert.equal(debate183Failure.status, "frozen-batch-09-debate-183-final-public-proxy-transfer-termination-diagnosed-stop-required");
assert.equal(debate19Plan.deterministicAlignment.podcastMinusExcerptOffsetMs, 3168041);

const available = [
  {
    debateNumber: "170",
    sourcePath: debate170Execution.result.sourcePath,
    sourceSha256: debate170Execution.result.sourceSha256,
    clipPath: debate170Execution.result.clipPath,
    clipSha256: debate170Execution.result.clipSha256,
    durationSeconds: debate170Execution.result.clipDurationSeconds,
    sourceOffsetMs: 0
  },
  {
    debateNumber: "19",
    sourcePath: debate19Execution.result.sourcePath,
    sourceSha256: debate19Execution.result.sourceSha256,
    clipPath: debate19Execution.result.clip.path,
    clipSha256: debate19Execution.result.clip.sha256,
    durationSeconds: debate19Execution.result.clip.durationSeconds,
    sourceOffsetMs: debate19Plan.deterministicAlignment.podcastMinusExcerptOffsetMs
  }
];
for (const item of available) {
  assert.equal(sha256(await readFile(item.sourcePath)), item.sourceSha256, `${item.debateNumber}: source hash mismatch`);
  assert.equal(sha256(await readFile(item.clipPath)), item.clipSha256, `${item.debateNumber}: clip hash mismatch`);
}

const workByKey = new Map(work.moves.map((move) => [`${move.debateNumber}:${move.moveId}`, move]));
const expectedKeys = ["170:pro-suffering-christian-hope-response", "19:pro-c009-phenomenal-value-reality"];
const selectedMoves = expectedKeys.map((key) => {
  const move = workByKey.get(key);
  assert(move, `${key}: work item missing`);
  return move;
});

const references = [];
for (const source of available) {
  const context = judgmentPreparation.contexts.find((item) => item.debateNumber === source.debateNumber && item.reviewerPass === "A");
  assert(context, `${source.debateNumber}: judgment context missing`);
  const [packet, locked, events] = await Promise.all([readJson(context.sourcePacket), readJson(context.lockedInventory), readJson(context.originalEvents)]);
  const speakers = [packet.sides.pro.speakers, packet.sides.con.speakers].flat();
  assert.equal(speakers.length, 2, `${source.debateNumber}: dyadic speakers required`);
  assert.equal(new Set(speakers).size, 2, `${source.debateNumber}: unique dyadic speakers required`);
  for (const speaker of speakers) {
    const candidates = locked.moves
      .filter((move) => move.speaker === speaker && move.attributionConfidence === "high")
      .map((move) => {
        const start = events[move.sourceSpan.startEvent];
        const end = events[move.sourceSpan.endEvent];
        const startMs = start.startMs;
        const endMs = end.startMs + end.durationMs;
        return { move, startMs, endMs, durationMs: endMs - startMs };
      })
      .filter((candidate) => candidate.durationMs >= 12000)
      .sort((left, right) => right.durationMs - left.durationMs || left.startMs - right.startMs || left.move.moveId.localeCompare(right.move.moveId));
    assert(candidates.length > 0, `${source.debateNumber}:${speaker}: reference unavailable`);
    const selected = candidates[0];
    const canonicalStartMs = Math.round((selected.startMs + selected.endMs) / 2 - 4000);
    const sourceStartMs = canonicalStartMs + source.sourceOffsetMs;
    assert(sourceStartMs >= 0, `${source.debateNumber}:${speaker}: source reference start invalid`);
    const safeSpeaker = speaker.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const localPath = `${mediaRoot}/debate-${source.debateNumber}/references/${safeSpeaker}.mp3`;
    if (shouldWrite) {
      await mkdir(path.dirname(localPath), { recursive: true });
      execFileSync(ffmpeg, [
        "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
        "-ss", (sourceStartMs / 1000).toFixed(3), "-i", source.sourcePath,
        "-t", "8", "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", localPath
      ]);
    }
    const actualDurationSeconds = shouldWrite
      ? Number(execFileSync(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", localPath], { encoding: "utf8" }).trim())
      : null;
    if (shouldWrite) assert(actualDurationSeconds >= 2 && actualDurationSeconds <= 10, `${source.debateNumber}:${speaker}: reference duration invalid`);
    references.push({
      debateNumber: source.debateNumber,
      speaker,
      selectedMoveId: selected.move.moveId,
      selectedMoveSourceSpan: selected.move.sourceSpan,
      selectedMoveDurationSeconds: Number((selected.durationMs / 1000).toFixed(3)),
      canonicalStartMs,
      sourceOffsetMs: source.sourceOffsetMs,
      sourceStartMs,
      requestedDurationSeconds: 8,
      actualDurationSeconds,
      localPath,
      sha256: shouldWrite ? sha256(await readFile(localPath)) : null,
      selectionRule: "midpoint-eight-seconds-of-longest-high-attribution-locked-move-per-speaker"
    });
  }
}

const calls = selectedMoves.map((move) => {
  const source = available.find((item) => item.debateNumber === move.debateNumber);
  return {
    debateNumber: move.debateNumber,
    debateId: move.debateId,
    moveId: move.moveId,
    expectedSpeaker: move.expectedSpeaker,
    proposition: move.proposition,
    verificationExcerpt: move.verificationExcerpt,
    trigger: move.trigger,
    clipPath: source.clipPath,
    clipSha256: source.clipSha256,
    durationSeconds: source.durationSeconds,
    transcriptPath: `${mediaRoot}/debate-${move.debateNumber}/transcripts/${move.moveId}.transcript.json`,
    model: "gpt-4o-transcribe-diarize",
    responseFormat: "diarized_json",
    chunkingStrategy: "auto",
    language: "en",
    knownSpeakers: references
      .filter((reference) => reference.debateNumber === move.debateNumber)
      .map(({ speaker, localPath, sha256: digest, actualDurationSeconds }) => ({ speaker, localPath, sha256: digest, actualDurationSeconds }))
  };
});
assert.equal(calls.length, 2);
assert(calls.every((call) => call.knownSpeakers.length === 2));
for (const call of calls) assert((await readFile(call.clipPath)).length < 25 * 1024 * 1024, `${call.moveId}: clip exceeds API limit`);

assert.equal(batch02Preparation.costEstimate.clipSeconds, 802.201938);
assert.equal(batch02Cost.calls.length, 10);
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
const expectedCostUsd = projectedUsage.totalInputTokens * 2.5 / 1_000_000 + projectedUsage.outputTokens * 10 / 1_000_000;

const sourceFiles = [
  workPath,
  judgmentPreparationPath,
  standingAuthorizationPath,
  debate170ExecutionPath,
  debate19ExecutionPath,
  debate19PlanPath,
  debate183FailurePath,
  batch02PreparationPath,
  batch02CostPath,
  ...toolSources,
  ...available.flatMap((source) => [source.sourcePath, source.clipPath]),
  ...references.filter(() => shouldWrite).map((reference) => reference.localPath)
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(file));

const manifest = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-09-partial-audio-verification-18-execution-preparation-manifest",
  protocolId: "assessment-production-post-canary-batch-09-decomposed-consensus",
  status: shouldWrite
    ? "prepared-two-available-batch-09-paid-known-speaker-diarizations-with-two-debate-183-blockers-conditional-activation-ready"
    : "preview-two-available-batch-09-paid-known-speaker-diarizations-with-two-debate-183-blockers-conditional-activation-ready",
  preparedAt: shouldWrite ? new Date().toISOString() : null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  batchNumber: 9,
  stagingOnly: true,
  AIOnly: true,
  userAuthorization: {
    instruction: "I approve the next section/attempt. Continue as far as you can without needing another approval or confirmation.",
    standingAuthorizationPath,
    standingAuthorizationSha256: sha256(await readFile(standingAuthorizationPath)),
    conditionalPaidAudioMaximumUsd: 1,
    verificationCallsAuthorizedForPreparation: 2,
    conditionalAdvanceApprovalRecorded: true,
    executionAuthorizedOnlyAfterFrozenEstimateIsReportedAndAtOrBelowOneDollar: true,
    audioPlaybackAuthorized: false,
    semanticAudioEvaluationAuthorizedOnlyThroughFrozenVerificationCalls: true
  },
  scope: {
    availableDebates: ["170", "19"],
    frozenTargetClips: 2,
    verificationCalls: 2,
    sameDebateSpeakerReferences: 4,
    blockedDebate: "183",
    blockedMoveIds: ["con-informed-deliberator-method", "con-foundational-anomaly-significance"],
    blockerDiagnosisPath: debate183FailurePath,
    blockerDiagnosisSha256: sha256(await readFile(debate183FailurePath)),
    completeFourClipCohort: false,
    partialResultsCannotAuthorizeAdjudication: true,
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
    referencesPerDebate: 2,
    references
  },
  costEstimate: {
    preparationDirectIncrementalCostUsdActual: 0,
    clipSeconds: Number(clipSeconds.toFixed(6)),
    clipMinutes: Number((clipSeconds / 60).toFixed(6)),
    durationOnlyPlanningEstimateUsd: Number((clipSeconds / 60 * 0.006).toFixed(7)),
    primaryExpectedFutureExecutionCostUsd: Number(expectedCostUsd.toFixed(7)),
    maximumConditionallyAuthorizedCostUsd: 1,
    projectedUsage,
    officialPricePerMillionTokensUsd: { input: 2.5, output: 10 },
    estimateMustBeReportedBeforeFirstCall: true,
    usageBaseline: {
      batch: 2,
      calls: 10,
      clipSeconds: batch02Preparation.costEstimate.clipSeconds,
      audioInputTokens: batch02Cost.totals.audioInputTokens,
      textInputTokens: batch02Cost.totals.textInputTokens,
      outputTokens: batch02Cost.totals.outputTokens,
      source: batch02CostPath
    }
  },
  executionPolicy: {
    sequential: true,
    attemptsPerCall: 1,
    retriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
    requestTimeoutMs: 240000,
    stopAfterRequestFailure: true,
    stopAfterUsageDerivedCostCapReachedOrExceeded: true,
    audioPlaybackCallsMaximum: 0,
    directIncrementalCostUsdMaximum: 1
  },
  sourceHashes,
  outputPaths: {
    activation: `${stageRoot}/execution-manifest.json`,
    execution: `${stageRoot}/model-execution.json`,
    audit: `${stageRoot}/audio-verification.json`,
    analysis: `${stageRoot}/analysis.json`,
    cost: `${stageRoot}/cost-control-analysis.json`
  },
  nextAuthorizedAction: "report-frozen-estimate-then-activate-and-execute-exactly-two-sequential-calls-if-estimate-does-not-exceed-one-dollar"
};

if (shouldWrite) {
  await mkdir(stageRoot, { recursive: true });
  await writeFile(preparationPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({ status: manifest.status, calls: calls.length, references: references.length, clipSeconds: manifest.costEstimate.clipSeconds, estimatedCostUsd: manifest.costEstimate.primaryExpectedFutureExecutionCostUsd }));
