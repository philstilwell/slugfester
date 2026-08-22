import { displayedLanguagePasses, wordCount } from "./v388-reconstruction.mjs";
import {
  POST_CANARY_BATCH_05_PUBLICATION_MODEL,
  POST_CANARY_BATCH_05_PUBLICATION_ROOT
} from "./assessment-production-post-canary-batch-05-publication.mjs";
import { validatePostCanaryBatch05PublicationOutput } from "./assessment-production-post-canary-batch-05-publication-validation.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const POST_CANARY_BATCH_05_DEBATE_64_REPAIR_ROOT =
  `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/repair-1`;
export const POST_CANARY_BATCH_05_DEBATE_64_REPAIR_PROTOCOL_ID =
  "assessment-production-post-canary-batch-05-debate-64-publication-repair-1";
export const POST_CANARY_BATCH_05_DEBATE_64_REPAIR_PACKET_VERSION =
  "1.0-assessment-production-post-canary-batch-05-debate-64-publication-repair-packet";
export const POST_CANARY_BATCH_05_DEBATE_64_REPAIR_OUTPUT_VERSION =
  "1.0-assessment-production-post-canary-batch-05-debate-64-publication-repair-output";
export const POST_CANARY_BATCH_05_DEBATE_64_REPAIR_FIELDS = Object.freeze([
  "representativeQuotes.con.text",
  "moveProse.con-first-cause-identification-gap.critique"
]);
export const POST_CANARY_BATCH_05_DEBATE_64_BASE_OUTPUT =
  `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/outputs/debate-64.json`;
export const POST_CANARY_BATCH_05_DEBATE_64_PUBLICATION_PACKET =
  `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/packets/debate-64.json`;

const labels = [
  "strongest feature:",
  "principal limitation:",
  "live burden:",
  "locked score:"
];
const terminalPunctuationPresent = (value) =>
  /[.!?]["')\]]?$/.test(String(value).trim());
const unexpectedCharactersAbsent = (value) =>
  !/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF\uFFFD]/u.test(value);

export function buildDebate64RepairSchema(packet) {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "slugfester-post-canary-batch-05-debate-64-publication-repair-1",
    title: "Slugfester post-canary Batch 5 Debate 64 bounded publication repair",
    type: "object",
    additionalProperties: false,
    required: [
      "schemaVersion", "protocolId", "packetIndex", "debateNumber", "debateId",
      "assessmentModel", "completedAt", "correctedFields"
    ],
    properties: {
      schemaVersion: { type: "string", const: POST_CANARY_BATCH_05_DEBATE_64_REPAIR_OUTPUT_VERSION },
      protocolId: { type: "string", const: POST_CANARY_BATCH_05_DEBATE_64_REPAIR_PROTOCOL_ID },
      packetIndex: { type: "integer", const: 0 },
      debateNumber: { type: "string", const: "64" },
      debateId: { type: "string", const: packet.debateId },
      assessmentModel: { type: "string", const: POST_CANARY_BATCH_05_PUBLICATION_MODEL.label },
      completedAt: { type: "string", minLength: 10 },
      correctedFields: {
        type: "object",
        additionalProperties: false,
        required: POST_CANARY_BATCH_05_DEBATE_64_REPAIR_FIELDS,
        properties: {
          "representativeQuotes.con.text": { type: "string", minLength: 3 },
          "moveProse.con-first-cause-identification-gap.critique": {
            type: "string", minLength: 880
          }
        }
      }
    }
  };
}

function exactKeys(value, expected, label) {
  assertV4(value && typeof value === "object" && !Array.isArray(value), `${label}: expected object`);
  assertV4(canonicalJson(Object.keys(value).sort()) === canonicalJson([...expected].sort()),
    `${label}: fields changed`);
}

