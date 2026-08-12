import { displayedLanguagePasses, wordCount } from "./v388-reconstruction.mjs";
import {
  CHECKPOINT_V22_PUBLICATION_MODEL,
  CHECKPOINT_V22_PUBLICATION_ROOT
} from "./assessment-production-checkpoint-v2.2-publication.mjs";
import { validateCheckpointV22PublicationOutput } from "./assessment-production-checkpoint-v2.2-publication-validation.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const CHECKPOINT_V22_REPAIR_ROOT =
  `${CHECKPOINT_V22_PUBLICATION_ROOT}/repair-1`;
export const CHECKPOINT_V22_REPAIR_PROTOCOL_ID =
  "assessment-production-checkpoint-v2.2-1-publication-repair-1";
export const CHECKPOINT_V22_REPAIR_PACKET_VERSION =
  "1.0-production-checkpoint-v2.2-publication-repair-packet";
export const CHECKPOINT_V22_REPAIR_OUTPUT_VERSION =
  "1.0-production-checkpoint-v2.2-publication-repair-output";
export const CHECKPOINT_V22_REPAIR_FIELDS = Object.freeze([
  "moveProse.pro-gospels-cumulative-reliability.critique",
  "moveProse.con-no-replacement-method-burden.critique"
]);

const labels = [
  "strongest feature:",
  "principal limitation:",
  "live burden:",
  "locked score:"
];

const terminalPunctuationPresent = (value) => /[.!?]["')\]]?$/.test(String(value).trim());
const unexpectedCharactersAbsent = (value) =>
  !/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF\uFFFD]/u.test(value);

export function repairMoveId(field) {
  const match = /^moveProse\.([^.]+)\.critique$/.exec(field);
  assertV4(match, `invalid repair field: ${field}`);
  return match[1];
}

export function buildCheckpointV22RepairSchema(packet) {
  const properties = Object.fromEntries(
    packet.corrections.map(({ moveId }) => [moveId, { type: "string", minLength: 880 }])
  );
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "slugfester-production-checkpoint-v2.2-publication-repair-1-debate-50",
    title: "Slugfester production checkpoint v2.2 Debate 50 bounded publication repair",
    type: "object",
    additionalProperties: false,
    required: [
      "schemaVersion",
      "protocolId",
      "debateNumber",
      "debateId",
      "assessmentModel",
      "completedAt",
      "correctedCritiques"
    ],
    properties: {
      schemaVersion: { type: "string", const: CHECKPOINT_V22_REPAIR_OUTPUT_VERSION },
      protocolId: { type: "string", const: CHECKPOINT_V22_REPAIR_PROTOCOL_ID },
      debateNumber: { type: "string", const: packet.debateNumber },
      debateId: { type: "string", const: packet.debateId },
      assessmentModel: { type: "string", const: CHECKPOINT_V22_PUBLICATION_MODEL.label },
      completedAt: { type: "string", minLength: 10 },
      correctedCritiques: {
        type: "object",
        additionalProperties: false,
        required: Object.keys(properties),
        properties
      }
    }
  };
}

export function validateCheckpointV22RepairOutput(repair, packet) {
  assertV4(
    repair && typeof repair === "object" && !Array.isArray(repair),
    "repair output must be an object"
  );
  const expectedTop = [
    "schemaVersion",
    "protocolId",
    "debateNumber",
    "debateId",
    "assessmentModel",
    "completedAt",
    "correctedCritiques"
  ];
  assertV4(
    canonicalJson(Object.keys(repair).sort()) === canonicalJson(expectedTop.sort()),
    "repair output fields changed"
  );
  assertV4(
    repair.schemaVersion === CHECKPOINT_V22_REPAIR_OUTPUT_VERSION &&
      repair.protocolId === CHECKPOINT_V22_REPAIR_PROTOCOL_ID &&
      repair.debateNumber === packet.debateNumber &&
      repair.debateId === packet.debateId &&
      repair.assessmentModel === CHECKPOINT_V22_PUBLICATION_MODEL.label &&
      !Number.isNaN(Date.parse(repair.completedAt)),
    "repair output identity or provenance mismatch"
  );
  const expectedMoveIds = packet.corrections.map(({ moveId }) => moveId).sort();
  assertV4(
    repair.correctedCritiques &&
      canonicalJson(Object.keys(repair.correctedCritiques).sort()) === canonicalJson(expectedMoveIds),
    "repair critique field set changed"
  );
  const fields = [];
  for (const correction of packet.corrections) {
    const critique = String(repair.correctedCritiques[correction.moveId] ?? "").trim();
    const words = wordCount(critique);
    const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
    assertV4(words >= 105 && words <= 130, `${correction.moveId}: repaired critique outside 105–130 words`);
    assertV4(critique.length >= 880, `${correction.moveId}: repaired critique shorter than 880 characters`);
    assertV4(sentences.length === 4, `${correction.moveId}: repaired critique must contain four sentences`);
    labels.forEach((label, index) => {
      assertV4(
        sentences[index].toLowerCase().startsWith(label),
        `${correction.moveId}: repaired critique label or order mismatch`
      );
      assertV4(
        terminalPunctuationPresent(sentences[index]),
        `${correction.moveId}: repaired critique sentence lacks terminal punctuation`
      );
    });
    assertV4(unexpectedCharactersAbsent(critique), `${correction.moveId}: repaired critique has an unexpected character`);
    assertV4(displayedLanguagePasses(critique), `${correction.moveId}: repaired critique has prohibited language`);
    fields.push({
      field: `moveProse.${correction.moveId}.critique`,
      words,
      characters: critique.length,
      sentences: sentences.length
    });
  }
  return {
    status: "passed",
    debateNumber: packet.debateNumber,
    correctedFields: fields,
    modelAuthoredScores: 0
  };
}

function withRepairMarkers(output) {
  const copy = structuredClone(output);
  for (const field of CHECKPOINT_V22_REPAIR_FIELDS) {
    copy.moveProse[repairMoveId(field)].critique = "__AUTHORIZED_REPAIR_FIELD__";
  }
  return copy;
}

export function mergeAndValidateCheckpointV22Repair({ baseOutput, repair, repairPacket, publicationPacket }) {
  const repairValidation = validateCheckpointV22RepairOutput(repair, repairPacket);
  const merged = structuredClone(baseOutput);
  const transformations = [];
  for (const correction of repairPacket.corrections) {
    const field = `moveProse.${correction.moveId}.critique`;
    const before = merged.moveProse[correction.moveId].critique;
    const after = repair.correctedCritiques[correction.moveId];
    merged.moveProse[correction.moveId].critique = after;
    transformations.push({ field, operation: "replace-authorized-invalid-field", before, after });
  }
  assertV4(
    canonicalJson(withRepairMarkers(merged)) === canonicalJson(withRepairMarkers(baseOutput)),
    "repair merge changed a field outside the two-field authorization"
  );
  const fullValidation = validateCheckpointV22PublicationOutput(merged, publicationPacket);
  return { merged, repairValidation, fullValidation, transformations };
}
