#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_15_PUBLICATION_FINALIZATION_PROTOCOL_ID,
  POST_CANARY_BATCH_15_PUBLICATION_FINALIZATION_ROOT } from
  "./lib/assessment-production-post-canary-batch-15-publication-finalization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";
const shouldWrite = process.argv.includes("--write");
const index = process.argv.indexOf("--activated-at");
const activatedAt = index >= 0 ? process.argv[index + 1] : null;
assertV4(activatedAt && !Number.isNaN(Date.parse(activatedAt)), "--activated-at requires ISO");
const ROOT = POST_CANARY_BATCH_15_PUBLICATION_FINALIZATION_ROOT;
const PREPARATION = `${ROOT}/preparation-manifest.json`; const ACTIVATION = `${ROOT}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(!(await exists(ACTIVATION)), `${ACTIVATION} exists`);
const preparationBytes = await readFile(path.resolve(PREPARATION)); const p = JSON.parse(preparationBytes);
assertV4(p.status === "frozen-post-canary-batch-15-publication-finalization-prepared" &&
  p.protocolId === POST_CANARY_BATCH_15_PUBLICATION_FINALIZATION_PROTOCOL_ID && p.contexts?.length === 10 &&
  p.executionPolicy?.deterministicFinalizationPassesMaximum === 1 && p.executionPolicy?.rerunsMaximum === 0 &&
  p.authorization?.finalizationActivation === true,
"Batch 15 finalization is not prepared");
for (const [file, digest] of Object.entries(p.sourceHashes)) assertV4(
  sha256(await readFile(path.resolve(file))) === digest, `${file}: source hash changed`);
for (const file of p.futureOutputPathsExcludedFromSourceHashes) if (file !== ACTIVATION)
  assertV4(!(await exists(file)), `${file} exists`);
const activation = { schemaVersion: "1.0-assessment-production-post-canary-batch-15-publication-finalization-activation",
  protocolId: p.protocolId, status: "frozen-post-canary-batch-15-publication-finalization-authorized",
  activatedAt, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false, batchNumber: 15, stagingOnly: true,
  preparation: PREPARATION, preparationSha256: sha256(preparationBytes),
  explicitOrder: p.explicitOrder, contexts: p.contexts, preview: p.preview,
  executionPolicy: p.executionPolicy, finalizationPolicy: p.finalizationPolicy,
  stopRules: p.stopRules, artifacts: p.artifacts,
  sourceHashes: { ...p.sourceHashes, [PREPARATION]: sha256(preparationBytes) },
  futureOutputPathsExcludedFromSourceHashes: p.futureOutputPathsExcludedFromSourceHashes.filter((file) => file !== ACTIVATION),
  authorization: { finalizationExecution: true, deterministicFinalizationPassesMaximum: 1,
    rerun: false, modelExecution: false, paidServices: false, renderingVerification: false,
    productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: "execute-one-frozen-batch-15-deterministic-publication-finalization-pass" };
if (shouldWrite) await writeFile(path.resolve(ACTIVATION), `${JSON.stringify(activation, null, 2)}\n`);
console.log(JSON.stringify({ status: activation.status, debates: 10,
  deterministicFinalizationPassesMaximum: 1, rerunsMaximum: 0, modelContexts: 0,
  directIncrementalCostUsd: 0, nextAuthorizedAction: activation.nextAuthorizedAction }, null, 2));