export function validateDebate64RepairOutput(repair, packet) {
  exactKeys(repair, [
    "schemaVersion", "protocolId", "packetIndex", "debateNumber", "debateId",
    "assessmentModel", "completedAt", "correctedFields"
  ], "repair output");
  assertV4(
    repair.schemaVersion === POST_CANARY_BATCH_05_DEBATE_64_REPAIR_OUTPUT_VERSION &&
      repair.protocolId === POST_CANARY_BATCH_05_DEBATE_64_REPAIR_PROTOCOL_ID &&
      repair.packetIndex === 0 && repair.debateNumber === "64" &&
      repair.debateId === packet.debateId &&
      repair.assessmentModel === POST_CANARY_BATCH_05_PUBLICATION_MODEL.label &&
      !Number.isNaN(Date.parse(repair.completedAt)),
    "repair output identity or provenance mismatch"
  );
  exactKeys(repair.correctedFields, POST_CANARY_BATCH_05_DEBATE_64_REPAIR_FIELDS,
    "correctedFields");

  const quoteCorrection = packet.corrections.find(({ repairType }) =>
    repairType === "representative-quote");
  const quote = String(repair.correctedFields[POST_CANARY_BATCH_05_DEBATE_64_REPAIR_FIELDS[0]]).trim();
  const quoteWords = wordCount(quote);
  assertV4(quoteCorrection.quoteEligible === true && quoteCorrection.sourceExcerpt.includes(quote),
    "repaired quote is not an exact eligible source substring");
  assertV4(quoteWords >= 3 && quoteWords <= 18, "repaired quote outside 3–18 words");
  assertV4(unexpectedCharactersAbsent(quote), "repaired quote has an unexpected character");

  const critique = String(
    repair.correctedFields[POST_CANARY_BATCH_05_DEBATE_64_REPAIR_FIELDS[1]]
  ).trim();
  const critiqueWords = wordCount(critique);
  const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
  assertV4(critiqueWords >= 105 && critiqueWords <= 130,
    "repaired critique outside 105–130 words");
  assertV4(critique.length >= 880, "repaired critique shorter than 880 characters");
  assertV4(sentences.length === 4, "repaired critique must contain four sentences");
  labels.forEach((label, index) => {
    assertV4(sentences[index].toLowerCase().startsWith(label),
      "repaired critique label or order mismatch");
    assertV4(terminalPunctuationPresent(sentences[index]),
      "repaired critique sentence lacks terminal punctuation");
  });
  assertV4(unexpectedCharactersAbsent(critique), "repaired critique has an unexpected character");
  assertV4(displayedLanguagePasses(critique), "repaired critique has prohibited language");

  return {
    status: "passed", debateNumber: "64", packetIndex: 0,
    correctedFields: [
      { field: POST_CANARY_BATCH_05_DEBATE_64_REPAIR_FIELDS[0], repairType: "representative-quote",
        words: quoteWords, exactSourceSubstring: true, sourceMoveId: quoteCorrection.sourceMoveId },
      { field: POST_CANARY_BATCH_05_DEBATE_64_REPAIR_FIELDS[1], repairType: "critique",
        words: critiqueWords, characters: critique.length, sentences: 4 }
    ],
    modelAuthoredScores: 0
  };
}

function withRepairMarkers(output) {
  const copy = structuredClone(output);
  copy.representativeQuotes.con.text = "__AUTHORIZED_REPAIR_FIELD__";
  copy.moveProse["con-first-cause-identification-gap"].critique =
    "__AUTHORIZED_REPAIR_FIELD__";
  return copy;
}

export function mergeAndValidateDebate64Repair({ baseOutput, repair, repairPacket, publicationPacket }) {
  validateDebate64RepairOutput(repair, repairPacket);
  const merged = structuredClone(baseOutput);
  const transformations = [
    {
      field: POST_CANARY_BATCH_05_DEBATE_64_REPAIR_FIELDS[0], packetIndex: 0,
      operation: "replace-authorized-invalid-field",
      before: merged.representativeQuotes.con.text,
      after: repair.correctedFields[POST_CANARY_BATCH_05_DEBATE_64_REPAIR_FIELDS[0]]
    },
    {
      field: POST_CANARY_BATCH_05_DEBATE_64_REPAIR_FIELDS[1], packetIndex: 0,
      operation: "replace-authorized-invalid-field",
      before: merged.moveProse["con-first-cause-identification-gap"].critique,
      after: repair.correctedFields[POST_CANARY_BATCH_05_DEBATE_64_REPAIR_FIELDS[1]]
    }
  ];
  merged.representativeQuotes.con.text = transformations[0].after;
  merged.moveProse["con-first-cause-identification-gap"].critique = transformations[1].after;
  assertV4(canonicalJson(withRepairMarkers(merged)) === canonicalJson(withRepairMarkers(baseOutput)),
    "repair merge changed a field outside the two-field authorization");
  const fullValidation = validatePostCanaryBatch05PublicationOutput(merged, publicationPacket);
  assertV4(transformations.length === 2, "exactly two authorized fields must change");
  return { merged, transformations, fullValidation };
}
