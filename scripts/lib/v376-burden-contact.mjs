import { canonicalJson, validateClosedSchema, validateSchemaValue } from "./v36-decision-cards.mjs";
import { containsScoreField } from "./v37-retired-semantic.mjs";
import { assert } from "./v372-atomic-bundles.mjs";

export const V376_ROOT = "docs/calibration/v3.7.6/burden-contact-decomposition-smoke";
export const V376_DEBATES = ["62", "154", "185"];
export const V376_PASSES = ["pass-a", "pass-b"];
export const V376_CASES = [
  { debateNumber: "62", caseId: "v291-dev-62-04", fixture: { polarity: "support", bridgeId: "pageau-folley-logos-meaning-resurrection-2026-con-central" } },
  { debateNumber: "62", caseId: "v291-dev-62-09", fixture: { polarity: "support", bridgeId: "pageau-folley-logos-meaning-resurrection-2026-pro-subsidiary-symbolic-meaning" } },
  { debateNumber: "154", caseId: "v291-dev-154-08", fixture: { polarity: "support", bridgeId: "koukl-oconnor-kanojia-nonbelief-harm-2025-con-subsidiary-conversion" } },
  { debateNumber: "154", caseId: "v291-dev-154-12", fixture: { polarity: "support", bridgeId: "koukl-oconnor-kanojia-nonbelief-harm-2025-con-subsidiary-dharma" } },
  { debateNumber: "154", caseId: "v291-dev-154-15", fixture: null },
  { debateNumber: "185", caseId: "v291-dev-185-05", fixture: { polarity: "attack", bridgeId: "con-central-sourcehood" } },
  { debateNumber: "185", caseId: "v291-dev-185-07", fixture: { polarity: "attack", bridgeId: "con-central-sourcehood" } },
  { debateNumber: "185", caseId: "v291-dev-185-08", fixture: { polarity: "attack", bridgeId: "pro-motion-responsibility" } }
];

export function makeV376Schema(packet) {
  const optionIds = [...new Set(packet.bundles.flatMap((bundle) => bundle.candidates.map((item) => item.optionId)))];
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-v376-${packet.reviewerPass}-${packet.debateNumber}`,
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "debateNumber", "reviewerPass", "bundles"],
    properties: {
      schemaVersion: { type: "string", const: "3.7.6-burden-contact-output" },
      debateNumber: { type: "string", const: packet.debateNumber },
      reviewerPass: { type: "string", const: packet.reviewerPass },
      bundles: { type: "array", minItems: packet.bundles.length, maxItems: packet.bundles.length, items: { type: "object", additionalProperties: false, required: ["bundleId", "optionId", "evidenceText", "rationale"], properties: { bundleId: { type: "string" }, optionId: { type: "string", enum: optionIds }, evidenceText: { type: "string", minLength: 1 }, rationale: { type: "string", minLength: 120 } } } }
    }
  };
}

export function validateV376Output(output, packet, schema) {
  validateSchemaValue(validateClosedSchema(schema, `${packet.reviewerPass}.${packet.debateNumber}.schema`), output, "burdenContactOutput");
  assert(output.schemaVersion === "3.7.6-burden-contact-output" && output.debateNumber === packet.debateNumber && output.reviewerPass === packet.reviewerPass, "output identity invalid");
  assert(output.bundles.length === packet.bundles.length && !containsScoreField(output), "output count or score prohibition invalid");
  for (let index = 0; index < packet.bundles.length; index += 1) {
    const expected = packet.bundles[index], actual = output.bundles[index];
    assert(actual.bundleId === expected.bundleId && expected.candidates.some((item) => item.optionId === actual.optionId), `${expected.bundleId}: option identity invalid`);
    const start = expected.sourceExcerpt.indexOf(actual.evidenceText);
    assert(start >= 0 && expected.sourceExcerpt.indexOf(actual.evidenceText, start + 1) === -1, `${expected.bundleId}: evidence absent or nonunique`);
    assert(actual.rationale.trim().length >= 120, `${expected.bundleId}: rationale too short`);
  }
}

export { assert, canonicalJson };
