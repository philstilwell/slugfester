#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_02_PUBLICATION_FINALIZATION_ORDER,
  POST_CANARY_BATCH_02_PUBLICATION_FINALIZATION_PROTOCOL_ID,
  POST_CANARY_BATCH_02_PUBLICATION_FINALIZATION_ROOT
} from "./lib/assessment-production-post-canary-batch-02-publication-finalization.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const activatedAtIndex = process.argv.indexOf("--activated-at");
const activatedAt =
  activatedAtIndex >= 0 ? process.argv[activatedAtIndex + 1] : null;
assertV4(
  activatedAt && !Number.isNaN(Date.parse(activatedAt)),
  "--activated-at requires an ISO timestamp"
);

const ROOT = POST_CANARY_BATCH_02_PUBLICATION_FINALIZATION_ROOT;
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) =>
  access(path.resolve(file)).then(
    () => true,
    () => false
  );

assertV4(!(await exists(ACTIVATION)), `${ACTIVATION} already exists`);
const preparationBytes = await readFile(path.resolve(PREPARATION));
const preparation = JSON.parse(preparationBytes);
assertV4(
  preparation.status ===
      "frozen-post-canary-batch-02-publication-finalization-prepared-not-authorized" &&
    preparation.protocolId ===
      POST_CANARY_BATCH_02_PUBLICATION_FINALIZATION_PROTOCOL_ID &&
    preparation.productionCanary === false &&
    preparation.batchNumber === 2 &&
    preparation.stagingOnly === true &&
    preparation.contexts?.length === 10 &&
    canonicalJson(preparation.explicitOrder) ===
      canonicalJson(POST_CANARY_BATCH_02_PUBLICATION_FINALIZATION_ORDER) &&
    preparation.executionPolicy?.deterministicRepositoryFinalizationPassesMaximum ===
      1 &&
    preparation.executionPolicy?.rerunsMaximum === 0 &&
    preparation.executionPolicy?.modelContexts === 0 &&
    preparation.executionPolicy?.separateActivationRequired === true &&
    preparation.authorization?.publicationFinalizationPreparation === true &&
    preparation.authorization?.publicationFinalizationActivation === false &&
    preparation.authorization?.publicationFinalization === false &&
    preparation.authorization?.modelExecution === false &&
    preparation.authorization?.paidServices === false &&
    preparation.authorization?.productionMutation === false &&
    preparation.authorization?.nextBatchSelection === false &&
    Object.values(preparation.stopRules).every(Boolean),
  "the Batch 2 publication finalization is not prepared"
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `Batch 2 finalization preparation source hash mismatch: ${file}`
  );
}
for (const file of preparation.futureOutputPathsExcludedFromSourceHashes) {
  if (file !== ACTIVATION) {
    assertV4(!(await exists(file)), `future Batch 2 finalization output exists: ${file}`);
  }
}

const activation = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-02-publication-finalization-execution-activation",
  protocolId: POST_CANARY_BATCH_02_PUBLICATION_FINALIZATION_PROTOCOL_ID,
  status: "frozen-post-canary-batch-02-publication-finalization-authorized",
  activatedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: false,
  batchNumber: 2,
  stagingOnly: true,
  userAuthorization: {
    instruction: preparation.userAuthorization.instruction,
    directIncrementalCostUsdMaximum: 0,
    deterministicFinalizationPasses: 1,
    rerunsMaximum: 0,
    modelExecution: false,
    paidServices: false,
    renderingVerification: false,
    validatorMigration: false,
    productionLedgerPublication: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  preparation: PREPARATION,
  preparationSha256: sha256(preparationBytes),
  inputs: structuredClone(preparation.inputs),
  explicitOrder: structuredClone(preparation.explicitOrder),
  contexts: structuredClone(preparation.contexts),
  executionPolicy: structuredClone(preparation.executionPolicy),
  finalizationPolicy: structuredClone(preparation.finalizationPolicy),
  preservedControls: structuredClone(preparation.preservedControls),
  compatibilityBoundary: structuredClone(preparation.compatibilityBoundary),
  stopRules: structuredClone(preparation.stopRules),
  artifacts: structuredClone(preparation.artifacts),
  futureOutputPathsExcludedFromSourceHashes:
    preparation.futureOutputPathsExcludedFromSourceHashes.filter(
      (file) => file !== ACTIVATION
    ),
  sourceHashes: {
    ...structuredClone(preparation.sourceHashes),
    [PREPARATION]: sha256(preparationBytes)
  },
  authorization: {
    publicationFinalization: true,
    deterministicFinalizationPassesMaximum: 1,
    rerun: false,
    modelExecution: false,
    paidServices: false,
    scoreRecalculation: false,
    renderingVerification: false,
    validatorMigration: false,
    productionLedgerPublication: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextRequiredAction:
    "execute-one-frozen-batch-02-deterministic-publication-finalization-pass"
};

if (shouldWrite) {
  await writeFile(
    path.resolve(ACTIVATION),
    `${JSON.stringify(activation, null, 2)}\n`
  );
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? activation.status : "preview",
      debates: activation.contexts.length,
      deterministicFinalizationPassesMaximum: 1,
      rerunsMaximum: 0,
      modelContexts: 0,
      directIncrementalCostUsdMaximum: 0,
      renderingVerificationAuthorized: false,
      productionMutationAuthorized: false,
      nextRequiredAction: activation.nextRequiredAction
    },
    null,
    2
  )
);
