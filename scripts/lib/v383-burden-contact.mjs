import { containsScoreField } from "./v37-retired-semantic.mjs";
import { assert, canonicalJson, validateClosedSchema, validateSchemaValue } from "./v36-decision-cards.mjs";

export const V383_ROOT = "docs/calibration/v3.8.3/held-out-burden-contact-classification-gate";
export const V383_INVENTORY = "docs/calibration/v3.8.2/held-out-source-preparation-instrumentation-continuation/final-source-inventory.json";
export const V383_SOURCE_ANALYSIS = "docs/calibration/v3.8.2/held-out-source-preparation-instrumentation-continuation/source-preparation-analysis.json";
export const V383_AUDIO_REQUIRED = "docs/calibration/v3.8.2/held-out-source-preparation-instrumentation-continuation/audio-verification-required.json";
export const V383_SOURCE_AUDIT = "docs/calibration/v3.8/held-out-burden-contact-integration-gate/source-audit.json";
export const V383_GATE_MANIFEST = "docs/calibration/v3.8/held-out-burden-contact-integration-gate/gate-manifest.json";
export const V383_WORKFLOW = "docs/assessment-workflow-v3.8.md";
export const V383_RUBRIC = "docs/reassessment-rubric-v3.8.md";
export const V383_MANUAL = `${V383_ROOT}/classification-manual.md`;
export const V383_PREREGISTRATION = `${V383_ROOT}/preregistration.md`;
export const V383_DEBATES = ["103", "55", "161"];
export const V383_PASSES = ["pass-a", "pass-b"];
export const V383_OUTPUT_SCHEMA_VERSION = "3.8.3-heldout-burden-contact-output";

export function buildV383CandidateUniverse(routes) {
  assert(Array.isArray(routes) && routes.length === 2, "candidate universe requires two routes");
  const candidates = [{ burdenContact: null }];
  const bridgeIds = new Set();
  for (const route of routes) {
    assert(["pro", "con"].includes(route.side), `${route.routeId}: invalid route side`);
    assert(Array.isArray(route.bridges) && route.bridges.length === 5, `${route.routeId}: expected five bridges`);
    for (const bridge of route.bridges) {
      assert(!bridgeIds.has(bridge.bridgeId), `${bridge.bridgeId}: duplicate bridge ID`);
      bridgeIds.add(bridge.bridgeId);
      assert(["motion", "central", "subsidiary"].includes(bridge.tier), `${bridge.bridgeId}: invalid tier`);
      for (const polarity of ["support", "attack"]) candidates.push({ burdenContact: { polarity, tier: bridge.tier, bridgeId: bridge.bridgeId } });
    }
  }
  assert(candidates.length === 21, "candidate universe must contain 21 composite states");
  return candidates;
}

export function rotateV383Candidates(candidates, shift) {
  const normalized = ((shift % candidates.length) + candidates.length) % candidates.length;
  return [...candidates.slice(normalized), ...candidates.slice(0, normalized)];
}

export function makeV383Schema(packet) {
  const optionIds = [...new Set(packet.bundles.flatMap((bundle) => bundle.candidates.map((item) => item.optionId)))];
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-v383-${packet.reviewerPass}-${packet.debateNumber}`,
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "debateNumber", "reviewerPass", "bundles"],
    properties: {
      schemaVersion: { type: "string", const: V383_OUTPUT_SCHEMA_VERSION },
      debateNumber: { type: "string", const: packet.debateNumber },
      reviewerPass: { type: "string", const: packet.reviewerPass },
      bundles: {
        type: "array",
        minItems: packet.bundles.length,
        maxItems: packet.bundles.length,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["bundleId", "optionId", "evidenceText", "rationale"],
          properties: {
            bundleId: { type: "string", minLength: 1 },
            optionId: { type: "string", enum: optionIds },
            evidenceText: { type: "string", minLength: 1 },
            rationale: { type: "string", minLength: 160 }
          }
        }
      }
    }
  };
}

export function validateV383Output(output, packet, schema) {
  validateSchemaValue(validateClosedSchema(schema, `${packet.reviewerPass}.${packet.debateNumber}.schema`), output, "v383BurdenContactOutput");
  assert(output.schemaVersion === V383_OUTPUT_SCHEMA_VERSION, "output schema version invalid");
  assert(output.debateNumber === packet.debateNumber && output.reviewerPass === packet.reviewerPass, "output identity invalid");
  assert(output.bundles.length === packet.bundles.length, "output bundle count invalid");
  assert(!containsScoreField(output), "scoring field prohibited");
  for (let index = 0; index < packet.bundles.length; index += 1) {
    const expected = packet.bundles[index];
    const actual = output.bundles[index];
    assert(actual.bundleId === expected.bundleId, `${expected.bundleId}: output order or identity invalid`);
    assert(expected.candidates.some((item) => item.optionId === actual.optionId), `${expected.bundleId}: option identity invalid`);
    const start = expected.atomicExcerpt.indexOf(actual.evidenceText);
    assert(start >= 0 && expected.atomicExcerpt.indexOf(actual.evidenceText, start + 1) === -1, `${expected.bundleId}: evidence absent or nonunique`);
    assert(actual.rationale.trim().length >= 160, `${expected.bundleId}: rationale too short`);
  }
}

export function v383BundleId(debateNumber, moveId) {
  const candidate = moveId.match(/candidate-(\d+)/)?.[1];
  assert(candidate, `${moveId}: candidate coordinate absent`);
  return `heldout-contact-${debateNumber}-${candidate}`;
}

export { assert, canonicalJson };
