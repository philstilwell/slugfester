import { displayedLanguagePasses, wordCount } from "./v388-reconstruction.mjs";
import {
  POST_CANARY_BATCH_08_PUBLICATION_MODEL,
  POST_CANARY_BATCH_08_PUBLICATION_ROOT
} from "./assessment-production-post-canary-batch-08-publication.mjs";
import {
  validatePostCanaryBatch08PublicationOutput
} from "./assessment-production-post-canary-batch-08-publication-validation.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const POST_CANARY_BATCH_08_PUBLICATION_REPAIR_ROOT =
  `${POST_CANARY_BATCH_08_PUBLICATION_ROOT}/repair-1`;
export const POST_CANARY_BATCH_08_PUBLICATION_REPAIR_PROTOCOL_ID =
  "assessment-production-post-canary-batch-08-publication-repair-1";
export const POST_CANARY_BATCH_08_PUBLICATION_REPAIR_PACKET_VERSION =
  "1.0-assessment-production-post-canary-batch-08-publication-repair-packet";
export const POST_CANARY_BATCH_08_PUBLICATION_REPAIR_OUTPUT_VERSION =
  "1.0-assessment-production-post-canary-batch-08-publication-repair-output";

const labels = ["strongest feature:", "principal limitation:", "live burden:", "locked score:"];
const exactKeys = (value, expected, label) => {
  assertV4(value && typeof value === "object" && !Array.isArray(value), `${label}: expected object`);
  assertV4(canonicalJson(Object.keys(value).sort()) === canonicalJson([...expected].sort()),
    `${label}: fields changed`);
};

export function parseBatch08PublicationRepairField(field) {
  let match = /^moveProse\.([^.]+)\.critique$/.exec(field);
  if (match) return { type: "critique-word-boundary", moveId: match[1] };
  match = /^representativeQuotes\.(pro|con)\.text$/.exec(field);
  if (match) return { type: "representative-quote-exact-source-substring", side: match[1] };
  throw new Error(`invalid Batch 8 publication repair field: ${field}`);
}

