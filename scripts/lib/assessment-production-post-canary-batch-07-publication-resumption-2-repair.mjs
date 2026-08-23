import { displayedLanguagePasses, wordCount } from "./v388-reconstruction.mjs";
import { POST_CANARY_BATCH_07_PUBLICATION_MODEL } from
  "./assessment-production-post-canary-batch-07-publication.mjs";
import { validatePostCanaryBatch07PublicationOutput } from
  "./assessment-production-post-canary-batch-07-publication-validation.mjs";
import { POST_CANARY_BATCH_07_PUBLICATION_RESUMPTION_2_ROOT } from
  "./assessment-production-post-canary-batch-07-publication-resumption-2.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const POST_CANARY_BATCH_07_RESUMPTION_2_REPAIR_ROOT =
  `${POST_CANARY_BATCH_07_PUBLICATION_RESUMPTION_2_ROOT}/repair-1`;
export const POST_CANARY_BATCH_07_RESUMPTION_2_REPAIR_PROTOCOL_ID =
  "assessment-production-post-canary-batch-07-publication-resumption-2-repair-1";
export const POST_CANARY_BATCH_07_RESUMPTION_2_REPAIR_PACKET_VERSION =
  "1.0-assessment-production-post-canary-batch-07-publication-resumption-2-repair-packet";
export const POST_CANARY_BATCH_07_RESUMPTION_2_REPAIR_OUTPUT_VERSION =
  "1.0-assessment-production-post-canary-batch-07-publication-resumption-2-repair-output";

const labels = ["strongest feature:", "principal limitation:", "live burden:", "locked score:"];
const exactKeys = (value, expected, label) => {
  assertV4(value && typeof value === "object" && !Array.isArray(value), `${label}: expected object`);
  assertV4(canonicalJson(Object.keys(value).sort()) === canonicalJson([...expected].sort()),
    `${label}: fields changed`);
};

export function resumption2RepairMoveId(field) {
  const match = /^moveProse\.([^.]+)\.critique$/.exec(field);
  assertV4(match, `invalid Batch 7 resumption-2 repair field: ${field}`);
  return match[1];
}

