import { displayedLanguagePasses, wordCount } from "./v388-reconstruction.mjs";
import { POST_CANARY_BATCH_01_PUBLICATION_MODEL, POST_CANARY_BATCH_01_PUBLICATION_ROOT } from "./assessment-production-post-canary-batch-01-publication.mjs";
import { POST_CANARY_BATCH_01_PUBLICATION_RESUMPTION_ROOT } from "./assessment-production-post-canary-batch-01-publication-resumption.mjs";
import { validatePostCanaryBatch01PublicationOutput } from "./assessment-production-post-canary-batch-01-publication-validation.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const POST_CANARY_BATCH_01_RESUMPTION_REPAIR_ROOT =
  `${POST_CANARY_BATCH_01_PUBLICATION_RESUMPTION_ROOT}/repair-1`;
export const POST_CANARY_BATCH_01_RESUMPTION_REPAIR_PROTOCOL_ID =
  "assessment-production-post-canary-batch-01-publication-resumption-1-repair-1";
export const POST_CANARY_BATCH_01_RESUMPTION_REPAIR_PACKET_VERSION =
  "1.0-assessment-production-post-canary-batch-01-publication-resumption-repair-packet";
export const POST_CANARY_BATCH_01_RESUMPTION_REPAIR_OUTPUT_VERSION =
  "1.0-assessment-production-post-canary-batch-01-publication-resumption-repair-output";
export const POST_CANARY_BATCH_01_RESUMPTION_REPAIR_PARTITIONS = Object.freeze([
  Object.freeze({
    debateNumber: "91",
    writableFields: Object.freeze(["representativeQuotes.con.text"])
  }),
  Object.freeze({
    debateNumber: "13",
    writableFields: Object.freeze([
      "moveProse.con-consolation-not-truth.critique",
      "moveProse.con-job-terrifying-submission.critique"
    ])
  }),
  Object.freeze({
    debateNumber: "13",
    writableFields: Object.freeze([
      "moveProse.pro-slavery-law-accommodation.critique"
    ])
  })
]);
export const POST_CANARY_BATCH_01_RESUMPTION_REPAIR_FIELDS = Object.freeze(
  POST_CANARY_BATCH_01_RESUMPTION_REPAIR_PARTITIONS.flatMap(
    ({ writableFields }) => writableFields
  )
);
export const POST_CANARY_BATCH_01_RESUMPTION_REPAIR_BASE_OUTPUTS =
  Object.freeze({
    "91": `${POST_CANARY_BATCH_01_PUBLICATION_RESUMPTION_ROOT}/outputs/debate-91.json`,
    "13": `${POST_CANARY_BATCH_01_PUBLICATION_RESUMPTION_ROOT}/outputs/debate-13.json`
  });
export const POST_CANARY_BATCH_01_RESUMPTION_REPAIR_PUBLICATION_PACKETS =
  Object.freeze({
    "91": `${POST_CANARY_BATCH_01_PUBLICATION_ROOT}/packets/debate-91.json`,
    "13": `${POST_CANARY_BATCH_01_PUBLICATION_ROOT}/packets/debate-13.json`
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

export function parseResumptionRepairField(field) {
  const quote = /^representativeQuotes\.(pro|con)\.text$/.exec(field);
  if (quote) return { type: "representative-quote", side: quote[1] };
  const critique = /^moveProse\.([^.]+)\.critique$/.exec(field);
  if (critique) return { type: "critique", moveId: critique[1] };
  throw new Error(`invalid publication-resumption repair field: ${field}`);
}

export function buildResumptionRepairSchema(packet) {
  const correctedProperties = Object.fromEntries(
    packet.corrections.map(({ field, repairType }) => [
      field,
      repairType === "critique"
        ? { type: "string", minLength: 880 }
        : { type: "string", minLength: 3 }
    ])
  );
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id:
      `slugfester-post-canary-batch-01-publication-resumption-repair-${packet.packetIndex}`,
    title:
      `Slugfester post-canary Batch 1 bounded publication-resumption repair packet ${packet.packetIndex}`,
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
      "correctedFields"
    ],
    properties: {
      schemaVersion: {
        type: "string",
        const: POST_CANARY_BATCH_01_RESUMPTION_REPAIR_OUTPUT_VERSION
      },
      protocolId: {
        type: "string",
        const: POST_CANARY_BATCH_01_RESUMPTION_REPAIR_PROTOCOL_ID
      },
      packetIndex: { type: "integer", const: packet.packetIndex },
      debateNumber: { type: "string", const: packet.debateNumber },
      debateId: { type: "string", const: packet.debateId },
      assessmentModel: {
        type: "string",
        const: POST_CANARY_BATCH_01_PUBLICATION_MODEL.label
      },
      completedAt: { type: "string", minLength: 10 },
      correctedFields: {
        type: "object",
        additionalProperties: false,
        required: Object.keys(correctedProperties),
        properties: correctedProperties
      }
    }
  };
}

function exactObjectKeys(value, expected, label) {
  assertV4(
    value && typeof value === "object" && !Array.isArray(value),
    `${label}: expected object`
  );
  assertV4(
    canonicalJson(Object.keys(value).sort()) ===
      canonicalJson([...expected].sort()),
    `${label}: fields changed`
  );
}

