#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const preparation = JSON.parse(await readFile("docs/calibration/v4.2.21.17.3/deterministic-disagreement-audio-prep/audio-source-preparation.json", "utf8"));
assert.equal(preparation.status, "prepared-two-local-audio-clips");
assert.equal(preparation.clips.length, 2);
assert.equal(preparation.totals.paidTranscriptionCalls, 0);
assert.equal(preparation.totals.transcriptionCostUsd, 0);
assert.equal(preparation.authorization.paidTranscriptionManifest, true);
assert.equal(preparation.authorization.paidTranscriptionExecution, false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assert.equal(sha256(await readFile(preparation.source.sourceAudio)), preparation.source.sourceAudioSha256);
for (const clip of preparation.clips) {
  assert.equal(sha256(await readFile(clip.clipPath)), clip.clipSha256);
  assert(clip.durationSeconds > 30);
  assert(clip.verificationExcerpt.length > 0);
  assert.equal(clip.trigger.eitherPassAssessmentBelowHigh, true);
}
console.log(JSON.stringify({ status: "passed", sourceVideoId: preparation.source.videoId, clips: 2, clipMinutes: preparation.totals.clipMinutes, hashesVerified: 3, paidTranscriptionCalls: 0, transcriptionCostUsd: 0, meteredApiCostUsd: 0 }, null, 2));
