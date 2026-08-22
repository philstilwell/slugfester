import { displayedLanguagePasses, wordCount } from "./v388-reconstruction.mjs";
import {
  POST_CANARY_BATCH_05_PUBLICATION_MODEL
} from "./assessment-production-post-canary-batch-05-publication.mjs";
import {
  POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_RECOVERY_PROTOCOL_ID,
  POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_RECOVERY_ROOT,
  validateDebate109ShardOutput
} from "./assessment-production-post-canary-batch-05-publication-resumption-recovery.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const POST_CANARY_BATCH_05_DEBATE_109_CORRECTION_2_ROOT =
  `${POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_RECOVERY_ROOT}/correction-2`;
export const POST_CANARY_BATCH_05_DEBATE_109_CORRECTION_2_PROTOCOL_ID =
  `${POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_RECOVERY_PROTOCOL_ID}-debate-109-pro-correction-2`;
export const POST_CANARY_BATCH_05_DEBATE_109_CORRECTION_2_PACKET_VERSION =
  "1.0-assessment-production-post-canary-batch-05-debate-109-pro-correction-2-packet";
export const POST_CANARY_BATCH_05_DEBATE_109_CORRECTION_2_OUTPUT_VERSION =
  "1.0-assessment-production-post-canary-batch-05-debate-109-pro-correction-2-output";

const labels = ["strongest feature:", "principal limitation:", "live burden:", "locked score:"];
const exactKeys = (value, expected, label) => {
  assertV4(value && typeof value === "object" && !Array.isArray(value), `${label}: expected object`);
  assertV4(canonicalJson(Object.keys(value).sort()) === canonicalJson([...expected].sort()),
    `${label}: fields changed`);
};

export function correctionMoveId(field) {
  const match = /^content\.moveProse\.([^.]+)\.critique$/.exec(field);
  assertV4(match, `invalid Debate 109 correction field: ${field}`);
  return match[1];
}

export function buildDebate109Correction2Schema(packet) {
  const properties = Object.fromEntries(packet.corrections.map(({ moveId }) => [
    moveId, { type: "string", minLength: 880 }
  ]));
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-batch-05-debate-109-pro-correction-2-${packet.packetIndex}`,
    title: `Batch 5 Debate 109 pro/shared correction-2 packet ${packet.packetIndex}`,
    type: "object", additionalProperties: false,
    required: ["schemaVersion", "protocolId", "packetIndex", "debateNumber",
      "debateId", "shardId", "assessmentModel", "completedAt", "correctedCritiques"],
    properties: {
      schemaVersion: { type: "string", const: POST_CANARY_BATCH_05_DEBATE_109_CORRECTION_2_OUTPUT_VERSION },
      protocolId: { type: "string", const: POST_CANARY_BATCH_05_DEBATE_109_CORRECTION_2_PROTOCOL_ID },
      packetIndex: { type: "integer", const: packet.packetIndex },
      debateNumber: { type: "string", const: "109" },
      debateId: { type: "string", const: packet.debateId },
      shardId: { type: "string", const: "shard-01-pro-shared" },
      assessmentModel: { type: "string", const: POST_CANARY_BATCH_05_PUBLICATION_MODEL.label },
      completedAt: { type: "string", minLength: 10 },
      correctedCritiques: { type: "object", additionalProperties: false,
        required: Object.keys(properties), properties }
    }
  };
}

export function validateDebate109Correction2Output(output, packet) {
  exactKeys(output, ["schemaVersion", "protocolId", "packetIndex", "debateNumber",
    "debateId", "shardId", "assessmentModel", "completedAt", "correctedCritiques"],
  "correction-2 output");
  assertV4(output.schemaVersion === POST_CANARY_BATCH_05_DEBATE_109_CORRECTION_2_OUTPUT_VERSION &&
    output.protocolId === POST_CANARY_BATCH_05_DEBATE_109_CORRECTION_2_PROTOCOL_ID &&
    output.packetIndex === packet.packetIndex && output.debateNumber === "109" &&
    output.debateId === packet.debateId && output.shardId === "shard-01-pro-shared" &&
    output.assessmentModel === POST_CANARY_BATCH_05_PUBLICATION_MODEL.label &&
    !Number.isNaN(Date.parse(output.completedAt)),
  "correction-2 output identity changed");
  const moveIds = packet.corrections.map(({ moveId }) => moveId);
  exactKeys(output.correctedCritiques, moveIds, "correctedCritiques");
  const correctedFields = [];
  for (const correction of packet.corrections) {
    const critique = String(output.correctedCritiques[correction.moveId] ?? "").trim();
    const words = wordCount(critique);
    const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
    assertV4(words >= 105 && words <= 130,
      `${correction.moveId}: corrected critique outside 105–130 words`);
    assertV4(critique.length >= 880,
      `${correction.moveId}: corrected critique shorter than 880 characters`);
    assertV4(sentences.length === 4,
      `${correction.moveId}: corrected critique must contain four sentences`);
    labels.forEach((label, index) => {
      assertV4(sentences[index].toLowerCase().startsWith(label),
        `${correction.moveId}: corrected critique label or order mismatch`);
      assertV4(/[.!?]["')\]]?$/.test(sentences[index].trim()),
        `${correction.moveId}: corrected critique lacks terminal punctuation`);
    });
    assertV4(!/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF\uFFFD]/u.test(critique),
      `${correction.moveId}: corrected critique has unexpected characters`);
    assertV4(displayedLanguagePasses(critique),
      `${correction.moveId}: corrected critique has prohibited language`);
    correctedFields.push({ field: correction.field, moveId: correction.moveId,
      words, characters: critique.length, sentences: 4 });
  }
  return { status: "passed", debateNumber: "109", shardId: "shard-01-pro-shared",
    packetIndex: packet.packetIndex, correctedFields, modelAuthoredScores: 0 };
}

function withMarkers(output, fields) {
  const copy = structuredClone(output);
  for (const field of fields) {
    copy.content.moveProse[correctionMoveId(field)].critique = "__AUTHORIZED_CORRECTION_FIELD__";
  }
  return copy;
}

export function mergeAndValidateDebate109Correction2({
  rejectedOutput, correctionOutputs, correctionPackets, originalShardPacket
}) {
  assertV4(correctionOutputs.length === 4 && correctionPackets.length === 4,
    "four Debate 109 correction-2 packets are required");
  const repaired = structuredClone(rejectedOutput);
  const fields = correctionPackets.flatMap((packet) =>
    packet.corrections.map(({ field }) => field));
  assertV4(fields.length === 8 && new Set(fields).size === 8,
    "the eight correction-2 fields changed");
  const transformations = [];
  for (let index = 0; index < 4; index += 1) {
    const output = correctionOutputs[index];
    const packet = correctionPackets[index];
    validateDebate109Correction2Output(output, packet);
    for (const correction of packet.corrections) {
      const before = repaired.content.moveProse[correction.moveId].critique;
      const after = output.correctedCritiques[correction.moveId];
      repaired.content.moveProse[correction.moveId].critique = after;
      transformations.push({ field: correction.field, packetIndex: index,
        operation: "replace-authorized-invalid-field", before, after });
    }
  }
  assertV4(canonicalJson(withMarkers(repaired, fields)) ===
    canonicalJson(withMarkers(rejectedOutput, fields)),
  "correction-2 merge changed a field outside the eight-field exception");
  const shardValidation = validateDebate109ShardOutput(repaired, originalShardPacket);
  return { repaired, transformations, shardValidation };
}
