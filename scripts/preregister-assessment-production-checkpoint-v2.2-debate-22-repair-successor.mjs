#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ARTIFACTS,
  CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ROOT
} from "./lib/assessment-production-checkpoint-v2.2-debate-22-repair-successor.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const preparationPath = `${CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ROOT}/preparation-manifest.json`;
const activationPath = `${CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ROOT}/execution-activation.json`;
const preparation = JSON.parse(await readFile(path.resolve(preparationPath), "utf8"));
assertV4(
  preparation.status === "explicit-order-model-free-complete-cohort-successor-prepared-and-frozen" &&
    preparation.intendedOrder.length === 10 &&
    preparation.repairPackets.length === 7 &&
    preparation.preparationReplay.totals.moves === 188 &&
    preparation.modelExecution === false &&
    preparation.directCostUsd === 0 &&
    preparation.controls.iterateExplicitOrderArrayDirectly === true &&
    preparation.controls.productionMutationForbidden === true,
  "successor preparation mismatch"
);
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
if (shouldWrite) assertV4(!(await exists(activationPath)), `${activationPath} already exists`);
const sourceFiles = [
  preparationPath,
  ...Object.values(preparation.inputs),
  ...preparation.repairPackets.flatMap(({ packet, repairOutput }) => [packet, repairOutput]),
  ...preparation.intendedOrder.map((debateNumber) => preparation.cohortPackets[debateNumber]),
  ...preparation.intendedOrder.filter((debateNumber) => debateNumber !== "22").map((debateNumber) => preparation.existingCohortOutputs[debateNumber]),
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-debate-22-repair.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-debate-22-repair-successor.mjs",
  "scripts/prepare-assessment-production-checkpoint-v2.2-debate-22-repair-successor.mjs",
  "scripts/preregister-assessment-production-checkpoint-v2.2-debate-22-repair-successor.mjs",
  "scripts/run-assessment-production-checkpoint-v2.2-debate-22-repair-successor.mjs",
  "scripts/test-assessment-production-checkpoint-v2.2-debate-22-repair-successor.mjs"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)].sort()) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}
const futureOutputPathsExcludedFromSourceHashes = Object.values(CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ARTIFACTS);
for (const file of futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!sourceHashes[file], `future output was included in source hashes: ${file}`);
  if (shouldWrite) assertV4(!(await exists(file)), `future output exists: ${file}`);
}
const activation = {
  schemaVersion: "1.0-production-checkpoint-v2.2-debate-22-publication-repair-explicit-order-successor-activation",
  protocolId: preparation.protocolId,
  status: "explicit-order-model-free-complete-cohort-successor-authorized-and-frozen",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: true,
  stagingOnly: true,
  intendedOrder: preparation.intendedOrder,
  modelExecution: false,
  repairAttempts: 0,
  retries: 0,
  directCostUsdMaximum: 0,
  executionPolicy: {
    maximumWallMinutes: 2,
    iterateExplicitOrderArrayDirectly: true,
    mergeOnlyThirteenAuthorizedCritiqueFields: true,
    writeArtifactsOnlyAfterAllPredicatesPass: true,
    preexistingOutputBlocks: true
  },
  authorization: {
    deterministicSuccessorExecution: true,
    deterministicMergeAndCompleteDebateValidation: true,
    deterministicCompleteCohortValidation: true,
    modelExecution: false,
    retry: false,
    deterministicCompilation: false,
    publicationFinalization: false,
    renderingVerification: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  artifacts: CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ARTIFACTS,
  futureOutputPathsExcludedFromSourceHashes,
  sourceHashes
};
if (shouldWrite) await writeFile(path.resolve(activationPath), `${JSON.stringify(activation, null, 2)}\n`);
console.log(JSON.stringify({
  status: shouldWrite ? "frozen" : "preview",
  intendedOrder: activation.intendedOrder,
  modelExecution: false,
  repairAttempts: 0,
  retries: 0,
  maximumWallMinutes: 2,
  directCostUsdMaximum: 0,
  productionMutation: false
}, null, 2));
