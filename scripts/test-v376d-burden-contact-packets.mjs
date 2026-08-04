#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V376D_CASES, V376D_DEBATES, V376D_PASSES, V376D_ROOT, assert, canonicalJson, validateV376DOutput } from "./lib/v376d-burden-contact.mjs";

const root = process.cwd(), shouldWrite = process.argv.includes("--write"), readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const mapping = await readJson(`${V376D_ROOT}/sealed-option-map.json`), audit = await readJson(`${V376D_ROOT}/source-audit.json`);
let contexts = 0, candidatePositionsCounterbalanced = true;
const expected = { none: 0, support: 0, attack: 0, motion: 0, central: 0, subsidiary: 0 };
for (const definition of V376D_CASES) {
  if (definition.fixture === null) expected.none += 1;
  else { expected[definition.fixture.polarity] += 1; expected[definition.route.bridges.find((item) => item.id === definition.fixture.bridgeId).tier] += 1; }
}
for (const reviewerPass of V376D_PASSES) for (const debateNumber of V376D_DEBATES) {
  const packet = await readJson(`${V376D_ROOT}/packets/${reviewerPass}/debate-${debateNumber}.json`), schema = await readJson(`${V376D_ROOT}/schemas/${reviewerPass}/debate-${debateNumber}.schema.json`);
  assert(packet.allSpeakerAttributionConfidenceHigh && packet.bundles.length === 4, `${reviewerPass}.${debateNumber}: packet balance invalid`);
  assert(!canonicalJson(packet).includes("matchesProvisionalReference") && !canonicalJson(packet).includes("semanticTuple"), `${reviewerPass}.${debateNumber}: sealed reference leaked`);
  const output = { schemaVersion: "3.7.6-disjoint-burden-contact-output", debateNumber, reviewerPass, bundles: packet.bundles.map((bundle) => {
    const mapped = mapping.passes[reviewerPass][bundle.bundleId], selected = mapped.options.find((item) => item.matchesProvisionalReference);
    assert(mapped.options.length === 9 && mapped.options.filter((item) => item.matchesProvisionalReference).length === 1, `${reviewerPass}.${bundle.bundleId}: candidate coverage invalid`);
    const values = mapped.options.map((item) => item.semanticTuple);
    assert(values.filter((item) => item.burdenContact === null).length === 1 && values.filter((item) => item.burdenContact?.polarity === "support").length === 4 && values.filter((item) => item.burdenContact?.polarity === "attack").length === 4, `${reviewerPass}.${bundle.bundleId}: composite universe invalid`);
    assert(bundle.decisionContext.route.bridges.every((bridge) => bridge.description.length >= 80 && !/narrower evidential or conceptual consideration/i.test(bridge.description)), `${reviewerPass}.${bundle.bundleId}: proposition-bearing bridge invalid`);
    const counterpart = mapping.passes[reviewerPass === "pass-a" ? "pass-b" : "pass-a"][bundle.bundleId], selectedCounterpart = counterpart.options.find((item) => item.matchesProvisionalReference);
    if (selected.optionId === selectedCounterpart.optionId) candidatePositionsCounterbalanced = false;
    assert(canonicalJson(values.map(canonicalJson).sort()) === canonicalJson(counterpart.options.map((item) => canonicalJson(item.semanticTuple)).sort()), `${reviewerPass}.${bundle.bundleId}: candidate universe mismatch`);
    return { bundleId: bundle.bundleId, optionId: selected.optionId, evidenceText: bundle.sourceExcerpt, rationale: "The exact excerpt proposition supplies a reason for or against this stated bridge, fixing contact, polarity, and tier as one composite; shared topic, speaker side, the motion default, and the nearest alternative are excluded." };
  }) };
  validateV376DOutput(output, packet, schema); contexts += 1;
}
assert(candidatePositionsCounterbalanced, "provisional-reference positions were not counterbalanced");
assert(audit.totals.caseCount === 12 && audit.totals.developmentOverlapCoordinates === 0 && audit.totals.uniqueLocalEventMatches === 12 && audit.totals.multiSpeakerDebates === 0, "source audit invalid");
assert(expected.none === 2 && expected.support === 7 && expected.attack === 3 && expected.motion === 1 && expected.central === 1 && expected.subsidiary === 8, "provisional category balance invalid");
const fixture = { schemaVersion: "3.7.6-disjoint-burden-contact-dry-fixture", passed: true, retiredCases: true, caseDisjointFromV376Development: true, dyadicOnly: true, initialContextCount: contexts, compositeCaseCount: V376D_CASES.length, casesPerDebate: 4, candidateCountPerCase: 9, provisionalCategoryBalance: expected, explicitNoContactCandidate: true, supportAttackPolarityExplicit: true, propositionBearingBridges: true, motionCompleteConclusionRequired: true, localTranscriptMatches: audit.totals.uniqueLocalEventMatches, requiredAudioVerifications: audit.totals.requiredAudioVerifications, completedAudioVerifications: audit.totals.completedAudioVerifications, candidatePositionsCounterbalanced, modelContextsExecuted: 0 };
if (shouldWrite) { await mkdir(path.resolve(root, V376D_ROOT), { recursive: true }); await writeFile(path.resolve(root, V376D_ROOT, "dry-fixture.json"), `${JSON.stringify(fixture, null, 2)}\n`); }
console.log(JSON.stringify(fixture, null, 2));
