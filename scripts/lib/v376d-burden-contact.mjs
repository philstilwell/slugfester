import { canonicalJson, validateClosedSchema, validateSchemaValue } from "./v36-decision-cards.mjs";
import { containsScoreField } from "./v37-retired-semantic.mjs";
import { assert } from "./v372-atomic-bundles.mjs";

export const V376D_ROOT = "docs/calibration/v3.7.6/case-disjoint-retired-burden-contact-test";
export const V376D_SOURCE = "docs/calibration/v2.8/development/challenge-input.json";
export const V376D_CORPUS_AUDIT = "docs/calibration/v2.1/corpus-transcript-audit.json";
export const V376D_DEBATES = ["04", "62", "152"];
export const V376D_PASSES = ["pass-a", "pass-b"];

const routes = {
  scienceCon: {
    id: "lennox-atkins-science-explain-everything-2019-con-route-v376d",
    side: "con",
    description: "Every meaningful question is in principle scientifically explainable without supernatural additions.",
    successCriteria: "Natural processes explain physical reality while historical religious claims receive no exemption from ordinary evidence; no non-scientific explanation is required.",
    bridges: [
      { id: "science-con-motion-explanatory-completeness", tier: "motion", description: "Every meaningful question—including questions about origins, consciousness, morality, and purpose—is in principle scientifically explainable without supernatural additions." },
      { id: "science-con-central-natural-sufficiency", tier: "central", description: "Natural causal processes can account for physical reality, life, and consciousness without supernatural agency." },
      { id: "science-con-subsidiary-resurrection", tier: "subsidiary", description: "The regular behavior and decomposition of dead bodies make bodily resurrection physically unavailable without adequate historical evidence for an exception." },
      { id: "science-con-subsidiary-divine-explanation", tier: "subsidiary", description: "Invoking God as the immediate explanation of an observation adds no testable mechanism or explanatory content." }
    ]
  },
  logosCon: {
    id: "pageau-folley-logos-meaning-resurrection-2026-con-route-v376d",
    side: "con",
    description: "Patterns and values can be explained as human and social abstractions, while theological historical or predictive claims remain answerable to ordinary evidence.",
    successCriteria: "Cultural meaning does not require a transcendent source, and claims about observable or historical reality meet ordinary evidential standards.",
    bridges: [
      { id: "logos-con-motion-human-patterns-and-evidence", tier: "motion", description: "Human and social practices explain patterns and values without a transcendent source, while theological historical or predictive claims remain answerable to ordinary evidence." },
      { id: "logos-con-central-social-abstraction", tier: "central", description: "Collective patterns and values emerge from human minds and social practices without a willful transcendent source." },
      { id: "logos-con-subsidiary-scriptural-allegory", tier: "subsidiary", description: "Scripture can retain allegorical, cultural, or moral value without thereby being literally or historically true." },
      { id: "logos-con-subsidiary-empirical-claims", tier: "subsidiary", description: "Theological descriptions or predictions of observable phenomena require empirical support and are open to scientific assessment." }
    ]
  },
  logosPro: {
    id: "pageau-folley-logos-meaning-resurrection-2026-pro-route-v376d",
    side: "pro",
    description: "Patterns and purposive unities are objective features that point upward to Logos, and biblical narratives disclose that structure analogically.",
    successCriteria: "Irreducible purposive organization, governing values, and analogical disclosure support a real higher unity rather than a merely useful abstraction.",
    bridges: [
      { id: "logos-pro-motion-objective-logos", tier: "motion", description: "Objective purposive unities culminate in Logos, and biblical or resurrection narratives truthfully disclose that structure." },
      { id: "logos-pro-central-top-down-unity", tier: "central", description: "Higher-level purposive unities exert real top-down constraint and point to a mind-like transcendent Logos." },
      { id: "logos-pro-subsidiary-analogical-memory", tier: "subsidiary", description: "Biblical narratives can truthfully remember events through deep analogical language rather than only through modern literal description." },
      { id: "logos-pro-subsidiary-governing-values", tier: "subsidiary", description: "The values a community celebrates structure its action and function as real governing gods or purposes." }
    ]
  },
  creatorCon: {
    id: "knechtle-aron-ra-god-existence-2023-con-route-v376d",
    side: "con",
    description: "Natural properties, evolution, social cooperation, and evidence-based inquiry explain reality without a designer or divine lawgiver.",
    successCriteria: "Logic, morality, and natural order remain intelligible without a deity, and religious assertions add no verified explanatory necessity.",
    bridges: [
      { id: "creator-con-motion-natural-sufficiency", tier: "motion", description: "Natural properties, evolution, social cooperation, and evidence-based inquiry explain reality without any designer or divine lawgiver." },
      { id: "creator-con-central-natural-order", tier: "central", description: "Observed natural processes sufficiently explain complexity and order without design." },
      { id: "creator-con-subsidiary-logic", tier: "subsidiary", description: "Logical and mathematical relations hold independently of whether any deity exists." },
      { id: "creator-con-subsidiary-morality", tier: "subsidiary", description: "Moral judgment and social cooperation do not require a divine lawgiver, and religious dogma can rationalize conduct already recognized as wrong." }
    ]
  },
  creatorPro: {
    id: "knechtle-aron-ra-god-existence-2023-pro-route-v376d",
    side: "pro",
    description: "A mind-like creator best explains the universe's intelligibility, objective logic and mathematics, biological information, and moral obligation.",
    successCriteria: "Natural processes within space and time do not explain their own origin or the objective rational and moral structure presupposed by inquiry.",
    bridges: [
      { id: "creator-pro-motion-mind-like-ground", tier: "motion", description: "A mind-like creator best explains cosmic origin, biological information, objective logic and mathematics, and moral obligation." },
      { id: "creator-pro-central-origin", tier: "central", description: "The universe requires an originating cause beyond the natural processes operating within space and time." },
      { id: "creator-pro-subsidiary-logic", tier: "subsidiary", description: "Objective laws of logic and mathematics require a mind-like ground rather than arising from matter alone." },
      { id: "creator-pro-subsidiary-morality", tier: "subsidiary", description: "Objective moral obligations require a transcendent moral lawgiver rather than only social agreement." }
    ]
  }
};

