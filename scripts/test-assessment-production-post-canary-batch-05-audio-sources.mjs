#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-05/disagreement-extraction";
const preparation = JSON.parse(
  await readFile(`${root}/audio-source-preparation.json`, "utf8")
);
const work = JSON.parse(await readFile(`${root}/audio-work-items.json`, "utf8"));
const expectedMoves = [
  "158:con-no-presented-extrabiblical-support",
  "158:con-unverified-resurrection-prior",
  "158:pro-case-specific-extraordinary-testimony-standard",
  "189:con-simple-laws-beneath-cell-complexity",
  "05:con-logical-grounding-burden",
  "05:pro-logic-reflects-gods-thinking"
];
const ffprobe = "/opt/homebrew/bin/ffprobe";
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");

assert.equal(
  preparation.status,
  "prepared-six-post-canary-batch-05-local-audio-clips-standing-authorization-active-for-audio-verification-preparation"
);
assert.equal(preparation.productionCanary, false);
assert.equal(preparation.batchNumber, 5);
assert.equal(preparation.stagingOnly, true);
assert.equal(preparation.developmentValidationOnly, false);
assert.equal(preparation.sources.length, 3);
assert.equal(preparation.clips.length, 6);
assert.equal(preparation.totals.sources, 3);
assert.equal(preparation.totals.clips, 6);
assert.equal(preparation.totals.paidTranscriptionCalls, 0);
assert.equal(preparation.totals.transcriptionCostUsd, 0);
assert.equal(preparation.totals.audioVerificationCalls, 0);
assert.equal(preparation.totals.audioVerificationCompleted, 0);
assert.equal(preparation.totals.modelContexts, 0);
assert.equal(preparation.totals.meteredModelApiCostUsd, 0);
assert.equal(preparation.totals.directIncrementalCostUsd, 0);
assert.equal(preparation.totals.audioFilesPlayed, 0);
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
  "prepare-freeze-validate-and-push-batch-05-audio-verification-manifest-and-cost-estimate-under-standing-authorization"
);
assert.equal(preparation.userAuthorization.sourceAudioFilesAuthorized, 3);
assert.equal(preparation.userAuthorization.clipsAuthorized, 6);
assert.equal(preparation.userAuthorization.directIncrementalCostUsdMaximum, 0);
assert.equal(preparation.userAuthorization.audioPlaybackAuthorized, false);
assert.equal(preparation.userAuthorization.semanticAudioEvaluationAuthorized, false);
assert.equal(preparation.acquisitionPolicy.maximumPublicSourceAttempts, 3);
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
      [0, 1].includes(item.attempt) &&
      ["success", "not-required-local-source-reused"].includes(item.outcome)
  )
);
assert.equal(
  preparation.publicSourceAttemptAudit.reduce((sum, item) => sum + item.attempt, 0),
  preparation.totals.sourceAcquisitionAttempts
);
assert.equal(preparation.totals.sourceAcquisitionAttempts, preparation.totals.sourceDownloads);
assert.equal(preparation.executionBoundary.audioPlaybackCalls, 0);
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
      clips: 6,
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
