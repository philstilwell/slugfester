#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  CHECKPOINT_V22_COMPATIBILITY_ORDER,
  CHECKPOINT_V22_COMPATIBILITY_REMEDY_ROOT,
  serializedJson,
  sha256,
  validateCheckpointV22SiteLedgerAdapter
} from "./lib/assessment-production-checkpoint-v2.2-compatibility-remedy.mjs";

const resolve = (relativePath) => path.resolve(process.cwd(), relativePath);
const readJson = (relativePath) =>
  readFile(resolve(relativePath), "utf8").then(JSON.parse);
const exists = (relativePath) =>
  access(resolve(relativePath)).then(
    () => true,
    () => false
  );
const preparationPath =
  `${CHECKPOINT_V22_COMPATIBILITY_REMEDY_ROOT}/preparation-manifest.json`;
const analysisPath = `${CHECKPOINT_V22_COMPATIBILITY_REMEDY_ROOT}/analysis.json`;
const [preparation, analysis] = await Promise.all([
  readJson(preparationPath),
  readJson(analysisPath)
]);

assert.equal(
  preparation.status,
  "compatibility-remedy-plan-prepared-and-frozen"
);
assert.equal(analysis.status, "compatibility-remedy-plan-freeze-passed");
assert.equal(preparation.planningOnly, true);
assert.equal(preparation.invariants.assessmentModel, "5.6 Sol");
assert.equal(
  preparation.invariants.displayedRubric,
  "Slugfester Reassessment Rubric v2"
);
assert.equal(
  preparation.invariants.chatGptSubscriptionAuthenticationPreserved,
  true
);
assert.equal(
  preparation.invariants.scoreBlindnessOfCompletedJudgmentPassesPreserved,
  true
);
assert.equal(preparation.invariants.integerRoundedTiesAllowed, true);
assert.equal(preparation.invariants.oneCompletedScorePassOnly, true);
assert.equal(preparation.invariants.scoreRerunAllowed, false);
assert.deepEqual(
  preparation.scope.findings,
  [
    "optional-overall-reference-links",
    "checkpoint-ledger-schema-adapter"
  ]
);
assert.equal(preparation.totals.debates, 10);
assert.equal(preparation.totals.sections, 51);
assert.equal(preparation.totals.moves, 188);
assert.equal(preparation.totals.emptyReferenceLinks, 53);
assert.equal(preparation.totals.suppliedReferenceLinks, 3);
assert.equal(preparation.totals.modelContexts, 0);
assert.equal(preparation.totals.meteredApiCostUsd, 0);
assert.equal(preparation.totals.productionMutations, 0);
assert.equal(
  preparation.remedy.optionalOverallReferenceLinks.negativeControls.length,
  5
);
assert.match(
  preparation.remedy.optionalOverallReferenceLinks.exactChange,
  /Keep array type validation and every existing supplied-link/
);
assert.equal(
  preparation.authorization.compatibilityRemedyExecutionActivation,
  true
);
for (const forbidden of [
  "compatibilityRemedyExecution",
  "validatorMigration",
  "stagingLedgerWrite",
  "productionLedgerPublication",
  "productionMutation",
  "remainingProductionBatches"
]) {
  assert.equal(preparation.authorization[forbidden], false, forbidden);
}
assert.equal(
  preparation.nextAuthorizedAction,
  "user-decision-on-compatibility-remedy-execution-activation"
);

assert.equal(
  await exists(
    `${CHECKPOINT_V22_COMPATIBILITY_REMEDY_ROOT}/execution-activation.json`
  ),
  false
);
assert.equal(
  await exists(`${CHECKPOINT_V22_COMPATIBILITY_REMEDY_ROOT}/execution.json`),
  false
);
assert.equal(
  await exists(
    `${CHECKPOINT_V22_COMPATIBILITY_REMEDY_ROOT}/output-bundle/staged-ledgers`
  ),
  false
);

const packetNumbers = preparation.artifacts.packets.map(
  (packet) => packet.debateNumber
);
assert.deepEqual(packetNumbers, CHECKPOINT_V22_COMPATIBILITY_ORDER);
for (const packetRecord of preparation.artifacts.packets) {
  const packetBytes = await readFile(resolve(packetRecord.path));
  assert.equal(sha256(packetBytes), packetRecord.sha256);
  const packet = JSON.parse(packetBytes);
  assert.equal(packet.planningOnly, true);
  assert.equal(packet.authorization.compatibilityRemedyExecution, false);
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
  const positive = validateCheckpointV22SiteLedgerAdapter({
    adapter: packet.proposedAdapterExactOutput,
    candidate,
    expectedSourceLocks: packet.sourceLocks
  });
  assert.equal(positive.repositoryScoreReplayPassed, true);
  assert.equal(positive.productionMutationPerformed, false);

  const ratingTamper = structuredClone(packet.proposedAdapterExactOutput);
  ratingTamper.scoringJudgment.moves[0].ratings.logicalCoherence.value = 0;
  assert.throws(() =>
    validateCheckpointV22SiteLedgerAdapter({
      adapter: ratingTamper,
      candidate,
      expectedSourceLocks: packet.sourceLocks
    })
  );

  const sourceTamper = structuredClone(packet.proposedAdapterExactOutput);
  sourceTamper.sourceLocks.finalLedgerSha256 = "0".repeat(64);
  assert.throws(() =>
    validateCheckpointV22SiteLedgerAdapter({
      adapter: sourceTamper,
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
    validateCheckpointV22SiteLedgerAdapter({
      adapter: packet.proposedAdapterExactOutput,
      candidate: candidateTamper,
      expectedSourceLocks: packet.sourceLocks
    })
  );

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
assert.equal(analysis.checks.stagingLedgersWritten, 0);
assert.equal(analysis.checks.productionLedgersWritten, 0);
assert.equal(analysis.checks.productionDebatesChanged, false);
assert.equal(analysis.checks.productionMutationPerformed, false);

console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: packetNumbers.length,
      sections: preparation.totals.sections,
      moves: preparation.totals.moves,
      deterministicScoreReplays: packetNumbers.length,
      negativeAdapterControls: packetNumbers.length * 3,
      activeValidatorChanged: false,
      productionMutationPerformed: false
    },
    null,
    2
  )
);
