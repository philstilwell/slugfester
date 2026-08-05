import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, canonicalJson, containsProhibitedCalculatedField } from "./v41-lean-production.mjs";

export const V4171_AUDIO_ADJ_ROOT = "docs/calibration/v4.1.7/fresh-six-gate/pass-b/audio-adjudication";
export const V4171_AUDIO_ADJ_PROTOCOL_ID = "v4.1.7.1-disputed-audio-attribution";
export const V4171_AUDIO_ADJ_PACKET_VERSION = "4.1.7.1-audio-attribution-adjudication-packet";
export const V4171_AUDIO_ADJ_OUTPUT_VERSION = "4.1.7.1-audio-attribution-adjudication-output";

const exactObject = (properties) => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });

export function makeV4171AudioAdjudicationSchema() {
  const item = exactObject({
    moveId: { type: "string", minLength: 1 },
    expectedSpeaker: { type: "string", minLength: 1 },
    status: { type: "string", enum: ["verified", "unresolved"] },
    authoringSpeaker: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    corePropositionAuthoredByExpectedSpeaker: { type: "boolean" },
    mixedSpeakerSpan: { type: "boolean" },
    evidenceSegmentIndexes: { type: "array", minItems: 1, maxItems: 6, uniqueItems: true, items: { type: "integer", minimum: 0 } },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    rationale: { type: "string", minLength: 20, maxLength: 1200 }
  });
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "slugfester-v4171-disputed-audio-attribution",
    title: "Slugfester v4.1.7.1 disputed audio-attribution adjudication",
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "protocolId", "debateNumber", "debateId", "reviewerRole", "assessmentModel", "calibrationOnly", "isolation", "adjudications", "audit"],
    properties: {
      schemaVersion: { type: "string", const: V4171_AUDIO_ADJ_OUTPUT_VERSION },
      protocolId: { type: "string", const: V4171_AUDIO_ADJ_PROTOCOL_ID },
      debateNumber: { type: "string", const: "91" },
      debateId: { type: "string", const: "cutter-oppy-mind-brain-harmony-god-2025" },
      reviewerRole: { type: "string", const: "isolated-audio-attribution-adjudicator" },
      assessmentModel: { type: "string", const: "5.6 Sol" },
      calibrationOnly: { type: "boolean", const: true },
      isolation: exactObject({ ratingsUnavailable: { type: "boolean", const: true }, scoresUnavailable: { type: "boolean", const: true }, legacyUnavailable: { type: "boolean", const: true }, otherDebatesUnavailable: { type: "boolean", const: true }, contaminationDetected: { type: "boolean", const: false } }),
      adjudications: { type: "array", minItems: 2, maxItems: 2, items: item },
      audit: exactObject({ allDisputedMovesReviewed: { type: "boolean", const: true }, rawAudioDerivedSegmentsNotAltered: { type: "boolean", const: true }, calculatedScoreFieldsEmitted: { type: "boolean", const: false }, manualOverrideUsed: { type: "boolean", const: false } })
    }
  };
}

export async function validateV4171AudioAdjudicationOutput(output, packet, root = process.cwd()) {
  const schema = makeV4171AudioAdjudicationSchema();
  assertV4(output && canonicalJson(Object.keys(output).sort()) === canonicalJson(schema.required.sort()), "audio adjudication output keys invalid");
  assertV4(output.schemaVersion === V4171_AUDIO_ADJ_OUTPUT_VERSION && output.protocolId === V4171_AUDIO_ADJ_PROTOCOL_ID, "audio adjudication output identity mismatch");
  assertV4(output.debateNumber === packet.debateNumber && output.debateId === packet.debateId, "audio adjudication debate identity mismatch");
  assertV4(output.reviewerRole === "isolated-audio-attribution-adjudicator" && output.assessmentModel === "5.6 Sol" && output.calibrationOnly === true, "audio adjudication reviewer boundary invalid");
  assertV4(canonicalJson(output.isolation) === canonicalJson({ ratingsUnavailable: true, scoresUnavailable: true, legacyUnavailable: true, otherDebatesUnavailable: true, contaminationDetected: false }), "audio adjudication isolation invalid");
  assertV4(canonicalJson(output.audit) === canonicalJson({ allDisputedMovesReviewed: true, rawAudioDerivedSegmentsNotAltered: true, calculatedScoreFieldsEmitted: false, manualOverrideUsed: false }), "audio adjudication audit invalid");
  assertV4(!containsProhibitedCalculatedField(output), "audio adjudication emitted prohibited calculated fields");
  assertV4(Array.isArray(output.adjudications) && canonicalJson(output.adjudications.map((item) => item.moveId)) === canonicalJson(packet.moves.map((item) => item.moveId)), "audio adjudication move order invalid");
  const validations = [];
  for (let index = 0; index < packet.moves.length; index += 1) {
    const move = packet.moves[index]; const adjudication = output.adjudications[index];
    assertV4(adjudication.expectedSpeaker === move.expectedSpeaker, `${move.moveId}: expected speaker changed`);
    assertV4(Array.isArray(adjudication.evidenceSegmentIndexes) && adjudication.evidenceSegmentIndexes.length >= 1 && adjudication.evidenceSegmentIndexes.length <= 6 && new Set(adjudication.evidenceSegmentIndexes).size === adjudication.evidenceSegmentIndexes.length, `${move.moveId}: evidence indexes invalid`);
    assertV4(typeof adjudication.rationale === "string" && adjudication.rationale.length >= 20 && adjudication.rationale.length <= 1200, `${move.moveId}: rationale invalid`);
    const transcriptBytes = await readFile(path.resolve(root, move.diarizedTranscriptPath));
    assertV4(createHash("sha256").update(transcriptBytes).digest("hex") === move.diarizedTranscriptSha256, `${move.moveId}: diarized transcript hash mismatch`);
    const transcript = JSON.parse(transcriptBytes);
    const evidence = adjudication.evidenceSegmentIndexes.map((segmentIndex) => {
      const segment = transcript.segments[segmentIndex];
      assertV4(segment && typeof segment.text === "string" && segment.text.trim(), `${move.moveId}: cited segment invalid`);
      return segment;
    });
    if (adjudication.status === "verified") {
      assertV4(adjudication.authoringSpeaker === move.expectedSpeaker && adjudication.corePropositionAuthoredByExpectedSpeaker === true && adjudication.confidence === "high", `${move.moveId}: verified decision invariants invalid`);
      assertV4(evidence.some((segment) => segment.speaker === move.expectedSpeaker), `${move.moveId}: verified decision lacks expected-speaker evidence`);
    } else assertV4(["high", "medium", "low"].includes(adjudication.confidence), `${move.moveId}: unresolved confidence invalid`);
    validations.push({ moveId: move.moveId, status: adjudication.status, citedSegments: evidence.length, expectedSpeakerSegmentsCited: evidence.filter((segment) => segment.speaker === move.expectedSpeaker).length });
  }
  return { status: "passed", debateNumber: output.debateNumber, adjudications: validations, verified: validations.filter((item) => item.status === "verified").length, unresolved: validations.filter((item) => item.status === "unresolved").length, calculatedFields: 0 };
}
