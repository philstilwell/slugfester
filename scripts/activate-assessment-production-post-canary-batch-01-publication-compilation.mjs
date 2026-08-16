#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_01_PUBLICATION_COMPILATION_ORDER,
  POST_CANARY_BATCH_01_PUBLICATION_COMPILATION_PROTOCOL_ID,
  POST_CANARY_BATCH_01_PUBLICATION_COMPILATION_ROOT
} from "./lib/assessment-production-post-canary-batch-01-publication-compilation.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const activatedAtIndex = process.argv.indexOf("--activated-at");
const activatedAt =
  activatedAtIndex >= 0 ? process.argv[activatedAtIndex + 1] : null;
assertV4(
  activatedAt && !Number.isNaN(Date.parse(activatedAt)),
  "--activated-at requires an ISO timestamp"
);

const ROOT = POST_CANARY_BATCH_01_PUBLICATION_COMPILATION_ROOT;
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
      "frozen-post-canary-batch-01-deterministic-publication-compilation-prepared-not-authorized" &&
    preparation.protocolId ===
      POST_CANARY_BATCH_01_PUBLICATION_COMPILATION_PROTOCOL_ID &&
    preparation.productionCanary === false &&
    preparation.batchNumber === 1 &&
    preparation.stagingOnly === true &&
    preparation.contexts?.length === 10 &&
    canonicalJson(preparation.explicitOrder) ===
      canonicalJson(POST_CANARY_BATCH_01_PUBLICATION_COMPILATION_ORDER) &&
    preparation.executionPolicy
      ?.deterministicRepositoryCompilationPassesMaximum === 1 &&
    preparation.executionPolicy?.rerunsMaximum === 0 &&
    preparation.executionPolicy?.modelContexts === 0 &&
    preparation.executionPolicy?.separateActivationRequired === true &&
    preparation.authorization?.compilationPreparation === true &&
    preparation.authorization?.deterministicCompilationActivation === false &&
    preparation.authorization?.deterministicCompilation === false &&
    preparation.authorization?.modelExecution === false &&
    preparation.authorization?.paidServices === false &&
    preparation.authorization?.productionMutation === false &&
    Object.values(preparation.stopRules).every(Boolean) &&
    preparation.nextAuthorizedAction ===
      "user-approval-required-before-activation-and-execution-of-one-frozen-batch-01-deterministic-publication-compilation-pass",
  "the Batch 1 deterministic publication compilation is not prepared"
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `compilation preparation source hash mismatch: ${file}`
  );
}
for (const file of preparation.futureOutputPathsExcludedFromSourceHashes) {
  if (file !== ACTIVATION) {
    assertV4(!(await exists(file)), `future compilation output exists: ${file}`);
  }
}

const activation = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-deterministic-publication-compilation-execution-activation",
  protocolId: POST_CANARY_BATCH_01_PUBLICATION_COMPILATION_PROTOCOL_ID,
  status:
    "frozen-post-canary-batch-01-deterministic-publication-compilation-authorized",
  activatedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: false,
  batchNumber: 1,
  stagingOnly: true,
  userAuthorization: {
    instruction:
      "I approve activation and execution of the one frozen Batch 1 deterministic publication-compilation pass, with a direct incremental cost cap of $0. Use exactly one repository compilation pass and no reruns. Stop after deterministic compiled-record validation, analysis, committing, and pushing. Do not execute models, use paid services, render or finalize publication, mutate production, or select the next batch.",
    directIncrementalCostUsdMaximum: 0,
    deterministicCompilationPasses: 1,
    rerunsMaximum: 0,
    modelExecution: false,
    paidServices: false,
    renderingVerification: false,
    publicationFinalization: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  preparation: PREPARATION,
  preparationSha256: sha256(preparationBytes),
  explicitOrder: structuredClone(preparation.explicitOrder),
  contexts: structuredClone(preparation.contexts),
  executionPolicy: structuredClone(preparation.executionPolicy),
  compilationPolicy: structuredClone(preparation.compilationPolicy),
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
    deterministicCompilation: true,
    deterministicCompilationPassesMaximum: 1,
    rerun: false,
    modelExecution: false,
    paidServices: false,
    scoreRecalculation: false,
    publicationFinalization: false,
    renderingVerification: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextRequiredAction:
    "execute-one-frozen-batch-01-deterministic-publication-compilation-pass"
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
      deterministicCompilationPassesMaximum: 1,
      rerunsMaximum: 0,
      modelContexts: 0,
      directIncrementalCostUsdMaximum: 0,
      publicationFinalizationAuthorized: false,
      renderingVerificationAuthorized: false,
      productionMutationAuthorized: false,
      nextRequiredAction: activation.nextRequiredAction
    },
    null,
    2
  )
);
