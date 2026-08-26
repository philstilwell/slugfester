import { displayedLanguagePasses, wordCount } from "./v388-reconstruction.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-10/publication-reconstruction/failure-recovery/original-unattempted-context-resumption-1/debate-107-transport-correction-1";
export const PROTOCOL_ID =
  "assessment-production-post-canary-batch-10-publication-debate-107-transport-correction-1";
export const OUTPUT_VERSION =
  "1.0-assessment-production-post-canary-batch-10-publication-debate-107-transport-correction-output";
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

export function buildTransportCorrectedSchema(packet) {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "slugfester-batch-10-debate-107-publication-transport-correction-1",
    title: "Batch 10 Debate 107 transport-corrected three-field publication correction",
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
        type: "object",
        additionalProperties: false,
        required: TARGETS.map((target) => target.itemId),
        properties: Object.fromEntries(TARGETS.map((target) => [
          target.itemId,
          { type: "string", minLength: 40 }
        ]))
      }
    }
  };
}

export function validateTransportCorrectionOutput(output, packet) {
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
    "transport correction output"
  );
  assertV4(
    output.schemaVersion === OUTPUT_VERSION &&
      output.protocolId === PROTOCOL_ID &&
      output.contextIndex === 0 &&
      output.debateNumber === packet.debateNumber &&
      output.debateId === packet.debateId &&
      output.assessmentModel === MODEL.label &&
      !Number.isNaN(Date.parse(output.completedAt)),
    "transport correction identity or provenance mismatch"
  );
  exactKeys(
    output.corrections,
    TARGETS.map((target) => target.itemId),
    "corrections"
  );
  const fieldValidations = TARGETS.map((target) => ({
    itemId: target.itemId,
    field: target.field,
    ...validateExplanation(output.corrections[target.itemId], target.field)
  }));
  return {
    status: "passed",
    debateNumber: "107",
    correctedFields: TARGETS.length,
    fieldValidations,
    modelAuthoredScores: 0
  };
}
