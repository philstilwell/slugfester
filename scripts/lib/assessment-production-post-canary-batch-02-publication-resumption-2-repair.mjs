import { displayedLanguagePasses, wordCount } from "./v388-reconstruction.mjs";
import { POST_CANARY_BATCH_02_PUBLICATION_MODEL } from "./assessment-production-post-canary-batch-02-publication.mjs";
import { validatePostCanaryBatch02PublicationOutput } from "./assessment-production-post-canary-batch-02-publication-validation.mjs";
import { POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_2_ROOT } from "./assessment-production-post-canary-batch-02-publication-resumption-2.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const POST_CANARY_BATCH_02_RESUMPTION_2_REPAIR_ROOT =
  `${POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_2_ROOT}/repair-1`;
export const POST_CANARY_BATCH_02_RESUMPTION_2_REPAIR_PROTOCOL_ID =
  "assessment-production-post-canary-batch-02-publication-resumption-2-repair-1";
export const POST_CANARY_BATCH_02_RESUMPTION_2_REPAIR_PACKET_VERSION =
  "1.0-assessment-production-post-canary-batch-02-publication-resumption-2-repair-packet";
export const POST_CANARY_BATCH_02_RESUMPTION_2_REPAIR_OUTPUT_VERSION =
  "1.0-assessment-production-post-canary-batch-02-publication-resumption-2-repair-output";

export const POST_CANARY_BATCH_02_RESUMPTION_2_REPAIR_PARTITIONS =
  Object.freeze([
    Object.freeze({
      debateNumber: "136",
      writableFields: Object.freeze([
        "moveProse.con-calibrated-existence-baseline.critique",
        "moveProse.con-anonymous-late-changing-transmission.critique"
      ])
    }),
    Object.freeze({
      debateNumber: "136",
      writableFields: Object.freeze([
        "moveProse.pro-miracle-content-method-challenge.critique",
        "moveProse.pro-attestation-can-raise-miracle-probability.critique"
      ])
    }),
    Object.freeze({
      debateNumber: "136",
      writableFields: Object.freeze([
        "moveProse.pro-acts-ending-supports-early-date.critique",
        "moveProse.pro-variation-compatible-with-testimony.critique"
      ])
    }),
    Object.freeze({
      debateNumber: "136",
      writableFields: Object.freeze([
        "moveProse.pro-local-knowledge-supports-continuity.critique",
        "moveProse.con-empty-tomb-narrative-not-verification.critique"
      ])
    }),
    Object.freeze({
      debateNumber: "136",
      writableFields: Object.freeze([
        "moveProse.con-bodily-scenes-as-polemical-development.critique"
      ])
    }),
    Object.freeze({
      debateNumber: "83",
      writableFields: Object.freeze([
        "moveProse.pro-first-cause-01.critique"
      ])
    })
  ]);
export const POST_CANARY_BATCH_02_RESUMPTION_2_REPAIR_FIELDS = Object.freeze(
  POST_CANARY_BATCH_02_RESUMPTION_2_REPAIR_PARTITIONS.flatMap(
    (partition) => partition.writableFields
  )
);
export const POST_CANARY_BATCH_02_RESUMPTION_2_BASE_OUTPUTS = Object.freeze({
  "136": `${POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_2_ROOT}/outputs/debate-136.json`,
  "83": `${POST_CANARY_BATCH_02_PUBLICATION_RESUMPTION_2_ROOT}/outputs/debate-83.json`
});
export const POST_CANARY_BATCH_02_RESUMPTION_2_PUBLICATION_PACKETS =
  Object.freeze({
    "136":
      "docs/assessment-production/post-canary-continuation-v1/batch-02/publication-reconstruction/packets/debate-136.json",
    "83":
      "docs/assessment-production/post-canary-continuation-v1/batch-02/publication-reconstruction/packets/debate-83.json"
  });

const labels = [
  "strongest feature:",
  "principal limitation:",
  "live burden:",
  "locked score:"
];
const terminalPunctuationPresent = (value) =>
  /[.!?]["')\]]?$/.test(String(value).trim());
const unexpectedCharactersAbsent = (value) =>
  !/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF\uFFFD]/u.test(
    value
  );

export function resumption2RepairMoveId(field) {
  const match = /^moveProse\.([^.]+)\.critique$/.exec(field);
  assertV4(match, `invalid repair field: ${field}`);
  return match[1];
}

