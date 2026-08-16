#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const root = process.cwd();
const correctionRoot =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/production-compatibility/correction-2";
const paths = {
  correctionPacket: `${correctionRoot}/correction-packet.json`,
  preparation: `${correctionRoot}/preparation-manifest.json`,
  analysis: `${correctionRoot}/preparation-analysis.json`,
  futureActivation: `${correctionRoot}/execution-activation.json`,
  futureExecution: `${correctionRoot}/execution.json`,
  futureExecutionAnalysis: `${correctionRoot}/execution-analysis.json`,
  activeValidator: "scripts/validate-debates.mjs",
  correction1ProposedValidator:
    "docs/assessment-production/post-canary-continuation-v1/batch-01/production-compatibility/correction-1/proposed-validator.mjs",
  correction1Activation:
    "docs/assessment-production/post-canary-continuation-v1/batch-01/production-compatibility/correction-1/execution-activation.json",
  correction1Execution:
    "docs/assessment-production/post-canary-continuation-v1/batch-01/production-compatibility/correction-1/execution.json",
  correction1Analysis:
    "docs/assessment-production/post-canary-continuation-v1/batch-01/production-compatibility/correction-1/execution-analysis.json",
  productionDebates: "src/data/debates.js",
  productionReferences: "src/data/references.js"
};

const resolve = (relativePath) => path.resolve(root, relativePath);
const exists = (relativePath) =>
  access(resolve(relativePath)).then(
    () => true,
    () => false
  );
const readBytes = (relativePath) => readFile(resolve(relativePath));
const readText = (relativePath) => readFile(resolve(relativePath), "utf8");
const readJson = (relativePath) => readText(relativePath).then(JSON.parse);
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
const fileSha256 = async (relativePath) => sha256(await readBytes(relativePath));

const [packet, preparation, analysis] = await Promise.all([
  readJson(paths.correctionPacket),
  readJson(paths.preparation),
  readJson(paths.analysis)
]);

assert.equal(
  packet.status,
  "frozen-batch-01-compatibility-correction-2-plan-packet"
);
assert.equal(
  preparation.status,
  "batch-01-compatibility-correction-2-plan-prepared-and-frozen"
);
assert.equal(
  analysis.status,
  "batch-01-compatibility-correction-2-plan-freeze-passed"
);
assert.equal(packet.planningOnly, true);
assert.equal(preparation.planningOnly, true);
assert.equal(preparation.directIncrementalCostCapUsd, 0);
assert.equal(packet.scope.finding, "execution-harness-candidate-source-mismatch");
assert.equal(packet.scope.validatorChangeProposed, false);
assert.equal(packet.scope.packetChangeProposed, false);
assert.equal(packet.scope.stagedAdapterChangeProposed, false);

assert.equal(
  await fileSha256(paths.activeValidator),
  "bd61fcb97ea4480b2768fa4575124eac354b09beb8276ae4a3ba04df9812ddcd"
);
assert.equal(
  await fileSha256(paths.correction1ProposedValidator),
  await fileSha256(paths.activeValidator)
);
assert.equal(
  await fileSha256(paths.correction1Activation),
  "31fd15c130bcfc36c84ad6fb3609c1aa59f889fe4eedefb51dc4209b48fcdcef"
);
assert.equal(
  await fileSha256(paths.correction1Execution),
  "177ad37c3aee1ef07ae75bbcaa88d0a1e4286f9c42337760403d41b647a6828a"
);
assert.equal(
  await fileSha256(paths.correction1Analysis),
  "dacc9ad33198558e431d37ee4e958c221f51cb77bcd7038bc2c13ab60d6521c5"
);
assert.equal(packet.preservedFailure.validatorVerdictReached, false);

const expectedOrder = ["31", "94", "52", "146", "91", "175", "75", "72", "13", "195"];
assert.deepEqual(
  packet.candidateLocks.map((lock) => lock.debateNumber),
  expectedOrder
);
assert.deepEqual(preparation.explicitOrder, expectedOrder);
assert.equal(packet.candidateLocks.length, 10);
assert.equal(new Set(packet.candidateLocks.map((lock) => lock.candidatePath)).size, 10);

let candidateBytes = 0;
let stagedAdapterBytes = 0;
for (const lock of packet.candidateLocks) {
  const [packetBytesValue, candidateBytesValue, stagedLedgerBytesValue] =
    await Promise.all([
      readBytes(lock.packetPath),
      readBytes(lock.candidatePath),
      readBytes(lock.stagedLedgerPath)
    ]);
  const frozenPacket = JSON.parse(packetBytesValue);
  const candidate = JSON.parse(candidateBytesValue);

  assert.equal(sha256(packetBytesValue), lock.packetSha256);
  assert.equal(sha256(candidateBytesValue), lock.candidateSha256);
  assert.equal(candidateBytesValue.length, lock.candidateBytes);
  assert.equal(sha256(stagedLedgerBytesValue), lock.stagedLedgerSha256);
  assert.equal(stagedLedgerBytesValue.length, lock.stagedLedgerBytes);
  assert.equal(frozenPacket.debateNumber, lock.debateNumber);
  assert.equal(frozenPacket.debateId, lock.debateId);
  assert.equal(frozenPacket.sources.candidate, lock.candidatePath);
  assert.equal(
    frozenPacket.sourceLocks.finalCandidateSha256,
    lock.candidateSha256
  );
  assert.equal(frozenPacket.futurePaths.stagedLedger, lock.stagedLedgerPath);
  assert.equal(frozenPacket.futurePaths.productionLedger, lock.productionLedgerPath);
  assert.equal(frozenPacket.proposedAdapterSha256, lock.stagedLedgerSha256);
  assert.equal(candidate.number, lock.debateNumber);
  assert.equal(candidate.id, lock.debateId);
  assert.equal(candidate.assessmentModel, "5.6 Sol");
  assert.equal(
    candidate.assessmentRubric,
    "Slugfester Reassessment Rubric v2"
  );
  assert.ok(candidate.logicalExtension);
  assert.equal(await exists(lock.productionLedgerPath), false);
  assert.notEqual(lock.candidatePath, paths.productionDebates);

  candidateBytes += candidateBytesValue.length;
  stagedAdapterBytes += stagedLedgerBytesValue.length;
}
assert.equal(candidateBytes, 383529);
assert.equal(stagedAdapterBytes, 1063267);

