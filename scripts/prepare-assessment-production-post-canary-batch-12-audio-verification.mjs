#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_12_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch12StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-12-standing-authorization.mjs";
import { V416_AUDIO_THRESHOLDS } from "./lib/v416-audio-verification.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const cohortRoot = "docs/assessment-production/post-canary-continuation-v1/batch-12";
const prepRoot = `${cohortRoot}/disagreement-extraction`;
const judgmentRoot = `${cohortRoot}/independent-judgments`;
const stageRoot = `${cohortRoot}/audio-verification`;
const mediaRoot = "output/transcribe/assessment-production-post-canary-batch-12-audio-verification";
const preparationPath = `${stageRoot}/execution-preparation-manifest.json`;
const activationPath = `${stageRoot}/execution-manifest.json`;
const executionPath = `${stageRoot}/model-execution.json`;
const auditPath = `${stageRoot}/audio-verification.json`;
const analysisPath = `${stageRoot}/analysis.json`;
const costControlAnalysisPath = `${stageRoot}/cost-control-analysis.json`;
const ffmpeg = "/opt/homebrew/bin/ffmpeg";
const ffprobe = "/opt/homebrew/bin/ffprobe";
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const EXPECTED_DEBATES = ["152", "07", "15"];
const EXPECTED_AUDIO = [
  "152:pro-evidence-experience-epistemology",
  "07:pro-doubled-kyrios-veiled-claim",
  "07:pro-synoptic-disclosure-early-christology",
  "15:con-natural-inquiry-falsifiability"
];
const supplementalReferencePreparationPath =
  `${stageRoot}/reference-source-preparation.json`;
const batch02PreparationPath =
  "docs/assessment-production/post-canary-continuation-v1/batch-02/audio-verification/execution-preparation-manifest.json";
const batch02CostPath =
  "docs/assessment-production/post-canary-continuation-v1/batch-02/audio-verification/cost-control-analysis.json";
const TOOL_SOURCES = [
  "docs/assessment-production-workflow.md",
  "scripts/lib/v416-audio-verification.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/assessment-production-post-canary-batch-12-standing-authorization.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-12-audio-verification.mjs",
  "scripts/test-assessment-production-post-canary-batch-12-audio-verification-preparation.mjs",
  "scripts/assessment-production-post-canary-batch-12-audio-verification-stage.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-12-audio-sources.mjs",
  "scripts/test-assessment-production-post-canary-batch-12-audio-sources.mjs"
];
const standingAuthorization = await loadAndValidatePostCanaryBatch12StandingAuthorization();

if (shouldWrite) {
  for (const file of [
    preparationPath, activationPath, executionPath, auditPath, analysisPath, costControlAnalysisPath
  ]) assertV4(!(await exists(file)), `${file} already exists`);
}

const sourcePreparationPath = `${prepRoot}/audio-source-preparation.json`;
const workPreparationPath = `${prepRoot}/audio-work-item-preparation.json`;
const workPath = `${prepRoot}/audio-work-items.json`;
const judgmentPreparationPath = `${judgmentRoot}/execution-preparation-manifest.json`;
const [
  sourcePreparationBytes,
  workPreparationBytes,
  workBytes,
  judgmentPreparationBytes,
  batch02PreparationBytes,
  batch02CostBytes,
  supplementalReferencePreparationBytes
] = await Promise.all([
  readFile(sourcePreparationPath),
  readFile(workPreparationPath),
  readFile(workPath),
  readFile(judgmentPreparationPath),
  readFile(batch02PreparationPath),
  readFile(batch02CostPath),
  readFile(supplementalReferencePreparationPath)
]);
const sourcePreparation = JSON.parse(sourcePreparationBytes);
const workPreparation = JSON.parse(workPreparationBytes);
const work = JSON.parse(workBytes);
const judgmentPreparation = JSON.parse(judgmentPreparationBytes);
const batch02Preparation = JSON.parse(batch02PreparationBytes);
const batch02Cost = JSON.parse(batch02CostBytes);
const supplementalReferencePreparation = JSON.parse(
  supplementalReferencePreparationBytes
);