export function buildResumption2RepairSchema(packet) {
  const critiqueProperties = Object.fromEntries(
    packet.corrections.map(({ moveId }) => [
      moveId,
      { type: "string", minLength: 880 }
    ])
  );
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id:
      `slugfester-post-canary-batch-02-publication-resumption-2-repair-${packet.packetIndex}`,
    title:
      `Slugfester post-canary Batch 2 Debate ${packet.debateNumber} bounded publication repair packet ${packet.packetIndex}`,
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
        const: POST_CANARY_BATCH_02_RESUMPTION_2_REPAIR_OUTPUT_VERSION
      },
      protocolId: {
        type: "string",
        const: POST_CANARY_BATCH_02_RESUMPTION_2_REPAIR_PROTOCOL_ID
      },
      packetIndex: { type: "integer", const: packet.packetIndex },
      debateNumber: { type: "string", const: packet.debateNumber },
      debateId: { type: "string", const: packet.debateId },
      assessmentModel: {
        type: "string",
        const: POST_CANARY_BATCH_02_PUBLICATION_MODEL.label
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

export function validateResumption2RepairOutput(repair, packet) {
  const expectedTop = [
    "schemaVersion",
    "protocolId",
    "packetIndex",
    "debateNumber",
    "debateId",
    "assessmentModel",
    "completedAt",
    "correctedCritiques"
  ];
  assertV4(
    repair && typeof repair === "object" && !Array.isArray(repair),
    "repair output must be an object"
  );
  assertV4(
    canonicalJson(Object.keys(repair).sort()) === canonicalJson(expectedTop.sort()),
    "repair output fields changed"
  );
  assertV4(
    repair.schemaVersion ===
        POST_CANARY_BATCH_02_RESUMPTION_2_REPAIR_OUTPUT_VERSION &&
      repair.protocolId ===
        POST_CANARY_BATCH_02_RESUMPTION_2_REPAIR_PROTOCOL_ID &&
      repair.packetIndex === packet.packetIndex &&
      repair.debateNumber === packet.debateNumber &&
      repair.debateId === packet.debateId &&
      repair.assessmentModel === POST_CANARY_BATCH_02_PUBLICATION_MODEL.label &&
      !Number.isNaN(Date.parse(repair.completedAt)),
    "repair output identity or provenance mismatch"
  );
  const expectedMoveIds = packet.corrections.map(({ moveId }) => moveId).sort();
  assertV4(
    repair.correctedCritiques &&
      canonicalJson(Object.keys(repair.correctedCritiques).sort()) ===
        canonicalJson(expectedMoveIds),
    "repair critique field set changed"
  );
  const correctedFields = [];
  for (const correction of packet.corrections) {
    const critique = String(
      repair.correctedCritiques[correction.moveId] ?? ""
    ).trim();
    const words = wordCount(critique);
    const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
    assertV4(
      words >= 105 && words <= 130,
      `${correction.moveId}: repaired critique outside 105–130 words`
    );
    assertV4(
      critique.length >= 880,
      `${correction.moveId}: repaired critique shorter than 880 characters`
    );
    assertV4(
      sentences.length === 4,
      `${correction.moveId}: repaired critique must contain four sentences`
    );
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
    assertV4(
      unexpectedCharactersAbsent(critique) && displayedLanguagePasses(critique),
      `${correction.moveId}: repaired critique has prohibited content`
    );
    correctedFields.push({
      field: `moveProse.${correction.moveId}.critique`,
      words,
      characters: critique.length,
      sentences: 4
    });
  }
  return {
    status: "passed",
    debateNumber: packet.debateNumber,
    packetIndex: packet.packetIndex,
    correctedFields,
    modelAuthoredScores: 0
  };
}

function withRepairMarkers(output, debateNumber) {
  const copy = structuredClone(output);
  for (const partition of POST_CANARY_BATCH_02_RESUMPTION_2_REPAIR_PARTITIONS) {
    if (partition.debateNumber !== debateNumber) continue;
    for (const field of partition.writableFields) {
      copy.moveProse[resumption2RepairMoveId(field)].critique =
        "__AUTHORIZED_REPAIR_FIELD__";
    }
  }
  return copy;
}

export function mergeAndValidateResumption2Repairs({
  baseOutputs,
  repairs,
  repairPackets,
  publicationPackets
}) {
  assertV4(
    repairs.length === 6 && repairPackets.length === 6,
    "all six repair packets are required for merge"
  );
  const mergedOutputs = Object.fromEntries(
    Object.entries(baseOutputs).map(([debate, output]) => [
      debate,
      structuredClone(output)
    ])
  );
  const transformations = [];
  for (let index = 0; index < 6; index += 1) {
    const repair = repairs[index];
    const packet = repairPackets[index];
    validateResumption2RepairOutput(repair, packet);
    const merged = mergedOutputs[packet.debateNumber];
    assertV4(merged, `Debate ${packet.debateNumber}: merge target missing`);
    for (const correction of packet.corrections) {
      const field = `moveProse.${correction.moveId}.critique`;
      const before = merged.moveProse[correction.moveId].critique;
      const after = repair.correctedCritiques[correction.moveId];
      merged.moveProse[correction.moveId].critique = after;
      transformations.push({
        debateNumber: packet.debateNumber,
        field,
        packetIndex: index,
        operation: "replace-authorized-invalid-field",
        before,
        after
      });
    }
  }
  const fullValidations = {};
  for (const debateNumber of ["136", "83"]) {
    assertV4(
      canonicalJson(withRepairMarkers(mergedOutputs[debateNumber], debateNumber)) ===
        canonicalJson(withRepairMarkers(baseOutputs[debateNumber], debateNumber)),
      `Debate ${debateNumber}: merge changed an unauthorized field`
    );
    fullValidations[debateNumber] = validatePostCanaryBatch02PublicationOutput(
      mergedOutputs[debateNumber],
      publicationPackets[debateNumber]
    );
  }
  return { mergedOutputs, transformations, fullValidations };
}
