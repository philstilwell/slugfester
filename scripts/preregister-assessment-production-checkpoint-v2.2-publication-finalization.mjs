#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

import {
  CHECKPOINT_V22_PUBLICATION_FINALIZATION_ORDER,
  CHECKPOINT_V22_PUBLICATION_FINALIZATION_PROTOCOL_ID,
  CHECKPOINT_V22_PUBLICATION_FINALIZATION_ROOT
} from "./lib/assessment-production-checkpoint-v2.2-publication-finalization.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);
const preparationPath = `${CHECKPOINT_V22_PUBLICATION_FINALIZATION_ROOT}/preparation-manifest.json`;
const activationPath = `${CHECKPOINT_V22_PUBLICATION_FINALIZATION_ROOT}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(
  !(await exists(activationPath)),
  `${activationPath} already exists; activation is immutable`
);

const preparationBytes = await readFile(path.resolve(preparationPath));
const preparation = JSON.parse(preparationBytes);
assertV4(
  preparation.status === "publication-finalization-plan-prepared-and-frozen" &&
    preparation.protocolId === CHECKPOINT_V22_PUBLICATION_FINALIZATION_PROTOCOL_ID &&
    canonicalJson(preparation.explicitOrder) ===
      canonicalJson(CHECKPOINT_V22_PUBLICATION_FINALIZATION_ORDER) &&
    preparation.contexts.length === 10 &&
    preparation.authorization.publicationFinalization === false &&
    preparation.compatibilityBoundary.productionMutationBlocked === true,
  "frozen publication finalization preparation changed"
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `preparation source hash mismatch: ${file}`
  );
}
for (const file of preparation.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(
    !(await exists(file)),
    `future finalization output already exists: ${file}`
  );
}
const activation = {
  schemaVersion:
    "1.0-production-checkpoint-v2.2-publication-finalization-execution-activation",
  protocolId: CHECKPOINT_V22_PUBLICATION_FINALIZATION_PROTOCOL_ID,
  status: "publication-finalization-execution-authorized-and-frozen",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: true,
  stagingOnly: true,
  modelContexts: 0,
  directCostUsd: 0,
  preparation: preparationPath,
  preparationSha256: sha256(preparationBytes),
  inputs: preparation.inputs,
  explicitOrder: CHECKPOINT_V22_PUBLICATION_FINALIZATION_ORDER,
  contexts: preparation.contexts,
  finalizationPolicy: preparation.finalizationPolicy,
  compatibilityBoundary: preparation.compatibilityBoundary,
  stopRules: preparation.stopRules,
  artifacts: preparation.artifacts,
  futureOutputPathsExcludedFromSourceHashes:
    preparation.futureOutputPathsExcludedFromSourceHashes.filter(
      (file) => file !== activationPath
    ),
  sourceHashes: {
    ...preparation.sourceHashes,
    [preparationPath]: sha256(preparationBytes)
  },
  authorization: {
    publicationFinalization: true,
    modelExecution: false,
    retry: false,
    scoreRecalculation: false,
    renderingVerification: false,
    validatorMigration: false,
    productionLedgerPublication: false,
    productionMutation: false,
    remainingProductionBatches: false
  }
};
if (shouldWrite) {
  await writeFile(
    path.resolve(activationPath),
    `${JSON.stringify(activation, null, 2)}\n`
  );
}
console.log(JSON.stringify({
  status: shouldWrite
    ? activation.status
    : "publication-finalization-activation-preview",
  debates: activation.contexts.length,
  modelContexts: 0,
  directCostUsd: 0,
  publicationFinalizationAuthorized: true,
  renderingVerification: false,
  validatorMigration: false,
  productionMutation: false
}, null, 2));
