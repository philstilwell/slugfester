#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_06_COMPATIBILITY_ORDER,
  POST_CANARY_BATCH_06_COMPATIBILITY_ROOT,
  serializedJson,
  sha256 as compatibilitySha256
} from "./lib/assessment-production-post-canary-batch-06-compatibility.mjs";
import {
  POST_CANARY_BATCH_06_COMPATIBILITY_ACTIVATION_STATUS,
  buildPostCanaryBatch06ValidatorSource,
  sha256,
  validatePostCanaryBatch06ValidatorSource
} from "./lib/assessment-production-post-canary-batch-06-compatibility-execution.mjs";

const resolve = (relativePath) => path.resolve(process.cwd(), relativePath);
const readJson = (relativePath) =>
  readFile(resolve(relativePath), "utf8").then(JSON.parse);
const exists = (relativePath) =>
  access(resolve(relativePath)).then(
    () => true,
    () => false
  );
const fileSha256 = async (relativePath) =>
  sha256(await readFile(resolve(relativePath)));
const root = POST_CANARY_BATCH_06_COMPATIBILITY_ROOT;
const preparationPath = `${root}/preparation-manifest.json`;
const activationPath = `${root}/execution-activation.json`;
const preparationBytes = await readFile(resolve(preparationPath));
const preparation = JSON.parse(preparationBytes);
const activation = await readJson(activationPath);

assert.equal(
  activation.status,
  POST_CANARY_BATCH_06_COMPATIBILITY_ACTIVATION_STATUS
);
assert.equal(activation.preparation.path, preparationPath);
assert.equal(activation.preparation.sha256, sha256(preparationBytes));
assert.equal(activation.directIncrementalCostCapUsd, 0);
assert.equal(activation.executionDiscipline.compatibilityPassesMaximum, 1);
assert.equal(activation.executionDiscipline.attemptsPerPass, 1);
assert.equal(activation.executionDiscipline.rerunsAllowed, false);
assert.equal(activation.executionDiscipline.retriesAllowed, false);
assert.equal(activation.executionDiscipline.automaticRepairsAllowed, false);
assert.equal(activation.authorization.executionActivation, true);
assert.equal(activation.authorization.compatibilityExecution, true);
assert.equal(activation.authorization.validatorMigration, true);
assert.equal(activation.authorization.stagingLedgerWrite, true);
assert.equal(activation.authorization.compatibilityPasses, 1);
for (const forbidden of [
  "compatibilityRerun",
  "packetRewrite",
  "adapterRewrite",
  "modelExecution",
  "paidServices",
  "scoreDerivation",
  "scoreRerun",
  "proseRewrite",
  "productionLedgerPublication",
  "productionMutation",
  "nextBatchSelection"
]) {
  assert.equal(activation.authorization[forbidden], false, forbidden);
}
assert.equal(
  activation.nextAuthorizedAction,
  "execute-one-frozen-batch-06-production-compatibility-staging-pass-no-reruns"
);

assert.deepEqual(
  activation.packetHashes.map((item) => item.debateNumber),
  POST_CANARY_BATCH_06_COMPATIBILITY_ORDER
);
for (const lock of activation.packetHashes) {
  const packetBytes = await readFile(resolve(lock.path));
  const packet = JSON.parse(packetBytes);
  assert.equal(sha256(packetBytes), lock.sha256);
  assert.equal(packet.debateNumber, lock.debateNumber);
  assert.equal(packet.debateId, lock.debateId);
  assert.equal(packet.proposedAdapterSha256, lock.proposedAdapterSha256);
  assert.equal(packet.futurePaths.stagedLedger, lock.stagedLedgerPath);
  assert.equal(packet.futurePaths.productionLedger, lock.productionLedgerPath);
  assert.equal(lock.stagedLedgerSha256, lock.proposedAdapterSha256);
  assert.equal(
    compatibilitySha256(serializedJson(packet.proposedAdapterExactOutput)),
    lock.proposedAdapterSha256
  );
  assert.equal(await exists(lock.stagedLedgerPath), false);
  assert.equal(await exists(lock.productionLedgerPath), false);
}

for (const [toolPath, expectedHash] of Object.entries(
  activation.executionToolHashes
)) {
  assert.equal(await fileSha256(toolPath), expectedHash, toolPath);
}
const baselineSource = await readFile(resolve(activation.validator.path), "utf8");
assert.equal(sha256(baselineSource), activation.validator.baselineSha256);
const proposedSource = buildPostCanaryBatch06ValidatorSource(baselineSource);
const proposedValidation = validatePostCanaryBatch06ValidatorSource(
  proposedSource
);
assert.equal(proposedValidation.sha256, activation.validator.proposedSha256);
assert.equal(proposedValidation.bytes, activation.validator.proposedBytes);

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
assert.equal(await exists(`${root}/execution.json`), false);
assert.equal(
  await exists(`${root}/output-bundle/staged-ledgers`),
  false
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      packets: activation.packetHashes.length,
      proposedValidatorSha256: activation.validator.proposedSha256,
      executionToolsHashLocked: Object.keys(
        activation.executionToolHashes
      ).length,
      productionLedgersProtected:
        activation.protectedProduction.productionLedgers.files,
      compatibilityPassesAuthorized: 1,
      rerunsAllowed: false,
      modelContexts: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0,
      productionMutationPerformed: false
    },
    null,
    2
  )
);
