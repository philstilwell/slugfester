#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { readJson } from "./lib/v41-lean-production.mjs";
import { V4171_AUDIO_ADJ_OUTPUT_VERSION, V4171_AUDIO_ADJ_PROTOCOL_ID, makeV4171AudioAdjudicationSchema, validateV4171AudioAdjudicationOutput } from "./lib/v4171-audio-adjudication.mjs";

const packet = await readJson("docs/calibration/v4.1.7/fresh-six-gate/pass-b/audio-adjudication/packet.json");
const output = {
  schemaVersion: V4171_AUDIO_ADJ_OUTPUT_VERSION,
  protocolId: V4171_AUDIO_ADJ_PROTOCOL_ID,
  debateNumber: packet.debateNumber,
  debateId: packet.debateId,
  reviewerRole: "isolated-audio-attribution-adjudicator",
  assessmentModel: "5.6 Sol",
  calibrationOnly: true,
  isolation: { ratingsUnavailable: true, scoresUnavailable: true, legacyUnavailable: true, otherDebatesUnavailable: true, contaminationDetected: false },
  adjudications: [],
  audit: { allDisputedMovesReviewed: true, rawAudioDerivedSegmentsNotAltered: true, calculatedScoreFieldsEmitted: false, manualOverrideUsed: false }
};
for (const move of packet.moves) {
  const transcript = await readJson(move.diarizedTranscriptPath);
  const evidenceSegmentIndexes = [transcript.segments.findIndex((segment) => typeof segment.text === "string" && segment.text.trim())];
  output.adjudications.push({ moveId: move.moveId, expectedSpeaker: move.expectedSpeaker, status: "unresolved", authoringSpeaker: null, corePropositionAuthoredByExpectedSpeaker: false, mixedSpeakerSpan: true, evidenceSegmentIndexes, confidence: "low", rationale: "Synthetic unresolved fixture used only to validate the closed adjudication shape." });
}
const validation = await validateV4171AudioAdjudicationOutput(output, packet);
assert.equal(validation.status, "passed");
assert.equal(validation.unresolved, 2);
assert.equal(makeV4171AudioAdjudicationSchema().properties.adjudications.minItems, 2);
const invalid = structuredClone(output); invalid.adjudications[0] = { ...invalid.adjudications[0], status: "verified", authoringSpeaker: invalid.adjudications[0].expectedSpeaker, corePropositionAuthoredByExpectedSpeaker: true, confidence: "medium" };
await assert.rejects(() => validateV4171AudioAdjudicationOutput(invalid, packet));
console.log(JSON.stringify({ status: "passed", unresolvedFixtureValidated: true, invalidVerifiedConfidenceRejected: true, modelContextsExecuted: 0 }, null, 2));