assert.equal(
  packet.candidateSourceContract.selection,
  "For each debate, read the compatibility packet first, then read only packet.sources.candidate as the Batch 1 publication candidate."
);
assert.equal(
  packet.candidateSourceContract.candidateSubstitutionForbidden,
  true
);
assert.equal(
  packet.routeAuthorityContract.liveRouteCredential.doesNotAuthorizeFutureExecution,
  true
);
assert.equal(
  packet.routeAuthorityContract.futureExecutionAuthorization.requiredBeforeAnyFuturePass,
  true
);
assert.equal(
  packet.routeAuthorityContract.unchangedValidatorCanBeTestedWithoutCredentialRewrite,
  true
);
assert.equal(
  packet.routeAuthorityContract.correction1PassMayNotBeReclassifiedOrContinued,
  true
);
assert.equal(packet.futureExecutionPlan.newCorrectionPass, true);
assert.equal(packet.futureExecutionPlan.continuationOfCorrection1, false);
assert.equal(packet.futureExecutionPlan.passLimit, 1);
assert.equal(packet.futureExecutionPlan.rerunsAllowed, false);
assert.equal(packet.futureExecutionPlan.retriesAllowed, false);
assert.equal(packet.futureExecutionPlan.validatorWritesAllowed, false);
assert.equal(packet.futureExecutionPlan.packetWritesAllowed, false);
assert.equal(packet.futureExecutionPlan.stagedAdapterWritesAllowed, false);
assert.equal(packet.futureExecutionPlan.candidateWritesAllowed, false);
assert.equal(packet.futureExecutionPlan.productionWritesAllowed, false);

for (const futurePath of [
  paths.futureActivation,
  paths.futureExecution,
  paths.futureExecutionAnalysis
]) {
  assert.equal(await exists(futurePath), false, futurePath);
}
for (const [sourcePath, expectedHash] of Object.entries(
  preparation.frozenSources
)) {
  assert.equal(await fileSha256(sourcePath), expectedHash, sourcePath);
}
assert.equal(
  await fileSha256(paths.productionDebates),
  "7043a9f8e3da3c6a2dbf9eb7af4c6df37c5eb63d91689c5c406397dca25a6561"
);
assert.equal(
  await fileSha256(paths.productionReferences),
  "b814bb04cf46e6423acd0981b70380a37c22273a1e9fbb14991ec9704920b57b"
);
assert.equal(
  analysis.preparation.sha256,
  await fileSha256(paths.preparation)
);
assert.equal(
  analysis.correctionPacket.sha256,
  await fileSha256(paths.correctionPacket)
);
assert.equal(analysis.checks.candidateLocksValidated, 10);
assert.equal(analysis.checks.validatorChanged, false);
assert.equal(analysis.checks.compatibilityPassesExecuted, 0);
assert.equal(analysis.checks.productionMutationPerformed, false);

for (const key of [
  "correction2ExecutionActivation",
  "compatibilityExecution",
  "compatibilityRerun",
  "validatorRewrite",
  "packetRewrite",
  "stagedAdapterRewrite",
  "candidateRewrite",
  "modelExecution",
  "paidServices",
  "productionLedgerPublication",
  "productionMutation",
  "nextBatchSelection"
]) {
  assert.equal(preparation.authorization[key], false, key);
}
assert.equal(preparation.totals.candidateLocks, 10);
assert.equal(preparation.totals.candidateBytes, 383529);
assert.equal(preparation.totals.stagedAdaptersPreserved, 10);
assert.equal(preparation.totals.stagedAdapterBytesPreserved, 1063267);
assert.equal(preparation.totals.compatibilityPassesExecuted, 0);
assert.equal(preparation.totals.compatibilityReruns, 0);
assert.equal(preparation.totals.modelContexts, 0);
assert.equal(preparation.totals.paidServiceCalls, 0);
assert.equal(preparation.totals.directIncrementalCostUsd, 0);
assert.equal(preparation.totals.productionMutations, 0);
assert.equal(
  preparation.nextAuthorizedAction,
  "user-approval-required-before-batch-01-compatibility-correction-2-activation-and-single-execution"
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      finding: packet.scope.finding,
      candidateLocksValidated: packet.candidateLocks.length,
      candidateBytes,
      packetsPreserved: packet.candidateLocks.length,
      stagedAdaptersPreserved: packet.candidateLocks.length,
      stagedAdapterBytes,
      exactValidatorPreserved: true,
      correction1EvidencePreserved: true,
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
