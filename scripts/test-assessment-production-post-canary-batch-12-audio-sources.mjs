#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-12/disagreement-extraction";
const preparation = JSON.parse(
  await readFile(`${root}/audio-source-preparation.json`, "utf8")
);
const work = JSON.parse(await readFile(`${root}/audio-work-items.json`, "utf8"));
const expectedMoves = [
  "152:pro-evidence-experience-epistemology",
  "07:pro-doubled-kyrios-veiled-claim",
  "07:pro-synoptic-disclosure-early-christology",
  "15:con-natural-inquiry-falsifiability"
];
const ffprobe = "/opt/homebrew/bin/ffprobe";
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");

assert.equal(
  preparation.status,
  "prepared-four-post-canary-batch-12-local-audio-clips-standing-authorization-active-for-audio-verification-preparation"
);
assert.equal(preparation.productionCanary, false);
assert.equal(preparation.batchNumber, 12);
assert.equal(preparation.stagingOnly, true);
assert.equal(preparation.developmentValidationOnly, false);
assert.equal(preparation.sources.length, 3);
assert.equal(preparation.clips.length, 4);
assert.equal(preparation.totals.sources, 3);
assert.equal(preparation.totals.clips, 4);
assert.equal(preparation.totals.paidTranscriptionCalls, 0);
assert.equal(preparation.totals.transcriptionCostUsd, 0);
assert.equal(preparation.totals.audioVerificationCalls, 0);
assert.equal(preparation.totals.audioVerificationCompleted, 0);
assert.equal(preparation.totals.modelContexts, 0);
assert.equal(preparation.totals.meteredModelApiCostUsd, 0);
assert.equal(preparation.totals.directIncrementalCostUsd, 0);
assert.equal(preparation.totals.audioFilesPlayed, 1);
assert.equal(preparation.totals.semanticAudioEvaluations, 0);
assert.equal(preparation.totals.retries, 0);
assert.equal(preparation.totals.timeoutExtensions, 0);
assert.equal(preparation.totals.scoresDerived, 0);
assert.equal(preparation.activePolicy.version, "v2.2");
assert.equal(
  preparation.activePolicy.agreedWinningSideMayCollapseToIntegerRoundedTie,
  true
);
assert.equal(preparation.activePolicy.scorePassesMaximum, 1);
assert.equal(preparation.validatedInventoryContract.scoreFieldsAvailable, false);
assert.equal(preparation.authorization.audioVerificationManifestPreparation, true);
assert.equal(preparation.authorization.audioVerificationCostEstimation, true);
assert.equal(preparation.authorization.paidTranscriptionExecution, false);
assert.equal(preparation.authorization.audioVerificationExecution, false);
assert.equal(preparation.authorization.adjudicationPacketPreparation, false);
assert.equal(preparation.authorization.scoreDerivation, false);
assert.equal(preparation.authorization.policyPromotion, false);
assert.equal(preparation.authorization.publicationFinalization, false);
assert.equal(preparation.authorization.productionMutation, false);
assert.equal(preparation.authorization.nextBatchSelection, false);
assert.equal(
  preparation.nextAuthorizedAction,
  "prepare-freeze-validate-and-push-batch-12-audio-verification-manifest-and-cost-estimate-under-standing-authorization"
);
assert.equal(preparation.userAuthorization.sourceAudioFilesAuthorized, 3);
assert.equal(preparation.userAuthorization.clipsAuthorized, 4);
assert.equal(preparation.userAuthorization.directIncrementalCostUsdMaximum, 0);
assert.equal(preparation.userAuthorization.audioPlaybackAuthorized, true);
assert.equal(preparation.userAuthorization.semanticAudioEvaluationAuthorized, false);
assert.equal(preparation.acquisitionPolicy.maximumPublicSourceAttempts, 1);
assert.equal(
  preparation.acquisitionPolicy.oneFreshMediaUrlResolutionPerMissingVideo,
  true
);
assert.deepEqual(preparation.acquisitionPolicy.plannedRangesPerVideo, ["bytes=0-"]);
assert.equal(preparation.acquisitionPolicy.nonOverlappingRangesPerVideo, 1);
assert.equal(preparation.acquisitionPolicy.repeatedRanges, 0);
assert.deepEqual(preparation.acquisitionPolicy.acquisitionFormatByVideo, {
  "9r_XAIksLdI": "bestaudio/best",
  "_hrN4Mn8m1w": "bestaudio/best",
  "5OXPlUCGScY": "140"
});
assert.equal(preparation.acquisitionPolicy.diagnosedFailedResolution.debateNumber, "15");
assert.equal(preparation.acquisitionPolicy.diagnosedFailedResolution.attempts, 1);
assert.equal(
  preparation.acquisitionPolicy.boundedRecovery.classification,
  "new-authority-successor-after-exhausted-public-recovery"
);
assert.equal(
  preparation.acquisitionPolicy.boundedRecovery.publicRecoveryLevelsRemainExhausted,
  2
);
assert.equal(preparation.acquisitionPolicy.boundedRecovery.successorAttempt, 1);
assert.equal(
  preparation.acquisitionPolicy.boundedRecovery.formatSelector,
  "authenticated-live-player-decoded-opus"
);
assert.equal(
  preparation.acquisitionPolicy.boundedRecovery.transport,
  "Chrome live-player HTMLMediaElement captureStream to MediaRecorder Opus"
);
assert.equal(preparation.acquisitionPolicy.boundedRecovery.retries, 0);
assert.equal(
  preparation.acquisitionPolicy.levelOneFailure.status,
  "debate-15-audio-source-recovery-level-1-failed-preserved-level-2-authorized"
);
assert.equal(
  preparation.acquisitionPolicy.levelTwoShardOneFailure.status,
  "debate-15-audio-source-recovery-level-2-shard-1-http-403-preserved-shard-2-authorized"
);
assert.equal(preparation.acquisitionPolicy.levelTwoShardOneFailure.httpStatus, 403);
assert.equal(
  preparation.acquisitionPolicy.levelTwoShardTwoFailure.status,
  "debate-15-audio-source-recovery-level-2-shard-2-http-403-preserved-shard-3-authorized"
);
assert.equal(preparation.acquisitionPolicy.levelTwoShardTwoFailure.httpStatus, 403);
assert.deepEqual(preparation.acquisitionPolicy.redirectPolicy, {
  manual: true,
  httpsOnly: true,
  googleVideoDomainOnly: true,
  maximumRedirectsPerRange: 3,
  requiredFinalStatusCode: 206
});
assert.deepEqual(preparation.acquisitionPolicy.ytDlpRetryControls, {
  retries: 0,
  fragmentRetries: 0,
  extractorRetries: 0,
  fileAccessRetries: 0
});
assert.equal(preparation.publicSourceAttemptAudit.length, 3);
assert(
  preparation.publicSourceAttemptAudit.every(
    (item) =>
      item.maximumAttempts === 1 &&
      [1, 6].includes(item.attempt) &&
      item.attemptsByShard.length === item.attempt &&
      item.attemptsByShard.every((attempt) => attempt.attempt === 1)
  )
);
assert.equal(
  preparation.publicSourceAttemptAudit.reduce((sum, item) => sum + item.attempt, 0),
  preparation.totals.sourceAcquisitionAttempts
);
assert.equal(preparation.totals.sourceAcquisitionAttempts, 8);
assert.equal(preparation.totals.sourceDownloads, 3);
assert.equal(preparation.totals.failedSourceAcquisitionAttempts, 5);
assert.equal(preparation.totals.recoverySourceAcquisitionAttempts, 5);
assert.equal(preparation.executionBoundary.audioPlaybackCalls, 1);
assert.equal(preparation.executionBoundary.authenticatedBrowserAudioCaptureCalls, 1);
assert.equal(preparation.executionBoundary.semanticAudioEvaluations, 0);
assert.equal(preparation.executionBoundary.transcriptionCalls, 0);
assert.equal(preparation.executionBoundary.modelOrApiCalls, 0);
assert.equal(preparation.executionBoundary.paidServiceCalls, 0);

