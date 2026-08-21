import { displayedLanguagePasses, wordCount } from "./v388-reconstruction.mjs";
import {
  POST_CANARY_BATCH_04_PUBLICATION_MODEL,
  POST_CANARY_BATCH_04_PUBLICATION_ROOT
} from "./assessment-production-post-canary-batch-04-publication.mjs";
import { validatePostCanaryBatch04PublicationOutput } from "./assessment-production-post-canary-batch-04-publication-validation.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const POST_CANARY_BATCH_04_DEBATE_49_REPAIR_ROOT =
  `${POST_CANARY_BATCH_04_PUBLICATION_ROOT}/resumption-1/repair-1`;
export const POST_CANARY_BATCH_04_DEBATE_49_REPAIR_PROTOCOL_ID =
  "assessment-production-post-canary-batch-04-debate-49-publication-resumption-repair-1";
export const POST_CANARY_BATCH_04_DEBATE_49_REPAIR_PACKET_VERSION =
  "1.0-assessment-production-post-canary-batch-04-debate-49-publication-resumption-repair-packet";
export const POST_CANARY_BATCH_04_DEBATE_49_REPAIR_OUTPUT_VERSION =
  "1.0-assessment-production-post-canary-batch-04-debate-49-publication-resumption-repair-output";
export const POST_CANARY_BATCH_04_DEBATE_49_BASE_OUTPUT =
  `${POST_CANARY_BATCH_04_PUBLICATION_ROOT}/resumption-1/outputs/debate-49.json`;
export const POST_CANARY_BATCH_04_DEBATE_49_PUBLICATION_PACKET =
  `${POST_CANARY_BATCH_04_PUBLICATION_ROOT}/packets/debate-49.json`;

export function debate49RepairMoveId(field) {
  const match = /^moveProse\.([^.]+)\.critique$/.exec(field);
  assertV4(match, `invalid Debate 49 repair field: ${field}`);
  return match[1];
}

export function buildDebate49RepairSchema(packet) {
  const critiqueProperties = Object.fromEntries(
    packet.corrections.map(({ moveId }) => [
      moveId,
      { type: "string", minLength: 880 }
    ])
  );
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id:
      `slugfester-post-canary-batch-04-debate-49-publication-resumption-repair-${packet.packetIndex}`,
    title:
      `Slugfester post-canary Batch 4 Debate 49 bounded publication resumption repair packet ${packet.packetIndex}`,
    type: "object",
    additionalProperties: false,
    required: [
      "schemaVersion",
      "protocolId",
      "packetIndex",
      "debateNumber",
      "debateId",
      "assessmentModel",
      "completedAt",
      "correctedCritiques"
    ],
    properties: {
      schemaVersion: {
        type: "string",
        const: POST_CANARY_BATCH_04_DEBATE_49_REPAIR_OUTPUT_VERSION
      },
      protocolId: {
        type: "string",
        const: POST_CANARY_BATCH_04_DEBATE_49_REPAIR_PROTOCOL_ID
      },
      packetIndex: { type: "integer", const: packet.packetIndex },
      debateNumber: { type: "string", const: "49" },
      debateId: { type: "string", const: packet.debateId },
      assessmentModel: {
        type: "string",
        const: POST_CANARY_BATCH_04_PUBLICATION_MODEL.label
      },
      completedAt: { type: "string", minLength: 10 },
      correctedCritiques: {
        type: "object",
        additionalProperties: false,
        required: Object.keys(critiqueProperties),
        properties: critiqueProperties
      }
    }
  };
}

const labels = [
  "strongest feature:",
  "principal limitation:",
  "live burden:",
  "locked score:"
];

