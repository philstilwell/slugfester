#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V374_BUNDLES, V374_CASE_IDS, V374_DEBATES, V374_PASSES, V374_ROOT, canonicalJson, compareV374Outputs, makeV374AdjudicationArtifacts, validateV374Output, assert } from "./lib/v374-disjoint-atomic.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const mapping = await readJson(`${V374_ROOT}/sealed-atomic-option-map.json`);
const v373Cases = new Set();
for (const reviewerPass of ["pass-a"]) for (const debateNumber of V374_DEBATES) {
  const packet = await readJson(`docs/calibration/v3.7.3/atomic-bundle-correction-smoke/packets/${reviewerPass}/debate-${debateNumber}.json`);
  for (const bundle of packet.bundles) v373Cases.add(bundle.caseId);
}
assert(V374_CASE_IDS.every((caseId) => !v373Cases.has(caseId)), "v3.7.4 case sample overlaps v3.7.3");
assert(V374_BUNDLES.length === 12 && new Set(V374_BUNDLES.map((item) => item.bundleId)).size === 12, "bundle inventory invalid");

const contexts = [];
let syntheticDisagreementVerified = false;
for (const reviewerPass of V374_PASSES) for (const debateNumber of V374_DEBATES) {
  const packetPath = `${V374_ROOT}/packets/${reviewerPass}/debate-${debateNumber}.json`;
  const schemaPath = `${V374_ROOT}/schemas/${reviewerPass}/debate-${debateNumber}.schema.json`;
  const packet = await readJson(packetPath);
  const schema = await readJson(schemaPath);
  assert(packet.bundles.length === 4 && packet.allSpeakerAttributionConfidenceHigh, `${reviewerPass}.${debateNumber}: packet balance or attribution invalid`);
  const output = { schemaVersion: "3.7.4-atomic-bundle-output", debateNumber, reviewerPass, bundles: packet.bundles.map((bundle) => ({ bundleId: bundle.bundleId, optionId: mapping.passes[reviewerPass][bundle.bundleId].options.find((item) => item.matchesRetiredExpected).optionId, evidenceText: bundle.sourceExcerpt, rationale: "The positive rule selects the retired fixture option for this deterministic test; the default and nearest exclusion are checked without making a model judgment." })) };
  validateV374Output(output, packet, schema);
  contexts.push({ reviewerPass, debateNumber, packet, output });
}

for (const debateNumber of V374_DEBATES) {
  const a = contexts.find((item) => item.reviewerPass === "pass-a" && item.debateNumber === debateNumber);
  const b = contexts.find((item) => item.reviewerPass === "pass-b" && item.debateNumber === debateNumber);
  for (const bundle of a.packet.bundles) {
    const bundleMap = mapping.passes["pass-a"][bundle.bundleId];
    const bMap = mapping.passes["pass-b"][bundle.bundleId];
    assert(bMap, "pass-b semantic universe missing");
    assert(canonicalJson(bundleMap.options.map((item) => item.semanticTuple).sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)))) === canonicalJson(bMap.options.map((item) => item.semanticTuple).sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)))), "counterbalanced semantic universe mismatch");
  }
  const agreements = compareV374Outputs(mapping, a.output, b.output);
  assert(agreements.every((item) => item.agreed), `${debateNumber}: retired synthetic choices should agree`);
  const firstBundle = b.output.bundles[0];
  const alternative = mapping.passes["pass-b"][firstBundle.bundleId].options.find((item) => !item.matchesRetiredExpected);
  const disputedOutput = { ...b.output, bundles: b.output.bundles.map((item, index) => index === 0 ? { ...item, optionId: alternative.optionId } : item) };
  const comparisons = compareV374Outputs(mapping, a.output, disputedOutput);
  const artifacts = makeV374AdjudicationArtifacts(debateNumber, a.packet, comparisons, mapping, 3);
  assert(artifacts.packet.bundles.length === 1 && artifacts.map.bundles.length === 1, `${debateNumber}: disagreement-only adjudication extraction failed`);
  assert(!canonicalJson(artifacts.packet).includes("semanticTuple") && !canonicalJson(artifacts.packet).includes("matchesRetiredExpected"), `${debateNumber}: sealed mapping leaked into adjudication packet`);
  syntheticDisagreementVerified = true;
}

const fixture = { schemaVersion: "3.7.4-disjoint-atomic-dry-fixture", passed: true, initialContextCount: contexts.length, debateCount: V374_DEBATES.length, distinctCaseCount: V374_CASE_IDS.length, distinctBundleCount: V374_BUNDLES.length, bundlesPerDebate: 4, caseOverlapWithV373: 0, debateContainerOverlapWithV373: 3, allSpeakerAttributionConfidenceHigh: true, candidatePositionsCounterbalanced: true, adjudicationDisagreementBranchVerified: syntheticDisagreementVerified, modelContextsExecuted: 0 };
if (shouldWrite) {
  await mkdir(path.resolve(root, V374_ROOT), { recursive: true });
  await writeFile(path.resolve(root, V374_ROOT, "dry-fixture.json"), `${JSON.stringify(fixture, null, 2)}\n`);
}
console.log(JSON.stringify(fixture, null, 2));
