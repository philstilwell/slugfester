#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { V416_AUDIO_THRESHOLDS } from "./lib/v416-audio-verification.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const root = process.cwd();
const cohortRoot =
  "docs/assessment-production/score-stability-v2.2.3-validation-cohort";
const prepRoot = `${cohortRoot}/disagreement-extraction`;
const judgmentRoot = `${cohortRoot}/independent-judgments`;
const stageRoot = `${cohortRoot}/audio-verification`;
const mediaRoot =
  "output/transcribe/assessment-production-score-stability-v2.2.3-audio-verification";
const preparationPath = `${stageRoot}/execution-preparation-manifest.json`;
const activationPath = `${stageRoot}/execution-manifest.json`;
const executionPath = `${stageRoot}/model-execution.json`;
const auditPath = `${stageRoot}/audio-verification.json`;
const analysisPath = `${stageRoot}/analysis.json`;
const ffmpeg = "/opt/homebrew/bin/ffmpeg";
const ffprobe = "/opt/homebrew/bin/ffprobe";
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
const EXPECTED_DEBATES = ["17", "75"];
const TOOL_SOURCES = [
  "docs/assessment-production-score-stability-v2.2.3-audio-verification-workflow.md",
  "docs/assessment-production-workflow.md",
  "scripts/lib/v416-audio-verification.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/prepare-assessment-production-score-stability-v2.2.3-audio-verification.mjs",
  "scripts/activate-assessment-production-score-stability-v2.2.3-audio-verification.mjs",
  "scripts/run-assessment-production-score-stability-v2.2.3-audio-verification.mjs",
  "scripts/analyze-assessment-production-score-stability-v2.2.3-audio-verification.mjs",
  "scripts/test-assessment-production-score-stability-v2.2.3-audio-verification.mjs",
  "/Users/philstilwell/.codex/skills/transcribe/scripts/transcribe_diarize.py"
];

if (shouldWrite) {
  for (const file of [
    preparationPath,
    activationPath,
    executionPath,
    auditPath,
    analysisPath
  ]) {
    assertV4(!(await exists(file)), `${file} already exists`);
  }
}

const sourcePreparationPath = `${prepRoot}/audio-source-preparation.json`;
const workPath = `${prepRoot}/audio-work-items.json`;
const judgmentPreparationPath =
  `${judgmentRoot}/execution-preparation-manifest.json`;
const [sourcePreparationBytes, workBytes, judgmentPreparationBytes] =
  await Promise.all([
    readFile(sourcePreparationPath),
    readFile(workPath),
    readFile(judgmentPreparationPath)
  ]);
const sourcePreparation = JSON.parse(sourcePreparationBytes);
const work = JSON.parse(workBytes);
const judgmentPreparation = JSON.parse(judgmentPreparationBytes);

assertV4(
  sourcePreparation.status === "prepared-four-v2.2.3-local-audio-clips" &&
    sourcePreparation.authorization.audioVerificationManifestPreparation &&
    sourcePreparation.nextAuthorizedAction ===
      "prepare-v2.2.3-audio-verification-manifest-and-cost-estimate-only",
  "v2.2.3 audio-verification preparation is not authorized"
);
assertV4(
  sourcePreparation.clips.length === 4 && work.moves.length === 4,
  "v2.2.3 four-clip population changed"
);
for (const [file, digest] of Object.entries(sourcePreparation.inputHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `input hash mismatch: ${file}`);
}
for (const source of sourcePreparation.sources) {
  assertV4(
    sha256(await readFile(source.sourceAudio)) === source.sourceAudioSha256,
    `source audio hash mismatch: ${source.videoId}`
  );
}
for (const clip of sourcePreparation.clips) {
  assertV4(
    sha256(await readFile(clip.clipPath)) === clip.clipSha256,
    `clip hash mismatch: ${clip.moveId}`
  );
}

