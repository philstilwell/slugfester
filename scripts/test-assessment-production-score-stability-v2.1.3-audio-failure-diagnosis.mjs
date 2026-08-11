#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const file =
  "docs/assessment-production/score-stability-v2.1.3-validation-cohort/audio-verification/failure-diagnosis.json";
const diagnosis = JSON.parse(await readFile(file, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(
  diagnosis.status,
  "mixed-speaker-locked-excerpt-contamination-confirmed-audio-attribution-packet-preparation-authorized"
);
assert.equal(diagnosis.preservedDeterministicGate.verified, 4);
assert.equal(diagnosis.preservedDeterministicGate.unresolved, 1);
assert.equal(diagnosis.preservedDeterministicGate.erasedOrReclassified, false);
assert.equal(diagnosis.unresolvedMove.debateNumber, "78");
assert.equal(
  diagnosis.unresolvedMove.moveId,
  "con-uncertain-single-catholic-lineage"
);
assert.equal(diagnosis.unresolvedMove.expectedSpeaker, "Graham Oppy");
assert.equal(
  diagnosis.diagnosis.failureClass,
  "mixed-speaker-locked-excerpt-contamination"
);
assert.equal(diagnosis.diagnosis.lockedExcerptTokenCount, 82);
assert.equal(diagnosis.diagnosis.fullClipMatchedTokens, 75);
assert.equal(diagnosis.diagnosis.expectedSpeakerMatchedTokens, 58);
assert.equal(diagnosis.diagnosis.expectedSpeakerRecallDeficitTokens, 17);
assert.equal(diagnosis.diagnosis.embeddedOtherSpeakerTokens, 17);
assert.equal(diagnosis.diagnosis.embeddedOtherSpeakerSegments.length, 2);
assert(
  diagnosis.diagnosis.embeddedOtherSpeakerSegments.every(
    (segment) =>
      segment.speaker === "William Albrecht" &&
      segment.lockedExcerptRecall === 1
  )
);
assert.equal(diagnosis.diagnosis.thresholdRelaxationApplied, false);
assert.equal(diagnosis.diagnosis.speakerRelabelingApplied, false);
assert.equal(diagnosis.diagnosis.manualAttributionOverrideApplied, false);
assert.equal(diagnosis.diagnosis.paidTranscriptionRetryApplied, false);
assert.equal(diagnosis.futureModelBoundary.model, "5.6 Sol");
assert.equal(diagnosis.futureModelBoundary.reasoningEffort, "low");
assert.equal(
  diagnosis.futureModelBoundary.authentication,
  "ChatGPT subscription"
);
assert.equal(diagnosis.futureModelBoundary.scoresUnavailable, true);
assert.equal(diagnosis.costs.additionalPaidTranscriptionCalls, 0);
assert.equal(diagnosis.costs.scoresDerived, 0);
assert.equal(
  diagnosis.authorization.audioAttributionAdjudicationPacketPreparation,
  true
);
assert.equal(
  diagnosis.authorization.audioAttributionAdjudicationModelExecution,
  false
);
assert.equal(diagnosis.authorization.paidTranscription, false);
assert.equal(diagnosis.authorization.retry, false);
assert.equal(diagnosis.authorization.scoreDerivation, false);
for (const [source, digest] of Object.entries(diagnosis.sourceHashes)) {
  assert.equal(
    sha256(await readFile(source)),
    digest,
    `source hash mismatch: ${source}`
  );
}
console.log(
  JSON.stringify(
    {
      status: "passed",
      move: "78:con-uncertain-single-catholic-lineage",
      failureClass: diagnosis.diagnosis.failureClass,
      originalGatePreserved: true,
      embeddedOtherSpeakerTokens:
        diagnosis.diagnosis.embeddedOtherSpeakerTokens,
      modelContexts: 0,
      paidTranscriptionCalls: 0,
      scoresDerived: 0
    },
    null,
    2
  )
);