export function buildBatch08PublicationRepairSchema(packet) {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-batch-08-publication-repair-${packet.contextIndex}`,
    title: `Batch 8 publication repair ${packet.packetId}`,
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "protocolId", "contextIndex", "packetId",
      "debateNumber", "debateId", "assessmentModel", "completedAt", "correctedFields"],
    properties: {
      schemaVersion: { type: "string", const: POST_CANARY_BATCH_08_PUBLICATION_REPAIR_OUTPUT_VERSION },
      protocolId: { type: "string", const: POST_CANARY_BATCH_08_PUBLICATION_REPAIR_PROTOCOL_ID },
      contextIndex: { type: "integer", const: packet.contextIndex },
      packetId: { type: "string", const: packet.packetId },
      debateNumber: { type: "string", const: packet.debateNumber },
      debateId: { type: "string", const: packet.debateId },
      assessmentModel: { type: "string", const: POST_CANARY_BATCH_08_PUBLICATION_MODEL.label },
      completedAt: { type: "string", minLength: 10 },
      correctedFields: {
        type: "array", minItems: packet.corrections.length, maxItems: packet.corrections.length,
        items: { type: "object", additionalProperties: false, required: ["path", "value"],
          properties: { path: { type: "string", enum: packet.corrections.map(({ field }) => field) },
            value: { type: "string", minLength: 3 } } }
      }
    }
  };
}

export function validateBatch08PublicationRepairOutput(output, packet) {
  exactKeys(output, ["schemaVersion", "protocolId", "contextIndex", "packetId",
    "debateNumber", "debateId", "assessmentModel", "completedAt", "correctedFields"],
  "repair output");
  assertV4(output.schemaVersion === POST_CANARY_BATCH_08_PUBLICATION_REPAIR_OUTPUT_VERSION &&
    output.protocolId === POST_CANARY_BATCH_08_PUBLICATION_REPAIR_PROTOCOL_ID &&
    output.contextIndex === packet.contextIndex && output.packetId === packet.packetId &&
    output.debateNumber === packet.debateNumber && output.debateId === packet.debateId &&
    output.assessmentModel === POST_CANARY_BATCH_08_PUBLICATION_MODEL.label &&
    !Number.isNaN(Date.parse(output.completedAt)), "repair output identity changed");
  assertV4(Array.isArray(output.correctedFields) &&
    output.correctedFields.length === packet.corrections.length, "corrected field count changed");
  const expectedPaths = packet.corrections.map(({ field }) => field).sort();
  const actualPaths = output.correctedFields.map(({ path }) => path).sort();
  assertV4(canonicalJson(actualPaths) === canonicalJson(expectedPaths) &&
    new Set(actualPaths).size === actualPaths.length, "corrected field paths changed");

  const correctedFields = [];
  for (const correction of packet.corrections) {
    const row = output.correctedFields.find(({ path }) => path === correction.field);
    exactKeys(row, ["path", "value"], `${correction.field} correction`);
    const value = String(row.value).trim();
    if (correction.type === "critique-word-boundary") {
      const words = wordCount(value);
      const sentences = value.split(/(?<=[.!?])\s+/).filter(Boolean);
      assertV4(words >= 105 && words <= 130, `${correction.moveId}: critique outside 105–130 words`);
      assertV4(value.length >= 880, `${correction.moveId}: critique shorter than 880 characters`);
      assertV4(sentences.length === 4, `${correction.moveId}: critique must contain four sentences`);
      labels.forEach((label, index) => {
        assertV4(sentences[index].toLowerCase().startsWith(label),
          `${correction.moveId}: label or order mismatch`);
        assertV4(/[.!?]["')\]]?$/.test(sentences[index].trim()),
          `${correction.moveId}: terminal punctuation missing`);
      });
      assertV4(displayedLanguagePasses(value), `${correction.moveId}: prohibited language`);
      assertV4(!/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF\uFFFD]/u.test(value),
        `${correction.moveId}: unexpected characters`);
      correctedFields.push({ path: correction.field, type: correction.type,
        words, characters: value.length, sentences: 4 });
    } else {
      const words = wordCount(value);
      assertV4(words >= 3 && words <= 18, `${correction.side}: quote outside 3–18 words`);
      assertV4(correction.lockedMove.sourceExcerpt.includes(value),
        `${correction.side}: quote is not an exact source substring`);
      assertV4(displayedLanguagePasses(value), `${correction.side}: prohibited language`);
      correctedFields.push({ path: correction.field, type: correction.type,
        words, characters: value.length, exactSourceSubstring: true });
    }
  }
  return { status: "passed", contextIndex: packet.contextIndex,
    debateNumber: packet.debateNumber, correctedFields, modelAuthoredScores: 0 };
}

function setField(output, field, value) {
  const parsed = parseBatch08PublicationRepairField(field);
  if (parsed.type === "critique-word-boundary") output.moveProse[parsed.moveId].critique = value;
  else output.representativeQuotes[parsed.side].text = value;
}

function withMarkers(output, fields) {
  const copy = structuredClone(output);
  for (const field of fields) setField(copy, field, "__AUTHORIZED_REPAIR_FIELD__");
  return copy;
}

export function mergeAndValidateBatch08PublicationRepairs({ baseOutput, repairOutputs,
  repairPackets, publicationPacket }) {
  assertV4(repairOutputs.length === repairPackets.length && repairPackets.length >= 1,
    "repair output and packet counts differ");
  const merged = structuredClone(baseOutput);
  const fields = repairPackets.flatMap((packet) => packet.corrections.map(({ field }) => field));
  assertV4(new Set(fields).size === fields.length, "repair fields are not disjoint");
  const transformations = [];
  for (let index = 0; index < repairPackets.length; index += 1) {
    const packet = repairPackets[index];
    const output = repairOutputs[index];
    validateBatch08PublicationRepairOutput(output, packet);
    for (const correction of packet.corrections) {
      const parsed = parseBatch08PublicationRepairField(correction.field);
      const before = parsed.type === "critique-word-boundary"
        ? merged.moveProse[parsed.moveId].critique : merged.representativeQuotes[parsed.side].text;
      const after = output.correctedFields.find(({ path }) => path === correction.field).value.trim();
      setField(merged, correction.field, after);
      transformations.push({ field: correction.field, contextIndex: packet.contextIndex,
        operation: "replace-explicitly-authorized-invalid-field", before, after });
    }
  }
  assertV4(canonicalJson(withMarkers(merged, fields)) === canonicalJson(withMarkers(baseOutput, fields)),
    "repair merge changed a field outside the authorization");
  const fullValidation = validatePostCanaryBatch08PublicationOutput(merged, publicationPacket);
  return { merged, transformations, fullValidation };
}