const sourceByDebate = new Map(
  sourcePreparation.sources.map((source) => [source.debateNumber, source])
);
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
  assertV4(
    speakers.length === 2 && new Set(speakers).size === 2,
    `Debate ${debateNumber}: exactly two substantive speakers required`
  );
  for (const speaker of speakers) {
    const candidates = locked.moves
      .filter(
        (move) =>
          move.speaker === speaker && move.attributionConfidence === "high"
      )
      .map((move) => {
        const start = events[move.sourceSpan.startEvent];
        const end = events[move.sourceSpan.endEvent];
        const startMs = start.startMs;
        const endMs = end.startMs + end.durationMs;
        return { move, startMs, endMs, durationMs: endMs - startMs };
      })
      .filter((candidate) => candidate.durationMs >= 12000)
      .sort(
        (left, right) =>
          right.durationMs - left.durationMs ||
          left.startMs - right.startMs ||
          left.move.moveId.localeCompare(right.move.moveId)
      );
    assertV4(
      candidates.length > 0,
      `Debate ${debateNumber}: no high-attribution reference span for ${speaker}`
    );
    const selected = candidates[0];
    const startSeconds = Number(
      (((selected.startMs + selected.endMs) / 2 - 4000) / 1000).toFixed(3)
    );
    assertV4(
      startSeconds * 1000 >= selected.startMs &&
        (startSeconds + 8) * 1000 <= selected.endMs,
      `${speaker}: deterministic reference window left the locked move span`
    );
    referenceSpecs.push({
      debateNumber,
      speaker,
      selectedMoveId: selected.move.moveId,
      selectedMoveSourceSpan: selected.move.sourceSpan,
      selectedMoveDurationSeconds: Number((selected.durationMs / 1000).toFixed(3)),
      startSeconds,
      requestedDurationSeconds: 8,
      selectionRule:
        "midpoint-eight-seconds-of-longest-high-attribution-locked-move"
    });
  }
}

const references = [];
for (const spec of referenceSpecs) {
  const source = sourceByDebate.get(spec.debateNumber);
  assertV4(source, `Debate ${spec.debateNumber}: normalized source unavailable`);
  const safeSpeaker = spec.speaker.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const referencePath =
    `${mediaRoot}/debate-${spec.debateNumber}/references/${safeSpeaker}.mp3`;
  if (shouldWrite) {
    await mkdir(path.dirname(referencePath), { recursive: true });
    execFileSync(ffmpeg, [
      "-nostdin",
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-ss",
      String(spec.startSeconds),
      "-i",
      path.resolve(root, source.sourceAudio),
      "-t",
      "8",
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-b:a",
      "64k",
      path.resolve(root, referencePath)
    ]);
  }
  const actualDurationSeconds = shouldWrite
    ? Number(
        execFileSync(
          ffprobe,
          [
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "csv=p=0",
            referencePath
          ],
          { encoding: "utf8" }
        ).trim()
      )
    : null;
  if (shouldWrite) {
    assertV4(
      actualDurationSeconds >= 1.2 && actualDurationSeconds <= 10,
      `${spec.speaker}: encoded reference duration outside API range`
    );
  }
  references.push({
    ...spec,
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
  transcriptPath:
    `${mediaRoot}/debate-${clip.debateNumber}/transcripts/${clip.moveId}.transcript.json`,
  model: "gpt-4o-transcribe-diarize",
  responseFormat: "diarized_json",
  chunkingStrategy: "auto",
  language: "en",
  knownSpeakers: references
    .filter((reference) => reference.debateNumber === clip.debateNumber)
    .map(({ speaker, localPath, sha256: digest, actualDurationSeconds }) => ({
      speaker,
      localPath,
      sha256: digest,
      actualDurationSeconds
    }))
}));
assertV4(
  calls.every((call) => call.knownSpeakers.length === 2),
  "every audio call requires exactly two same-debate speaker references"
);
for (const call of calls) {
  assertV4(
    (await readFile(call.clipPath)).length < 25 * 1024 * 1024,
    `${call.moveId}: clip exceeds 25 MB`
  );
}

const planningPricePerMinuteUsd = 0.006;
const clipMinutes =
  calls.reduce((sum, call) => sum + call.durationSeconds, 0) / 60;
const expectedCostUsd = clipMinutes * planningPricePerMinuteUsd;
const maximumAuthorizedCostUsd = 0.1;
const sourceFiles = [
  sourcePreparationPath,
  workPath,
  judgmentPreparationPath,
  ...TOOL_SOURCES,
  ...sourcePreparation.sources.map((source) => source.sourceAudio),
  ...calls.map((call) => call.clipPath),
  ...references.filter((reference) => shouldWrite).map((reference) => reference.localPath)
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) {
  sourceHashes[file] = sha256(await readFile(file));
}

