#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  DEBATE_157_CORRECTION_2_PROTOCOL_ID,
  DEBATE_157_CORRECTION_2_ROOT
} from "./lib/assessment-production-post-canary-batch-03-publication-resumption-2-repair-correction-2.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const index = process.argv.indexOf("--activated-at");
const activatedAt = index >= 0 ? process.argv[index + 1] : null;
assertV4(activatedAt && !Number.isNaN(Date.parse(activatedAt)), "--activated-at requires an ISO timestamp");

const PREPARATION = `${DEBATE_157_CORRECTION_2_ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${DEBATE_157_CORRECTION_2_ROOT}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(!(await exists(ACTIVATION)), `${ACTIVATION} already exists`);
const preparationBytes = await readFile(path.resolve(PREPARATION));
const preparation = JSON.parse(preparationBytes);
assertV4(
  preparation.protocolId === DEBATE_157_CORRECTION_2_PROTOCOL_ID &&
    preparation.status === "frozen-one-context-two-field-debate-157-publication-repair-correction-2-prepared" &&
    preparation.context?.writableFieldCount === 2 &&
    preparation.model?.label === "5.6 Sol" &&
    preparation.model?.slug === "gpt-5.6-sol" &&
    preparation.model?.reasoningEffort === "low" &&
    preparation.model?.authentication === "ChatGPT subscription" &&
    preparation.executionPolicy?.contexts === 1 &&
    preparation.executionPolicy?.attemptsPerContext === 1 &&
    preparation.executionPolicy?.retriesMaximum === 0 &&
    preparation.executionPolicy?.timeoutExtensionsMaximum === 0 &&
    preparation.executionPolicy?.recursiveRecoveryContextsMaximum === 1 &&
    preparation.executionPolicy?.separateActivationRequired === true &&
    preparation.authorization?.executionActivationPreparation === true &&
    preparation.authorization?.correctionModelExecution === false &&
    preparation.userAuthorization?.oneTimeRecursiveRecoveryException === true &&
    preparation.modelInputs?.failedRepairOutputUnavailable === true &&
    Object.values(preparation.stopRules).every(Boolean),
  "the one-time Debate 157 correction-2 execution is not prepared"
);
assertV4(
  execFileSync(preparation.executionEnvironment.codexPath, ["--version"], { encoding: "utf8" }).trim() ===
    preparation.executionEnvironment.codexCliVersion,
  "the frozen Codex command-line version changed"
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest, `${file}: frozen correction-2 source drifted`);
}
for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
  if (future !== ACTIVATION) assertV4(!(await exists(future)), `future correction-2 output exists: ${future}`);
}

const activation = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-03-debate-157-publication-repair-correction-2-execution-activation",
  protocolId: preparation.protocolId,
  status: "one-frozen-debate-157-publication-repair-correction-2-context-authorized",
  activatedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false,
  batchNumber: 3,
  stagingOnly: true,
  userAuthorization: structuredClone(preparation.userAuthorization),
  preparationManifest: PREPARATION,
  preparationManifestSha256: sha256(preparationBytes),
  model: structuredClone(preparation.model),
  costBoundary: structuredClone(preparation.costEstimate),
  executionEnvironment: structuredClone(preparation.executionEnvironment),
  modelInputs: structuredClone(preparation.modelInputs),
  inputs: structuredClone(preparation.inputs),
  context: structuredClone(preparation.context),
  hashLocks: structuredClone(preparation.hashLocks),
  isolation: structuredClone(preparation.isolation),
  executionPolicy: structuredClone(preparation.executionPolicy),
  deterministicValidation: structuredClone(preparation.deterministicValidation),
  stopRules: structuredClone(preparation.stopRules),
  sourceHashes: structuredClone(preparation.sourceHashes),
  authorization: {
    correctionModelExecution: true,
    deterministicOutputValidation: true,
    deterministicAnalysis: true,
    recursiveRecoveryExceptionUsed: true,
    retry: false,
    timeoutExtension: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  artifacts: structuredClone(preparation.artifacts),
  futureOutputPathsExcludedFromSourceHashes:
    preparation.futureOutputPathsExcludedFromSourceHashes.filter((file) => file !== ACTIVATION),
  nextRequiredAction: "execute-the-one-frozen-debate-157-correction-2-context-once"
};
if (shouldWrite) await writeFile(path.resolve(ACTIVATION), `${JSON.stringify(activation, null, 2)}\n`);
console.log(JSON.stringify({
  status: shouldWrite ? activation.status : "validated-preview",
  contexts: 1,
  writableFields: activation.context.writableFields,
  model: activation.model,
  attemptMaximum: 1,
  retriesMaximum: 0,
  directIncrementalCostUsdMaximum: 0,
  nextRequiredAction: activation.nextRequiredAction
}, null, 2));
