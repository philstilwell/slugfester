import { canonicalJson, validateClosedSchema, validateSchemaValue } from "./v36-decision-cards.mjs";
import { containsScoreField } from "./v37-retired-semantic.mjs";
import { assert } from "./v372-atomic-bundles.mjs";

export const V373_ROOT = "docs/calibration/v3.7.3/atomic-bundle-correction-smoke";
export const V373_DEBATES = ["62", "154", "185"];
export const V373_PASSES = ["pass-a", "pass-b"];

export function makeV373Schema(packet) {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-v373-${packet.reviewerPass}-${packet.debateNumber}`,
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "debateNumber", "reviewerPass", "bundles"],
    properties: {
      schemaVersion: { type: "string", const: "3.7.3-atomic-bundle-output" },
      debateNumber: { type: "string", const: packet.debateNumber },
      reviewerPass: { type: "string", const: packet.reviewerPass },
      bundles: {
        type: "array", minItems: packet.bundles.length, maxItems: packet.bundles.length,
        items: {
          type: "object", additionalProperties: false, required: ["bundleId", "optionId", "evidenceText", "rationale"],
          properties: {
            bundleId: { type: "string" }, optionId: { type: "string", enum: ["option-1", "option-2", "option-3", "option-4"] },
            evidenceText: { type: "string", minLength: 1 }, rationale: { type: "string", minLength: 80 }
          }
        }
      }
    }
  };
}

export function validateV373Output(output, packet, schema) {
  validateSchemaValue(validateClosedSchema(schema, `${packet.reviewerPass}.${packet.debateNumber}.schema`), output, "atomicOutput");
  assert(output.schemaVersion === "3.7.3-atomic-bundle-output" && output.debateNumber === packet.debateNumber && output.reviewerPass === packet.reviewerPass, "atomic output identity invalid");
  assert(Array.isArray(output.bundles) && output.bundles.length === packet.bundles.length, "atomic bundle count invalid");
  assert(!containsScoreField(output), "atomic output contains prohibited score field");
  for (let index = 0; index < packet.bundles.length; index += 1) {
    const expected = packet.bundles[index], actual = output.bundles[index];
    assert(actual.bundleId === expected.bundleId, `${expected.bundleId}: identity or order mismatch`);
    assert(expected.candidates.some((item) => item.optionId === actual.optionId), `${expected.bundleId}: option unavailable`);
    assert(typeof actual.evidenceText === "string" && actual.evidenceText.length > 0, `${expected.bundleId}: evidence missing`);
    const start = expected.sourceExcerpt.indexOf(actual.evidenceText);
    assert(start >= 0 && expected.sourceExcerpt.indexOf(actual.evidenceText, start + 1) === -1, `${expected.bundleId}: evidence absent or nonunique`);
    assert(typeof actual.rationale === "string" && actual.rationale.trim().length >= 80, `${expected.bundleId}: rationale too short`);
  }
  return output;
}

export function cartesian(valueLists) {
  return valueLists.reduce((rows, values) => rows.flatMap((row) => values.map((value) => [...row, value])), [[]]);
}

export { assert, canonicalJson };