export function validateDebate49RepairOutput(repair, packet) {
  const expectedTop = [
    "schemaVersion", "protocolId", "packetIndex", "debateNumber",
    "debateId", "assessmentModel", "completedAt", "correctedCritiques"
  ];
  assertV4(repair && typeof repair === "object" && !Array.isArray(repair),
    "repair output must be an object");
  assertV4(canonicalJson(Object.keys(repair).sort()) === canonicalJson(expectedTop.sort()),
    "repair output fields changed");
  assertV4(
    repair.schemaVersion === POST_CANARY_BATCH_04_DEBATE_49_REPAIR_OUTPUT_VERSION &&
      repair.protocolId === POST_CANARY_BATCH_04_DEBATE_49_REPAIR_PROTOCOL_ID &&
      repair.packetIndex === packet.packetIndex &&
      repair.debateNumber === "49" &&
      repair.debateId === packet.debateId &&
      repair.assessmentModel === POST_CANARY_BATCH_04_PUBLICATION_MODEL.label &&
      !Number.isNaN(Date.parse(repair.completedAt)),
    "repair output identity or provenance mismatch"
  );
  const expectedMoveIds = packet.corrections.map(({ moveId }) => moveId).sort();
  assertV4(
    repair.correctedCritiques &&
      canonicalJson(Object.keys(repair.correctedCritiques).sort()) === canonicalJson(expectedMoveIds),
    "repair critique field set changed"
  );
  const correctedFields = [];
  for (const correction of packet.corrections) {
    const critique = String(repair.correctedCritiques[correction.moveId] ?? "").trim();
    const words = wordCount(critique);
    const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
    assertV4(words >= 105 && words <= 130,
      `${correction.moveId}: repaired critique outside 105–130 words`);
    assertV4(critique.length >= 880,
      `${correction.moveId}: repaired critique shorter than 880 characters`);
    assertV4(sentences.length === 4,
      `${correction.moveId}: repaired critique must contain four sentences`);
    labels.forEach((label, index) => {
      assertV4(sentences[index].toLowerCase().startsWith(label),
        `${correction.moveId}: repaired critique label or order mismatch`);
      assertV4(/[.!?]["')\]]?$/.test(sentences[index].trim()),
        `${correction.moveId}: repaired critique sentence lacks terminal punctuation`);
    });
    assertV4(
      !/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF\uFFFD]/u.test(critique),
      `${correction.moveId}: repaired critique has an unexpected character`
    );
    assertV4(displayedLanguagePasses(critique),
      `${correction.moveId}: repaired critique has prohibited language`);
    correctedFields.push({
      field: `moveProse.${correction.moveId}.critique`,
      words,
      characters: critique.length,
      sentences: 4
    });
  }
  return { status: "passed", debateNumber: "49", packetIndex: packet.packetIndex,
    correctedFields, modelAuthoredScores: 0 };
}

function withRepairMarkers(output, repairFields) {
  const copy = structuredClone(output);
  for (const field of repairFields) {
    copy.moveProse[debate49RepairMoveId(field)].critique = "__AUTHORIZED_REPAIR_FIELD__";
  }
  return copy;
}

export function mergeAndValidateDebate49Repairs({
  baseOutput,
  repairs,
  repairPackets,
  publicationPacket,
  repairFields
}) {
  assertV4(
    repairs.length === 11 && repairPackets.length === 11 && repairFields.length === 22,
    "all eleven Debate 49 repair packets are required for merge"
  );
  const merged = structuredClone(baseOutput);
  const transformations = [];
  for (let index = 0; index < repairPackets.length; index += 1) {
    const repair = repairs[index];
    const packet = repairPackets[index];
    validateDebate49RepairOutput(repair, packet);
    for (const correction of packet.corrections) {
      const field = `moveProse.${correction.moveId}.critique`;
      const before = merged.moveProse[correction.moveId].critique;
      const after = repair.correctedCritiques[correction.moveId];
      merged.moveProse[correction.moveId].critique = after;
      transformations.push({ field, packetIndex: index,
        operation: "replace-authorized-invalid-field", before, after });
    }
  }
  assertV4(
    canonicalJson(withRepairMarkers(merged, repairFields)) ===
      canonicalJson(withRepairMarkers(baseOutput, repairFields)),
    "repair merge changed a field outside the 22-field authorization"
  );
  const fullValidation = validatePostCanaryBatch04PublicationOutput(merged, publicationPacket);
  return { merged, transformations, fullValidation };
}
