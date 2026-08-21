import { displayedLanguagePasses, wordCount } from "./v388-reconstruction.mjs";
import { POST_CANARY_BATCH_04_PUBLICATION_MODEL } from "./assessment-production-post-canary-batch-04-publication.mjs";
import { validatePostCanaryBatch04PublicationOutput } from "./assessment-production-post-canary-batch-04-publication-validation.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const POST_CANARY_BATCH_04_RESUMPTION_2_REPAIR_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-04/publication-reconstruction/resumption-2/repair-1";
export const POST_CANARY_BATCH_04_RESUMPTION_2_REPAIR_PROTOCOL_ID =
  "assessment-production-post-canary-batch-04-publication-resumption-2-repair-1";
export const POST_CANARY_BATCH_04_RESUMPTION_2_REPAIR_PACKET_VERSION =
  "1.0-assessment-production-post-canary-batch-04-publication-resumption-2-repair-packet";
export const POST_CANARY_BATCH_04_RESUMPTION_2_REPAIR_OUTPUT_VERSION =
  "1.0-assessment-production-post-canary-batch-04-publication-resumption-2-repair-output";

export function repairMoveId(field) {
  const match = /^moveProse\.([^.]+)\.critique$/.exec(field);
  assertV4(match, `invalid repair field: ${field}`);
  return match[1];
}

export function buildResumption2RepairSchema(packet) {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-batch-04-publication-resumption-2-repair-${packet.packetIndex}`,
    title: `Slugfester Batch 4 Debate ${packet.debateNumber} single-field publication repair`,
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "protocolId", "packetIndex", "debateNumber",
      "debateId", "assessmentModel", "completedAt", "correctedCritique"],
    properties: {
      schemaVersion: { type: "string", const: POST_CANARY_BATCH_04_RESUMPTION_2_REPAIR_OUTPUT_VERSION },
      protocolId: { type: "string", const: POST_CANARY_BATCH_04_RESUMPTION_2_REPAIR_PROTOCOL_ID },
      packetIndex: { type: "integer", const: packet.packetIndex },
      debateNumber: { type: "string", const: packet.debateNumber },
      debateId: { type: "string", const: packet.debateId },
      assessmentModel: { type: "string", const: POST_CANARY_BATCH_04_PUBLICATION_MODEL.label },
      completedAt: { type: "string", minLength: 10 },
      correctedCritique: { type: "string", minLength: 880 }
    }
  };
}

const labels = ["strongest feature:", "principal limitation:", "live burden:", "locked score:"];
export function validateResumption2RepairOutput(repair, packet) {
  const expectedTop = ["schemaVersion", "protocolId", "packetIndex", "debateNumber",
    "debateId", "assessmentModel", "completedAt", "correctedCritique"];
  assertV4(repair && typeof repair === "object" && !Array.isArray(repair),
    "repair output must be an object");
  assertV4(canonicalJson(Object.keys(repair).sort()) === canonicalJson(expectedTop.sort()),
    "repair output fields changed");
  assertV4(repair.schemaVersion === POST_CANARY_BATCH_04_RESUMPTION_2_REPAIR_OUTPUT_VERSION &&
    repair.protocolId === POST_CANARY_BATCH_04_RESUMPTION_2_REPAIR_PROTOCOL_ID &&
    repair.packetIndex === packet.packetIndex && repair.debateNumber === packet.debateNumber &&
    repair.debateId === packet.debateId &&
    repair.assessmentModel === POST_CANARY_BATCH_04_PUBLICATION_MODEL.label &&
    !Number.isNaN(Date.parse(repair.completedAt)),
  "repair output identity or provenance mismatch");
  const critique = String(repair.correctedCritique ?? "").trim();
  const words = wordCount(critique);
  const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
  assertV4(words >= 105 && words <= 130,
    `${packet.moveId}: repaired critique outside 105–130 words`);
  assertV4(critique.length >= 880,
    `${packet.moveId}: repaired critique shorter than 880 characters`);
  assertV4(sentences.length === 4,
    `${packet.moveId}: repaired critique must contain four sentences`);
  labels.forEach((label, index) => {
    assertV4(sentences[index].toLowerCase().startsWith(label),
      `${packet.moveId}: repaired critique label or order mismatch`);
    assertV4(/[.!?]["')\]]?$/.test(sentences[index].trim()),
      `${packet.moveId}: repaired critique sentence lacks terminal punctuation`);
  });
  assertV4(!/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF\uFFFD]/u.test(critique),
    `${packet.moveId}: repaired critique has an unexpected character`);
  assertV4(displayedLanguagePasses(critique),
    `${packet.moveId}: repaired critique has prohibited language`);
  return { status: "passed", debateNumber: packet.debateNumber,
    packetIndex: packet.packetIndex, correctedField: packet.writableField,
    words, characters: critique.length, sentences: 4, modelAuthoredScores: 0 };
}

export function mergeAndValidateSingleFieldRepair({ baseOutput, repair,
  repairPacket, publicationPacket }) {
  validateResumption2RepairOutput(repair, repairPacket);
  const moveId = repairPacket.moveId;
  const merged = structuredClone(baseOutput);
  const before = merged.moveProse[moveId].critique;
  merged.moveProse[moveId].critique = repair.correctedCritique;
  const markedBase = structuredClone(baseOutput);
  const markedMerged = structuredClone(merged);
  markedBase.moveProse[moveId].critique = "__AUTHORIZED_REPAIR_FIELD__";
  markedMerged.moveProse[moveId].critique = "__AUTHORIZED_REPAIR_FIELD__";
  assertV4(canonicalJson(markedBase) === canonicalJson(markedMerged),
    `Debate ${repairPacket.debateNumber}: repair changed an unauthorized field`);
  const fullValidation = validatePostCanaryBatch04PublicationOutput(merged, publicationPacket);
  return { merged, transformation: { field: repairPacket.writableField,
    packetIndex: repairPacket.packetIndex, operation: "replace-authorized-invalid-field",
    before, after: repair.correctedCritique }, fullValidation };
}
