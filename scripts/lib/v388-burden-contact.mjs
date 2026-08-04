import { containsScoreField } from "./v37-retired-semantic.mjs";
import { assert, canonicalJson, validateClosedSchema, validateSchemaValue } from "./v36-decision-cards.mjs";

export const V388_CONTACT_ROOT = "docs/calibration/v3.8.8/burden-contact-consensus";
export const V388_CONTACT_DEBATES = ["55", "103", "161"];
export const V388_CONTACT_PASSES = ["pass-a", "pass-b"];
export const V388_CONTACT_INVENTORY = "docs/calibration/v3.8.8/coverage-consensus/final-coverage-inventory.json";
export const V388_CONTACT_SECTION_ANALYSIS = "docs/calibration/v3.8.8/section-weight-consensus/section-weight-consensus-analysis.json";
export const V388_CONTACT_PRIOR_ANALYSIS = "docs/calibration/v3.8.3/held-out-burden-contact-classification-gate/gate-analysis.json";
export const V388_CONTACT_PRIOR_INVENTORY = "docs/calibration/v3.8.2/held-out-source-preparation-instrumentation-continuation/final-source-inventory.json";
export const V388_CONTACT_SOURCE_AUDIT = "docs/calibration/v3.8/held-out-burden-contact-integration-gate/source-audit.json";
export const V388_CONTACT_WORKFLOW = "docs/assessment-workflow-v3.8.md";
export const V388_CONTACT_RUBRIC = "docs/reassessment-rubric-v3.8.md";
export const V388_CONTACT_MANUAL = `${V388_CONTACT_ROOT}/classification-manual.md`;
export const V388_CONTACT_OUTPUT_VERSION = "3.8.8-burden-contact-output";

const string = (extra = {}) => ({ type: "string", ...extra });
const array = (items, extra = {}) => ({ type: "array", items, ...extra });
const closedObject = (properties) => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });

export function buildV388ContactUniverse(routes) {
  assert(Array.isArray(routes) && routes.length === 2, "contact universe requires two routes");
  const candidates = [{ burdenContact: null }];
  const bridgeIds = new Set();
  for (const route of routes) {
    assert(["pro", "con"].includes(route.side), `${route.routeId}: invalid route side`);
    assert(Array.isArray(route.bridges) && route.bridges.length === 5, `${route.routeId}: five bridges required`);
    for (const bridge of route.bridges) {
      assert(!bridgeIds.has(bridge.bridgeId), `${bridge.bridgeId}: duplicate bridge`);
      bridgeIds.add(bridge.bridgeId);
      assert(["motion", "central", "subsidiary"].includes(bridge.tier), `${bridge.bridgeId}: invalid bridge tier`);
      for (const polarity of ["support", "attack"]) candidates.push({ burdenContact: { polarity, tier: bridge.tier, bridgeId: bridge.bridgeId } });
    }
  }
  assert(candidates.length === 21, "contact universe must have 21 complete states");
  return candidates;
}

export function rotateV388ContactUniverse(candidates, shift) {
  const normalized = ((shift % candidates.length) + candidates.length) % candidates.length;
  return [...candidates.slice(normalized), ...candidates.slice(0, normalized)];
}

export const v388ContactBundleId = (debateNumber, moveIndex) => `v388-contact-${debateNumber}-${String(moveIndex + 1).padStart(2, "0")}`;

export function makeV388ContactSchema(packet) {
  const optionIds = [...new Set(packet.bundles.flatMap((bundle) => bundle.candidates.map((candidate) => candidate.optionId)))];
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-v388-contact-${packet.reviewerPass}-${packet.debateNumber}`,
    ...closedObject({
      schemaVersion: string({ const: V388_CONTACT_OUTPUT_VERSION }),
      debateNumber: string({ const: packet.debateNumber }),
      debateId: string({ const: packet.debateId }),
      reviewerPass: string({ const: packet.reviewerPass }),
      reviewerRole: string({ const: "burden-contact-classifier" }),
      bundles: array(closedObject({ bundleId: string({ minLength: 1 }), optionId: string({ enum: optionIds }), evidenceText: string({ minLength: 1 }), rationale: string({ minLength: 160 }) }), { minItems: packet.bundles.length, maxItems: packet.bundles.length })
    })
  };
}

export function validateV388ContactOutput(output, packet, schema) {
  validateSchemaValue(validateClosedSchema(schema, `${packet.reviewerPass}.${packet.debateNumber}.schema`), output, `v388Contact.${packet.reviewerPass}.${packet.debateNumber}`);
  assert(output.schemaVersion === V388_CONTACT_OUTPUT_VERSION && output.debateNumber === packet.debateNumber && output.debateId === packet.debateId && output.reviewerPass === packet.reviewerPass && output.reviewerRole === "burden-contact-classifier", "contact output identity invalid");
  assert(output.bundles.length === packet.bundles.length, "contact bundle count invalid");
  assert(!containsScoreField(output), "contact output contains prohibited score field");
  for (let index = 0; index < packet.bundles.length; index += 1) {
    const expected = packet.bundles[index];
    const actual = output.bundles[index];
    assert(actual.bundleId === expected.bundleId, `${expected.bundleId}: output identity or order invalid`);
    assert(expected.candidates.some((candidate) => candidate.optionId === actual.optionId), `${expected.bundleId}: unknown option`);
    const evidenceStart = expected.atomicExcerpt.indexOf(actual.evidenceText);
    assert(evidenceStart >= 0 && expected.atomicExcerpt.indexOf(actual.evidenceText, evidenceStart + 1) === -1, `${expected.bundleId}: evidence absent or nonunique`);
    assert(actual.rationale.trim().length >= 160, `${expected.bundleId}: rationale too short`);
  }
  return { debateNumber: packet.debateNumber, reviewerPass: packet.reviewerPass, bundles: packet.bundles.length, scoreFields: 0 };
}

export function decodeV388Contact(output, mapping) {
  return output.bundles.map((bundle) => {
    const mapped = mapping[bundle.bundleId];
    assert(mapped, `${bundle.bundleId}: sealed mapping absent`);
    const option = mapped.options.find((candidate) => candidate.optionId === bundle.optionId);
    assert(option, `${bundle.bundleId}: sealed option absent`);
    return { bundleId: bundle.bundleId, moveId: mapped.moveId, semanticTuple: option.semanticTuple };
  });
}

export { assert, canonicalJson, containsScoreField };
