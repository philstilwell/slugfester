#!/usr/bin/env node

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { debates } from "../src/data/debates.js";
import {
  CALIBRATION_PROMOTION_ORDER,
  CALIBRATION_PROMOTION_PROTOCOL_ID,
  CALIBRATION_PROMOTION_ROOT,
  sha256,
  validateCalibrationPromotionSiteLedgerAdapter
} from "./lib/assessment-production-calibration-promotion-v1.mjs";

const root = process.cwd();
const repositoryOnly = process.argv.includes("--repository-only");
for (const argument of process.argv.slice(2)) {
  assert.equal(argument, "--repository-only", `unknown argument: ${argument}`);
}
const bytes = (file) => readFileSync(path.join(root, file));
const json = (file) => JSON.parse(bytes(file));
const assertLock = (record) => {
  assert.equal(existsSync(path.join(root, record.path)), true, `${record.path}: missing`);
  assert.equal(sha256(bytes(record.path)), record.sha256, `${record.path}: SHA-256 changed`);
};
const manifestPath = `${CALIBRATION_PROMOTION_ROOT}/manifest.json`;
const manifest = json(manifestPath);
const execution = json(`${CALIBRATION_PROMOTION_ROOT}/execution.json`);
assert.equal(manifest.protocolId, CALIBRATION_PROMOTION_PROTOCOL_ID);
assert.equal(manifest.status, "frozen-calibration-promotion-manifest");
assert.deepEqual(manifest.explicitOrder, [...CALIBRATION_PROMOTION_ORDER]);
assert.equal(execution.status, "passed-calibration-promotion-production-mutation");
assertLock(manifest.authorization);
for (const record of Object.values(manifest.frozenEvidence).filter((value) => value?.path)) assertLock(record);

const productionByNumber = new Map(debates.map((debate) => [debate.number, debate]));
let moves = 0;
for (const record of manifest.debates) {
  assertLock(record.frozenCompiled);
  assertLock(record.candidate);
  assertLock(record.stagedLedger);
  assertLock(record.packet);
  const packet = json(record.packet.path);
  const candidate = json(record.candidate.path);
  const adapter = json(record.stagedLedger.path);
  for (const sourceLock of Object.values(packet.sourceLocks)) {
    if (repositoryOnly && sourceLock.path.startsWith(".assessment-cache/")) continue;
    assertLock(sourceLock);
  }
  const production = productionByNumber.get(record.debateNumber);
  assert.deepEqual(production, candidate, `${record.debateNumber}: production differs from promoted candidate`);
  assert.equal(sha256(bytes(record.productionLedgerPath)), record.stagedLedger.sha256, `${record.debateNumber}: production ledger differs from staging`);
  const result = validateCalibrationPromotionSiteLedgerAdapter({ adapter, candidate, expectedSourceLocks: packet.sourceLocks });
  moves += result.moves;
}
assert.equal(moves, 100);
const ledgerNames = readdirSync(path.join(root, "docs/assessment-ledgers")).filter((name) => name.endsWith(".json"));
const standaloneRegistry = json("docs/assessment-production/standalone-debates-v1/registry.json");
assert.equal(standaloneRegistry.status, "active");
assert.equal(standaloneRegistry.campaignBoundary.batch18Permitted, false);
const publishedStandalone = standaloneRegistry.debates.filter(
  (item) => item.status === "published-and-frozen"
);
for (const item of publishedStandalone) {
  assert.equal(item.productionLedger?.path, `docs/assessment-ledgers/${item.debateId}.json`);
  assertLock(item.productionLedger);
}
assert.equal(
  ledgerNames.length,
  179 + publishedStandalone.length,
  "expected 179 historical production ledgers plus authenticated standalone ledgers"
);
assert.equal(existsSync(path.join(root, "docs/assessment-production/post-canary-continuation-v1/batch-18")), false, "Batch 18 exists");

const renderingPath = `${CALIBRATION_PROMOTION_ROOT}/rendering/rendering-audit.json`;
assert.equal(existsSync(path.join(root, renderingPath)), true, "fresh production rendering audit is missing");
const rendering = json(renderingPath);
assert.equal(rendering.status, "passed-calibration-promotion-production-rendering");
assert.equal(rendering.totals.debates, 5);
assert.equal(rendering.totals.viewports, 10);
assert.equal(rendering.totals.screenshots, 20);
assert.equal(rendering.totals.runtimeFailures, 0);
assert.equal(rendering.totals.horizontalOverflowFailures, 0);
for (const result of rendering.results) {
  assertLock(result.evidence);
  const evidence = json(result.evidence.path);
  assert.equal(Object.values(evidence.checks).every(Boolean), true, `${result.evidence.path}: rendering check failed`);
  for (const screenshot of Object.values(evidence.screenshots)) assertLock(screenshot);
}

console.log(`Calibration promotion audit passed: 5 promoted debates, ${moves} promoted moves, 179 historical production ledgers plus ${publishedStandalone.length} authenticated standalone ledger${publishedStandalone.length === 1 ? "" : "s"}, 10 promoted viewports, 20 promoted screenshots, $0 direct incremental cost (${repositoryOnly ? "repository-only frozen-hash replay" : "full replay including local event bytes"}).`);
