#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V376D_DEBATES, V376D_ROOT, assert, canonicalJson, validateV376DOutput } from "./lib/v376d-burden-contact.mjs";
import { adjudicationV376DOption, compareV376DOutputs, makeV376DAdjudicationArtifacts, v376dSemanticWinner } from "./lib/v376d-execution.mjs";

const root = process.cwd(), shouldWrite = process.argv.includes("--write"), readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const mapping = await readJson(`${V376D_ROOT}/sealed-option-map.json`), forcedDisputeByDebate = { "04": "burden-contact-disjoint-04-10", "62": "burden-contact-disjoint-62-06", "152": "burden-contact-disjoint-152-09" };
let disputes = 0, adjudicationContexts = 0, resolved = 0, noContactDisputeVerified = false, polarityDisputeVerified = false, tierDisputeVerified = false;

for (let debateIndex = 0; debateIndex < V376D_DEBATES.length; debateIndex += 1) {
  const debateNumber = V376D_DEBATES[debateIndex], packetA = await readJson(`${V376D_ROOT}/packets/pass-a/debate-${debateNumber}.json`), packetB = await readJson(`${V376D_ROOT}/packets/pass-b/debate-${debateNumber}.json`), schemaA = await readJson(`${V376D_ROOT}/schemas/pass-a/debate-${debateNumber}.schema.json`), schemaB = await readJson(`${V376D_ROOT}/schemas/pass-b/debate-${debateNumber}.schema.json`), forcedBundleId = forcedDisputeByDebate[debateNumber];
  const selections = (reviewerPass, packet, forceAlternative) => packet.bundles.map((bundle) => {
    const options = mapping.passes[reviewerPass][bundle.bundleId].options, reference = options.find((item) => item.matchesProvisionalReference); let selected = reference;
    if (forceAlternative && bundle.bundleId === forcedBundleId) {
      if (debateNumber === "04") selected = options.find((item) => item.semanticTuple.burdenContact !== null);
      else if (debateNumber === "62") selected = options.find((item) => item.semanticTuple.burdenContact?.bridgeId === reference.semanticTuple.burdenContact?.bridgeId && item.semanticTuple.burdenContact?.polarity !== reference.semanticTuple.burdenContact?.polarity);
      else selected = options.find((item) => item.semanticTuple.burdenContact?.polarity === reference.semanticTuple.burdenContact?.polarity && item.semanticTuple.burdenContact?.tier !== reference.semanticTuple.burdenContact?.tier);
    }
    return { bundleId: bundle.bundleId, optionId: selected.optionId, evidenceText: bundle.sourceExcerpt, rationale: "The exact excerpt proposition fixes contact, polarity, and bridge as one synthetic composite; shared topic, speaker side, motion promotion, and the nearest alternative are expressly excluded." };
  });
  const outputA = { schemaVersion: "3.7.6-disjoint-burden-contact-output", debateNumber, reviewerPass: "pass-a", bundles: selections("pass-a", packetA, false) }, outputB = { schemaVersion: "3.7.6-disjoint-burden-contact-output", debateNumber, reviewerPass: "pass-b", bundles: selections("pass-b", packetB, true) };
  validateV376DOutput(outputA, packetA, schemaA); validateV376DOutput(outputB, packetB, schemaB);
  const comparisons = compareV376DOutputs(mapping, outputA, outputB); assert(comparisons.filter((item) => !item.agreed).length === 1, `${debateNumber}: synthetic dispute count invalid`);
  const artifacts = makeV376DAdjudicationArtifacts(debateNumber, packetA, comparisons, mapping, debateIndex * 5);
  assert(artifacts.packet.bundles.length === 1 && artifacts.map.bundles.length === 1 && !canonicalJson(artifacts.packet).includes("semanticTuple") && !canonicalJson(artifacts.packet).includes("matchesProvisionalReference"), `${debateNumber}: pass-c scope or sealing invalid`);
  const disputed = comparisons.find((item) => !item.agreed), passCOption = artifacts.map.bundles[0].options.find((item) => canonicalJson(item.semanticTuple) === canonicalJson(disputed.passA));
  const passCOutput = { schemaVersion: "3.7.6-disjoint-burden-contact-output", debateNumber, reviewerPass: "pass-c", bundles: [{ bundleId: disputed.bundleId, optionId: passCOption.optionId, evidenceText: artifacts.packet.bundles[0].sourceExcerpt, rationale: "The exact excerpt proposition fixes contact, polarity, and bridge as one synthetic adjudication composite; topic overlap, motion promotion, and the nearest alternative are excluded." }] };
  validateV376DOutput(passCOutput, artifacts.packet, artifacts.schema);
  const passC = adjudicationV376DOption({ debates: { [debateNumber]: artifacts.map } }, debateNumber, disputed.bundleId, passCOption.optionId).semanticTuple;
  assert(v376dSemanticWinner([disputed.passA, disputed.passB, passC])?.votes === 2, `${debateNumber}: two-vote resolution failed`);
  if (disputed.passA.burdenContact === null || disputed.passB.burdenContact === null) noContactDisputeVerified = true;
  if (disputed.passA.burdenContact?.polarity !== disputed.passB.burdenContact?.polarity) polarityDisputeVerified = true;
  if (disputed.passA.burdenContact?.tier !== disputed.passB.burdenContact?.tier) tierDisputeVerified = true;
  disputes += 1; adjudicationContexts += 1; resolved += 1;
}
assert(noContactDisputeVerified && polarityDisputeVerified && tierDisputeVerified, "contact, polarity, and tier dispute branches must be covered");
const fixture = { schemaVersion: "3.7.6-disjoint-execution-dry-fixture", passed: true, modelContextsExecuted: 0, syntheticInitialContexts: 6, syntheticDisputedCompositeCases: disputes, syntheticAdjudicationContexts: adjudicationContexts, disputeOnlyPacketScopeVerified: true, noContactDisputeVerified, polarityDisputeVerified, tierDisputeVerified, sealedReferenceLeakage: 0, twoVoteResolutions: resolved };
if (shouldWrite) await writeFile(path.resolve(root, V376D_ROOT, "execution-dry-fixture.json"), `${JSON.stringify(fixture, null, 2)}\n`);
console.log(JSON.stringify(fixture, null, 2));
