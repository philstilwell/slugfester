#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const file =
  "docs/assessment-production/canary-v1-audio-verification/failure-diagnosis.json";
const diagnosis = JSON.parse(await readFile(file, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assert.equal(
  diagnosis.status,
  "mixed-speaker-lexical-collision-confirmed-audio-attribution-packet-preparation-authorized"
);
assert.equal(diagnosis.preservedDeterministicGate.verified, 3);
assert.equal(diagnosis.preservedDeterministicGate.unresolved, 1);
assert.equal(diagnosis.preservedDeterministicGate.erasedOrReclassified, false);
assert.equal(diagnosis.unresolvedMove.debateNumber, "05");
assert.equal(diagnosis.unresolvedMove.moveId, "pro-move-07");
assert.equal(diagnosis.unresolvedMove.expectedSpeaker, "Sye Ten Bruggencate");
assert.equal(diagnosis.diagnosis.failureClass, "mixed-speaker-lexical-collision");
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
  assert.equal(sha256(await readFile(source)), digest, `source hash mismatch: ${source}`);
}
console.log(
  JSON.stringify(
    {
      status: "passed",
      move: "05:pro-move-07",
      failureClass: diagnosis.diagnosis.failureClass,
      originalGatePreserved: true,
      modelContexts: 0,
      paidTranscriptionCalls: 0,
      scoresDerived: 0
    },
    null,
    2
  )
);
