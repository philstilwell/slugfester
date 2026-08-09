import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  assertV4,
  canonicalJson,
  containsProhibitedCalculatedField
} from "./v4-lean-production.mjs";

export const PRODUCTION_CANARY_AUDIO_ADJ_ROOT =
  "docs/assessment-production/canary-v1-audio-attribution-adjudication";
export const PRODUCTION_CANARY_AUDIO_ADJ_PROTOCOL_ID =
  "assessment-production-canary-v1-audio-attribution-adjudication";
export const PRODUCTION_CANARY_AUDIO_ADJ_PACKET_VERSION =
  "1.0-production-canary-audio-attribution-adjudication-packet";
export const PRODUCTION_CANARY_AUDIO_ADJ_OUTPUT_VERSION =
  "1.0-production-canary-audio-attribution-adjudication-output";

const exactObject = (properties) => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties
});
const ISOLATION = Object.freeze({
  ratingsUnavailable: true,
  scoresUnavailable: true,
  legacyUnavailable: true,
  otherDebatesUnavailable: true,
  publicationProseUnavailable: true,
  contaminationDetected: false
});
const AUDIT = Object.freeze({
  allDisputedMovesReviewed: true,
  rawAudioDerivedSegmentsNotAltered: true,
  calculatedScoreFieldsEmitted: false,
  thresholdRelaxationUsed: false,
  speakerRelabelingUsed: false,
  manualOverrideUsed: false
});

export function makeProductionCanaryAudioAttributionAdjudicationSchema() {
  const item = exactObject({
    moveId: { type: "string", const: "pro-move-07" },
    expectedSpeaker: { type: "string", const: "Sye Ten Bruggencate" },
    status: { type: "string", enum: ["verified", "unresolved"] },
    authoringSpeaker: {
      anyOf: [{ type: "string", minLength: 1 }, { type: "null" }]
    },
    corePropositionAuthoredByExpectedSpeaker: { type: "boolean" },
    mixedSpeakerSpan: { type: "boolean" },
    evidenceSegmentIndexes: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: { type: "integer", minimum: 0 }
    },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    rationale: { type: "string", minLength: 20, maxLength: 1200 }
  });
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "slugfester-production-canary-audio-attribution-adjudication",
    title: "Slugfester production-canary isolated audio-attribution adjudication",
    type: "object",
    additionalProperties: false,
    required: [
      "schemaVersion",
      "protocolId",
      "debateNumber",
      "debateId",
      "reviewerRole",
      "assessmentModel",
      "productionCanary",
      "stagingOnly",
      "isolation",
      "adjudications",
      "audit"
    ],
    properties: {
      schemaVersion: {
        type: "string",
        const: PRODUCTION_CANARY_AUDIO_ADJ_OUTPUT_VERSION
      },
      protocolId: {
        type: "string",
        const: PRODUCTION_CANARY_AUDIO_ADJ_PROTOCOL_ID
      },
      debateNumber: { type: "string", const: "05" },
      debateId: {
        type: "string",
        const: "dillahunty-ten-bruggencate-reasonable-god-2014"
      },
      reviewerRole: {
        type: "string",
        const: "isolated-audio-attribution-adjudicator"
      },
      assessmentModel: { type: "string", const: "5.6 Sol" },
      productionCanary: { type: "boolean", const: true },
      stagingOnly: { type: "boolean", const: true },
      isolation: exactObject(
        Object.fromEntries(
          Object.entries(ISOLATION).map(([key, value]) => [
            key,
            { type: "boolean", const: value }
          ])
        )
      ),
      adjudications: { type: "array", minItems: 1, maxItems: 1, items: item },
      audit: exactObject(
        Object.fromEntries(
          Object.entries(AUDIT).map(([key, value]) => [
            key,
            { type: "boolean", const: value }
          ])
        )
      )
    }
  };
}