assertV4(
  sourcePreparation.status ===
      "prepared-four-post-canary-batch-12-local-audio-clips-standing-authorization-active-for-audio-verification-preparation" &&
    sourcePreparation.authorization.audioVerificationManifestPreparation &&
    sourcePreparation.nextAuthorizedAction ===
      "prepare-freeze-validate-and-push-batch-12-audio-verification-manifest-and-cost-estimate-under-standing-authorization",
  "Batch 12 audio-verification preparation is not authorized"
);
assertV4(sourcePreparation.clips.length === 4 && work.moves.length === 4, "four-clip cohort changed");
assertV4(
  JSON.stringify(sourcePreparation.clips.map((clip) => `${clip.debateNumber}:${clip.moveId}`)) ===
    JSON.stringify(EXPECTED_AUDIO),
  "exact audio-verification population changed"
);
for (const [file, digest] of Object.entries(sourcePreparation.inputHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `input hash mismatch: ${file}`);
}
assertV4(
  workPreparation.sourceCompatibility.occurrences.length === 0 &&
    workPreparation.sourceCompatibility.sourceRowsInjected === 0 &&
    workPreparation.sourceCompatibility.sourceRowsOmitted === 0 &&
    workPreparation.sourceCompatibility.sourceRowsRewritten === 0,
  "source-compatibility evidence changed"
);
for (const source of sourcePreparation.sources) {
  assertV4(sha256(await readFile(source.sourceAudio)) === source.sourceAudioSha256, `source hash mismatch: ${source.videoId}`);
}
for (const clip of sourcePreparation.clips) {
  assertV4(sha256(await readFile(clip.clipPath)) === clip.clipSha256, `clip hash mismatch: ${clip.moveId}`);
}
assertV4(
  supplementalReferencePreparation.status ===
      "passed-one-supplemental-same-debate-speaker-reference-source" &&
    supplementalReferencePreparation.need.debateNumber === "15" &&
    supplementalReferencePreparation.need.speaker === "John Lennox" &&
    supplementalReferencePreparation.successfulRecovery.status === "passed" &&
    supplementalReferencePreparation.successfulRecovery.retries === 0,
  "supplemental Debate 15 reference source changed"
);
const supplementalReferencePath =
  supplementalReferencePreparation.successfulRecovery.artifact;
assertV4(
  sha256(await readFile(supplementalReferencePath)) ===
    supplementalReferencePreparation.successfulRecovery.sha256,
  "supplemental Debate 15 reference source hash changed"
);

const sourceByDebate = new Map(sourcePreparation.sources.map((source) => [source.debateNumber, source]));
const referenceSpecs = [];
for (const debateNumber of EXPECTED_DEBATES) {
  const context = judgmentPreparation.contexts.find(
    (item) => item.debateNumber === debateNumber && item.reviewerPass === "A"
  );
  assertV4(context, `Debate ${debateNumber}: source context unavailable`);
  const [packet, locked, events] = await Promise.all([
    readFile(context.sourcePacket, "utf8").then(JSON.parse),
    readFile(context.lockedInventory, "utf8").then(JSON.parse),
    readFile(context.originalEvents, "utf8").then(JSON.parse)
  ]);
  const speakers = [packet.sides.pro.speakers, packet.sides.con.speakers].flat();
  assertV4(speakers.length === 2 && new Set(speakers).size === 2, `Debate ${debateNumber}: dyadic source required`);
  for (const speaker of speakers) {
    let candidates = locked.moves
      .filter((move) => move.speaker === speaker && move.attributionConfidence === "high")
      .map((move) => {
        const start = events[move.sourceSpan.startEvent];
        const end = events[move.sourceSpan.endEvent];
        const startMs = start.startMs;
        const endMs = end.startMs + end.durationMs;
        return { move, startMs, endMs, durationMs: endMs - startMs };
      })
      .filter((candidate) => candidate.durationMs >= 12000)
      .sort((left, right) =>
        right.durationMs - left.durationMs || left.startMs - right.startMs ||
        left.move.moveId.localeCompare(right.move.moveId)
      );
    if (debateNumber === "15" && speaker === "Christopher Hitchens") {
      candidates = candidates.filter(
        (candidate) =>
          candidate.startMs >= 1106140 && candidate.endMs <= 1248750
      );
    }
    assertV4(candidates.length > 0, `Debate ${debateNumber}: reference unavailable for ${speaker}`);
    const selected = candidates[0];
    const startSeconds = Number((((selected.startMs + selected.endMs) / 2 - 4000) / 1000).toFixed(3));
    assertV4(
      startSeconds * 1000 >= selected.startMs && (startSeconds + 8) * 1000 <= selected.endMs,
      `${speaker}: reference window left locked move`
    );
    referenceSpecs.push({
      debateNumber,
      speaker,
      selectedMoveId: selected.move.moveId,
      selectedMoveSourceSpan: selected.move.sourceSpan,
      selectedMoveDurationSeconds: Number((selected.durationMs / 1000).toFixed(3)),
      startSeconds,
      requestedDurationSeconds: 8,
      supplementalCapturedSource:
        debateNumber === "15" && speaker === "John Lennox",
      selectionRule: "midpoint-eight-seconds-of-longest-high-attribution-locked-move"
    });
  }
}

