#!/usr/bin/env node
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_07_RENDERING_ORDER, POST_CANARY_BATCH_07_RENDERING_PROTOCOL_ID,
  POST_CANARY_BATCH_07_RENDERING_ROOT, validatePostCanaryBatch07RenderingPacket } from
  "./lib/assessment-production-post-canary-batch-07-rendering-verification.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
const ROOT = POST_CANARY_BATCH_07_RENDERING_ROOT;
const m = JSON.parse(await readFile(path.resolve(`${ROOT}/preparation-manifest.json`), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(m.status === "frozen-post-canary-batch-07-rendering-verification-prepared" &&
  m.protocolId === POST_CANARY_BATCH_07_RENDERING_PROTOCOL_ID && m.packets?.length === 10 &&
  canonicalJson(m.explicitOrder) === canonicalJson(POST_CANARY_BATCH_07_RENDERING_ORDER) &&
  m.gateExpectations?.sections === 51 && m.gateExpectations?.moves === 187 &&
  m.gateExpectations?.viewportResults === 20 && m.browserPlan?.oneAttemptPerViewport === true &&
  m.browserPlan?.retriesMaximum === 0 && m.browserPlan?.timeoutExtensionsMaximum === 0,
"Batch 7 rendering preparation changed");
for (const [file, digest] of Object.entries(m.sourceHashes)) assertV4(
  sha256(await readFile(path.resolve(file))) === digest, `${file}: source hash changed`);
for (const [file, digest] of Object.entries(m.toolHashes)) assertV4(
  sha256(await readFile(path.resolve(file))) === digest, `${file}: tool hash changed`);
for (const row of m.packets) {
  const bytes = await readFile(path.resolve(row.path));
  assertV4(sha256(bytes) === row.sha256 && bytes.length === row.bytes, `${row.debateNumber}: packet changed`);
  validatePostCanaryBatch07RenderingPacket(JSON.parse(bytes));
}
for (const file of m.futureOutputPathsExcludedFromSourceHashes) assertV4(!(await exists(file)), `${file} exists`);
console.log(JSON.stringify({ status: "passed", debates: 10, sections: 51, moves: 187,
  packets: 10, viewportResultsPlanned: 20, screenshotsPlanned: 40,
  renderingPasses: 0, directIncrementalCostUsd: 0 }, null, 2));