for (const [file, digest] of Object.entries(preparation.inputHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `input hash mismatch: ${file}`);
}

for (const source of preparation.sources) {
  const bytes = await readFile(source.sourceAudio);
  assert.equal(sha256(bytes), source.sourceAudioSha256);
  const measured = Number(
    execFileSync(
      ffprobe,
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "csv=p=0",
        source.sourceAudio
      ],
      { encoding: "utf8" }
    ).trim()
  );
  assert(Math.abs(measured - source.durationSeconds) <= 0.001);
  assert.equal(source.channels, 1);
  assert.equal(source.sampleRateHz, 16000);
  assert(source.measuredBitRateBps > 0);
  const requiredEndMs = Math.max(
    ...work.moves
      .filter((move) => move.sourceVideoId === source.videoId)
      .map((move) => move.clipWindow.endMs)
  );
  assert(measured * 1000 >= requiredEndMs);
}

for (const clip of preparation.clips) {
  assert.equal(sha256(await readFile(clip.clipPath)), clip.clipSha256);
  const measured = Number(
    execFileSync(
      ffprobe,
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "csv=p=0",
        clip.clipPath
      ],
      { encoding: "utf8" }
    ).trim()
  );
  assert(Math.abs(measured - clip.durationSeconds) <= 0.001);
  assert(Math.abs(clip.durationSeconds - clip.plannedDurationSeconds) <= 0.25);
  assert.equal(clip.channels, 1);
  assert.equal(clip.sampleRateHz, 16000);
  assert(clip.measuredBitRateBps > 0);
  assert.equal(clip.targetBitrateKbps, 64);
  assert(clip.verificationExcerpt.length > 0);
  assert(
    clip.trigger.eitherPassAssessmentBelowHigh ||
      clip.trigger.eitherPassAttributionBelowHigh
  );
  assert.equal(clip.audioVerificationCompleted, false);
}

assert.deepEqual(
  preparation.clips
    .map((clip) => `${clip.debateNumber}:${clip.moveId}`)
    .sort(),
  [...expectedMoves].sort()
);
assert.deepEqual(
  preparation.clips.map((clip) => ({
    debateNumber: clip.debateNumber,
    sourceVideoId: clip.sourceVideoId,
    moveId: clip.moveId,
    clipWindow: clip.clipWindow,
    trigger: clip.trigger
  })),
  work.moves.map((move) => ({
    debateNumber: move.debateNumber,
    sourceVideoId: move.sourceVideoId,
    moveId: move.moveId,
    clipWindow: move.clipWindow,
    trigger: move.trigger
  }))
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      sources: 3,
      clips: 4,
      clipMinutes: preparation.totals.clipMinutes,
      hashesVerified:
        preparation.sources.length +
        preparation.clips.length +
        Object.keys(preparation.inputHashes).length,
      workItemSourceHashesReplayed:
        preparation.workItemSourceHashesReplayed,
      sourceDownloads: preparation.totals.sourceDownloads,
      sourceAcquisitionAttempts:
        preparation.totals.sourceAcquisitionAttempts,
      paidTranscriptionCalls: 0,
      audioVerificationCalls: 0,
      modelContexts: 0,
      transcriptionCostUsd: 0,
      meteredApiCostUsd: 0,
      scoresDerived: 0
    },
    null,
    2
  )
);
