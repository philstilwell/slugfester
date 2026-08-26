import { displayedLanguagePasses, wordCount } from "./v388-reconstruction.mjs";
import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-10/publication-reconstruction/failure-recovery/original-unattempted-context-resumption-2/field-disjoint-repair-1";
export const PROTOCOL_ID =
  "assessment-production-post-canary-batch-10-publication-field-disjoint-repair-1";
export const OUTPUT_VERSION =
  "1.0-assessment-production-post-canary-batch-10-publication-field-disjoint-repair-output";
export const MODEL = Object.freeze({
  label: "5.6 Sol",
  slug: "gpt-5.6-sol",
  reasoningEffort: "low",
  authentication: "ChatGPT subscription"
});
export const DEBATE_PLANS = Object.freeze([
  Object.freeze({ debateNumber: "123", critiqueShardSizes: Object.freeze([5, 5]) }),
  Object.freeze({ debateNumber: "177", critiqueShardSizes: Object.freeze([7, 8]), quoteSide: "pro" }),
  Object.freeze({ debateNumber: "68", critiqueShardSizes: Object.freeze([6]) }),
  Object.freeze({ debateNumber: "147", critiqueShardSizes: Object.freeze([9, 8]) }),
  Object.freeze({ debateNumber: "61", critiqueShardSizes: Object.freeze([3]) })
]);

function exactKeys(value, expected, label) {
  assertV4(value && typeof value === "object" && !Array.isArray(value),
    `${label}: expected object`);
  assertV4(canonicalJson(Object.keys(value).sort()) === canonicalJson([...expected].sort()),
    `${label}: fields changed`);
}

function unexpectedCharactersAbsent(value) {
  return !/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF\uFFFD]/u
    .test(String(value));
}

function terminalPunctuationPresent(value) {
  return /[.!?]["')\]]?$/.test(String(value).trim());
}

export function buildFieldDisjointRepairSchema(packet) {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-batch-10-field-disjoint-repair-${packet.contextIndex}`,
    title: `Batch 10 Debate ${packet.debateNumber} field-disjoint repair ${packet.shardId}`,
    type: "object",
    additionalProperties: false,
    required: [
      "schemaVersion", "protocolId", "contextIndex", "debateNumber", "debateId",
      "shardId", "assessmentModel", "completedAt", "corrections"
    ],
    properties: {
      schemaVersion: { type: "string", const: OUTPUT_VERSION },
      protocolId: { type: "string", const: PROTOCOL_ID },
      contextIndex: { type: "integer", const: packet.contextIndex },
      debateNumber: { type: "string", const: packet.debateNumber },
      debateId: { type: "string", const: packet.debateId },
      shardId: { type: "string", const: packet.shardId },
      assessmentModel: { type: "string", const: MODEL.label },
      completedAt: { type: "string", minLength: 10 },
      corrections: {
        type: "object",
        additionalProperties: false,
        required: packet.targets.map((target) => target.fieldKey),
        properties: Object.fromEntries(packet.targets.map((target) => [
          target.fieldKey,
          target.kind === "critique"
            ? { type: "string", minLength: 880 }
            : { type: "string", minLength: 3 }
        ]))
      }
    }
  };
}

export function validateFieldDisjointRepairOutput(output, packet) {
  const topLevelKeys = [
    "schemaVersion", "protocolId", "contextIndex", "debateNumber", "debateId",
    "shardId", "assessmentModel", "completedAt", "corrections"
  ];
  exactKeys(output, topLevelKeys, "repair output");
  assertV4(
    output.schemaVersion === OUTPUT_VERSION && output.protocolId === PROTOCOL_ID &&
      output.contextIndex === packet.contextIndex &&
      output.debateNumber === packet.debateNumber && output.debateId === packet.debateId &&
      output.shardId === packet.shardId && output.assessmentModel === MODEL.label &&
      !Number.isNaN(Date.parse(output.completedAt)),
    "repair identity or provenance mismatch"
  );
  exactKeys(output.corrections, packet.targets.map((target) => target.fieldKey),
    "corrections");
  const labels = [
    "strongest feature:", "principal limitation:", "live burden:", "locked score:"
  ];
  const fieldValidations = [];
  for (const target of packet.targets) {
    const correction = String(output.corrections[target.fieldKey]).trim();
    assertV4(unexpectedCharactersAbsent(correction),
      `${target.field}: unexpected character`);
    assertV4(displayedLanguagePasses(correction),
      `${target.field}: prohibited language`);
    if (target.kind === "quote") {
      const words = wordCount(correction);
      assertV4(target.sourceExcerpt.includes(correction),
        `${target.field}: quote is not an exact source substring`);
      assertV4(words >= 3 && words <= 18,
        `${target.field}: quote outside 3–18 words`);
      fieldValidations.push({ fieldKey: target.fieldKey, field: target.field,
        kind: target.kind, words, characters: correction.length, exactSourceSubstring: true });
      continue;
    }
    const words = wordCount(correction);
    assertV4(words >= 105 && words <= 130,
      `${target.field}: critique outside 105–130 words`);
    assertV4(correction.length >= 880,
      `${target.field}: critique shorter than 880 characters`);
    const sentences = correction.split(/(?<=[.!?])\s+/).filter(Boolean);
    assertV4(sentences.length === 4,
      `${target.field}: critique must contain exactly four sentences`);
    for (let index = 0; index < labels.length; index += 1) {
      assertV4(sentences[index].toLowerCase().startsWith(labels[index]),
        `${target.field}: critique label or order mismatch`);
      assertV4(terminalPunctuationPresent(sentences[index]),
        `${target.field}: critique sentence lacks terminal punctuation`);
    }
    fieldValidations.push({ fieldKey: target.fieldKey, field: target.field,
      kind: target.kind, words, characters: correction.length, sentences: 4 });
  }
  return {
    status: "passed",
    contextIndex: packet.contextIndex,
    debateNumber: packet.debateNumber,
    shardId: packet.shardId,
    correctedFields: packet.targets.length,
    fieldValidations,
    modelAuthoredScores: 0
  };
}