const references = [];
for (const spec of referenceSpecs) {
  const source = sourceByDebate.get(spec.debateNumber);
  const safeSpeaker = spec.speaker.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const referencePath = `${mediaRoot}/debate-${spec.debateNumber}/references/${safeSpeaker}.mp3`;
  const inputPath = spec.supplementalCapturedSource
    ? supplementalReferencePath
    : source.sourceAudio;
  const inputStartSeconds = spec.supplementalCapturedSource
    ? Number((spec.startSeconds - supplementalReferencePreparation.selection.captureStartSeconds).toFixed(3))
    : spec.startSeconds;
  if (shouldWrite) {
    await mkdir(path.dirname(referencePath), { recursive: true });
    execFileSync(ffmpeg, [
      "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
      "-ss", String(inputStartSeconds), "-i", inputPath,
      "-t", "8", "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", referencePath
    ]);
  }
  const actualDurationSeconds = shouldWrite
    ? Number(execFileSync(ffprobe, [
        "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", referencePath
      ], { encoding: "utf8" }).trim())
    : null;
  if (shouldWrite) assertV4(actualDurationSeconds >= 2 && actualDurationSeconds <= 10, `${spec.speaker}: duration invalid`);
  references.push({
    ...spec,
    inputPath,
    inputStartSeconds,
    actualDurationSeconds,
    localPath: referencePath,
    sha256: shouldWrite ? sha256(await readFile(referencePath)) : null
  });
}

const calls = sourcePreparation.clips.map((clip) => ({
  debateNumber: clip.debateNumber,
  debateId: clip.debateId,
  moveId: clip.moveId,
  expectedSpeaker: clip.expectedSpeaker,
  proposition: clip.proposition,
  verificationExcerpt: clip.verificationExcerpt,
  trigger: clip.trigger,
  clipPath: clip.clipPath,
  clipSha256: clip.clipSha256,
  durationSeconds: clip.durationSeconds,
  transcriptPath: `${mediaRoot}/debate-${clip.debateNumber}/transcripts/${clip.moveId}.transcript.json`,
  model: "gpt-4o-transcribe-diarize",
  responseFormat: "diarized_json",
  chunkingStrategy: "auto",
  language: "en",
  knownSpeakers: references
    .filter((reference) => reference.debateNumber === clip.debateNumber)
    .map(({ speaker, localPath, sha256: digest, actualDurationSeconds }) => ({
      speaker, localPath, sha256: digest, actualDurationSeconds
    }))
}));
assertV4(calls.length === 4 && references.length === 6, "four calls and six references required");
assertV4(calls.every((call) => call.knownSpeakers.length === 2), "two same-debate references required per call");
for (const call of calls) assertV4((await readFile(call.clipPath)).length < 25 * 1024 * 1024, `${call.moveId}: clip too large`);

const clipSeconds = calls.reduce((sum, call) => sum + call.durationSeconds, 0);
assertV4(
  batch02Preparation.costEstimate.clipSeconds === 802.201938 &&
    batch02Cost.calls.length === 10 &&
    batch02Cost.totals.audioInputTokens === 14947 &&
    batch02Cost.totals.textInputTokens === 1140 &&
    batch02Cost.totals.outputTokens === 25310 &&
    batch02Cost.pricing.inputRatePerMillionUsd === 2.5 &&
    batch02Cost.pricing.outputRatePerMillionUsd === 10,
  "Batch 2 returned-token usage baseline changed"
);
const projectedUsage = {
  audioInputTokens: Math.ceil(batch02Cost.totals.audioInputTokens / batch02Preparation.costEstimate.clipSeconds * clipSeconds),
  textInputTokens: Math.ceil(batch02Cost.totals.textInputTokens / batch02Cost.calls.length * calls.length),
  outputTokens: Math.ceil(batch02Cost.totals.outputTokens / batch02Preparation.costEstimate.clipSeconds * clipSeconds)
};
projectedUsage.totalInputTokens = projectedUsage.audioInputTokens + projectedUsage.textInputTokens;
const usageDerivedPlanningEstimateUsd =
  projectedUsage.totalInputTokens * 2.5 / 1_000_000 + projectedUsage.outputTokens * 10 / 1_000_000;
const authorizedDurationOnlyPlanningEstimateUsd = Number(
  (clipSeconds / 60 * 0.006).toFixed(7)
);

