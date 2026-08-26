import { displayedLanguagePasses, wordCount } from "./v388-reconstruction.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-10/publication-reconstruction/failure-recovery/debate-21-timeout-recovery-1/recursive-correction-1";
export const PROTOCOL_ID =
  "assessment-production-post-canary-batch-10-publication-debate-21-recursive-correction-1";
export const PACKET_VERSION =
  "1.0-assessment-production-post-canary-batch-10-publication-recursive-correction-packet";
export const OUTPUT_VERSION =
  "1.0-assessment-production-post-canary-batch-10-publication-recursive-correction-output";
export const TARGET_MOVE_ID = "con-judaism-character-and-justice";
export const TARGET_FIELD = `moveProse.${TARGET_MOVE_ID}.critique`;
export const MODEL = Object.freeze({
  label: "5.6 Sol",
  slug: "gpt-5.6-sol",
  reasoningEffort: "low",
  authentication: "ChatGPT subscription"
});

const labels = [
  "strongest feature:",
  "principal limitation:",
  "live burden:",
  "locked score:"
];

function exactKeys(value, expected, label) {
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

export function validateCorrectionCritique(value, field = TARGET_FIELD) {
  const critique = String(value).trim();
  const words = wordCount(critique);
  const sentences = critique.split(/(?<=[.!?])\s+/).filter(Boolean);
  assertV4(words >= 105 && words <= 130, `${field}: outside 105–130 words`);
  assertV4(critique.length >= 880, `${field}: shorter than 880 characters`);
  assertV4(sentences.length === 4, `${field}: must contain four sentences`);
  labels.forEach((label, index) => {
    assertV4(
      sentences[index].toLowerCase().startsWith(label),
      `${field}: label or order mismatch`
    );
    assertV4(
      /[.!?]["')\]]?$/.test(sentences[index].trim()),
      `${field}: sentence lacks terminal punctuation`
    );
  });
  assertV4(
    !/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF\uFFFD]/u.test(
      critique
    ),
    `${field}: unexpected character`
  );
  assertV4(displayedLanguagePasses(critique), `${field}: prohibited language`);
  return { words, characters: critique.length, sentences: 4 };
}

export function buildCorrectionSchema(packet) {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "slugfester-batch-10-debate-21-publication-recursive-correction-1",
    title: "Batch 10 Debate 21 one-field publication correction",
    type: "object",
    additionalProperties: false,
    required: [
      "schemaVersion",
      "protocolId",
      "contextIndex",
      "debateNumber",
      "debateId",
      "assessmentModel",
      "completedAt",
      "fieldPath",
      "critique"
    ],
    properties: {
      schemaVersion: { type: "string", const: OUTPUT_VERSION },
      protocolId: { type: "string", const: PROTOCOL_ID },
      contextIndex: { type: "integer", const: 0 },
      debateNumber: { type: "string", const: packet.debateNumber },
      debateId: { type: "string", const: packet.debateId },
      assessmentModel: { type: "string", const: MODEL.label },
      completedAt: { type: "string", minLength: 10 },
      fieldPath: { type: "string", const: TARGET_FIELD },
      critique: { type: "string", minLength: 880 }
    }
  };
}

export function validateCorrectionOutput(output, packet) {
  exactKeys(
    output,
    [
      "schemaVersion",
      "protocolId",
      "contextIndex",
      "debateNumber",
      "debateId",
      "assessmentModel",
      "completedAt",
      "fieldPath",
      "critique"
    ],
    "correction output"
  );
  assertV4(
    output.schemaVersion === OUTPUT_VERSION &&
      output.protocolId === PROTOCOL_ID &&
      output.contextIndex === 0 &&
      output.debateNumber === packet.debateNumber &&
      output.debateId === packet.debateId &&
      output.assessmentModel === MODEL.label &&
      output.fieldPath === TARGET_FIELD &&
      !Number.isNaN(Date.parse(output.completedAt)),
    "correction identity or provenance mismatch"
  );
  return {
    status: "passed",
    debateNumber: packet.debateNumber,
    correctedField: TARGET_FIELD,
    ...validateCorrectionCritique(output.critique),
    modelAuthoredScores: 0
  };
}
