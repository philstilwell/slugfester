#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { getReferenceDefinition, referenceFromUrl } from "../src/data/references.js";
import {
  CHECKPOINT_V22_SITE_LEDGER_ADAPTER_VERSION
} from "./lib/assessment-production-checkpoint-v2.2-compatibility-remedy.mjs";
import {
  POST_CANARY_BATCH_01_SITE_LEDGER_ADAPTER_VERSION
} from "./lib/assessment-production-post-canary-batch-01-compatibility.mjs";
import {
  POST_CANARY_BATCH_02_SITE_LEDGER_ADAPTER_VERSION
} from "./lib/assessment-production-post-canary-batch-02-compatibility.mjs";
import {
  POST_CANARY_BATCH_03_SITE_LEDGER_ADAPTER_VERSION
} from "./lib/assessment-production-post-canary-batch-03-compatibility.mjs";
import {
  POST_CANARY_BATCH_04_SITE_LEDGER_ADAPTER_VERSION
} from "./lib/assessment-production-post-canary-batch-04-compatibility.mjs";
import {
  POST_CANARY_BATCH_05_SITE_LEDGER_ADAPTER_VERSION
} from "./lib/assessment-production-post-canary-batch-05-compatibility.mjs";
import {
  POST_CANARY_BATCH_06_SITE_LEDGER_ADAPTER_VERSION
} from "./lib/assessment-production-post-canary-batch-06-compatibility.mjs";
import {
  POST_CANARY_BATCH_07_SITE_LEDGER_ADAPTER_VERSION
} from "./lib/assessment-production-post-canary-batch-07-compatibility.mjs";
import {
  POST_CANARY_BATCH_08_SITE_LEDGER_ADAPTER_VERSION
} from "./lib/assessment-production-post-canary-batch-08-compatibility.mjs";
import {
  POST_CANARY_BATCH_09_SITE_LEDGER_ADAPTER_VERSION
} from "./lib/assessment-production-post-canary-batch-09-compatibility.mjs";
import {
  POST_CANARY_BATCH_10_COMPATIBILITY_ORDER,
  POST_CANARY_BATCH_10_COMPATIBILITY_ROOT,
  POST_CANARY_BATCH_10_SITE_LEDGER_ADAPTER_VERSION,
  serializedJson,
  validatePostCanaryBatch10SiteLedgerAdapter
} from "./lib/assessment-production-post-canary-batch-10-compatibility.mjs";
import {
  POST_CANARY_BATCH_10_COMPATIBILITY_ACTIVATION_STATUS,
  sha256
} from "./lib/assessment-production-post-canary-batch-10-compatibility-execution.mjs";

const resolve = (relativePath) => path.resolve(process.cwd(), relativePath);
const readJson = (relativePath) =>
  readFile(resolve(relativePath), "utf8").then(JSON.parse);
const fileSha256 = async (relativePath) =>
  sha256(await readFile(resolve(relativePath)));
const root = POST_CANARY_BATCH_10_COMPATIBILITY_ROOT;
const activation = await readJson(`${root}/execution-activation.json`);
const preparationBytes = await readFile(
  resolve(`${root}/preparation-manifest.json`)
);
const preparation = JSON.parse(preparationBytes);
assert.equal(
  activation.status,
  POST_CANARY_BATCH_10_COMPATIBILITY_ACTIVATION_STATUS
);
assert.equal(activation.preparation.sha256, sha256(preparationBytes));
assert.equal(activation.authorization.compatibilityExecution, true);
assert.equal(activation.authorization.validatorMigration, true);
assert.equal(activation.authorization.stagingLedgerWrite, true);

const validatorSource = await readFile(
  resolve(activation.validator.path),
  "utf8"
);
assert.equal(sha256(validatorSource), activation.validator.proposedSha256);
const validator = await import(
  `./validate-debates.mjs?batch10Compatibility=${activation.validator.proposedSha256}`
);
for (const schemaVersion of [
  CHECKPOINT_V22_SITE_LEDGER_ADAPTER_VERSION,
  POST_CANARY_BATCH_01_SITE_LEDGER_ADAPTER_VERSION,
  POST_CANARY_BATCH_02_SITE_LEDGER_ADAPTER_VERSION,
  POST_CANARY_BATCH_03_SITE_LEDGER_ADAPTER_VERSION,
  POST_CANARY_BATCH_04_SITE_LEDGER_ADAPTER_VERSION,
  POST_CANARY_BATCH_05_SITE_LEDGER_ADAPTER_VERSION,
  POST_CANARY_BATCH_06_SITE_LEDGER_ADAPTER_VERSION,
  POST_CANARY_BATCH_07_SITE_LEDGER_ADAPTER_VERSION,
  POST_CANARY_BATCH_08_SITE_LEDGER_ADAPTER_VERSION,
  POST_CANARY_BATCH_09_SITE_LEDGER_ADAPTER_VERSION,
  POST_CANARY_BATCH_10_SITE_LEDGER_ADAPTER_VERSION
]) {
  assert.equal(
    validator.isAdjudicatedConsensusLedgerAdapterVersion(schemaVersion),
    true,
    schemaVersion
  );
}

