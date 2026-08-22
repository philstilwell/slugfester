#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_05_DEBATE_64_REPAIR_PROTOCOL_ID,
  POST_CANARY_BATCH_05_DEBATE_64_REPAIR_ROOT
} from "./lib/assessment-production-post-canary-batch-05-publication-repair.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const activatedIndex = process.argv.indexOf("--activated-at");
const activatedAt = activatedIndex >= 0 ? process.argv[activatedIndex + 1] : null;
assertV4(activatedAt && !Number.isNaN(Date.parse(activatedAt)),
  "--activated-at requires an ISO timestamp");
const ROOT = POST_CANARY_BATCH_05_DEBATE_64_REPAIR_ROOT;
const PREPARATION = `${ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(!(await exists(ACTIVATION)), `${ACTIVATION} already exists`);
const preparationBytes = await readFile(path.resolve(PREPARATION));
const preparation = JSON.parse(preparationBytes);
assertV4(
  preparation.protocolId === POST_CANARY_BATCH_05_DEBATE_64_REPAIR_PROTOCOL_ID &&
    preparation.status ===
      "frozen-one-isolated-two-field-batch-05-debate-64-publication-repair-context-prepared-and-authorized" &&
    preparation.batchNumber === 5 && preparation.contexts?.length === 1 &&
    preparation.contexts[0].writableFieldCount === 2 &&
    preparation.model?.label === "5.6 Sol" && preparation.model?.slug === "gpt-5.6-sol" &&
    preparation.model?.reasoningEffort === "low" &&
    preparation.model?.authentication === "ChatGPT subscription" &&
    preparation.executionPolicy?.attemptsPerContext === 1 &&
    preparation.executionPolicy?.retriesMaximum === 0 &&
    preparation.executionPolicy?.timeoutExtensionsMaximum === 0 &&
    preparation.executionPolicy?.recursiveCorrectionContextsMaximum === 0 &&
    preparation.executionPolicy?.maximumParallelContexts === 1 &&
    JSON.stringify(preparation.executionPolicy?.schedulerRamp) === JSON.stringify([1]) &&
    preparation.nextAuthorizedAction ===
      "activate-and-execute-exactly-one-frozen-debate-64-two-field-publication-repair-context",
  "the Debate 64 repair execution is not prepared"
);
assertV4(execFileSync(preparation.executionEnvironment.codexPath, ["--version"],
  { encoding: "utf8" }).trim() === preparation.executionEnvironment.codexCliVersion,
  "the frozen Codex command-line version changed");
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `${file}: frozen repair source drifted`);
}
for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
  if (future !== ACTIVATION) assertV4(!(await exists(future)), `future repair output exists: ${future}`);
}
const activation = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-debate-64-publication-repair-execution-activation",
  protocolId: preparation.protocolId,
  status: "frozen-one-isolated-two-field-batch-05-debate-64-publication-repair-context-authorized",
  activatedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false, batchNumber: 5, stagingOnly: true, AIOnly: true,
  userAuthorization: preparation.userAuthorization,
  preparation: { path: PREPARATION, sha256: sha256(preparationBytes) },
  model: preparation.model, contexts: preparation.contexts,
  modelInputs: preparation.modelInputs, isolation: preparation.isolation,
  repairContract: preparation.repairContract,
  executionEnvironment: preparation.executionEnvironment,
  executionPolicy: preparation.executionPolicy,
  stopRules: preparation.stopRules,
  sourceHashes: { ...preparation.sourceHashes, [PREPARATION]: sha256(preparationBytes) },
  futureOutputPathsExcludedFromSourceHashes:
    preparation.futureOutputPathsExcludedFromSourceHashes.filter((file) => file !== ACTIVATION),
  artifacts: preparation.artifacts,
  authorization: {
    repairModelContexts: true, repairModelExecution: true,
    deterministicRepairOutputValidation: true,
    deterministicMergeAndCompleteValidation: true,
    sevenContextResumptionPreparation: true,
    retry: false, timeoutExtension: false, recursiveCorrectionModelExecution: false,
    paidServices: false, publicationCompilation: false,
    productionMutation: false, nextBatchSelection: false
  },
  nextAuthorizedAction: "execute-exactly-one-frozen-debate-64-two-field-publication-repair-context"
};
if (shouldWrite) await writeFile(path.resolve(ACTIVATION), `${JSON.stringify(activation, null, 2)}\n`);
console.log(JSON.stringify({
  status: activation.status, contextsAuthorized: 1, writableFieldsAuthorized: 2,
  model: activation.model, attemptsPerContext: 1, retriesMaximum: 0,
  directIncrementalCostUsdMaximum: 0, nextAuthorizedAction: activation.nextAuthorizedAction
}, null, 2));
