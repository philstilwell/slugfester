#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const preparation = JSON.parse(
  await readFile(
    "docs/assessment-production/canary-v1-disagreement-audio-prep/audio-source-preparation.json",
    "utf8"
  )
);
const expectedMoves = [
  "05:pro-move-07",
  "130:con-gospel-mythmaking-indicators",
  "130:pro-schizotypal-profile-mismatch",
  "152:move-pro-objective-moral-ground"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(
  preparation.status,
  "prepared-four-local-production-canary-audio-clips"
);
assert.equal(preparation.productionCanary, true);
assert.equal(preparation.stagingOnly, true);
assert.equal(preparation.sources.length, 3);
assert.equal(preparation.clips.length, 4);
assert.equal(preparation.totals.sources, 3);
assert.equal(preparation.totals.clips, 4);
assert.equal(preparation.totals.paidTranscriptionCalls, 0);
assert.equal(preparation.totals.transcriptionCostUsd, 0);
assert.equal(preparation.totals.modelContexts, 0);
assert.equal(preparation.totals.scoresDerived, 0);
assert.equal(preparation.authorization.audioVerificationManifest, true);
assert.equal(preparation.authorization.paidTranscriptionExecution, false);
assert.equal(preparation.authorization.audioVerificationExecution, false);
assert.equal(preparation.authorization.adjudicationPacketPreparation, false);
assert.equal(preparation.authorization.scoreDerivation, false);
assert.equal(preparation.authorization.publicationFinalization, false);
assert.equal(preparation.authorization.productionMutation, false);
assert.equal(preparation.authorization.remainingProductionBatches, false);

for (const [file, digest] of Object.entries(preparation.inputHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `input hash mismatch: ${file}`);
}
for (const source of preparation.sources) {
  assert.equal(
    sha256(await readFile(source.sourceAudio)),
    source.sourceAudioSha256
  );
}
for (const clip of preparation.clips) {
  assert.equal(sha256(await readFile(clip.clipPath)), clip.clipSha256);
  assert(clip.durationSeconds > 60);
  assert(clip.verificationExcerpt.length > 0);
  assert(
    clip.trigger.eitherPassAssessmentBelowHigh ||
      clip.trigger.eitherPassAttributionBelowHigh
  );
}
assert.deepEqual(
  preparation.clips
    .map((clip) => `${clip.debateNumber}:${clip.moveId}`)
    .sort(),
  [...expectedMoves].sort()
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
      paidTranscriptionCalls: 0,
      transcriptionCostUsd: 0,
      meteredApiCostUsd: 0,
      scoresDerived: 0
    },
    null,
    2
  )
);
