#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_02_COMPATIBILITY_ORDER,
  POST_CANARY_BATCH_02_COMPATIBILITY_PROTOCOL_ID,
  POST_CANARY_BATCH_02_COMPATIBILITY_ROOT,
  POST_CANARY_BATCH_02_SITE_LEDGER_ADAPTER_VERSION,
  serializedJson,
  sha256,
  validatePostCanaryBatch02SiteLedgerAdapter
} from "./lib/assessment-production-post-canary-batch-02-compatibility.mjs";

const resolve = (relativePath) => path.resolve(process.cwd(), relativePath);
const readJson = (relativePath) =>
  readFile(resolve(relativePath), "utf8").then(JSON.parse);
const exists = (relativePath) =>
  access(resolve(relativePath)).then(
    () => true,
    () => false
  );
const preparationPath =
  `${POST_CANARY_BATCH_02_COMPATIBILITY_ROOT}/preparation-manifest.json`;
const analysisPath =
  `${POST_CANARY_BATCH_02_COMPATIBILITY_ROOT}/analysis.json`;
const [preparation, analysis] = await Promise.all([
  readJson(preparationPath),
  readJson(analysisPath)
]);

assert.equal(
  preparation.status,
  "post-canary-batch-02-compatibility-plan-prepared-and-frozen"
);
assert.equal(
  analysis.status,
  "post-canary-batch-02-compatibility-plan-freeze-passed"
);
assert.equal(
  preparation.protocolId,
  POST_CANARY_BATCH_02_COMPATIBILITY_PROTOCOL_ID
);
assert.equal(preparation.productionCanary, false);
assert.equal(preparation.batchNumber, 2);
assert.equal(preparation.planningOnly, true);
assert.equal(preparation.directIncrementalCostCapUsd, 0);
assert.equal(preparation.invariants.assessmentModel, "5.6 Sol");
assert.equal(preparation.invariants.reasoningEffort, "low");
assert.equal(
  preparation.invariants.displayedRubric,
  "Slugfester Reassessment Rubric v2"
);
assert.equal(
  preparation.invariants.chatGptSubscriptionAuthenticationPreserved,
  true
);
assert.equal(preparation.invariants.isolatedModelPassesPreserved, true);
assert.equal(
  preparation.invariants.scoreBlindnessOfCompletedModelPassesPreserved,
  true
);
assert.equal(preparation.invariants.integerRoundedTiesAllowed, true);
assert.equal(preparation.invariants.oneCompletedScorePassOnly, true);
assert.equal(preparation.invariants.scoreRerunAllowed, false);
assert.equal(preparation.invariants.modelExecutionAllowed, false);
assert.equal(preparation.invariants.paidServiceAllowed, false);
assert.equal(
  preparation.scope.finding,
  "batch-02-site-ledger-adapter-and-validator-route"
);
assert.equal(
  preparation.proposedValidatorRoute.newSchemaVersion,
  POST_CANARY_BATCH_02_SITE_LEDGER_ADAPTER_VERSION
);
assert.equal(
  preparation.proposedValidatorRoute.activationRequirements.length,
  4
);
assert.equal(
  preparation.proposedValidatorRoute.unchangedBehavior.length,
  6
);
assert.equal(preparation.stagedExecutionPlan[1].passLimit, 1);
assert.equal(preparation.stagedExecutionPlan[1].rerunsAllowed, false);
assert.deepEqual(preparation.stagedExecutionPlan[1].forbiddenWrites, [
  "docs/assessment-ledgers/**",
  "src/data/debates.js",
  "src/data/references.js"
]);

assert.equal(preparation.totals.debates, 10);
assert.equal(preparation.totals.planPackets, 10);
assert.equal(preparation.totals.sections, 51);
assert.equal(preparation.totals.moves, 190);
assert.equal(preparation.totals.oneSidedDisplayRows, 14);
assert.equal(preparation.totals.overallBlunders, 61);
assert.equal(preparation.totals.emptyReferenceLinks, 55);
assert.equal(preparation.totals.suppliedReferenceLinks, 6);
assert.equal(preparation.totals.repositoryScoreReplays, 10);
assert.equal(preparation.totals.modelContexts, 0);
assert.equal(preparation.totals.paidServiceCalls, 0);
assert.equal(preparation.totals.directIncrementalCostUsd, 0);
assert.equal(preparation.totals.scoreChanges, 0);
assert.equal(preparation.totals.proseChanges, 0);
assert.equal(preparation.totals.attributionChanges, 0);
assert.equal(preparation.totals.optionalReferenceBehaviorChanges, 0);
assert.equal(preparation.totals.productionMutations, 0);

assert.equal(preparation.authorization.compatibilityPlanPreparation, true);
for (const forbidden of [
  "compatibilityExecutionActivation",
  "compatibilityExecution",
  "validatorMigration",
  "stagingLedgerWrite",
  "modelExecution",
  "paidServices",
  "productionLedgerPublication",
  "productionMutation",
  "nextBatchSelection"
]) {
  assert.equal(preparation.authorization[forbidden], false, forbidden);
}
assert.equal(
  preparation.nextAuthorizedAction,
  "user-approval-required-before-batch-02-production-compatibility-execution-activation"
);

