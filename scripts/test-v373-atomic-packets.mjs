#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assert, validateV373Output, V373_DEBATES, V373_PASSES, V373_ROOT } from "./lib/v373-atomic-packets.mjs";

const root = process.cwd(), shouldWrite = process.argv.includes("--write"), readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const contexts = []; let total = 0;
for (const reviewerPass of V373_PASSES) for (const debateNumber of V373_DEBATES) {
  const packet = await readJson(`${V373_ROOT}/packets/${reviewerPass}/debate-${debateNumber}.json`), schema = await readJson(`${V373_ROOT}/schemas/${reviewerPass}/debate-${debateNumber}.schema.json`);
  assert(packet.allSpeakerAttributionConfidenceHigh, `${reviewerPass}.${debateNumber}: audio prerequisite unexpected`);
  assert(packet.bundles.every((bundle) => bundle.candidates.length >= 2 && bundle.candidates.length <= 4), `${reviewerPass}.${debateNumber}: candidate count invalid`);
  const output = { schemaVersion: "3.7.3-atomic-bundle-output", debateNumber, reviewerPass, bundles: packet.bundles.map((bundle) => ({ bundleId: bundle.bundleId, optionId: bundle.candidates[0].optionId, evidenceText: bundle.sourceExcerpt, rationale: "The selected complete bundle satisfies the positive rule; the default and competing candidate exclusions do not fit the exact response language in context." })) };
  validateV373Output(output, packet, schema); total += output.bundles.length; contexts.push({ reviewerPass, debateNumber, bundleCount: output.bundles.length });
}
assert(total === 16, "two-pass bundle coverage must be 16");
const result = { schemaVersion: "3.7.3-atomic-packet-dry-fixture", passed: true, initialContextCount: contexts.length, distinctBundleCount: total / 2, allSpeakerAttributionConfidenceHigh: true, modelContextsExecuted: 0, contexts };
const text = `${JSON.stringify(result, null, 2)}\n`;
if (shouldWrite) await writeFile(path.resolve(root, `${V373_ROOT}/dry-fixture.json`), text);
console.log(text);
