#!/usr/bin/env node
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const preparation = JSON.parse(await readFile("docs/calibration/v4.2.21.2/disagreement-audio-prep/audio-source-preparation.json", "utf8"));
assert.equal(preparation.status, "prepared-five-local-audio-clips"); assert.equal(preparation.clips.length, 5); assert.equal(preparation.totals.paidTranscriptionCalls, 0); assert.equal(preparation.totals.transcriptionCostUsd, 0); assert.equal(preparation.authorization.paidTranscriptionExecution, false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex"); assert.equal(sha256(await readFile(preparation.source.sourceAudio)), preparation.source.sourceAudioSha256); for (const clip of preparation.clips) { assert.equal(sha256(await readFile(clip.clipPath)), clip.clipSha256); assert(clip.durationSeconds > 0); assert(clip.verificationExcerpt.length > 0); }
console.log(JSON.stringify({ status: "passed", sourceVideoId: preparation.source.videoId, clips: 5, clipMinutes: preparation.totals.clipMinutes, hashesVerified: 6, paidTranscriptionCalls: 0, transcriptionCostUsd: 0, meteredApiCostUsd: 0 }, null, 2));
