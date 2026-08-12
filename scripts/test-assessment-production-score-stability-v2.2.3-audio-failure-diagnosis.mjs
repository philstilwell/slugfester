#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const file =
  "docs/assessment-production/score-stability-v2.2.3-validation-cohort/audio-verification/failure-diagnosis.json";
const diagnosis = JSON.parse(await readFile(file, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(
  diagnosis.status,
  "mixed-speaker-locked-excerpt-contamination-confirmed-audio-attribution-packet-preparation-authorized"
);
assert.equal(diagnosis.preservedDeterministicGate.verified, 3);
assert.equal(diagnosis.preservedDeterministicGate.unresolved, 1);
assert.equal(diagnosis.preservedDeterministicGate.erasedOrReclassified, false);
assert.equal(diagnosis.unresolvedMove.debateNumber, "17");
assert.equal(
  diagnosis.unresolvedMove.moveId,
  "pro-cumulative-moral-christian-case"
);
assert.equal(diagnosis.unresolvedMove.expectedSpeaker, "Francis Collins");
assert.equal(
  diagnosis.diagnosis.failureClass,
  "mixed-speaker-locked-excerpt-contamination"
);
assert.equal(diagnosis.diagnosis.lockedExcerptTokenCount, 72);
assert.equal(diagnosis.diagnosis.fullClipMatchedTokens, 69);
assert.equal(diagnosis.diagnosis.expectedSpeakerMatchedTokens, 56);
assert.equal(diagnosis.diagnosis.expectedSpeakerRecallDeficitTokens, 13);
assert.equal(diagnosis.diagnosis.embeddedOtherSpeakerTokens, 13);
assert.equal(diagnosis.diagnosis.otherSpeakerCoveredDeficitTokens, 13);
assert(diagnosis.diagnosis.embeddedOtherSpeakerSegments.length >= 1);
assert(
  diagnosis.diagnosis.embeddedOtherSpeakerSegments.every(
    (segment) => segment.speaker === "Alex O'Connor"
  )
);
assert.equal(
  diagnosis.diagnosis.embeddedOtherSpeakerSegments.reduce(
    (total, segment) => total + segment.matchedDeficitTokens.length,
    0
  ),
  13
);
assert.equal(
  diagnosis.diagnosis.deficitTokenCoverage.reduce(
    (total, entry) => total + entry.coveredCount,
    0
  ),
  13
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
      move: "17:pro-cumulative-moral-christian-case",
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
