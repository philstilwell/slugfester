#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V376_CASES, V376_DEBATES, V376_PASSES, V376_ROOT, assert, canonicalJson, validateV376Output } from "./lib/v376-burden-contact.mjs";

const root = process.cwd(), shouldWrite = process.argv.includes("--write"), readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const mapping = await readJson(`${V376_ROOT}/sealed-option-map.json`);
let contexts = 0, candidatePositionsCounterbalanced = true;
for (const reviewerPass of V376_PASSES) for (const debateNumber of V376_DEBATES) {
  const packet = await readJson(`${V376_ROOT}/packets/${reviewerPass}/debate-${debateNumber}.json`), schema = await readJson(`${V376_ROOT}/schemas/${reviewerPass}/debate-${debateNumber}.schema.json`);
  assert(packet.allSpeakerAttributionConfidenceHigh && packet.bundles.length >= 2 && packet.bundles.length <= 3, `${reviewerPass}.${debateNumber}: packet balance invalid`);
  assert(!canonicalJson(packet).includes("matchesDesignFixture") && !canonicalJson(packet).includes("semanticTuple"), `${reviewerPass}.${debateNumber}: sealed fixture leaked`);
  const output = { schemaVersion: "3.7.6-burden-contact-output", debateNumber, reviewerPass, bundles: packet.bundles.map((bundle) => {
    const mapped = mapping.passes[reviewerPass][bundle.bundleId], selected = mapped.options.find((item) => item.matchesDesignFixture);
    assert(mapped.options.filter((item) => item.matchesDesignFixture).length === 1, `${reviewerPass}.${bundle.bundleId}: fixture coverage invalid`);
    const values = mapped.options.map((item) => item.semanticTuple), nullCount = values.filter((item) => item.burdenContact === null).length;
    const supportCount = values.filter((item) => item.burdenContact?.polarity === "support").length, attackCount = values.filter((item) => item.burdenContact?.polarity === "attack").length;
    assert(nullCount === 1 && supportCount === attackCount && values.length === 1 + supportCount + attackCount, `${reviewerPass}.${bundle.bundleId}: composite universe invalid`);
    assert(bundle.decisionContext.speaker.side && bundle.decisionContext.route.side, `${reviewerPass}.${bundle.bundleId}: polarity context missing`);
    assert(bundle.decisionContext.route.bridges.every((bridge) => !/^Support a narrower evidential or conceptual consideration/.test(bridge.description)), `${reviewerPass}.${bundle.bundleId}: generic subsidiary survived`);
    const counterpart = mapping.passes[reviewerPass === "pass-a" ? "pass-b" : "pass-a"][bundle.bundleId];
    const selectedCounterpart = counterpart.options.find((item) => item.matchesDesignFixture);
    if (selected.optionId === selectedCounterpart.optionId) candidatePositionsCounterbalanced = false;
    const universe = values.map(canonicalJson).sort(), otherUniverse = counterpart.options.map((item) => canonicalJson(item.semanticTuple)).sort();
    assert(canonicalJson(universe) === canonicalJson(otherUniverse), `${reviewerPass}.${bundle.bundleId}: candidate universe mismatch`);
    return { bundleId: bundle.bundleId, optionId: selected.optionId, evidenceText: bundle.sourceExcerpt, rationale: "The excerpt proposition is matched against the stated bridge claim; exact contact and its support-or-attack polarity select this composite, while topic overlap, the motion default, and the nearest competing bridge are expressly excluded for the design fixture." };
  }) };
  validateV376Output(output, packet, schema);
  contexts += 1;
}
assert(candidatePositionsCounterbalanced, "design-fixture positions were not counterbalanced");
const fixture = { schemaVersion: "3.7.6-burden-contact-dry-fixture", passed: true, exposedDevelopmentCases: true, initialContextCount: contexts, compositeCaseCount: V376_CASES.length, exposedFailureCases: 3, orthogonalCases: 5, noContactCandidateRequired: true, supportAttackPolarityRequired: true, exactBridgeContactRequired: true, genericSubsidiaryCandidates: 0, allSpeakerAttributionConfidenceHigh: true, candidatePositionsCounterbalanced, modelContextsExecuted: 0 };
if (shouldWrite) { await mkdir(path.resolve(root, V376_ROOT), { recursive: true }); await writeFile(path.resolve(root, V376_ROOT, "dry-fixture.json"), `${JSON.stringify(fixture, null, 2)}\n`); }
console.log(JSON.stringify(fixture, null, 2));
