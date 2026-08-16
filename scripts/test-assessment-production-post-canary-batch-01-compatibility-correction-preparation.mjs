#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

import {
  POST_CANARY_BATCH_01_COMPATIBILITY_CORRECTION_PROTOCOL_ID,
  POST_CANARY_BATCH_01_COMPATIBILITY_CORRECTION_ROOT,
  buildPostCanaryBatch01CompatibilityCorrectedValidator,
  serializedJson,
  sha256
} from "./lib/assessment-production-post-canary-batch-01-compatibility-correction.mjs";

const resolve = (relativePath) => path.resolve(process.cwd(), relativePath);
const readJson = (relativePath) =>
  readFile(resolve(relativePath), "utf8").then(JSON.parse);
const exists = (relativePath) =>
  access(resolve(relativePath)).then(
    () => true,
    () => false
  );
const paths = {
  preparation:
    `${POST_CANARY_BATCH_01_COMPATIBILITY_CORRECTION_ROOT}/preparation-manifest.json`,
  preparationAnalysis:
    `${POST_CANARY_BATCH_01_COMPATIBILITY_CORRECTION_ROOT}/preparation-analysis.json`,
  correctionPacket:
    `${POST_CANARY_BATCH_01_COMPATIBILITY_CORRECTION_ROOT}/correction-packet.json`,
  proposedValidator:
    `${POST_CANARY_BATCH_01_COMPATIBILITY_CORRECTION_ROOT}/proposed-validator.mjs`,
  activeValidator: "scripts/validate-debates.mjs"
};
const [preparation, preparationAnalysis, correctionPacket] =
  await Promise.all([
    readJson(paths.preparation),
    readJson(paths.preparationAnalysis),
    readJson(paths.correctionPacket)
  ]);
const [activeValidator, proposedValidator] = await Promise.all([
  readFile(resolve(paths.activeValidator), "utf8"),
  readFile(resolve(paths.proposedValidator), "utf8")
]);

assert.equal(
  preparation.status,
  "batch-01-compatibility-correction-plan-prepared-and-frozen"
);
assert.equal(
  preparationAnalysis.status,
  "batch-01-compatibility-correction-plan-freeze-passed"
);
assert.equal(
  preparation.protocolId,
  POST_CANARY_BATCH_01_COMPATIBILITY_CORRECTION_PROTOCOL_ID
);
assert.equal(preparation.productionCanary, false);
assert.equal(preparation.batchNumber, 1);
assert.equal(preparation.planningOnly, true);
assert.equal(preparation.directIncrementalCostCapUsd, 0);
assert.deepEqual(preparation.scope.findings, [
  "route-level-tamper-control",
  "mutable-analysis-hash-conflict"
]);
assert.equal(preparation.invariants.assessmentModel, "5.6 Sol");
assert.equal(preparation.invariants.reasoningEffort, "low");
assert.equal(
  preparation.invariants.chatGptSubscriptionAuthenticationPreserved,
  true
);
assert.equal(preparation.invariants.isolatedModelPassesPreserved, true);
assert.equal(preparation.invariants.scoreBlindnessPreserved, true);
assert.equal(preparation.invariants.integerRoundedTiesAllowed, true);
assert.equal(preparation.invariants.oneCompletedScorePassOnly, true);
assert.equal(preparation.invariants.scoreRerunAllowed, false);
assert.equal(preparation.invariants.modelExecutionAllowed, false);
assert.equal(preparation.invariants.paidServiceAllowed, false);
assert.equal(preparation.invariants.stagedAdapterRewriteAllowed, false);
assert.equal(preparation.invariants.packetRewriteAllowed, false);
assert.equal(preparation.invariants.productionMutationAllowed, false);

assert.equal(
  sha256(activeValidator),
  correctionPacket.attemptedValidator.sha256
);
assert.equal(
  sha256(activeValidator),
  "3fb5dd3a3f1e7414966fc6fb7b44c840c80e6d1259195f41f032b5557bc81c7f"
);
assert.equal(
  proposedValidator,
  buildPostCanaryBatch01CompatibilityCorrectedValidator(activeValidator)
);
assert.equal(
  sha256(proposedValidator),
  correctionPacket.proposedValidator.sha256
);
assert.equal(
  correctionPacket.proposedValidator.sha256,
  preparation.correction.proposedValidator.sha256
);
assert.equal(correctionPacket.exactTransformations.length, 6);
assert.equal(proposedValidator.includes("analysisText"), false);
assert.equal(
  proposedValidator.includes(
    "/correction-1/execution-activation.json"
  ),
  true
);
assert.equal(
  proposedValidator.includes(
    "post-canary-batch-01-compatibility-correction-1-execution-authorized-and-frozen"
  ),
  true
);
for (const required of [
  "sha256(preparationText) !== activation.preparation?.sha256",
  "sha256(packetText) !== packetLock.sha256",
  "sha256(ledgerText) !== packetLock.proposedAdapterSha256",
  "validatePostCanaryBatch01SiteLedgerAdapter({"
]) {
  assert.equal(proposedValidator.includes(required), true, required);
}