export async function validateProductionCanaryAudioAttributionAdjudicationOutput(
  output,
  packet
) {
  const schema = makeProductionCanaryAudioAttributionAdjudicationSchema();
  assertV4(
    output &&
      canonicalJson(Object.keys(output).sort()) ===
        canonicalJson([...schema.required].sort()),
    "audio-attribution adjudication output keys invalid"
  );
  assertV4(
    output.schemaVersion === PRODUCTION_CANARY_AUDIO_ADJ_OUTPUT_VERSION &&
      output.protocolId === PRODUCTION_CANARY_AUDIO_ADJ_PROTOCOL_ID,
    "audio-attribution adjudication output identity mismatch"
  );
  assertV4(
    output.debateNumber === packet.debateNumber &&
      output.debateId === packet.debateId,
    "audio-attribution adjudication debate identity mismatch"
  );
  assertV4(
    output.reviewerRole === "isolated-audio-attribution-adjudicator" &&
      output.assessmentModel === "5.6 Sol" &&
      output.productionCanary === true &&
      output.stagingOnly === true,
    "audio-attribution adjudication reviewer boundary invalid"
  );
  assertV4(
    canonicalJson(output.isolation) === canonicalJson(ISOLATION),
    "audio-attribution adjudication isolation invalid"
  );
  assertV4(
    canonicalJson(output.audit) === canonicalJson(AUDIT),
    "audio-attribution adjudication audit invalid"
  );
  assertV4(
    !containsProhibitedCalculatedField(output),
    "audio-attribution adjudication emitted prohibited calculated fields"
  );
  assertV4(
    Array.isArray(output.adjudications) &&
      canonicalJson(output.adjudications.map((item) => item.moveId)) ===
        canonicalJson(packet.moves.map((item) => item.moveId)),
    "audio-attribution adjudication move order invalid"
  );

  const validations = [];
  for (let index = 0; index < packet.moves.length; index += 1) {
    const move = packet.moves[index];
    const adjudication = output.adjudications[index];
    assertV4(
      adjudication.expectedSpeaker === move.expectedSpeaker,
      `${move.moveId}: expected speaker changed`
    );
    assertV4(
      Array.isArray(adjudication.evidenceSegmentIndexes) &&
        adjudication.evidenceSegmentIndexes.length >= 1 &&
        adjudication.evidenceSegmentIndexes.length <= 6 &&
        new Set(adjudication.evidenceSegmentIndexes).size ===
          adjudication.evidenceSegmentIndexes.length,
      `${move.moveId}: evidence indexes invalid`
    );
    assertV4(
      typeof adjudication.rationale === "string" &&
        adjudication.rationale.length >= 20 &&
        adjudication.rationale.length <= 1200,
      `${move.moveId}: rationale invalid`
    );
    const transcriptBytes = await readFile(move.diarizedTranscriptPath);
    assertV4(
      createHash("sha256").update(transcriptBytes).digest("hex") ===
        move.diarizedTranscriptSha256,
      `${move.moveId}: diarized transcript hash mismatch`
    );
    const transcript = JSON.parse(transcriptBytes);
    const citedSegments = adjudication.evidenceSegmentIndexes.map(
      (segmentIndex) => {
        const segment = transcript.segments[segmentIndex];
        assertV4(
          segment && typeof segment.text === "string" && segment.text.trim(),
          `${move.moveId}: cited segment invalid`
        );
        return segment;
      }
    );
    if (adjudication.status === "verified") {
      assertV4(
        adjudication.authoringSpeaker === move.expectedSpeaker &&
          adjudication.corePropositionAuthoredByExpectedSpeaker === true &&
          adjudication.confidence === "high",
        `${move.moveId}: verified decision invariants invalid`
      );
      assertV4(
        citedSegments.some(
          (segment) => segment.speaker === move.expectedSpeaker
        ),
        `${move.moveId}: verified decision lacks expected-speaker evidence`
      );
    } else {
      assertV4(
        adjudication.authoringSpeaker === null &&
          adjudication.corePropositionAuthoredByExpectedSpeaker === false,
        `${move.moveId}: unresolved decision invariants invalid`
      );
    }
    validations.push({
      moveId: move.moveId,
      status: adjudication.status,
      citedSegments: citedSegments.length,
      expectedSpeakerSegmentsCited: citedSegments.filter(
        (segment) => segment.speaker === move.expectedSpeaker
      ).length
    });
  }
  return {
    status: "passed",
    debateNumber: output.debateNumber,
    adjudications: validations,
    verified: validations.filter((item) => item.status === "verified").length,
    unresolved: validations.filter((item) => item.status === "unresolved").length,
    calculatedFields: 0
  };
}

export {
  AUDIT as PRODUCTION_CANARY_AUDIO_ADJ_AUDIT,
  ISOLATION as PRODUCTION_CANARY_AUDIO_ADJ_ISOLATION
};
