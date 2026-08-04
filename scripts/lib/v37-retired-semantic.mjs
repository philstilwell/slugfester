import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  assert, canonicalJson, validateBurdenConflictCard, validateClosedSchema, validateDiagnosticCard,
  validateReframeCard, validateSchemaValue, validateTargetCard
} from "./v36-decision-cards.mjs";

export const V37_GATE_ROOT = "docs/calibration/v3.7/retired-semantic-card-test";
export const V37_FAMILIES = ["target", "diagnostic", "reframe", "burden"];
export const V37_MODELS = {
  terra: { label: "5.6 Terra", slug: "gpt-5.6-terra", reasoningEffort: "high" },
  sol: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high" }
};
export const V37_INPUT_PATHS = [
  "docs/calibration/v3.2/retired-three-debate-test/inputs/pageau-folley-logos-meaning-resurrection-2026.json",
  "docs/calibration/v3.2/retired-three-debate-test/inputs/dennett-caruso-free-will-responsibility-2021.json",
  "docs/calibration/v3.2/retired-three-debate-test/inputs/koukl-oconnor-kanojia-nonbelief-harm-2025.json"
];
export const V37_RETIRED_FIXTURES = "docs/calibration/v3.6.1/decision-card-development/retired-fixtures.json";

const read = (root, file) => readFile(path.resolve(root, file), "utf8");
export async function loadV37Sources(root) {
  const inputs = await Promise.all(V37_INPUT_PATHS.map(async (file) => JSON.parse(await read(root, file))));
  const challenges = new Map(inputs.flatMap((input) => input.cases).map((item) => [item.caseId, item]));
  const retired = JSON.parse(await read(root, V37_RETIRED_FIXTURES));
  const fixtures = new Map(retired.debates.flatMap((debate) => debate.cases).map((item) => [item.caseId, item]));
  return { inputs, challenges, retired, fixtures };
}

export function containsScoreField(value) {
  if (!value || typeof value !== "object") return false;
  if (Object.keys(value).some((key) => /^(score|scores|moveScore|sectionScore|overall|winner)$/i.test(key))) return true;
  return Object.values(value).some(containsScoreField);
}

export function expectedCard(family, fixture, packetCase) {
  if (family === "target") return fixture.targetCard;
  if (family === "diagnostic") return fixture.diagnosticCard;
  if (family === "reframe") return fixture.reframeCard;
  return fixture.burdenPackets.find((item) => item.fieldPath === packetCase.fieldPath)?.card;
}

export function semanticAssertions(family, card) {
  if (family === "target") return [
    { fieldPath: "directTarget.contact", value: card.directTarget.contact },
    ...card.components.map((item) => ({ fieldPath: `components.${item.componentId}.contactMode`, value: item.contactMode })),
    { fieldPath: "example.classification", value: card.example.classification },
    { fieldPath: "scope.relation", value: card.scope.relation },
    { fieldPath: "contrary.classification", value: card.contrary.classification }
  ];
  if (family === "diagnostic") return [
    { fieldPath: "defect.type", value: card.defect.type },
    { fieldPath: "consequence.stated", value: card.consequence.cueText !== null },
    { fieldPath: "consequence.relationKind", value: card.consequence.relationKind }
  ];
  if (family === "reframe") return [
    { fieldPath: "malformedDemand.explained", value: card.malformedCueText !== null },
    { fieldPath: "replacementDemand.stated", value: card.replacementCueText !== null },
    { fieldPath: "relationKind", value: card.relationKind }
  ];
  return [
    { fieldPath: "candidateSelection", value: card.candidateSelection },
    { fieldPath: "qualifyingCue", value: card.qualifyingCue }
  ];
}

export async function validateV37Batch(root, output, packet, schema, family) {
  assert(V37_FAMILIES.includes(family) && packet.family === family, `${family}: packet identity invalid`);
  validateSchemaValue(validateClosedSchema(schema, `${family}.batchSchema`), output, `${family}.batch`);
  assert(output.schemaVersion === "3.7-family-card-batch" && output.family === family, `${family}: output identity invalid`);
  assert(Array.isArray(output.cards) && output.cards.length === packet.cases.length, `${family}: card count mismatch`);
  assert(!containsScoreField(output), `${family}: prohibited score field present`);
  const { challenges, fixtures } = await loadV37Sources(root);
  for (let index = 0; index < packet.cases.length; index += 1) {
    const packetCase = packet.cases[index], card = output.cards[index], challenge = challenges.get(packetCase.caseId), fixture = fixtures.get(packetCase.caseId);
    assert(challenge && fixture && card.caseId === packetCase.caseId && card.moveId === packetCase.moveId, `${family}[${index}]: identity or order mismatch`);
    assert(challenge.sourceExcerpt === packetCase.sourceExcerpt, `${family}[${index}]: source excerpt mismatch`);
    if (family === "target") validateTargetCard(card, challenge);
    else if (family === "diagnostic") validateDiagnosticCard(card, challenge);
    else if (family === "reframe") validateReframeCard(card, challenge);
    else {
      const burdenPacket = fixture.burdenPackets.find((item) => item.fieldPath === packetCase.fieldPath);
      assert(burdenPacket, `${packetCase.caseId}: burden fixture missing`);
      validateBurdenConflictCard(card, { challengeCase: challenge, fieldPath: burdenPacket.fieldPath, candidate1: burdenPacket.candidate1, candidate2: burdenPacket.candidate2 });
    }
  }
  return output;
}

export function compareSemanticBatches(family, actualCards, packetCases, fixtures) {
  const comparisons = [];
  for (let index = 0; index < packetCases.length; index += 1) {
    const packetCase = packetCases[index], actual = actualCards[index], expected = expectedCard(family, fixtures.get(packetCase.caseId), packetCase);
    const actualMap = new Map(semanticAssertions(family, actual).map((item) => [item.fieldPath, item.value]));
    for (const assertion of semanticAssertions(family, expected)) {
      comparisons.push({ family, caseId: packetCase.caseId, fieldPath: assertion.fieldPath, expected: assertion.value, actual: actualMap.get(assertion.fieldPath), matched: canonicalJson(actualMap.get(assertion.fieldPath)) === canonicalJson(assertion.value) });
    }
  }
  return comparisons;
}

export { assert, canonicalJson };