export function validateResumptionRepairOutput(repair, packet) {
  const expectedTop = [
    "schemaVersion",
    "protocolId",
    "packetIndex",
    "debateNumber",
    "debateId",
    "assessmentModel",
    "completedAt",
    "correctedFields"
  ];
  exactObjectKeys(repair, expectedTop, "repair output");
  assertV4(
    repair.schemaVersion ===
        POST_CANARY_BATCH_01_RESUMPTION_REPAIR_OUTPUT_VERSION &&
      repair.protocolId === POST_CANARY_BATCH_01_RESUMPTION_REPAIR_PROTOCOL_ID &&
      repair.packetIndex === packet.packetIndex &&
      repair.debateNumber === packet.debateNumber &&
      repair.debateId === packet.debateId &&
      repair.assessmentModel === POST_CANARY_BATCH_01_PUBLICATION_MODEL.label &&
      !Number.isNaN(Date.parse(repair.completedAt)),
    "repair output identity or provenance mismatch"
  );
  const expectedFields = packet.corrections.map(({ field }) => field);
  exactObjectKeys(repair.correctedFields, expectedFields, "correctedFields");

  const correctedFields = [];
  for (const correction of packet.corrections) {
    const value = String(repair.correctedFields[correction.field] ?? "").trim();
    if (correction.repairType === "representative-quote") {
      const words = wordCount(value);
      assertV4(
        correction.quoteEligible === true &&
          correction.sourceExcerpt.includes(value),
        `${correction.field}: repaired quote is not an exact eligible source substring`
      );
      assertV4(
        words >= 3 && words <= 18,
        `${correction.field}: repaired quote outside 3–18 words`
      );
      assertV4(
        unexpectedCharactersAbsent(value),
        `${correction.field}: repaired quote has an unexpected character`
      );
      correctedFields.push({
        field: correction.field,
        repairType: correction.repairType,
        words,
        exactSourceSubstring: true,
        sourceMoveId: correction.sourceMoveId
      });
      continue;
    }

    const words = wordCount(value);
    const sentences = value.split(/(?<=[.!?])\s+/).filter(Boolean);
    assertV4(
      words >= 105 && words <= 130,
      `${correction.field}: repaired critique outside 105–130 words`
    );
    assertV4(
      value.length >= 880,
      `${correction.field}: repaired critique shorter than 880 characters`
    );
    assertV4(
      sentences.length === 4,
      `${correction.field}: repaired critique must contain four sentences`
    );
    labels.forEach((label, index) => {
      assertV4(
        sentences[index].toLowerCase().startsWith(label),
        `${correction.field}: repaired critique label or order mismatch`
      );
      assertV4(
        terminalPunctuationPresent(sentences[index]),
        `${correction.field}: repaired critique sentence lacks terminal punctuation`
      );
    });
    assertV4(
      unexpectedCharactersAbsent(value),
      `${correction.field}: repaired critique has an unexpected character`
    );
    assertV4(
      displayedLanguagePasses(value),
      `${correction.field}: repaired critique has prohibited language`
    );
    correctedFields.push({
      field: correction.field,
      repairType: correction.repairType,
      words,
      characters: value.length,
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
  for (const partition of POST_CANARY_BATCH_01_RESUMPTION_REPAIR_PARTITIONS) {
    if (partition.debateNumber !== debateNumber) continue;
    for (const field of partition.writableFields) {
      const parsed = parseResumptionRepairField(field);
      if (parsed.type === "representative-quote") {
        copy.representativeQuotes[parsed.side].text =
          "__AUTHORIZED_REPAIR_FIELD__";
      } else {
        copy.moveProse[parsed.moveId].critique =
          "__AUTHORIZED_REPAIR_FIELD__";
      }
    }
  }
  return copy;
}

export function mergeAndValidateResumptionRepairs({
  baseOutputs,
  repairs,
  repairPackets,
  publicationPackets
}) {
  assertV4(
    repairs.length === 3 && repairPackets.length === 3,
    "all three publication-resumption repair packets are required for merge"
  );
  const mergedOutputs = {
    "91": structuredClone(baseOutputs["91"]),
    "13": structuredClone(baseOutputs["13"])
  };
  const transformations = [];
  for (let index = 0; index < 3; index += 1) {
    const repair = repairs[index];
    const packet = repairPackets[index];
    validateResumptionRepairOutput(repair, packet);
    for (const correction of packet.corrections) {
      const parsed = parseResumptionRepairField(correction.field);
      const target = mergedOutputs[packet.debateNumber];
      let before;
      if (parsed.type === "representative-quote") {
        before = target.representativeQuotes[parsed.side].text;
        target.representativeQuotes[parsed.side].text =
          repair.correctedFields[correction.field];
      } else {
        before = target.moveProse[parsed.moveId].critique;
        target.moveProse[parsed.moveId].critique =
          repair.correctedFields[correction.field];
      }
      transformations.push({
        debateNumber: packet.debateNumber,
        field: correction.field,
        packetIndex: index,
        operation: "replace-authorized-invalid-field",
        before,
        after: repair.correctedFields[correction.field]
      });
    }
  }
  for (const debateNumber of ["91", "13"]) {
    assertV4(
      canonicalJson(withRepairMarkers(mergedOutputs[debateNumber], debateNumber)) ===
        canonicalJson(withRepairMarkers(baseOutputs[debateNumber], debateNumber)),
      `Debate ${debateNumber}: repair merge changed an unauthorized field`
    );
  }
  const fullValidations = Object.fromEntries(
    ["91", "13"].map((debateNumber) => [
      debateNumber,
      validatePostCanaryBatch01PublicationOutput(
        mergedOutputs[debateNumber],
        publicationPackets[debateNumber]
      )
    ])
  );
  assertV4(
    transformations.length === 4,
    "the publication-resumption merge must change exactly four fields"
  );
  return { mergedOutputs, transformations, fullValidations };
}
