#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

import {
  CHECKPOINT_V22_PUBLICATION_COMPILATION_ORDER,
  CHECKPOINT_V22_PUBLICATION_COMPILATION_PROTOCOL_ID,
  CHECKPOINT_V22_PUBLICATION_COMPILATION_ROOT
} from "./lib/assessment-production-checkpoint-v2.2-publication-compilation.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");

const preparationPath = `${CHECKPOINT_V22_PUBLICATION_COMPILATION_ROOT}/preparation-manifest.json`;
const activationPath = `${CHECKPOINT_V22_PUBLICATION_COMPILATION_ROOT}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(!(await exists(activationPath)), `${activationPath} already exists; activation is immutable`);

const preparationBytes = await readFile(path.resolve(preparationPath));
const preparation = JSON.parse(preparationBytes);
assertV4(
  preparation.status === "deterministic-publication-compilation-plan-prepared-and-frozen" &&
    preparation.protocolId === CHECKPOINT_V22_PUBLICATION_COMPILATION_PROTOCOL_ID &&
    canonicalJson(preparation.explicitOrder) === canonicalJson(CHECKPOINT_V22_PUBLICATION_COMPILATION_ORDER) &&
    preparation.authorization.deterministicCompilation === false &&
    preparation.contexts.length === 10,
  "frozen deterministic compilation preparation changed"
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest, `preparation source hash mismatch: ${file}`);
}
for (const file of preparation.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(file)), `future compilation output already exists: ${file}`);
}

const activation = {
  schemaVersion: "1.0-production-checkpoint-v2.2-deterministic-publication-compilation-execution-activation",
  protocolId: CHECKPOINT_V22_PUBLICATION_COMPILATION_PROTOCOL_ID,
  status: "deterministic-publication-compilation-execution-authorized-and-frozen",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: true,
  stagingOnly: true,
  modelContexts: 0,
  directCostUsd: 0,
  preparation: preparationPath,
  preparationSha256: sha256(preparationBytes),
  explicitOrder: CHECKPOINT_V22_PUBLICATION_COMPILATION_ORDER,
  contexts: preparation.contexts,
  compilationPolicy: preparation.compilationPolicy,
  stopRules: preparation.stopRules,
  artifacts: preparation.artifacts,
  futureOutputPathsExcludedFromSourceHashes: preparation.futureOutputPathsExcludedFromSourceHashes.filter(
    (file) => file !== activationPath
  ),
  sourceHashes: {
    ...preparation.sourceHashes,
    [preparationPath]: sha256(preparationBytes)
  },
  authorization: {
    deterministicCompilation: true,
    modelExecution: false,
    retry: false,
    scoreRecalculation: false,
    publicationFinalization: false,
    renderingVerification: false,
    productionMutation: false,
    remainingProductionBatches: false
  }
};
if (shouldWrite) await writeFile(path.resolve(activationPath), `${JSON.stringify(activation, null, 2)}\n`);
console.log(JSON.stringify({
  status: shouldWrite ? activation.status : "deterministic-publication-compilation-activation-preview",
  debates: activation.contexts.length,
  modelContexts: 0,
  directCostUsd: 0,
  deterministicCompilationAuthorized: true,
  publicationFinalization: false,
  productionMutation: false
}, null, 2));