const sourceFiles = [
  sourcePreparationPath, workPreparationPath, workPath, judgmentPreparationPath,
  batch02PreparationPath, batch02CostPath, supplementalReferencePreparationPath,
  supplementalReferencePath, POST_CANARY_BATCH_12_STANDING_AUTHORIZATION,
  ...TOOL_SOURCES,
  ...sourcePreparation.sources.map((source) => source.sourceAudio),
  ...calls.map((call) => call.clipPath),
  ...references.filter(() => shouldWrite).map((reference) => reference.localPath)
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(file));

const manifest = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-12-audio-verification-execution-preparation-manifest",
  protocolId: "assessment-production-post-canary-batch-12-decomposed-consensus",
  status: shouldWrite
    ? "prepared-four-post-canary-batch-12-paid-known-speaker-diarizations-standing-authorization-conditional-activation-ready"
    : "preview-four-post-canary-batch-12-paid-known-speaker-diarizations-standing-authorization-conditional-activation-ready",
  preparedAt: shouldWrite ? new Date().toISOString() : null,
  approvedAt: null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false,
  batchNumber: 12,
  stagingOnly: true,
  developmentValidationOnly: false,
  AIOnly: true,
  userAuthorization: {
    instruction: standingAuthorization.record.userAuthorization.instruction,
    standingAuthorizationPath: POST_CANARY_BATCH_12_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standingAuthorization.sha256,
    preparationDirectIncrementalCostUsdMaximum: 0,
    conditionalPaidAudioMaximumUsd: 1,
    verificationCallsAuthorizedForPreparation: 4,
    speakerReferencesAuthorizedForPreparation: 6,
    conditionalAdvanceApprovalRecorded: true,
    audioVerificationExecutionAuthorizedOnlyAfterFrozenEstimateAtOrBelowOneDollar: true,
    audioPlaybackAuthorized: false,
    semanticAudioEvaluationAuthorized: false
  },
  scope: {
    debates: EXPECTED_DEBATES,
    frozenTargetClips: 4,
    verificationCalls: 4,
    additionalVerificationTargets: 0,
    sameDebateSpeakerSupportReferences: 6,
    scoreFieldsAvailable: false,
    legacyAssessmentFieldsAvailable: false,
    exactFrozenClipPopulationPreserved: true,
    sourceCompatibility: structuredClone(workPreparation.sourceCompatibility)
  },
  model: "gpt-4o-transcribe-diarize",
  calls,
  thresholds: V416_AUDIO_THRESHOLDS,
  referenceContract: {
    requestedDurationSeconds: 8,
    promotedRepositoryAcceptedRangeSeconds: [1.2, 10],
    currentOfficialAcceptedRangeSeconds: [2, 10],
    enforcedAcceptedRangeSeconds: [2, 10],
    currentOfficialRangeIsStricterAtLowerBound: true,
    measuredBeforeExecution: shouldWrite,
    referencesPerDebate: 2,
    selectionRule: "midpoint-eight-seconds-of-longest-high-attribution-locked-move-per-speaker",
    references
  },
  costEstimate: {
    preparationDirectIncrementalCostUsdMaximum: 0,
    preparationDirectIncrementalCostUsdActual: 0,
    promotedPlanningPricePerMinuteUsd: 0.006,
    durationOnlyPlanningRateBasis: "promoted-production-canary",
    clipSeconds: Number(clipSeconds.toFixed(6)),
    clipMinutes: Number((clipSeconds / 60).toFixed(4)),
    durationOnlyPlanningEstimateUsd: authorizedDurationOnlyPlanningEstimateUsd,
    durationOnlyEstimateAuthorizedByUser: true,
    usageDerivedPlanningEstimateUsd: Number(usageDerivedPlanningEstimateUsd.toFixed(7)),
    primaryExpectedFutureExecutionCostUsd: Number(usageDerivedPlanningEstimateUsd.toFixed(7)),
    primaryEstimateBasis: "Batch 2 returned-token usage rates applied to Batch 12 exact clip seconds and four-call count",
    maximumConditionallyAuthorizedCostUsd: 1,
    projectedUsage,
    usageBaseline: {
      batch: 2,
      calls: batch02Cost.calls.length,
      clipSeconds: batch02Preparation.costEstimate.clipSeconds,
      audioInputTokens: batch02Cost.totals.audioInputTokens,
      textInputTokens: batch02Cost.totals.textInputTokens,
      outputTokens: batch02Cost.totals.outputTokens,
      usageDerivedEstimatedCostUsd: batch02Cost.totals.usageDerivedEstimatedCostUsd,
      source: batch02CostPath
    },
    officialPricingCheckedAt: "2026-08-26",
    officialModelPricingUrl: "https://developers.openai.com/api/docs/models/gpt-4o-transcribe-diarize",
    officialPricePerMillionTokensUsd: { input: 2.5, output: 10 },
    actualTokenBilledCostMayVary: true,
    ChatGPTSubscriptionApplicable: false,
    OpenAIApiBillingRequired: true,
    conditionalAdvanceApprovalRecorded: true,
    conditionalAdvanceApprovalMaximumUsd: 1,
    estimateWithinConditionalApproval: usageDerivedPlanningEstimateUsd <= 1
  },
  executionPolicy: {
    callsMaximum: 4,
    attemptsPerCall: 1,
    retriesMaximum: 0,
    sequentialExecution: true,
    stopRemainingAfterRequestLevelFailure: true,
    stopRemainingAfterUsageDerivedCapExceedance: true,
    continueAfterCompletedButDeterministicallyUnresolvedTranscript: true,
    chunkingStrategy: "auto",
    responseFormat: "diarized_json",
    knownSpeakerReferencesPerCall: 2,
    transcriptsSavedLocally: true
  },
  judgmentModelBoundary: {
    judgmentModel: "5.6 Sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    judgmentModelCallsThisStage: 0,
    scoreBlind: true,
    roundedIntegerScoreTiesPermitted: true,
    unchanged: true
  },
  standingAuthorization: {
    path: POST_CANARY_BATCH_12_STANDING_AUTHORIZATION,
    sha256: standingAuthorization.sha256,
    status: standingAuthorization.record.status,
    conditionalPaidAudioMaximumUsd: 1,
    automaticContinuationWhileGatesPass: true
  },
  activePolicy: structuredClone(sourcePreparation.activePolicy),
  validatedInventoryContract: structuredClone(sourcePreparation.validatedInventoryContract),
  authorization: {
    paidTranscriptionActivation: shouldWrite,
    paidTranscriptionExecution: false,
    deterministicAudioAnalysis: false,
    retry: false,
    correctionCall: false,
    adjudicationPacketPreparation: false,
    adjudicationModelExecution: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    publicationFinalization: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  stopRules: {
    sourceHashMismatchBlocks: true,
    preexistingTranscriptBlocks: true,
    missingApiKeyBlocks: true,
    failedTranscriptPreserved: true,
    requestFailureStopsRemaining: true,
    usageDerivedCapExceedanceStopsRemaining: true,
    deterministicUnresolvedBlocksAdjudication: true,
    retryAuthorized: false,
    correctionAuthorized: false,
    thresholdRelaxationAuthorized: false,
    speakerRelabelingAuthorized: false,
    manualAttributionOverrideAuthorized: false
  },
  artifacts: {
    preparation: preparationPath,
    activation: activationPath,
    execution: executionPath,
    audit: auditPath,
    analysis: analysisPath,
    costControlAnalysis: costControlAnalysisPath,
    transcripts: calls.map((call) => call.transcriptPath)
  },
  futureOutputPathsExcludedFromSourceHashes: [
    activationPath,
    ...calls.map((call) => call.transcriptPath),
    executionPath, auditPath, analysisPath, costControlAnalysisPath
  ],
  sourceHashes,
  nextAuthorizedAction: "activate-and-execute-four-batch-12-paid-audio-verification-calls-under-standing-authorization"
};
assertV4(manifest.costEstimate.primaryExpectedFutureExecutionCostUsd <= 1, "estimated cost exceeds standing authorization");
if (shouldWrite) {
  await mkdir(stageRoot, { recursive: true });
  await writeFile(preparationPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: manifest.status,
  callsMaximum: 4,
  debates: EXPECTED_DEBATES,
  references: references.map(({ debateNumber, speaker, selectedMoveId, startSeconds, actualDurationSeconds }) => ({
    debateNumber, speaker, selectedMoveId, startSeconds, actualDurationSeconds
  })),
  clipMinutes: manifest.costEstimate.clipMinutes,
  model: manifest.model,
  expectedCostUsd: manifest.costEstimate.primaryExpectedFutureExecutionCostUsd,
  maximumAuthorizedCostUsd: 1,
  ChatGPTSubscriptionApplicable: false,
  conditionalAdvanceApprovalRecorded: true,
  estimateWithinConditionalApproval: manifest.costEstimate.estimateWithinConditionalApproval,
  retries: 0,
  paidExecutionAuthorized: false,
  scoreDerivationAuthorized: false
}, null, 2));
