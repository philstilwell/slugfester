import { canonicalJson, validateClosedSchema, validateSchemaValue } from "./v36-decision-cards.mjs";
import { containsScoreField } from "./v37-retired-semantic.mjs";
import { assert } from "./v372-atomic-bundles.mjs";

export const V374_ROOT = "docs/calibration/v3.7.4/disjoint-retired-atomic-bundle-test";
export const V374_MANIFEST = `${V374_ROOT}/gate-manifest.json`;
export const V374_DEBATES = ["62", "154", "185"];
export const V374_PASSES = ["pass-a", "pass-b"];
export const V374_MODEL = { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high" };
export const V374_CASE_IDS = ["v291-dev-62-07", "v291-dev-154-09", "v291-dev-154-12", "v291-dev-154-14", "v291-dev-185-07"];
export const V374_BUNDLES = [
  { bundleId: "target-62-07-components", debateNumber: "62", caseId: "v291-dev-62-07", family: "target", kind: "target-components" },
  { bundleId: "diagnostic-62-07", debateNumber: "62", caseId: "v291-dev-62-07", family: "diagnostic", kind: "diagnostic-defect" },
  { bundleId: "reframe-62-07", debateNumber: "62", caseId: "v291-dev-62-07", family: "reframe", kind: "reframe" },
  { bundleId: "burden-62-07", debateNumber: "62", caseId: "v291-dev-62-07", family: "burden", kind: "burden" },
  { bundleId: "target-154-09-components", debateNumber: "154", caseId: "v291-dev-154-09", family: "target", kind: "target-components" },
  { bundleId: "diagnostic-154-09", debateNumber: "154", caseId: "v291-dev-154-09", family: "diagnostic", kind: "diagnostic-defect" },
  { bundleId: "diagnostic-154-12", debateNumber: "154", caseId: "v291-dev-154-12", family: "diagnostic", kind: "diagnostic-linked" },
  { bundleId: "target-154-14-components", debateNumber: "154", caseId: "v291-dev-154-14", family: "target", kind: "target-components" },
  { bundleId: "target-185-07-components", debateNumber: "185", caseId: "v291-dev-185-07", family: "target", kind: "target-components" },
  { bundleId: "diagnostic-185-07", debateNumber: "185", caseId: "v291-dev-185-07", family: "diagnostic", kind: "diagnostic-defect" },
  { bundleId: "reframe-185-07", debateNumber: "185", caseId: "v291-dev-185-07", family: "reframe", kind: "reframe" },
  { bundleId: "burden-185-07", debateNumber: "185", caseId: "v291-dev-185-07", family: "burden", kind: "burden" }
];

export function makeV374Schema(packet) {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-v374-${packet.reviewerPass}-${packet.debateNumber}`,
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "debateNumber", "reviewerPass", "bundles"],
    properties: {
      schemaVersion: { type: "string", const: "3.7.4-atomic-bundle-output" },
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
            bundleId: { type: "string" },
            optionId: { type: "string", enum: ["option-1", "option-2", "option-3", "option-4"] },
            evidenceText: { type: "string", minLength: 1 },
            rationale: { type: "string", minLength: 80 }
          }
        }
      }
    }
  };
}

export function validateV374Output(output, packet, schema) {
  validateSchemaValue(validateClosedSchema(schema, `${packet.reviewerPass}.${packet.debateNumber}.schema`), output, "atomicOutput");
  assert(output.schemaVersion === "3.7.4-atomic-bundle-output" && output.debateNumber === packet.debateNumber && output.reviewerPass === packet.reviewerPass, "atomic output identity invalid");
  assert(Array.isArray(output.bundles) && output.bundles.length === packet.bundles.length, "atomic bundle count invalid");
  assert(!containsScoreField(output), "atomic output contains prohibited score field");
  for (let index = 0; index < packet.bundles.length; index += 1) {
    const expected = packet.bundles[index];
    const actual = output.bundles[index];
    assert(actual.bundleId === expected.bundleId, `${expected.bundleId}: identity or order mismatch`);
    assert(expected.candidates.some((item) => item.optionId === actual.optionId), `${expected.bundleId}: option unavailable`);
    const start = expected.sourceExcerpt.indexOf(actual.evidenceText);
    assert(start >= 0 && expected.sourceExcerpt.indexOf(actual.evidenceText, start + 1) === -1, `${expected.bundleId}: evidence absent or nonunique`);
    assert(actual.rationale.trim().length >= 80, `${expected.bundleId}: rationale too short`);
  }
  return output;
}

export function semanticOption(mapping, reviewerPass, bundleId, optionId) {
  const option = mapping.passes?.[reviewerPass]?.[bundleId]?.options?.find((item) => item.optionId === optionId);
  assert(option, `${reviewerPass}.${bundleId}.${optionId}: sealed option missing`);
  return option;
}

export function adjudicationSemanticOption(mapping, debateNumber, bundleId, optionId) {
  const option = mapping.debates?.[debateNumber]?.bundles?.find((item) => item.bundleId === bundleId)?.options?.find((item) => item.optionId === optionId);
  assert(option, `pass-c.${debateNumber}.${bundleId}.${optionId}: adjudication option missing`);
  return option;
}

export function semanticWinner(votes) {
  const counts = [];
  for (const value of votes.filter((item) => item !== null && item !== undefined)) {
    const key = canonicalJson(value);
    const found = counts.find((item) => item.key === key);
    if (found) found.votes += 1;
    else counts.push({ key, value, votes: 1 });
  }
  counts.sort((left, right) => right.votes - left.votes || left.key.localeCompare(right.key));
  return counts[0]?.votes >= 2 ? counts[0] : null;
}

export function matchesV374Retired(mapping, bundleId, semanticTuple) {
  const option = mapping.passes?.["pass-a"]?.[bundleId]?.options?.find((item) => canonicalJson(item.semanticTuple) === canonicalJson(semanticTuple));
  assert(option, `${bundleId}: semantic tuple absent from sealed universe`);
  return option.matchesRetiredExpected;
}

export function compareV374Outputs(mapping, outputA, outputB) {
  assert(outputA.debateNumber === outputB.debateNumber, "comparison debate mismatch");
  const bById = new Map(outputB.bundles.map((item) => [item.bundleId, item]));
  return outputA.bundles.map((choiceA) => {
    const choiceB = bById.get(choiceA.bundleId);
    assert(choiceB, `${choiceA.bundleId}: pass-b choice missing`);
    const passA = semanticOption(mapping, "pass-a", choiceA.bundleId, choiceA.optionId).semanticTuple;
    const passB = semanticOption(mapping, "pass-b", choiceB.bundleId, choiceB.optionId).semanticTuple;
    return { bundleId: choiceA.bundleId, debateNumber: outputA.debateNumber, passA, passB, agreed: canonicalJson(passA) === canonicalJson(passB) };
  });
}

export function makeV374AdjudicationArtifacts(debateNumber, passAPacket, comparisons, mapping, rotationSeed = 0) {
  const disputed = comparisons.filter((item) => !item.agreed);
  const sourceById = new Map(passAPacket.bundles.map((item) => [item.bundleId, item]));
  const map = { schemaVersion: "3.7.4-adjudication-option-map", debateNumber, bundles: [] };
  const bundles = disputed.map((comparison, disputeIndex) => {
    const source = sourceById.get(comparison.bundleId);
    assert(source, `${comparison.bundleId}: source bundle missing`);
    const valuesByOption = new Map(source.candidates.map((item) => [item.optionId, item.values]));
    const universe = mapping.passes["pass-a"][comparison.bundleId].options.map((item) => ({ ...item, values: valuesByOption.get(item.optionId) }));
    const shift = (rotationSeed + disputeIndex + 1) % universe.length;
    const ordered = [...universe.slice(shift), ...universe.slice(0, shift)];
    map.bundles.push({ bundleId: comparison.bundleId, options: ordered.map((item, index) => ({ optionId: `option-${index + 1}`, semanticTuple: item.semanticTuple, matchesRetiredExpected: item.matchesRetiredExpected })) });
    return { ...source, candidates: ordered.map((item, index) => ({ optionId: `option-${index + 1}`, values: item.values })) };
  });
  const packet = { schemaVersion: "3.7.4-atomic-bundle-packet", debateNumber, reviewerPass: "pass-c", allSpeakerAttributionConfidenceHigh: passAPacket.allSpeakerAttributionConfidenceHigh, bundles };
  return { packet, schema: makeV374Schema(packet), map };
}

export { assert, canonicalJson };