const manifest = {
  schemaVersion:
    "1.0-score-stability-v2.2.3-audio-verification-execution-preparation-manifest",
  protocolId: "assessment-production-score-stability-v2.2.3-audio-verification",
  status: shouldWrite
    ? "prepared-four-paid-known-speaker-diarizations-pending-explicit-user-approval"
    : "preview-four-paid-known-speaker-diarizations-pending-explicit-user-approval",
  preparedAt: shouldWrite ? new Date().toISOString() : null,
  approvedAt: null,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: false,
  stagingOnly: true,
  developmentValidationOnly: true,
  AIOnly: true,
  model: "gpt-4o-transcribe-diarize",
  calls,
  thresholds: V416_AUDIO_THRESHOLDS,
  referenceContract: {
    requestedDurationSeconds: 8,
    acceptedRangeSeconds: [1.2, 10],
    measuredBeforeExecution: shouldWrite,
    referencesPerDebate: 2,
    selectionRule:
      "midpoint-eight-seconds-of-longest-high-attribution-locked-move-per-speaker",
    references
  },
  costEstimate: {
    planningPricePerMinuteUsd,
    planningRateBasis: "promoted-production-canary",
    clipMinutes: Number(clipMinutes.toFixed(4)),
    expectedCostUsd: Number(expectedCostUsd.toFixed(4)),
    maximumAuthorizedCostUsd,
    officialPricingCheckedAt: "2026-08-12",
    officialPricingUrl:
      "https://developers.openai.com/api/docs/models/gpt-4o-transcribe-diarize",
    officialPricePerMillionTokensUsd: { input: 2.5, output: 10 },
    actualTokenBilledCostMayVary: true,
    ChatGPTSubscriptionApplicable: false,
    OpenAIApiBillingRequired: true,
    explicitUserApprovalRequired: true,
    explicitUserApprovalRecorded: false
  },
  executionPolicy: {
    callsMaximum: 4,
    attemptsPerCall: 1,
    retriesMaximum: 0,
    sequentialExecution: true,
    stopRemainingAfterRequestLevelFailure: true,
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
    unchanged: true
  },
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
    policyPromotion: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  stopRules: {
    sourceHashMismatchBlocks: true,
    preexistingTranscriptBlocks: true,
    missingApiKeyBlocks: true,
    failedTranscriptPreserved: true,
    requestFailureStopsRemaining: true,
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
    transcripts: calls.map((call) => call.transcriptPath)
  },
  futureOutputPathsExcludedFromSourceHashes: [
    activationPath,
    ...calls.map((call) => call.transcriptPath),
    executionPath,
    auditPath,
    analysisPath
  ],
  sourceHashes,
  nextAuthorizedAction:
    "record-explicit-user-approval-and-freeze-v2.2.3-paid-audio-verification-activation"
};
assertV4(
  manifest.costEstimate.expectedCostUsd <= maximumAuthorizedCostUsd,
  "estimated transcription cost exceeds proposed cap"
);
if (shouldWrite) {
  await mkdir(stageRoot, { recursive: true });
  await writeFile(preparationPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: manifest.status,
      callsMaximum: 4,
      debates: EXPECTED_DEBATES,
      references: references.map(
        ({ debateNumber, speaker, selectedMoveId, startSeconds, actualDurationSeconds }) => ({
          debateNumber,
          speaker,
          selectedMoveId,
          startSeconds,
          actualDurationSeconds
        })
      ),
      clipMinutes: manifest.costEstimate.clipMinutes,
      model: manifest.model,
      expectedCostUsd: manifest.costEstimate.expectedCostUsd,
      maximumAuthorizedCostUsd,
      ChatGPTSubscriptionApplicable: false,
      explicitUserApprovalRequired: true,
      explicitUserApprovalRecorded: false,
      retries: 0,
      transcriptsSavedLocally: true,
      judgmentModelBoundary: manifest.judgmentModelBoundary,
      paidExecutionAuthorized: false,
      scoreDerivationAuthorized: false
    },
    null,
    2
  )
);
