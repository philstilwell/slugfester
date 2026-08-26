import { displayedLanguagePasses, wordCount } from "./v388-reconstruction.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-10/publication-reconstruction/failure-recovery/original-unattempted-context-resumption-1/debate-107-correction-1";
export const PROTOCOL_ID =
  "assessment-production-post-canary-batch-10-publication-debate-107-correction-1";
export const PACKET_VERSION =
  "1.0-assessment-production-post-canary-batch-10-publication-debate-107-correction-packet";
export const OUTPUT_VERSION =
  "1.0-assessment-production-post-canary-batch-10-publication-debate-107-correction-output";
export const MODEL = Object.freeze({
  label: "5.6 Sol",
  slug: "gpt-5.6-sol",
  reasoningEffort: "low",
  authentication: "ChatGPT subscription"
});
export const TARGETS = Object.freeze([
  Object.freeze({
    itemId: "d107-ai-pro-premise-1",
    arrayIndex: 0,
    field: "aiExtension.pro.premises[0].novelty.explanation"
  }),
  Object.freeze({
    itemId: "d107-ai-pro-premise-3",
    arrayIndex: 2,
    field: "aiExtension.pro.premises[2].novelty.explanation"
  }),
  Object.freeze({
    itemId: "d107-ai-pro-premise-5",
    arrayIndex: 4,
    field: "aiExtension.pro.premises[4].novelty.explanation"
  })
]);

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

function validateExplanation(value, field) {
  const explanation = String(value).trim();
  const words = wordCount(explanation);
  assertV4(words >= 8 && words <= 35, `${field}: outside 8–35 words`);
  assertV4(/[.!?]["')\]]?$/.test(explanation), `${field}: lacks terminal punctuation`);
  assertV4(
    !/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF\uFFFD]/u.test(
      explanation
    ),
    `${field}: unexpected character`
  );
  assertV4(displayedLanguagePasses(explanation), `${field}: prohibited language`);
  return { words, characters: explanation.length };
}

export function buildCorrectionSchema(packet) {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "slugfester-batch-10-debate-107-publication-correction-1",
    title: "Batch 10 Debate 107 three-field publication correction",
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
      "corrections"
    ],
    properties: {
      schemaVersion: { type: "string", const: OUTPUT_VERSION },
      protocolId: { type: "string", const: PROTOCOL_ID },
      contextIndex: { type: "integer", const: 0 },
      debateNumber: { type: "string", const: packet.debateNumber },
      debateId: { type: "string", const: packet.debateId },
      assessmentModel: { type: "string", const: MODEL.label },
      completedAt: { type: "string", minLength: 10 },
      corrections: {
        type: "array",
        minItems: TARGETS.length,
        maxItems: TARGETS.length,
        prefixItems: TARGETS.map((target) => ({
          type: "object",
          additionalProperties: false,
          required: ["itemId", "field", "explanation"],
          properties: {
            itemId: { type: "string", const: target.itemId },
            field: { type: "string", const: target.field },
            explanation: { type: "string", minLength: 40 }
          }
        })),
        items: false
      }
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
      "corrections"
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
      !Number.isNaN(Date.parse(output.completedAt)),
    "correction identity or provenance mismatch"
  );
  assertV4(
    Array.isArray(output.corrections) && output.corrections.length === TARGETS.length,
    "exactly three corrections required"
  );
  const fieldValidations = output.corrections.map((correction, index) => {
    const target = TARGETS[index];
    exactKeys(correction, ["itemId", "field", "explanation"], `corrections[${index}]`);
    assertV4(
      correction.itemId === target.itemId && correction.field === target.field,
      `corrections[${index}]: target changed`
    );
    return {
      itemId: target.itemId,
      field: target.field,
      ...validateExplanation(correction.explanation, target.field)
    };
  });
  return {
    status: "passed",
    debateNumber: "107",
    correctedFields: TARGETS.length,
    fieldValidations,
    modelAuthoredScores: 0
  };
}
