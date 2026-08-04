#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V376_DEBATES, V376_ROOT, assert, canonicalJson, validateV376Output } from "./lib/v376-burden-contact.mjs";
import { adjudicationOption, compareV376Outputs, makeV376AdjudicationArtifacts, semanticWinner } from "./lib/v376-execution.mjs";

const root = process.cwd(), shouldWrite = process.argv.includes("--write"), readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const mapping = await readJson(`${V376_ROOT}/sealed-option-map.json`);
const forcedDisputeByDebate = { "62": "burden-contact-62-04", "154": "burden-contact-154-15", "185": "burden-contact-185-05" };
let disputes = 0, adjudicationContexts = 0, resolved = 0, noContactDisputeVerified = false, polarityDisputeVerified = false;

for (let debateIndex = 0; debateIndex < V376_DEBATES.length; debateIndex += 1) {
  const debateNumber = V376_DEBATES[debateIndex], packetA = await readJson(`${V376_ROOT}/packets/pass-a/debate-${debateNumber}.json`), packetB = await readJson(`${V376_ROOT}/packets/pass-b/debate-${debateNumber}.json`), schemaA = await readJson(`${V376_ROOT}/schemas/pass-a/debate-${debateNumber}.schema.json`), schemaB = await readJson(`${V376_ROOT}/schemas/pass-b/debate-${debateNumber}.schema.json`), forcedBundleId = forcedDisputeByDebate[debateNumber];
  const selections = (reviewerPass, packet, forceAlternative) => packet.bundles.map((bundle) => {
    const options = mapping.passes[reviewerPass][bundle.bundleId].options, fixture = options.find((item) => item.matchesDesignFixture);
    let selected = fixture;
    if (forceAlternative && bundle.bundleId === forcedBundleId) {
      selected = debateNumber === "154" ? options.find((item) => item.semanticTuple.burdenContact !== null) : options.find((item) => item.semanticTuple.burdenContact?.polarity && item.semanticTuple.burdenContact.polarity !== fixture.semanticTuple.burdenContact?.polarity);
    }
    return { bundleId: bundle.bundleId, optionId: selected.optionId, evidenceText: bundle.sourceExcerpt, rationale: "The excerpt proposition is matched against the bridge claim; exact contact and polarity determine this synthetic composite, while topic overlap, motion promotion, and the nearest alternative are expressly excluded." };
  });
  const outputA = { schemaVersion: "3.7.6-burden-contact-output", debateNumber, reviewerPass: "pass-a", bundles: selections("pass-a", packetA, false) }, outputB = { schemaVersion: "3.7.6-burden-contact-output", debateNumber, reviewerPass: "pass-b", bundles: selections("pass-b", packetB, true) };
  validateV376Output(outputA, packetA, schemaA); validateV376Output(outputB, packetB, schemaB);
  const comparisons = compareV376Outputs(mapping, outputA, outputB);
  assert(comparisons.filter((item) => !item.agreed).length === 1, `${debateNumber}: synthetic dispute count invalid`);
  const artifacts = makeV376AdjudicationArtifacts(debateNumber, packetA, comparisons, mapping, debateIndex * 5);
  assert(artifacts.packet.bundles.length === 1 && artifacts.map.bundles.length === 1, `${debateNumber}: pass-c scope invalid`);
  assert(!canonicalJson(artifacts.packet).includes("semanticTuple") && !canonicalJson(artifacts.packet).includes("matchesDesignFixture"), `${debateNumber}: sealed fixture leaked`);
  const disputed = comparisons.find((item) => !item.agreed), passCOption = artifacts.map.bundles[0].options.find((item) => canonicalJson(item.semanticTuple) === canonicalJson(disputed.passA));
  const passCOutput = { schemaVersion: "3.7.6-burden-contact-output", debateNumber, reviewerPass: "pass-c", bundles: [{ bundleId: disputed.bundleId, optionId: passCOption.optionId, evidenceText: artifacts.packet.bundles[0].sourceExcerpt, rationale: "The excerpt proposition is matched against the bridge claim; exact contact and polarity resolve this synthetic dispute, while topic overlap, motion promotion, and the nearest alternative are expressly excluded." }] };
  validateV376Output(passCOutput, artifacts.packet, artifacts.schema);
  const passC = adjudicationOption({ debates: { [debateNumber]: artifacts.map } }, debateNumber, disputed.bundleId, passCOption.optionId).semanticTuple;
  assert(semanticWinner([disputed.passA, disputed.passB, passC])?.votes === 2, `${debateNumber}: two-vote resolution failed`);
  if (disputed.passA.burdenContact === null || disputed.passB.burdenContact === null) noContactDisputeVerified = true;
  if (disputed.passA.burdenContact?.polarity !== disputed.passB.burdenContact?.polarity) polarityDisputeVerified = true;
  disputes += 1; adjudicationContexts += 1; resolved += 1;
}
assert(noContactDisputeVerified && polarityDisputeVerified, "contact and polarity dispute branches must both be covered");
const fixture = { schemaVersion: "3.7.6-execution-dry-fixture", passed: true, modelContextsExecuted: 0, syntheticInitialContexts: 6, syntheticDisputedCompositeCases: disputes, syntheticAdjudicationContexts: adjudicationContexts, disputeOnlyPacketScopeVerified: true, noContactDisputeVerified, polarityDisputeVerified, sealedFixtureLeakage: 0, twoVoteResolutions: resolved };
if (shouldWrite) await writeFile(path.resolve(root, V376_ROOT, "execution-dry-fixture.json"), `${JSON.stringify(fixture, null, 2)}\n`);
console.log(JSON.stringify(fixture, null, 2));