let sections = 0;
let moves = 0;
let oneSidedDisplayRows = 0;
let emptyReferenceLinks = 0;
let suppliedReferenceLinks = 0;
let positiveRoutes = 0;
let negativeControls = 0;
for (const lock of activation.packetHashes) {
  const packetText = await readFile(resolve(lock.path), "utf8");
  const packet = JSON.parse(packetText);
  const ledgerText = await readFile(resolve(lock.stagedLedgerPath), "utf8");
  const ledger = JSON.parse(ledgerText);
  const candidate = await readJson(packet.sources.candidate);
  assert.equal(sha256(packetText), lock.sha256);
  assert.equal(sha256(ledgerText), lock.stagedLedgerSha256);
  assert.equal(Buffer.byteLength(ledgerText), lock.stagedLedgerBytes);
  const routeLock =
    validator.validatePostCanaryBatch10LedgerAdapterRouteLocks({
      debate: candidate,
      ledgerText,
      packetPath: lock.path,
      packetText,
      packet,
      activation,
      preparationText: preparationBytes.toString("utf8")
    });
  assert.equal(routeLock.debateNumber, lock.debateNumber);
  const route = validator.validatePostCanaryBatch10LedgerAdapterRoute({
    debate: candidate,
    ledger,
    ledgerText
  });
  assert.equal(route.repositoryScoreReplayPassed, true);
  const adapter = validatePostCanaryBatch10SiteLedgerAdapter({
    adapter: ledger,
    candidate,
    expectedSourceLocks: packet.sourceLocks
  });
  assert.equal(adapter.repositoryScoreReplayPassed, true);
  sections += adapter.sections;
  moves += adapter.moves;
  oneSidedDisplayRows += candidate.sections
    .flatMap((section) => section.exchanges)
    .filter((exchange) => Boolean(exchange.pro) !== Boolean(exchange.con))
    .length;
  for (const side of ["pro", "con"]) {
    for (const blunder of candidate.overall[side].blunders) {
      if (blunder.links.length === 0) emptyReferenceLinks += 1;
      for (const link of blunder.links) {
        const reference = referenceFromUrl(link.url);
        assert.ok(reference, `${lock.debateNumber}: supplied reference invalid`);
        assert.ok(
          getReferenceDefinition(reference.type, reference.slug),
          `${lock.debateNumber}: supplied reference definition missing`
        );
        suppliedReferenceLinks += 1;
      }
    }
  }
  positiveRoutes += 1;

  const badActivation = structuredClone(activation);
  badActivation.status = "tampered";
  assert.throws(() =>
    validator.validatePostCanaryBatch10LedgerAdapterRouteLocks({
      debate: candidate,
      ledgerText,
      packetPath: lock.path,
      packetText,
      packet,
      activation: badActivation,
      preparationText: preparationBytes.toString("utf8")
    })
  );
  negativeControls += 1;

  assert.throws(() =>
    validator.validatePostCanaryBatch10LedgerAdapterRouteLocks({
      debate: candidate,
      ledgerText,
      packetPath: `${lock.path}.tampered`,
      packetText,
      packet,
      activation,
      preparationText: preparationBytes.toString("utf8")
    })
  );
  negativeControls += 1;

  assert.throws(() =>
    validator.validatePostCanaryBatch10LedgerAdapterRouteLocks({
      debate: candidate,
      ledgerText: `${ledgerText} `,
      packetPath: lock.path,
      packetText,
      packet,
      activation,
      preparationText: preparationBytes.toString("utf8")
    })
  );
  negativeControls += 1;

  const candidateTamper = structuredClone(candidate);
  const firstMove = candidateTamper.sections
    .flatMap((section) => section.exchanges)
    .flatMap((exchange) => [exchange.pro, exchange.con])
    .find(Boolean);
  firstMove.ledgerMoveId = `${firstMove.ledgerMoveId}-tampered`;
  assert.throws(() =>
    validatePostCanaryBatch10SiteLedgerAdapter({
      adapter: ledger,
      candidate: candidateTamper,
      expectedSourceLocks: packet.sourceLocks
    })
  );
  negativeControls += 1;
}

assert.deepEqual(
  activation.packetHashes.map((item) => item.debateNumber),
  POST_CANARY_BATCH_10_COMPATIBILITY_ORDER
);
assert.equal(positiveRoutes, 10);
assert.equal(negativeControls, 40);
assert.equal(sections, 51);
assert.equal(moves, 182);
assert.equal(oneSidedDisplayRows, 8);
assert.equal(emptyReferenceLinks, 54);
assert.equal(suppliedReferenceLinks, 6);
assert.equal(
  await fileSha256(activation.protectedProduction.debates.path),
  activation.protectedProduction.debates.sha256
);
assert.equal(
  await fileSha256(activation.protectedProduction.references.path),
  activation.protectedProduction.references.sha256
);
const ledgerNames = (
  await readdir(resolve("docs/assessment-ledgers"))
)
  .filter((name) => name.endsWith(".json"))
  .sort();
const ledgerRecords = await Promise.all(
  ledgerNames.map(async (name) => {
    const ledgerPath = `docs/assessment-ledgers/${name}`;
    return { path: ledgerPath, sha256: await fileSha256(ledgerPath) };
  })
);
assert.equal(
  activation.protectedProduction.productionLedgers.files,
  ledgerRecords.length
);
assert.equal(
  activation.protectedProduction.productionLedgers.digest,
  sha256(serializedJson(ledgerRecords))
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: positiveRoutes,
      sections,
      moves,
      oneSidedDisplayRows,
      emptyReferenceLinks,
      suppliedReferenceLinks,
      positiveRoutes,
      negativeControls,
      existingAdapterRoutesPreserved: 10,
      modelContexts: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0,
      productionMutationPerformed: false
    },
    null,
    2
  )
);
