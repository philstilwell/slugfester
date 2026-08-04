import { readFile } from "node:fs/promises";
import path from "node:path";
import { assert, canonicalJson, validateClosedSchema, validateSchemaValue } from "./v36-decision-cards.mjs";
import { containsScoreField } from "./v37-retired-semantic.mjs";

export const V371_ROOT = "docs/calibration/v3.7.1/gold-blind-benchmark-audit";
export const V371_DEBATES = ["62", "154", "185"];
export const V371_INITIAL_PASSES = ["pass-a", "pass-b"];
export const V371_MODEL = { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high" };
export const V371_AUDIT_SOURCE = "docs/calibration/v3.7/retired-semantic-card-test/gold-audit-disagreements.json";

export const readJson = async (root, file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));

export function optionValues(dispute) {
  const values = [];
  for (const value of [dispute.retiredExpected, dispute.terra, dispute.sol]) {
    if (!values.some((item) => canonicalJson(item) === canonicalJson(value))) values.push(value);
  }
  return values;
}

export function questionFor(dispute) {
  const field = dispute.fieldPath;
  if (field === "example.classification") return "Which example classification is licensed by the response language?";
  if (field.startsWith("components.")) return "Which contact mode is licensed for this indispensable target component?";
  if (field === "contrary.classification") return "Which contrary-material classification follows from the component decisions and response language?";
  if (field === "defect.type") return "Which eligible diagnostic defect, if any, is explicitly identified?";
  if (field === "consequence.relationKind") return "Which relation kind explicitly connects the diagnostic defect to its stated consequence?";
  if (field === "malformedDemand.explained") return "Does the response explicitly explain that the governing demand is malformed?";
  if (field === "replacementDemand.stated") return "Does the response explicitly state a replacement governing demand?";
  if (field === "relationKind") return "Which relation kind explicitly connects the reframe clauses?";
  if (field === "candidateSelection") return "Which displayed burden candidate is actually advanced by the response?";
  throw new Error(`${dispute.key}: unsupported audit field`);
}

export function semanticOptionMap(mapping, debateNumber, reviewerPass) {
  const debate = mapping.passes[reviewerPass][debateNumber];
  return new Map(debate.decisions.flatMap((decision) => decision.options.map((option) => [
    `${decision.auditId}::${option.optionId}`,
    option.semanticValue
  ])));
}

export function validateAuditOutput(output, packet, schema) {
  validateSchemaValue(validateClosedSchema(schema, `${packet.reviewerPass}.${packet.debateNumber}.schema`), output, "auditOutput");
  assert(output.schemaVersion === "3.7.1-audit-output", "audit output schemaVersion invalid");
  assert(output.debateNumber === packet.debateNumber && output.reviewerPass === packet.reviewerPass, "audit output identity invalid");
  assert(Array.isArray(output.decisions) && output.decisions.length === packet.decisions.length, "audit output decision count invalid");
  assert(!containsScoreField(output), "audit output contains prohibited score field");
  for (let index = 0; index < packet.decisions.length; index += 1) {
    const expected = packet.decisions[index], actual = output.decisions[index];
    assert(actual.auditId === expected.auditId, `${expected.auditId}: identity or order mismatch`);
    assert(expected.candidates.some((candidate) => candidate.optionId === actual.optionId), `${expected.auditId}: option is not in packet`);
    assert(typeof actual.evidenceText === "string" && actual.evidenceText.length > 0, `${expected.auditId}: evidence missing`);
    const start = expected.sourceExcerpt.indexOf(actual.evidenceText);
    assert(start >= 0, `${expected.auditId}: evidence absent from sourceExcerpt`);
    assert(expected.sourceExcerpt.indexOf(actual.evidenceText, start + 1) === -1, `${expected.auditId}: evidence is not unique in sourceExcerpt`);
    assert(typeof actual.rationale === "string" && actual.rationale.trim().length >= 80, `${expected.auditId}: rationale too short`);
  }
  return output;
}

export function makeAuditSchema(packet) {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-v371-${packet.reviewerPass}-${packet.debateNumber}`,
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "debateNumber", "reviewerPass", "decisions"],
    properties: {
      schemaVersion: { type: "string", const: "3.7.1-audit-output" },
      debateNumber: { type: "string", const: packet.debateNumber },
      reviewerPass: { type: "string", const: packet.reviewerPass },
      decisions: {
        type: "array",
        minItems: packet.decisions.length,
        maxItems: packet.decisions.length,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["auditId", "optionId", "evidenceText", "rationale"],
          properties: {
            auditId: { type: "string" },
            optionId: { type: "string", enum: ["option-1", "option-2", "option-3"] },
            evidenceText: { type: "string", minLength: 1 },
            rationale: { type: "string", minLength: 80 }
          }
        }
      }
    }
  };
}

export { assert, canonicalJson };
