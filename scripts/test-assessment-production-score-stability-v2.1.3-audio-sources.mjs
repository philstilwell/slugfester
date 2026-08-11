#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const root =
  "docs/assessment-production/score-stability-v2.1.3-validation-cohort/disagreement-extraction";
const preparation = JSON.parse(
  await readFile(`${root}/audio-source-preparation.json`, "utf8")
);
const work = JSON.parse(await readFile(`${root}/audio-work-items.json`, "utf8"));
const expectedMoves = [
  "181:con-miracle-judgment-depends-on-priors",
  "181:pro-paul-bodily-transformation",
  "92:con-grim-reaper-temporal-mirror",
  "78:con-reformation-had-reform-precursors",
  "78:con-uncertain-single-catholic-lineage"
];
const ffprobe = "/opt/homebrew/bin/ffprobe";
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");

assert.equal(preparation.status, "prepared-five-v2.1.3-local-audio-clips");
assert.equal(preparation.productionCanary, false);
assert.equal(preparation.stagingOnly, true);
assert.equal(preparation.developmentValidationOnly, true);
assert.equal(preparation.sources.length, 3);
assert.equal(preparation.clips.length, 5);
assert.equal(preparation.totals.sources, 3);
assert.equal(preparation.totals.clips, 5);
assert.equal(preparation.totals.paidTranscriptionCalls, 0);
assert.equal(preparation.totals.transcriptionCostUsd, 0);
assert.equal(preparation.totals.audioVerificationCalls, 0);
assert.equal(preparation.totals.audioVerificationCompleted, 0);
assert.equal(preparation.totals.modelContexts, 0);
assert.equal(preparation.totals.meteredModelApiCostUsd, 0);
assert.equal(preparation.totals.retries, 0);
assert.equal(preparation.totals.timeoutExtensions, 0);
assert.equal(preparation.totals.scoresDerived, 0);
assert.equal(preparation.proposedPolicy.everyIntegerRoundedTieAccepted, true);
assert.equal(preparation.proposedPolicy.promoted, false);
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
  "prepare-v2.1.3-audio-verification-manifest-and-cost-estimate-only"
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
      sources: 3,
      clips: 5,
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