export const V376D_CASES = [
  { debateNumber: "04", sourceCaseId: "v28-dev-04-05", route: routes.scienceCon, fixture: { polarity: "support", bridgeId: "science-con-subsidiary-resurrection" } },
  { debateNumber: "04", sourceCaseId: "v28-dev-04-06", route: routes.scienceCon, fixture: { polarity: "attack", bridgeId: "science-con-subsidiary-resurrection" } },
  { debateNumber: "04", sourceCaseId: "v28-dev-04-10", route: routes.scienceCon, fixture: null },
  { debateNumber: "04", sourceCaseId: "v28-dev-04-11", route: routes.scienceCon, fixture: { polarity: "attack", bridgeId: "science-con-motion-explanatory-completeness" } },
  { debateNumber: "62", sourceCaseId: "v28-dev-62-06", route: routes.logosCon, fixture: { polarity: "support", bridgeId: "logos-con-subsidiary-scriptural-allegory" } },
  { debateNumber: "62", sourceCaseId: "v28-dev-62-07", route: routes.logosPro, fixture: { polarity: "support", bridgeId: "logos-pro-subsidiary-analogical-memory" } },
  { debateNumber: "62", sourceCaseId: "v28-dev-62-08", route: routes.logosCon, fixture: { polarity: "support", bridgeId: "logos-con-subsidiary-empirical-claims" } },
  { debateNumber: "62", sourceCaseId: "v28-dev-62-12", route: routes.logosPro, fixture: { polarity: "support", bridgeId: "logos-pro-subsidiary-governing-values" } },
  { debateNumber: "152", sourceCaseId: "v28-dev-152-06", route: routes.creatorCon, fixture: { polarity: "support", bridgeId: "creator-con-subsidiary-logic" } },
  { debateNumber: "152", sourceCaseId: "v28-dev-152-08", route: routes.creatorPro, fixture: { polarity: "attack", bridgeId: "creator-pro-subsidiary-morality" } },
  { debateNumber: "152", sourceCaseId: "v28-dev-152-09", route: routes.creatorPro, fixture: { polarity: "support", bridgeId: "creator-pro-central-origin" } },
  { debateNumber: "152", sourceCaseId: "v28-dev-152-11", route: routes.creatorPro, fixture: null }
];

export function makeV376DSchema(packet) {
  const optionIds = [...new Set(packet.bundles.flatMap((bundle) => bundle.candidates.map((item) => item.optionId)))];
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `slugfester-v376d-${packet.reviewerPass}-${packet.debateNumber}`,
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "debateNumber", "reviewerPass", "bundles"],
    properties: {
      schemaVersion: { type: "string", const: "3.7.6-disjoint-burden-contact-output" },
      debateNumber: { type: "string", const: packet.debateNumber },
      reviewerPass: { type: "string", const: packet.reviewerPass },
      bundles: { type: "array", minItems: packet.bundles.length, maxItems: packet.bundles.length, items: { type: "object", additionalProperties: false, required: ["bundleId", "optionId", "evidenceText", "rationale"], properties: { bundleId: { type: "string" }, optionId: { type: "string", enum: optionIds }, evidenceText: { type: "string", minLength: 1 }, rationale: { type: "string", minLength: 120 } } } }
    }
  };
}

export function validateV376DOutput(output, packet, schema) {
  validateSchemaValue(validateClosedSchema(schema, `${packet.reviewerPass}.${packet.debateNumber}.schema`), output, "disjointBurdenContactOutput");
  assert(output.schemaVersion === "3.7.6-disjoint-burden-contact-output" && output.debateNumber === packet.debateNumber && output.reviewerPass === packet.reviewerPass, "output identity invalid");
  assert(output.bundles.length === packet.bundles.length && !containsScoreField(output), "output count or score prohibition invalid");
  for (let index = 0; index < packet.bundles.length; index += 1) {
    const expected = packet.bundles[index], actual = output.bundles[index];
    assert(actual.bundleId === expected.bundleId && expected.candidates.some((item) => item.optionId === actual.optionId), `${expected.bundleId}: option identity invalid`);
    const start = expected.sourceExcerpt.indexOf(actual.evidenceText);
    assert(start >= 0 && expected.sourceExcerpt.indexOf(actual.evidenceText, start + 1) === -1, `${expected.bundleId}: evidence absent or nonunique`);
    assert(actual.rationale.trim().length >= 120, `${expected.bundleId}: rationale too short`);
  }
}

export function v376dCoordinate(sourceCaseId) {
  return sourceCaseId.replace(/^v28-dev-/, "");
}

export { assert, canonicalJson };
