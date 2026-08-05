#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { readJson } from "./lib/v41-lean-production.mjs";
import { V4172_AUDIO_ADJ_OUTPUT_VERSION, V4172_AUDIO_ADJ_PROTOCOL_ID, makeV4172AudioAdjudicationSchema, validateV4172AudioAdjudicationOutput } from "./lib/v4172-audio-adjudication.mjs";
const packet = await readJson("docs/calibration/v4.1.7/fresh-six-gate/pass-b/audio-adjudication-v4172/packet.json");
const schema = makeV4172AudioAdjudicationSchema();
assert.equal(schema.properties.adjudications.items.properties.evidenceSegmentIndexes.uniqueItems, undefined);
const output = { schemaVersion: V4172_AUDIO_ADJ_OUTPUT_VERSION, protocolId: V4172_AUDIO_ADJ_PROTOCOL_ID, debateNumber: packet.debateNumber, debateId: packet.debateId, reviewerRole: "isolated-audio-attribution-adjudicator", assessmentModel: "5.6 Sol", calibrationOnly: true, isolation: { ratingsUnavailable: true, scoresUnavailable: true, legacyUnavailable: true, otherDebatesUnavailable: true, contaminationDetected: false }, adjudications: [], audit: { allDisputedMovesReviewed: true, rawAudioDerivedSegmentsNotAltered: true, calculatedScoreFieldsEmitted: false, manualOverrideUsed: false } };
for (const move of packet.moves) { const transcript = await readJson(move.diarizedTranscriptPath); const evidenceSegmentIndexes = [transcript.segments.findIndex((segment) => typeof segment.text === "string" && segment.text.trim())]; output.adjudications.push({ moveId: move.moveId, expectedSpeaker: move.expectedSpeaker, status: "unresolved", authoringSpeaker: null, corePropositionAuthoredByExpectedSpeaker: false, mixedSpeakerSpan: true, evidenceSegmentIndexes, confidence: "low", rationale: "Synthetic unresolved fixture validates the endpoint-compatible closed output shape." }); }
assert.equal((await validateV4172AudioAdjudicationOutput(output, packet)).unresolved, 2);
const duplicate = structuredClone(output); duplicate.adjudications[0].evidenceSegmentIndexes = [duplicate.adjudications[0].evidenceSegmentIndexes[0], duplicate.adjudications[0].evidenceSegmentIndexes[0]];
await assert.rejects(() => validateV4172AudioAdjudicationOutput(duplicate, packet));
console.log(JSON.stringify({ status: "passed", unsupportedUniqueItemsRemoved: true, deterministicDuplicateRejectionRetained: true, modelContextsExecuted: 0 }, null, 2));
