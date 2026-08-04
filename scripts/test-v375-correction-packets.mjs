#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V375_BUNDLES, V375_DEBATES, V375_PASSES, V375_ROOT, assert, canonicalJson, validateV375Output } from "./lib/v375-correction.mjs";

const root = process.cwd(), shouldWrite = process.argv.includes("--write"), readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const mapping = await readJson(`${V375_ROOT}/sealed-option-map.json`);
let contexts = 0;
for (const reviewerPass of V375_PASSES) for (const debateNumber of V375_DEBATES) {
  const packet = await readJson(`${V375_ROOT}/packets/${reviewerPass}/debate-${debateNumber}.json`), schema = await readJson(`${V375_ROOT}/schemas/${reviewerPass}/debate-${debateNumber}.schema.json`);
  assert(packet.allSpeakerAttributionConfidenceHigh && packet.bundles.length >= 2 && packet.bundles.length <= 3, `${reviewerPass}.${debateNumber}: packet balance invalid`);
  const output = { schemaVersion: "3.7.5-correction-output", debateNumber, reviewerPass, bundles: packet.bundles.map((bundle) => ({ bundleId: bundle.bundleId, optionId: mapping.passes[reviewerPass][bundle.bundleId].options.find((item) => item.matchesDevelopmentReference).optionId, evidenceText: bundle.sourceExcerpt, rationale: "The positive correction anchor selects this deterministic development reference; the default and nearest exclusion are represented without making a fresh model judgment." })) };
  validateV375Output(output, packet, schema);
  for (const bundle of packet.bundles) {
    const a = mapping.passes["pass-a"][bundle.bundleId].options.map((item) => item.semanticTuple).sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));
    const b = mapping.passes["pass-b"][bundle.bundleId].options.map((item) => item.semanticTuple).sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));
    assert(canonicalJson(a) === canonicalJson(b), `${bundle.bundleId}: counterbalanced universe mismatch`);
  }
  contexts += 1;
}
const fixture = { schemaVersion: "3.7.5-correction-dry-fixture", passed: true, exposedCorrectionCases: true, initialContextCount: contexts, atomicBundleCount: V375_BUNDLES.length, diagnosticBundles: 4, burdenBundles: 4, allSpeakerAttributionConfidenceHigh: true, candidatePositionsCounterbalanced: true, modelContextsExecuted: 0 };
if (shouldWrite) { await mkdir(path.resolve(root, V375_ROOT), { recursive: true }); await writeFile(path.resolve(root, V375_ROOT, "dry-fixture.json"), `${JSON.stringify(fixture, null, 2)}\n`); }
console.log(JSON.stringify(fixture, null, 2));