const syntax = spawnSync(process.execPath, ["--check", resolve(paths.proposedValidator)], {
  encoding: "utf8"
});
assert.equal(syntax.status, 0, syntax.stderr);

assert.equal(preparation.preservedArtifacts.packets.length, 10);
assert.equal(preparation.preservedArtifacts.stagedLedgers.length, 10);
assert.equal(preparation.preservedArtifacts.packetRewrites, 0);
assert.equal(preparation.preservedArtifacts.stagedAdapterRewrites, 0);
let stagedBytes = 0;
let byteTamperHashControls = 0;
for (const packetLock of preparation.preservedArtifacts.packets) {
  const stagedLock = preparation.preservedArtifacts.stagedLedgers.find(
    (item) => item.debateNumber === packetLock.debateNumber
  );
  assert.ok(stagedLock);
  const packetBytes = await readFile(resolve(packetLock.path));
  const packet = JSON.parse(packetBytes);
  const stagedBytesValue = await readFile(resolve(stagedLock.path));
  assert.equal(sha256(packetBytes), packetLock.sha256);
  assert.equal(sha256(stagedBytesValue), stagedLock.sha256);
  assert.equal(packet.proposedAdapterSha256, stagedLock.sha256);
  assert.equal(
    stagedBytesValue.toString("utf8"),
    serializedJson(packet.proposedAdapterExactOutput)
  );
  stagedBytes += stagedBytesValue.length;

  const tampered = structuredClone(packet.proposedAdapterExactOutput);
  const firstRating = tampered.scoringJudgment.moves[0].ratings.logicalCoherence;
  firstRating.value = firstRating.value === 100 ? 99 : firstRating.value + 1;
  assert.notEqual(
    sha256(serializedJson(tampered)),
    packet.proposedAdapterSha256
  );
  byteTamperHashControls += 1;
  assert.equal(await exists(packet.futurePaths.productionLedger), false);
}
assert.equal(stagedBytes, 1063267);
assert.equal(byteTamperHashControls, 10);

assert.equal(preparation.futureExecutionPlan.passLimit, 1);
assert.equal(preparation.futureExecutionPlan.rerunsAllowed, false);
assert.equal(preparation.futureExecutionPlan.continuationOfFailedPass, false);
assert.equal(preparation.futureExecutionPlan.newCorrectionPass, true);
assert.equal(
  preparation.futureExecutionPlan.forbiddenWrites.includes(
    "docs/assessment-ledgers/**"
  ),
  true
);
assert.equal(
  preparation.futureExecutionPlan.forbiddenWrites.includes(
    "src/data/debates.js"
  ),
  true
);
for (const forbidden of [
  "correctionExecutionActivation",
  "validatorCorrectionExecution",
  "compatibilityRerun",
  "modelExecution",
  "paidServices",
  "productionLedgerPublication",
  "productionMutation",
  "nextBatchSelection"
]) {
  assert.equal(preparation.authorization[forbidden], false, forbidden);
}
assert.equal(preparation.totals.compatibilityPassesExecuted, 0);
assert.equal(preparation.totals.compatibilityReruns, 0);
assert.equal(preparation.totals.modelContexts, 0);
assert.equal(preparation.totals.paidServiceCalls, 0);
assert.equal(preparation.totals.directIncrementalCostUsd, 0);
assert.equal(preparation.totals.productionLedgerPublications, 0);
assert.equal(preparation.totals.productionMutations, 0);

for (const futurePath of [
  preparation.artifacts.futureActivation,
  preparation.artifacts.futureExecution,
  preparation.artifacts.futureExecutionAnalysis
]) {
  assert.equal(await exists(futurePath), false, futurePath);
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
  preparationAnalysis.preparation.sha256,
  sha256(serializedJson(preparation))
);
assert.equal(
  preparationAnalysis.correctionPacket.sha256,
  sha256(serializedJson(correctionPacket))
);
assert.equal(preparationAnalysis.checks.activeValidatorChangedThisStage, false);
assert.equal(preparationAnalysis.checks.compatibilityPassesExecuted, 0);
assert.equal(preparationAnalysis.checks.packetRewrites, 0);
assert.equal(preparationAnalysis.checks.stagedAdapterRewrites, 0);
assert.equal(preparationAnalysis.checks.productionMutationPerformed, false);
assert.equal(
  preparation.nextAuthorizedAction,
  "user-approval-required-before-batch-01-compatibility-correction-1-activation-and-single-execution"
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      findings: preparation.scope.findings.length,
      exactValidatorTransformations:
        correctionPacket.exactTransformations.length,
      proposedValidatorSha256: correctionPacket.proposedValidator.sha256,
      packetsPreserved: preparation.preservedArtifacts.packets.length,
      stagedAdaptersPreserved:
        preparation.preservedArtifacts.stagedLedgers.length,
      byteTamperHashControls,
      compatibilityPassesExecuted: 0,
      compatibilityReruns: 0,
      modelContexts: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0,
      productionMutationPerformed: false
    },
    null,
    2
  )
);
