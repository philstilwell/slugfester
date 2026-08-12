#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const root =
  "docs/assessment-production/production-checkpoint-v2.2-1/disagreement-extraction";
const preparation = JSON.parse(
  await readFile(`${root}/audio-source-preparation.json`, "utf8")
);
const work = JSON.parse(await readFile(`${root}/audio-work-items.json`, "utf8"));
const expectedMoves = [
  "25:con-internal-reform-resources",
  "104:con-selection-for-reliable-investigation"
];
const ffprobe = "/opt/homebrew/bin/ffprobe";
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");

assert.equal(
  preparation.status,
  "prepared-two-production-checkpoint-v2.2-local-audio-clips"
);
assert.equal(preparation.productionCanary, true);
assert.equal(preparation.stagingOnly, true);
assert.equal(preparation.developmentValidationOnly, false);
assert.equal(preparation.sources.length, 2);
assert.equal(preparation.clips.length, 2);
assert.equal(preparation.totals.sources, 2);
assert.equal(preparation.totals.clips, 2);
assert.equal(preparation.totals.paidTranscriptionCalls, 0);
assert.equal(preparation.totals.transcriptionCostUsd, 0);
assert.equal(preparation.totals.audioVerificationCalls, 0);
assert.equal(preparation.totals.audioVerificationCompleted, 0);
assert.equal(preparation.totals.modelContexts, 0);
assert.equal(preparation.totals.meteredModelApiCostUsd, 0);
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
assert.equal(preparation.authorization.paidTranscriptionExecution, false);
assert.equal(preparation.authorization.audioVerificationExecution, false);
assert.equal(preparation.authorization.adjudicationPacketPreparation, false);
assert.equal(preparation.authorization.scoreDerivation, false);
assert.equal(preparation.authorization.policyPromotion, false);
assert.equal(preparation.authorization.publicationFinalization, false);
assert.equal(preparation.authorization.productionMutation, false);
assert.equal(preparation.authorization.remainingProductionBatches, false);
assert.equal(
  preparation.nextAuthorizedAction,
  "prepare-production-checkpoint-v2.2-audio-verification-manifest-and-cost-estimate-only"
);

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
      sources: 2,
      clips: 2,
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