assert.equal(
  await exists(
    `${POST_CANARY_BATCH_02_COMPATIBILITY_ROOT}/execution-activation.json`
  ),
  false
);
assert.equal(
  await exists(`${POST_CANARY_BATCH_02_COMPATIBILITY_ROOT}/execution.json`),
  false
);
assert.equal(
  await exists(
    `${POST_CANARY_BATCH_02_COMPATIBILITY_ROOT}/output-bundle/staged-ledgers`
  ),
  false
);

const packetNumbers = preparation.artifacts.packets.map(
  (packet) => packet.debateNumber
);
assert.deepEqual(packetNumbers, POST_CANARY_BATCH_02_COMPATIBILITY_ORDER);
for (const packetRecord of preparation.artifacts.packets) {
  const packetBytes = await readFile(resolve(packetRecord.path));
  assert.equal(sha256(packetBytes), packetRecord.sha256);
  const packet = JSON.parse(packetBytes);
  assert.equal(packet.planningOnly, true);
  assert.equal(packet.productionCanary, false);
  assert.equal(packet.batchNumber, 2);
  assert.equal(packet.authorization.compatibilityExecution, false);
  assert.equal(packet.authorization.validatorMigration, false);
  assert.equal(packet.authorization.stagingLedgerWrite, false);
  assert.equal(packet.authorization.productionLedgerPublication, false);
  assert.equal(packet.authorization.productionMutation, false);
  assert.equal(
    sha256(serializedJson(packet.proposedAdapterExactOutput)),
    packet.proposedAdapterSha256
  );
  assert.equal(
    packet.proposedAdapterSha256,
    packetRecord.proposedAdapterSha256
  );
  const candidate = await readJson(packet.sources.candidate);
  const positive = validatePostCanaryBatch02SiteLedgerAdapter({
    adapter: packet.proposedAdapterExactOutput,
    candidate,
    expectedSourceLocks: packet.sourceLocks
  });
  assert.equal(positive.repositoryScoreReplayPassed, true);
  assert.equal(positive.productionMutationPerformed, false);

  const ratingTamper = structuredClone(packet.proposedAdapterExactOutput);
  ratingTamper.scoringJudgment.moves[0].ratings.logicalCoherence.value = 0;
  assert.throws(() =>
    validatePostCanaryBatch02SiteLedgerAdapter({
      adapter: ratingTamper,
      candidate,
      expectedSourceLocks: packet.sourceLocks
    })
  );

  const sourceTamper = structuredClone(packet.proposedAdapterExactOutput);
  sourceTamper.sourceLocks.finalLedgerSha256 = "0".repeat(64);
  assert.throws(() =>
    validatePostCanaryBatch02SiteLedgerAdapter({
      adapter: sourceTamper,
      candidate,
      expectedSourceLocks: packet.sourceLocks
    })
  );

  const routeTamper = structuredClone(packet.proposedAdapterExactOutput);
  routeTamper.schemaVersion =
    "1.0-production-checkpoint-v2.2-site-ledger-adapter";
  assert.throws(() =>
    validatePostCanaryBatch02SiteLedgerAdapter({
      adapter: routeTamper,
      candidate,
      expectedSourceLocks: packet.sourceLocks
    })
  );

  const candidateTamper = structuredClone(candidate);
  const firstMove = candidateTamper.sections
    .flatMap((section) => section.exchanges)
    .flatMap((exchange) => [exchange.pro, exchange.con])
    .find(Boolean);
  firstMove.ledgerMoveId = `${firstMove.ledgerMoveId}-tampered`;
  assert.throws(() =>
    validatePostCanaryBatch02SiteLedgerAdapter({
      adapter: packet.proposedAdapterExactOutput,
      candidate: candidateTamper,
      expectedSourceLocks: packet.sourceLocks
    })
  );

  assert.equal(await exists(packet.futurePaths.stagedLedger), false);
  assert.equal(await exists(packet.futurePaths.productionLedger), false);
}

for (const [sourcePath, expectedHash] of Object.entries(
  preparation.frozenSources
)) {
  assert.equal(
    sha256(await readFile(resolve(sourcePath))),
    expectedHash,
    sourcePath
  );
}
assert.equal(
  analysis.preparation.sha256,
  sha256(serializedJson(preparation))
);
assert.equal(analysis.checks.activeValidatorChanged, false);
assert.equal(analysis.checks.batch01RoutePreservationSpecified, true);
assert.equal(analysis.checks.stagingLedgersWritten, 0);
assert.equal(analysis.checks.productionLedgersWritten, 0);
assert.equal(analysis.checks.productionDebatesChanged, false);
assert.equal(analysis.checks.modelContexts, 0);
assert.equal(analysis.checks.paidServiceCalls, 0);
assert.equal(analysis.checks.productionMutationPerformed, false);

console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: packetNumbers.length,
      sections: preparation.totals.sections,
      moves: preparation.totals.moves,
      deterministicScoreReplays: packetNumbers.length,
      negativeAdapterControls: packetNumbers.length * 4,
      validatorRouteDefined: true,
      activeValidatorChanged: false,
      modelContexts: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0,
      productionMutationPerformed: false
    },
    null,
    2
  )
);
