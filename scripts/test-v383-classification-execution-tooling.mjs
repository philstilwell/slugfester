#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V383_DEBATES, V383_OUTPUT_SCHEMA_VERSION, V383_ROOT, assert, canonicalJson, validateV383Output } from "./lib/v383-burden-contact.mjs";
import { adjudicationV383Option, compareV383Outputs, makeV383AdjudicationArtifacts, v383SemanticWinner } from "./lib/v383-execution.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const mapping = await readJson(`${V383_ROOT}/sealed-option-map.json`);
let syntheticDisputes = 0;
let adjudicationContexts = 0;
let twoVoteResolutions = 0;
let noContactDisputeVerified = false;
let polarityDisputeVerified = false;
let bridgeOrTierDisputeVerified = false;

const rationale = "The atomic proposition supplies a direct reason for or against the exact selected bridge, so contact, polarity, tier, and bridge identity form one composite decision. The compatibility check excludes mere topic overlap, while the nearest competing bridge and motion promotion are expressly rejected.";

for (let debateIndex = 0; debateIndex < V383_DEBATES.length; debateIndex += 1) {
  const debateNumber = V383_DEBATES[debateIndex];
  const packetA = await readJson(`${V383_ROOT}/packets/pass-a/debate-${debateNumber}.json`);
  const packetB = await readJson(`${V383_ROOT}/packets/pass-b/debate-${debateNumber}.json`);
  const schemaA = await readJson(`${V383_ROOT}/schemas/pass-a/debate-${debateNumber}.schema.json`);
  const schemaB = await readJson(`${V383_ROOT}/schemas/pass-b/debate-${debateNumber}.schema.json`);
  const forcedBundleId = packetA.bundles[debateIndex].bundleId;
  const selections = (reviewerPass, packet, forceAlternative) => packet.bundles.map((bundle) => {
    const options = mapping.passes[reviewerPass][bundle.bundleId].options;
    const provisional = options.find((item) => item.matchesProvisionalAid);
    let selected = provisional;
    if (forceAlternative && bundle.bundleId === forcedBundleId) {
      if (debateIndex === 0) selected = options.find((item) => item.semanticTuple.burdenContact === null) ?? options.find((item) => item.semanticTuple.burdenContact !== null);
      else if (debateIndex === 1 && provisional.semanticTuple.burdenContact) selected = options.find((item) => item.semanticTuple.burdenContact?.bridgeId === provisional.semanticTuple.burdenContact.bridgeId && item.semanticTuple.burdenContact?.polarity !== provisional.semanticTuple.burdenContact.polarity);
      else if (provisional.semanticTuple.burdenContact) selected = options.find((item) => item.semanticTuple.burdenContact?.polarity === provisional.semanticTuple.burdenContact.polarity && item.semanticTuple.burdenContact?.tier !== provisional.semanticTuple.burdenContact.tier);
      else selected = options.find((item) => item.semanticTuple.burdenContact !== null);
    }
    return { bundleId: bundle.bundleId, optionId: selected.optionId, evidenceText: bundle.atomicExcerpt, rationale };
  });
  const outputA = { schemaVersion: V383_OUTPUT_SCHEMA_VERSION, debateNumber, reviewerPass: "pass-a", bundles: selections("pass-a", packetA, false) };
  const outputB = { schemaVersion: V383_OUTPUT_SCHEMA_VERSION, debateNumber, reviewerPass: "pass-b", bundles: selections("pass-b", packetB, true) };
  validateV383Output(outputA, packetA, schemaA);
  validateV383Output(outputB, packetB, schemaB);
  const comparisons = compareV383Outputs(mapping, outputA, outputB);
  assert(comparisons.filter((item) => !item.agreed).length === 1, `${debateNumber}: synthetic dispute count invalid`);
  const artifacts = makeV383AdjudicationArtifacts(debateNumber, packetA, comparisons, debateIndex);
  assert(artifacts.packet.bundles.length === 1 && artifacts.packet.bundles[0].candidates.length === 2, `${debateNumber}: dispute-only packet scope invalid`);
  const packetText = canonicalJson(artifacts.packet);
  assert(!packetText.includes("semanticTuple") && !packetText.includes("matchesProvisionalAid"), `${debateNumber}: sealed adjudication value leaked`);
  const disputed = comparisons.find((item) => !item.agreed);
  const passCOption = artifacts.map.bundles[0].options.find((item) => canonicalJson(item.semanticTuple) === canonicalJson(disputed.passA));
  const outputC = { schemaVersion: V383_OUTPUT_SCHEMA_VERSION, debateNumber, reviewerPass: "pass-c", bundles: [{ bundleId: disputed.bundleId, optionId: passCOption.optionId, evidenceText: artifacts.packet.bundles[0].atomicExcerpt, rationale }] };
  validateV383Output(outputC, artifacts.packet, artifacts.schema);
  const mappedC = adjudicationV383Option({ debates: { [debateNumber]: artifacts.map } }, debateNumber, disputed.bundleId, passCOption.optionId).semanticTuple;
  assert(v383SemanticWinner([disputed.passA, disputed.passB, mappedC])?.votes === 2, `${debateNumber}: two-vote resolution failed`);
  if (disputed.passA.burdenContact === null || disputed.passB.burdenContact === null) noContactDisputeVerified = true;
  if (disputed.passA.burdenContact?.polarity !== disputed.passB.burdenContact?.polarity && disputed.passA.burdenContact && disputed.passB.burdenContact) polarityDisputeVerified = true;
  if (disputed.passA.burdenContact?.tier !== disputed.passB.burdenContact?.tier || disputed.passA.burdenContact?.bridgeId !== disputed.passB.burdenContact?.bridgeId) bridgeOrTierDisputeVerified = true;
  syntheticDisputes += 1;
  adjudicationContexts += 1;
  twoVoteResolutions += 1;
}

assert(noContactDisputeVerified && polarityDisputeVerified && bridgeOrTierDisputeVerified, "dry tooling did not cover no-contact, polarity, and bridge/tier disputes");
const fixture = {
  schemaVersion: "3.8.3-heldout-classification-execution-dry-fixture",
  passed: true,
  modelContextsExecuted: 0,
  syntheticInitialContexts: 6,
  syntheticDisputedCompositeCases: syntheticDisputes,
  syntheticAdjudicationContexts: adjudicationContexts,
  disputedMovesOnly: true,
  twoInitialTuplesOnly: true,
  noContactDisputeVerified,
  polarityDisputeVerified,
  bridgeOrTierDisputeVerified,
  sealedValueLeakage: 0,
  twoVoteResolutions,
  scoringFields: 0,
  meteredApiCostUsd: 0,
  transcriptionCostUsd: 0
};
if (shouldWrite) await writeFile(path.resolve(root, V383_ROOT, "execution-dry-fixture.json"), `${JSON.stringify(fixture, null, 2)}\n`);
console.log(JSON.stringify(fixture, null, 2));
