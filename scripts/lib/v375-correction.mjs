import { canonicalJson, validateClosedSchema, validateSchemaValue } from "./v36-decision-cards.mjs";
import { containsScoreField } from "./v37-retired-semantic.mjs";
import { assert } from "./v372-atomic-bundles.mjs";

export const V375_ROOT = "docs/calibration/v3.7.5/taxonomy-priority-correction-smoke";
export const V375_DEBATES = ["62", "154", "185"];
export const V375_PASSES = ["pass-a", "pass-b"];
export const V375_BUNDLES = [
  { bundleId: "diagnostic-62-07", debateNumber: "62", caseId: "v291-dev-62-07", family: "diagnostic" },
  { bundleId: "burden-62-07", debateNumber: "62", caseId: "v291-dev-62-07", family: "burden", referenceBridgeId: "pageau-folley-logos-meaning-resurrection-2026-pro-subsidiary" },
  { bundleId: "diagnostic-154-09", debateNumber: "154", caseId: "v291-dev-154-09", family: "diagnostic" },
  { bundleId: "diagnostic-154-15", debateNumber: "154", caseId: "v291-dev-154-15", family: "diagnostic" },
  { bundleId: "burden-154-12", debateNumber: "154", caseId: "v291-dev-154-12", family: "burden", referenceBridgeId: "koukl-oconnor-kanojia-nonbelief-harm-2025-con-central" },
  { bundleId: "diagnostic-185-07", debateNumber: "185", caseId: "v291-dev-185-07", family: "diagnostic" },
  { bundleId: "burden-185-07", debateNumber: "185", caseId: "v291-dev-185-07", family: "burden", referenceBridgeId: "con-central-sourcehood" },
  { bundleId: "burden-185-05", debateNumber: "185", caseId: "v291-dev-185-05", family: "burden", referenceBridgeId: "con-motion-no-basic-desert" }
];

export function makeV375Schema(packet) {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-v375-${packet.reviewerPass}-${packet.debateNumber}`,
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "debateNumber", "reviewerPass", "bundles"],
    properties: {
      schemaVersion: { type: "string", const: "3.7.5-correction-output" },
      debateNumber: { type: "string", const: packet.debateNumber },
      reviewerPass: { type: "string", const: packet.reviewerPass },
      bundles: { type: "array", minItems: packet.bundles.length, maxItems: packet.bundles.length, items: { type: "object", additionalProperties: false, required: ["bundleId", "optionId", "evidenceText", "rationale"], properties: { bundleId: { type: "string" }, optionId: { type: "string", enum: ["option-1", "option-2", "option-3", "option-4"] }, evidenceText: { type: "string", minLength: 1 }, rationale: { type: "string", minLength: 80 } } } }
    }
  };
}

export function validateV375Output(output, packet, schema) {
  validateSchemaValue(validateClosedSchema(schema, `${packet.reviewerPass}.${packet.debateNumber}.schema`), output, "correctionOutput");
  assert(output.schemaVersion === "3.7.5-correction-output" && output.debateNumber === packet.debateNumber && output.reviewerPass === packet.reviewerPass, "output identity invalid");
  assert(output.bundles.length === packet.bundles.length && !containsScoreField(output), "output count or score prohibition invalid");
  for (let index = 0; index < packet.bundles.length; index += 1) {
    const expected = packet.bundles[index], actual = output.bundles[index];
    assert(actual.bundleId === expected.bundleId && expected.candidates.some((item) => item.optionId === actual.optionId), `${expected.bundleId}: option identity invalid`);
    const start = expected.sourceExcerpt.indexOf(actual.evidenceText);
    assert(start >= 0 && expected.sourceExcerpt.indexOf(actual.evidenceText, start + 1) === -1, `${expected.bundleId}: evidence absent or nonunique`);
    assert(actual.rationale.trim().length >= 80, `${expected.bundleId}: rationale too short`);
  }
}

export { assert, canonicalJson };
