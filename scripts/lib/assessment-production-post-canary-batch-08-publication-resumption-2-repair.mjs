import { displayedLanguagePasses, wordCount } from "./v388-reconstruction.mjs";
import { POST_CANARY_BATCH_08_PUBLICATION_MODEL } from
  "./assessment-production-post-canary-batch-08-publication.mjs";
import { validatePostCanaryBatch08PublicationOutput } from
  "./assessment-production-post-canary-batch-08-publication-validation.mjs";
import { POST_CANARY_BATCH_08_PUBLICATION_RESUMPTION_2_ROOT } from
  "./assessment-production-post-canary-batch-08-publication-resumption-2.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const POST_CANARY_BATCH_08_DEBATE_120_REPAIR_ROOT =
  `${POST_CANARY_BATCH_08_PUBLICATION_RESUMPTION_2_ROOT}/repair-1`;
export const POST_CANARY_BATCH_08_DEBATE_120_REPAIR_PROTOCOL_ID =
  "assessment-production-post-canary-batch-08-debate-120-publication-resumption-2-repair-1";
export const POST_CANARY_BATCH_08_DEBATE_120_REPAIR_PACKET_VERSION =
  "1.0-assessment-production-post-canary-batch-08-debate-120-publication-repair-packet";
export const POST_CANARY_BATCH_08_DEBATE_120_REPAIR_OUTPUT_VERSION =
  "1.0-assessment-production-post-canary-batch-08-debate-120-publication-repair-output";
