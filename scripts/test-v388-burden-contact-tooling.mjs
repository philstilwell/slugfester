#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V388_CONTACT_DEBATES, V388_CONTACT_PASSES, V388_CONTACT_ROOT, canonicalJson, validateV388ContactOutput } from "./lib/v388-burden-contact.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const sealed = await readJson(`${V388_CONTACT_ROOT}/sealed-option-map.json`);
const reports = [];
for (const reviewerPass of V388_CONTACT_PASSES) for (const debateNumber of V388_CONTACT_DEBATES) {
  const packetPath = `${V388_CONTACT_ROOT}/packets/${reviewerPass}/debate-${debateNumber}.json`;
  const schemaPath = `${V388_CONTACT_ROOT}/schemas/${reviewerPass}/debate-${debateNumber}.schema.json`;
  const [packet, schema] = await Promise.all([readJson(packetPath), readJson(schemaPath)]);
  const output = { schemaVersion: "3.8.8-burden-contact-output", debateNumber, debateId: packet.debateId, reviewerPass, reviewerRole: "burden-contact-classifier", bundles: packet.bundles.map((bundle) => ({ bundleId: bundle.bundleId, optionId: bundle.candidates[0].optionId, evidenceText: bundle.atomicExcerpt, rationale: "This deterministic dry fixture identifies the expressed move proposition, applies exact bridge contact and compatibility, records the selected complete state and polarity where applicable, and excludes the nearest competing bridge or no-contact state without supplying any participant score or assessment prose." })) };
  const summary = validateV388ContactOutput(output, packet, schema);
  for (const bundle of packet.bundles) {
    const left = sealed.passes["pass-a"][bundle.bundleId];
    const right = sealed.passes["pass-b"][bundle.bundleId];
    const leftPositions = new Map(left.options.map((option) => [canonicalJson(option.semanticTuple), option.optionId]));
    const rightPositions = new Map(right.options.map((option) => [canonicalJson(option.semanticTuple), option.optionId]));
    if ([...leftPositions].some(([semantic, optionId]) => rightPositions.get(semantic) === optionId)) throw new Error(`${bundle.bundleId}: semantic option position not counterbalanced`);
  }
  reports.push(summary);
}
const fixture = { schemaVersion: "3.8.8-burden-contact-tooling-dry-fixture", status: "passed", reports, totals: { contexts: 6, bundles: reports.reduce((sum, report) => sum + report.bundles, 0), expectedBundlesAcrossTwoPasses: 144, scoreFields: 0, modelContextsExecuted: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 } };
if (shouldWrite) { await mkdir(path.resolve(root, V388_CONTACT_ROOT), { recursive: true }); await writeFile(path.resolve(root, `${V388_CONTACT_ROOT}/dry-fixture.json`), `${JSON.stringify(fixture, null, 2)}\n`); }
console.log(JSON.stringify(fixture, null, 2));
