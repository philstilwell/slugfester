#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V375_DEBATES, V375_ROOT, assert, canonicalJson, validateV375Output } from "./lib/v375-correction.mjs";
import { adjudicationOption, compareV375Outputs, makeV375AdjudicationArtifacts, mappedOption, semanticWinner } from "./lib/v375-execution.mjs";

const root = process.cwd(), shouldWrite = process.argv.includes("--write");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const mapping = await readJson(`${V375_ROOT}/sealed-option-map.json`);
const forcedDisputeByDebate = { "62": "burden-62-07", "154": "diagnostic-154-09", "185": "burden-185-07" };
let disputes = 0, adjudicationContexts = 0, resolved = 0;
const families = new Set();

for (let debateIndex = 0; debateIndex < V375_DEBATES.length; debateIndex += 1) {
  const debateNumber = V375_DEBATES[debateIndex];
  const packetA = await readJson(`${V375_ROOT}/packets/pass-a/debate-${debateNumber}.json`);
  const packetB = await readJson(`${V375_ROOT}/packets/pass-b/debate-${debateNumber}.json`);
  const schemaA = await readJson(`${V375_ROOT}/schemas/pass-a/debate-${debateNumber}.schema.json`);
  const schemaB = await readJson(`${V375_ROOT}/schemas/pass-b/debate-${debateNumber}.schema.json`);
  const forcedBundleId = forcedDisputeByDebate[debateNumber];
  const selections = (reviewerPass, packet, forceAlternative) => packet.bundles.map((bundle) => {
    const options = mapping.passes[reviewerPass][bundle.bundleId].options;
    const reference = options.find((item) => item.matchesDevelopmentReference);
    const selected = forceAlternative && bundle.bundleId === forcedBundleId ? options.find((item) => !item.matchesDevelopmentReference) : reference;
    return { bundleId: bundle.bundleId, optionId: selected.optionId, evidenceText: bundle.sourceExcerpt, rationale: "The positive correction rule selects this dry-fixture option; the default is considered and the nearest competing classification is expressly excluded." };
  });
  const outputA = { schemaVersion: "3.7.5-correction-output", debateNumber, reviewerPass: "pass-a", bundles: selections("pass-a", packetA, false) };
  const outputB = { schemaVersion: "3.7.5-correction-output", debateNumber, reviewerPass: "pass-b", bundles: selections("pass-b", packetB, true) };
  validateV375Output(outputA, packetA, schemaA);
  validateV375Output(outputB, packetB, schemaB);
  const comparisons = compareV375Outputs(mapping, outputA, outputB);
  assert(comparisons.filter((item) => !item.agreed).length === 1, `${debateNumber}: synthetic dispute count invalid`);
  const artifacts = makeV375AdjudicationArtifacts(debateNumber, packetA, comparisons, mapping, debateIndex * 5);
  assert(artifacts.packet.bundles.length === 1 && artifacts.map.bundles.length === 1, `${debateNumber}: pass-c scope invalid`);
  assert(!canonicalJson(artifacts.packet).includes("semanticTuple") && !canonicalJson(artifacts.packet).includes("matchesDevelopmentReference"), `${debateNumber}: sealed reference leaked`);
  const disputed = comparisons.find((item) => !item.agreed);
  const passCOption = artifacts.map.bundles[0].options.find((item) => canonicalJson(item.semanticTuple) === canonicalJson(disputed.passA));
  const passCOutput = { schemaVersion: "3.7.5-correction-output", debateNumber, reviewerPass: "pass-c", bundles: [{ bundleId: disputed.bundleId, optionId: passCOption.optionId, evidenceText: artifacts.packet.bundles[0].sourceExcerpt, rationale: "The positive correction rule selects this adjudication option; the default is considered and the nearest competing classification is expressly excluded." }] };
  validateV375Output(passCOutput, artifacts.packet, artifacts.schema);
  const passC = adjudicationOption({ debates: { [debateNumber]: artifacts.map } }, debateNumber, disputed.bundleId, passCOption.optionId).semanticTuple;
  assert(mappedOption(mapping, "pass-a", disputed.bundleId, outputA.bundles.find((item) => item.bundleId === disputed.bundleId).optionId), "pass-a mapping absent");
  assert(semanticWinner([disputed.passA, disputed.passB, passC])?.votes === 2, `${debateNumber}: two-vote resolution failed`);
  families.add(artifacts.packet.bundles[0].family);
  disputes += 1;
  adjudicationContexts += 1;
  resolved += 1;
}

assert(families.has("diagnostic") && families.has("burden"), "both correction families must exercise adjudication");
const fixture = { schemaVersion: "3.7.5-correction-execution-dry-fixture", passed: true, modelContextsExecuted: 0, syntheticInitialContexts: 6, syntheticDisputedBundles: disputes, syntheticAdjudicationContexts: adjudicationContexts, disputeOnlyPacketScopeVerified: true, diagnosticAndBurdenBranchesVerified: true, sealedReferenceLeakage: 0, twoVoteResolutions: resolved };
if (shouldWrite) await writeFile(path.resolve(root, V375_ROOT, "execution-dry-fixture.json"), `${JSON.stringify(fixture, null, 2)}\n`);
console.log(JSON.stringify(fixture, null, 2));
