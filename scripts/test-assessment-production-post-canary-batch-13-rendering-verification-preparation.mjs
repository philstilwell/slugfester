#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_13_RENDERING_ORDER,
  POST_CANARY_BATCH_13_RENDERING_PROTOCOL_ID,
  POST_CANARY_BATCH_13_RENDERING_ROOT,
  hashFile,
  validatePostCanaryBatch13RenderingPacket
} from "./lib/assessment-production-post-canary-batch-13-rendering-verification.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const manifest = JSON.parse(await readFile(path.resolve(
  `${POST_CANARY_BATCH_13_RENDERING_ROOT}/preparation-manifest.json`), "utf8"));
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(manifest.status ===
  "frozen-post-canary-batch-13-rendering-verification-prepared" &&
  manifest.protocolId === POST_CANARY_BATCH_13_RENDERING_PROTOCOL_ID &&
  manifest.packets?.length === 10 &&
  canonicalJson(manifest.explicitOrder) ===
    canonicalJson(POST_CANARY_BATCH_13_RENDERING_ORDER) &&
  manifest.gateExpectations?.sections === 53 &&
  manifest.gateExpectations?.moves === 199 &&
  manifest.gateExpectations?.viewportResults === 20 &&
  manifest.gateExpectations?.screenshots === 40 &&
  manifest.browserPlan?.controller === "playwright-cli" &&
  manifest.browserPlan?.attemptsPerViewport === 1 &&
  manifest.browserPlan?.retriesMaximum === 0 &&
  manifest.browserPlan?.timeoutExtensionsMaximum === 0,
"Batch 13 rendering preparation changed");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assertV4(await hashFile(file) === digest, `${file}: source hash changed`);
}
for (const [file, digest] of Object.entries(manifest.toolHashes)) {
  assertV4(await hashFile(file) === digest, `${file}: tool hash changed`);
}
for (const row of manifest.packets) {
  const packetBytes = await readFile(path.resolve(row.path));
  assertV4((await hashFile(row.path)) === row.sha256 &&
    packetBytes.length === row.bytes, `${row.debateNumber}: packet changed`);
  validatePostCanaryBatch13RenderingPacket(JSON.parse(packetBytes));
}
for (const file of manifest.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(file)), `${file} exists`);
}
console.log(JSON.stringify({ status: "passed", debates: 10,
  sections: 53, moves: 199, packets: 10,
  viewportResultsPlanned: 20, screenshotsPlanned: 40,
  renderingPasses: 0, directIncrementalCostUsd: 0 }, null, 2));