export function buildResumption2RepairSchema(packet) {
  const properties = Object.fromEntries(packet.corrections.map(({ moveId }) =>
    [moveId, { type: "string", minLength: 880 }]));
  return { $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-batch-07-publication-resumption-2-repair-${packet.contextIndex}`,
    title: `Batch 7 publication resumption-2 repair packet ${packet.contextIndex}`,
    type: "object", additionalProperties: false,
    required: ["schemaVersion", "protocolId", "contextIndex", "packetIndex", "debateNumber",
      "debateId", "assessmentModel", "completedAt", "correctedCritiques"],
    properties: { schemaVersion: { type: "string", const: POST_CANARY_BATCH_07_RESUMPTION_2_REPAIR_OUTPUT_VERSION },
      protocolId: { type: "string", const: POST_CANARY_BATCH_07_RESUMPTION_2_REPAIR_PROTOCOL_ID },
      contextIndex: { type: "integer", const: packet.contextIndex },
      packetIndex: { type: "integer", const: packet.packetIndex },
      debateNumber: { type: "string", const: packet.debateNumber },
      debateId: { type: "string", const: packet.debateId },
      assessmentModel: { type: "string", const: POST_CANARY_BATCH_07_PUBLICATION_MODEL.label },
      completedAt: { type: "string", minLength: 10 },
      correctedCritiques: { type: "object", additionalProperties: false,
        required: Object.keys(properties), properties } } };
}

export function validateResumption2RepairOutput(output, packet) {
  exactKeys(output, ["schemaVersion", "protocolId", "contextIndex", "packetIndex", "debateNumber",
    "debateId", "assessmentModel", "completedAt", "correctedCritiques"], "repair output");
  assertV4(output.schemaVersion === POST_CANARY_BATCH_07_RESUMPTION_2_REPAIR_OUTPUT_VERSION &&
    output.protocolId === POST_CANARY_BATCH_07_RESUMPTION_2_REPAIR_PROTOCOL_ID &&
    output.contextIndex === packet.contextIndex && output.packetIndex === packet.packetIndex &&
    output.debateNumber === packet.debateNumber && output.debateId === packet.debateId &&
    output.assessmentModel === POST_CANARY_BATCH_07_PUBLICATION_MODEL.label &&
    !Number.isNaN(Date.parse(output.completedAt)), "repair output identity changed");
  const moveIds = packet.corrections.map(({ moveId }) => moveId);
  exactKeys(output.correctedCritiques, moveIds, "correctedCritiques");
  const correctedFields = [];
  for (const correction of packet.corrections) {
    const critique = String(output.correctedCritiques[correction.moveId] ?? "").trim();
    const words = wordCount(critique);
    const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
    assertV4(words >= 105 && words <= 130, `${correction.moveId}: critique outside 105–130 words`);
    assertV4(critique.length >= 880, `${correction.moveId}: critique shorter than 880 characters`);
    assertV4(sentences.length === 4, `${correction.moveId}: critique must contain four sentences`);
    labels.forEach((label, index) => {
      assertV4(sentences[index].toLowerCase().startsWith(label), `${correction.moveId}: label or order mismatch`);
      assertV4(/[.!?]["')\]]?$/.test(sentences[index].trim()), `${correction.moveId}: terminal punctuation missing`);
    });
    assertV4(!/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF\uFFFD]/u.test(critique),
      `${correction.moveId}: unexpected characters`);
    assertV4(displayedLanguagePasses(critique), `${correction.moveId}: prohibited language`);
    correctedFields.push({ field: correction.field, moveId: correction.moveId,
      words, characters: critique.length, sentences: 4 });
  }
  return { status: "passed", debateNumber: packet.debateNumber,
    contextIndex: packet.contextIndex, packetIndex: packet.packetIndex,
    correctedFields, modelAuthoredScores: 0 };
}

function withMarkers(output, fields) {
  const copy = structuredClone(output);
  for (const field of fields) copy.moveProse[resumption2RepairMoveId(field)].critique = "__AUTHORIZED_REPAIR_FIELD__";
  return copy;
}

export function mergeAndValidateResumption2Repair({ baseOutput, repairOutputs, repairPackets, publicationPacket }) {
  assertV4(repairOutputs.length === repairPackets.length && repairPackets.length > 0,
    "repair output and packet counts differ");
  const debateNumber = repairPackets[0].debateNumber;
  assertV4(repairPackets.every((packet) => packet.debateNumber === debateNumber),
    "repair packets crossed debate boundaries");
  const merged = structuredClone(baseOutput);
  const fields = repairPackets.flatMap((packet) => packet.corrections.map(({ field }) => field));
  assertV4(new Set(fields).size === fields.length, "a repair field was exposed more than once");
  const transformations = [];
  for (let index = 0; index < repairPackets.length; index += 1) {
    const repair = repairOutputs[index];
    const packet = repairPackets[index];
    validateResumption2RepairOutput(repair, packet);
    for (const correction of packet.corrections) {
      const before = merged.moveProse[correction.moveId].critique;
      const after = repair.correctedCritiques[correction.moveId];
      merged.moveProse[correction.moveId].critique = after;
      transformations.push({ field: correction.field, contextIndex: packet.contextIndex,
        packetIndex: packet.packetIndex, operation: "replace-authorized-invalid-field", before, after });
    }
  }
  assertV4(canonicalJson(withMarkers(merged, fields)) === canonicalJson(withMarkers(baseOutput, fields)),
    "repair merge changed a field outside its authorization");
  const fullValidation = validatePostCanaryBatch07PublicationOutput(merged, publicationPacket);
  return { merged, transformations, fullValidation };
}
