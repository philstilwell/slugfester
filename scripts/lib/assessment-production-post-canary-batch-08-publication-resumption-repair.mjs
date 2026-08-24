import { displayedLanguagePasses, wordCount } from "./v388-reconstruction.mjs";
import { POST_CANARY_BATCH_08_PUBLICATION_MODEL } from
  "./assessment-production-post-canary-batch-08-publication.mjs";
import { validatePostCanaryBatch08PublicationOutput } from
  "./assessment-production-post-canary-batch-08-publication-validation.mjs";
import { POST_CANARY_BATCH_08_PUBLICATION_RESUMPTION_ROOT } from
  "./assessment-production-post-canary-batch-08-publication-resumption.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const POST_CANARY_BATCH_08_DEBATE_08_REPAIR_ROOT =
  `${POST_CANARY_BATCH_08_PUBLICATION_RESUMPTION_ROOT}/repair-1`;
export const POST_CANARY_BATCH_08_DEBATE_08_REPAIR_PROTOCOL_ID =
  "assessment-production-post-canary-batch-08-debate-08-publication-resumption-repair-1";
export const POST_CANARY_BATCH_08_DEBATE_08_REPAIR_PACKET_VERSION =
  "1.0-assessment-production-post-canary-batch-08-debate-08-publication-repair-packet";
export const POST_CANARY_BATCH_08_DEBATE_08_REPAIR_OUTPUT_VERSION =
  "1.0-assessment-production-post-canary-batch-08-debate-08-publication-repair-output";
const labels = ["strongest feature:", "principal limitation:", "live burden:", "locked score:"];
const exactKeys = (value, expected, label) => {
  assertV4(value && typeof value === "object" && !Array.isArray(value), `${label}: expected object`);
  assertV4(canonicalJson(Object.keys(value).sort()) === canonicalJson([...expected].sort()),
    `${label}: fields changed`);
};
export function debate08RepairMoveId(field) {
  const match = /^moveProse\.([^.]+)\.critique$/.exec(field);
  assertV4(match, `invalid Debate 08 repair field: ${field}`); return match[1];
}
export function buildDebate08RepairSchema(packet) {
  const properties = Object.fromEntries(packet.corrections.map(({ moveId }) =>
    [moveId, { type: "string", minLength: 880 }]));
  return { $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-batch-08-debate-08-publication-repair-${packet.packetIndex}`,
    title: `Batch 8 Debate 08 publication repair packet ${packet.packetIndex}`,
    type: "object", additionalProperties: false,
    required: ["schemaVersion", "protocolId", "packetIndex", "debateNumber",
      "debateId", "assessmentModel", "completedAt", "correctedCritiques"],
    properties: { schemaVersion: { type: "string", const: POST_CANARY_BATCH_08_DEBATE_08_REPAIR_OUTPUT_VERSION },
      protocolId: { type: "string", const: POST_CANARY_BATCH_08_DEBATE_08_REPAIR_PROTOCOL_ID },
      packetIndex: { type: "integer", const: packet.packetIndex },
      debateNumber: { type: "string", const: "08" },
      debateId: { type: "string", const: packet.debateId },
      assessmentModel: { type: "string", const: POST_CANARY_BATCH_08_PUBLICATION_MODEL.label },
      completedAt: { type: "string", minLength: 10 },
      correctedCritiques: { type: "object", additionalProperties: false,
        required: Object.keys(properties), properties } } };
}
export function validateDebate08RepairOutput(output, packet) {
  exactKeys(output, ["schemaVersion", "protocolId", "packetIndex", "debateNumber",
    "debateId", "assessmentModel", "completedAt", "correctedCritiques"], "repair output");
  assertV4(output.schemaVersion === POST_CANARY_BATCH_08_DEBATE_08_REPAIR_OUTPUT_VERSION &&
    output.protocolId === POST_CANARY_BATCH_08_DEBATE_08_REPAIR_PROTOCOL_ID &&
    output.packetIndex === packet.packetIndex && output.debateNumber === "08" &&
    output.debateId === packet.debateId &&
    output.assessmentModel === POST_CANARY_BATCH_08_PUBLICATION_MODEL.label &&
    !Number.isNaN(Date.parse(output.completedAt)), "repair output identity changed");
  const moveIds = packet.corrections.map(({ moveId }) => moveId);
  exactKeys(output.correctedCritiques, moveIds, "correctedCritiques");
  const correctedFields = [];
  for (const correction of packet.corrections) {
    const critique = String(output.correctedCritiques[correction.moveId] ?? "").trim();
    const words = wordCount(critique); const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
    assertV4(words >= 105 && words <= 130, `${correction.moveId}: critique outside 105–130 words`);
    assertV4(critique.length >= 880, `${correction.moveId}: critique shorter than 880 characters`);
    assertV4(sentences.length === 4, `${correction.moveId}: critique must contain four sentences`);
    labels.forEach((label, index) => { assertV4(sentences[index].toLowerCase().startsWith(label),
      `${correction.moveId}: label or order mismatch`);
      assertV4(/[.!?]["')\]]?$/.test(sentences[index].trim()),
        `${correction.moveId}: terminal punctuation missing`); });
    assertV4(!/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF\uFFFD]/u.test(critique),
      `${correction.moveId}: unexpected characters`);
    assertV4(displayedLanguagePasses(critique), `${correction.moveId}: prohibited language`);
    correctedFields.push({ field: correction.field, moveId: correction.moveId,
      words, characters: critique.length, sentences: 4 });
  }
  return { status: "passed", debateNumber: "08", packetIndex: packet.packetIndex,
    correctedFields, modelAuthoredScores: 0 };
}
function withMarkers(output, fields) {
  const copy = structuredClone(output);
  for (const field of fields) copy.moveProse[debate08RepairMoveId(field)].critique = "__AUTHORIZED_REPAIR_FIELD__";
  return copy;
}
export function mergeAndValidateDebate08Repair({ baseOutput, repairOutputs, repairPackets, publicationPacket }) {
  assertV4(repairOutputs.length === 1 && repairPackets.length === 1,
    "one Debate 08 repair packet is required");
  const merged = structuredClone(baseOutput);
  const fields = repairPackets.flatMap((packet) => packet.corrections.map(({ field }) => field));
  assertV4(fields.length === 2 && new Set(fields).size === 2, "the two repair fields changed");
  const transformations = [];
  for (let index = 0; index < 1; index += 1) {
    const repair = repairOutputs[index]; const packet = repairPackets[index];
    validateDebate08RepairOutput(repair, packet);
    for (const correction of packet.corrections) {
      const before = merged.moveProse[correction.moveId].critique;
      const after = repair.correctedCritiques[correction.moveId];
      merged.moveProse[correction.moveId].critique = after;
      transformations.push({ field: correction.field, packetIndex: index,
        operation: "replace-authorized-invalid-field", before, after });
    }
  }
  assertV4(canonicalJson(withMarkers(merged, fields)) === canonicalJson(withMarkers(baseOutput, fields)),
    "repair merge changed a field outside the two-field authorization");
  const fullValidation = validatePostCanaryBatch08PublicationOutput(merged, publicationPacket);
  return { merged, transformations, fullValidation };
}
