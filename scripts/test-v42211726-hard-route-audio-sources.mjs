#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const preparation = JSON.parse(await readFile("docs/calibration/v4.2.21.17.26/hard-route-disagreement-audio-prep/audio-source-preparation.json", "utf8"));
assert.equal(preparation.status, "prepared-three-local-hard-route-audio-clips");
assert.equal(preparation.clips.length, 3);
assert.equal(preparation.totals.paidTranscriptionCalls, 0);
assert.equal(preparation.totals.transcriptionCostUsd, 0);
assert.equal(preparation.authorization.paidTranscriptionManifest, true);
assert.equal(preparation.authorization.paidTranscriptionExecution, false);
assert.equal(preparation.authorization.audioVerificationExecution, false);
assert.equal(preparation.authorization.adjudicationPacketPreparation, false);
assert.equal(preparation.authorization.scoreDerivation, false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assert.equal(sha256(await readFile(preparation.source.sourceAudio)), preparation.source.sourceAudioSha256);
for (const clip of preparation.clips) {
  assert.equal(sha256(await readFile(clip.clipPath)), clip.clipSha256);
  assert(clip.durationSeconds > 60);
  assert(clip.verificationExcerpt.length > 0);
  assert(clip.trigger.eitherPassAssessmentBelowHigh || clip.trigger.eitherPassAttributionBelowHigh);
}
assert.deepEqual(preparation.clips.map((clip) => clip.moveId), ["move-con-04-undeliberated-voluntary-action", "move-con-05-reflexive-first-person-perspective", "move-pro-06-introspective-mechanism-gap"]);
console.log(JSON.stringify({ status: "passed", sourceVideoId: preparation.source.videoId, clips: 3, clipMinutes: preparation.totals.clipMinutes, hashesVerified: 4, paidTranscriptionCalls: 0, transcriptionCostUsd: 0, meteredApiCostUsd: 0 }, null, 2));
