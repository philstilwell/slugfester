#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
import {
  CALIBRATION_PROMOTION_ORDER,
  CALIBRATION_PROMOTION_PROTOCOL_ID,
  CALIBRATION_PROMOTION_ROOT,
  serializedJson,
  sha256
} from "./lib/assessment-production-calibration-promotion-v1.mjs";
import {
  buildProductionDebatesSource,
  extractProductionDebateRecords,
  inventoryDigest
} from "./lib/assessment-production-post-canary-batch-17-production-publication.mjs";

const root = process.cwd();
const resolve = (file) => path.resolve(root, file);
const readBytes = (file) => readFile(resolve(file));
const readJson = (file) => readFile(resolve(file), "utf8").then(JSON.parse);
const manifest = await readJson(`${CALIBRATION_PROMOTION_ROOT}/manifest.json`);
assertV4(
  manifest.protocolId === CALIBRATION_PROMOTION_PROTOCOL_ID &&
    manifest.status === "frozen-calibration-promotion-manifest" &&
    canonicalJson(manifest.explicitOrder) === canonicalJson(CALIBRATION_PROMOTION_ORDER),
  "frozen calibration-promotion manifest required"
);
const authorizationBytes = await readBytes(manifest.authorization.path);
assertV4(sha256(authorizationBytes) === manifest.authorization.sha256, "authorization changed");
const authorization = JSON.parse(authorizationBytes);
assertV4(authorization.authorized.productionMutation && authorization.prohibited.batch18Selection, "production authorization missing");

const productionBytes = await readBytes(manifest.baseline.productionDebates.path);
assertV4(sha256(productionBytes) === manifest.baseline.productionDebates.sha256, "production debate baseline changed");
assertV4(sha256(await readBytes(manifest.baseline.references.path)) === manifest.baseline.references.sha256, "references changed");
for (const record of manifest.baseline.productionLedgers.files) {
  assertV4(sha256(await readBytes(record.path)) === record.sha256, `${record.path}: preexisting ledger changed`);
}
assertV4(inventoryDigest(manifest.baseline.productionLedgers.files) === manifest.baseline.productionLedgers.inventorySha256, "ledger baseline inventory changed");

const replacements = [];
for (const debate of manifest.debates) {
  const [candidateBytes, ledgerBytes, packetBytes] = await Promise.all([
    readBytes(debate.candidate.path),
    readBytes(debate.stagedLedger.path),
    readBytes(debate.packet.path)
  ]);
  assertV4(sha256(candidateBytes) === debate.candidate.sha256, `${debate.debateNumber}: candidate changed`);
  assertV4(sha256(ledgerBytes) === debate.stagedLedger.sha256, `${debate.debateNumber}: staged ledger changed`);
  assertV4(sha256(packetBytes) === debate.packet.sha256, `${debate.debateNumber}: packet changed`);
  replacements.push({ ...debate, candidate: JSON.parse(candidateBytes), ledgerBytes });
}

const output = buildProductionDebatesSource({
  baselineSource: productionBytes.toString("utf8"),
  replacements
});
for (const debate of replacements) {
  await mkdir(path.dirname(resolve(debate.productionLedgerPath)), { recursive: true });
  await writeFile(resolve(debate.productionLedgerPath), debate.ledgerBytes);
}
await writeFile(resolve(manifest.baseline.productionDebates.path), output);

const writtenRecords = extractProductionDebateRecords(output);
const baselineRecords = extractProductionDebateRecords(productionBytes.toString("utf8"));
const promotedNumbers = new Set(CALIBRATION_PROMOTION_ORDER);
let changed = 0;
for (let index = 0; index < writtenRecords.length; index += 1) {
  const after = writtenRecords[index];
  const before = baselineRecords[index];
  if (promotedNumbers.has(after.number)) {
    changed += 1;
    const candidate = replacements.find((item) => item.debateNumber === after.number).candidate;
    assertV4(canonicalJson(JSON.parse(after.text)) === canonicalJson(candidate), `${after.number}: published candidate changed`);
  } else {
    assertV4(after.text === before.text, `${after.number}: unrelated debate changed`);
  }
}
assertV4(changed === 5 && writtenRecords.length === 195, "exactly five of 195 records must change");
for (const debate of replacements) {
  assertV4(sha256(await readBytes(debate.productionLedgerPath)) === debate.stagedLedger.sha256, `${debate.debateNumber}: published ledger changed`);
}
assertV4(sha256(await readBytes(manifest.baseline.references.path)) === manifest.baseline.references.sha256, "references changed during promotion");

const execution = {
  schemaVersion: "1.0-assessment-production-calibration-promotion-v1-execution",
  protocolId: CALIBRATION_PROMOTION_PROTOCOL_ID,
  status: "passed-calibration-promotion-production-mutation",
  completedAt: new Date().toISOString(),
  manifest: { path: `${CALIBRATION_PROMOTION_ROOT}/manifest.json`, sha256: sha256(await readBytes(`${CALIBRATION_PROMOTION_ROOT}/manifest.json`)) },
  productionDebates: { path: manifest.baseline.productionDebates.path, beforeSha256: manifest.baseline.productionDebates.sha256, afterSha256: sha256(output), debates: 195, changedRecords: changed },
  publishedLedgers: replacements.map((item) => ({ debateNumber: item.debateNumber, debateId: item.debateId, path: item.productionLedgerPath, sha256: item.stagedLedger.sha256, byteIdenticalToStaging: true })),
  preserved: { unrelatedDebates: 190, preexistingProductionLedgers: 174, referencesByteIdentical: true, frozenEvidenceChanged: false },
  totals: { promotedDebates: 5, newLedgers: 5, scorePasses: 0, modelCalls: 0, paidCalls: 0, directIncrementalCostUsd: 0 },
  batch18Selected: false
};
await writeFile(resolve(`${CALIBRATION_PROMOTION_ROOT}/execution.json`), serializedJson(execution));
console.log(serializedJson({ status: execution.status, changedRecords: changed, ledgersPublished: 5, directIncrementalCostUsd: 0 }));