const labels = ["strongest feature:", "principal limitation:", "live burden:", "locked score:"];
const exactKeys = (value, expected, label) => {
  assertV4(value && typeof value === "object" && !Array.isArray(value), `${label}: expected object`);
  assertV4(canonicalJson(Object.keys(value).sort()) === canonicalJson([...expected].sort()),
    `${label}: fields changed`);
};
export function debate120RepairMoveId(field) {
  const match = /^moveProse\.([^.]+)\.critique$/.exec(field);
  assertV4(match, `invalid Debate 120 repair field: ${field}`); return match[1];
}
export function buildDebate120RepairSchema(packet) {
  const properties = Object.fromEntries(packet.corrections.map((correction) => [
    correction.field,
    correction.type === "critique-word-boundary"
      ? { type: "string", minLength: 880 }
      : { type: "string", minLength: 8 }
  ]));
  return { $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-batch-08-debate-120-publication-repair-${packet.packetIndex}`,
    title: `Batch 8 Debate 120 publication repair packet ${packet.packetIndex}`,
    type: "object", additionalProperties: false,
    required: ["schemaVersion", "protocolId", "packetIndex", "debateNumber",
      "debateId", "assessmentModel", "completedAt", "correctedFields"],
    properties: { schemaVersion: { type: "string", const: POST_CANARY_BATCH_08_DEBATE_120_REPAIR_OUTPUT_VERSION },
      protocolId: { type: "string", const: POST_CANARY_BATCH_08_DEBATE_120_REPAIR_PROTOCOL_ID },
      packetIndex: { type: "integer", const: packet.packetIndex },
      debateNumber: { type: "string", const: "120" },
      debateId: { type: "string", const: packet.debateId },
      assessmentModel: { type: "string", const: POST_CANARY_BATCH_08_PUBLICATION_MODEL.label },
      completedAt: { type: "string", minLength: 10 },
      correctedFields: { type: "object", additionalProperties: false,
        required: Object.keys(properties), properties } } };
}
export function validateDebate120RepairOutput(output, packet) {
  exactKeys(output, ["schemaVersion", "protocolId", "packetIndex", "debateNumber",
    "debateId", "assessmentModel", "completedAt", "correctedFields"], "repair output");
  assertV4(output.schemaVersion === POST_CANARY_BATCH_08_DEBATE_120_REPAIR_OUTPUT_VERSION &&
    output.protocolId === POST_CANARY_BATCH_08_DEBATE_120_REPAIR_PROTOCOL_ID &&
    output.packetIndex === packet.packetIndex && output.debateNumber === "120" &&
    output.debateId === packet.debateId &&
    output.assessmentModel === POST_CANARY_BATCH_08_PUBLICATION_MODEL.label &&
    !Number.isNaN(Date.parse(output.completedAt)), "repair output identity changed");
  exactKeys(output.correctedFields, packet.corrections.map(({ field }) => field), "correctedFields");
  const correctedFields = [];
  for (const correction of packet.corrections) {
    const text = String(output.correctedFields[correction.field] ?? "").trim();
    const words = wordCount(text);
    if (correction.type === "critique-word-boundary") {
      const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
      assertV4(words >= 105 && words <= 130, `${correction.moveId}: critique outside 105–130 words`);
      assertV4(text.length >= 880, `${correction.moveId}: critique shorter than 880 characters`);
      assertV4(sentences.length === 4, `${correction.moveId}: critique must contain four sentences`);
      labels.forEach((label, index) => { assertV4(sentences[index].toLowerCase().startsWith(label),
        `${correction.moveId}: label or order mismatch`);
        assertV4(/[.!?]["')\]]?$/.test(sentences[index].trim()),
          `${correction.moveId}: terminal punctuation missing`); });
      correctedFields.push({ field: correction.field, type: correction.type,
        moveId: correction.moveId, words, characters: text.length, sentences: 4 });
    } else {
      assertV4(correction.type === "novelty-explanation-minimum-words",
        `${correction.field}: unknown repair type`);
      assertV4(words >= 8 && words <= 35,
        `${correction.itemId}: novelty explanation outside 8–35 words`);
      correctedFields.push({ field: correction.field, type: correction.type,
        itemId: correction.itemId, words, characters: text.length });
    }
    assertV4(!/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF\uFFFD]/u.test(text),
      `${correction.field}: unexpected characters`);
    assertV4(displayedLanguagePasses(text), `${correction.field}: prohibited language`);
  }
  return { status: "passed", debateNumber: "120", packetIndex: packet.packetIndex,
    correctedFields, modelAuthoredScores: 0 };
}
function setField(output, correction, value) {
  if (correction.type === "critique-word-boundary") {
    output.moveProse[correction.moveId].critique = value;
    return;
  }
  assertV4(
    correction.type === "novelty-explanation-minimum-words" &&
      correction.side === "pro" && correction.premiseIndex === 3,
    `${correction.field}: unsupported repair field`
  );
  output.aiExtension.pro.premises[3].novelty.explanation = value;
}
function getField(output, correction) {
  if (correction.type === "critique-word-boundary") {
    return output.moveProse[correction.moveId].critique;
  }
  return output.aiExtension.pro.premises[3].novelty.explanation;
}
function withMarkers(output, corrections) {
  const copy = structuredClone(output);
  for (const correction of corrections) setField(copy, correction, "__AUTHORIZED_REPAIR_FIELD__");
  return copy;
}
export function mergeAndValidateDebate120Repair({ baseOutput, repairOutputs, repairPackets, publicationPacket }) {
  assertV4(repairOutputs.length === 2 && repairPackets.length === 2,
    "two Debate 120 repair packets are required");
  const merged = structuredClone(baseOutput);
  const corrections = repairPackets.flatMap((packet) => packet.corrections);
  const fields = corrections.map(({ field }) => field);
  assertV4(fields.length === 3 && new Set(fields).size === 3, "the three repair fields changed");
  const transformations = [];
  for (let index = 0; index < 2; index += 1) {
    const repair = repairOutputs[index]; const packet = repairPackets[index];
    validateDebate120RepairOutput(repair, packet);
    for (const correction of packet.corrections) {
      const before = getField(merged, correction);
      const after = repair.correctedFields[correction.field];
      setField(merged, correction, after);
      transformations.push({ field: correction.field, packetIndex: index,
        operation: "replace-authorized-invalid-field", before, after });
    }
  }
  assertV4(canonicalJson(withMarkers(merged, corrections)) === canonicalJson(withMarkers(baseOutput, corrections)),
    "repair merge changed a field outside the three-field authorization");
  const fullValidation = validatePostCanaryBatch08PublicationOutput(merged, publicationPacket);
  return { merged, transformations, fullValidation };
}
