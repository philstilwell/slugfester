#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { DEBATE_27_PUBLICATION_REPAIR_ROOT } from "./lib/assessment-production-post-canary-batch-03-publication-resumption-3-repair.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const index = process.argv.indexOf("--activated-at");
const activatedAt = index >= 0 ? process.argv[index + 1] : null;
assertV4(activatedAt && !Number.isNaN(Date.parse(activatedAt)), "--activated-at requires an ISO timestamp");
const PREPARATION = `${DEBATE_27_PUBLICATION_REPAIR_ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${DEBATE_27_PUBLICATION_REPAIR_ROOT}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(!(await exists(ACTIVATION)), `${ACTIVATION} already exists`);
const preparationBytes = await readFile(path.resolve(PREPARATION));
const preparation = JSON.parse(preparationBytes);
assertV4(
  preparation.status === "frozen-four-bounded-seven-field-debate-27-publication-repair-contexts-prepared" && preparation.contexts?.length === 4 &&
    preparation.contexts.every(({ writableFieldCount }) => writableFieldCount >= 1 && writableFieldCount <= 2) &&
    preparation.model?.label === "5.6 Sol" && preparation.model?.slug === "gpt-5.6-sol" && preparation.model?.reasoningEffort === "low" && preparation.model?.authentication === "ChatGPT subscription" &&
    preparation.executionPolicy?.attemptsPerContext === 1 && preparation.executionPolicy?.retriesMaximum === 0 && preparation.executionPolicy?.timeoutExtensionsMaximum === 0 && preparation.executionPolicy?.recursiveCorrectionContextsMaximum === 0 &&
    preparation.executionPolicy?.maximumParallelContexts === 2 && canonicalJson(preparation.executionPolicy?.schedulerRamp) === canonicalJson([1, 2]) &&
    preparation.authorization?.executionActivationPreparation === true && preparation.authorization?.repairModelExecution === false && Object.values(preparation.stopRules).every(Boolean),
  "the Debate 27 repair execution is not prepared"
);
assertV4(execFileSync(preparation.executionEnvironment.codexPath, ["--version"], { encoding: "utf8" }).trim() === preparation.executionEnvironment.codexCliVersion, "the frozen Codex version changed");
for (const [file, digest] of Object.entries(preparation.sourceHashes)) assertV4(sha256(await readFile(path.resolve(file))) === digest, `${file}: frozen Debate 27 repair source drifted`);
for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) if (future !== ACTIVATION) assertV4(!(await exists(future)), `future repair output exists: ${future}`);
const activation = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-03-debate-27-publication-repair-execution-activation",
  protocolId: preparation.protocolId,
  status: "four-frozen-bounded-debate-27-publication-repair-contexts-authorized",
  activatedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false, batchNumber: 3, stagingOnly: true,
  preparationManifest: PREPARATION, preparationManifestSha256: sha256(preparationBytes),
  userAuthorization: structuredClone(preparation.userAuthorization), model: structuredClone(preparation.model), costBoundary: structuredClone(preparation.costEstimate),
  executionEnvironment: structuredClone(preparation.executionEnvironment), inputs: structuredClone(preparation.inputs), modelInputs: structuredClone(preparation.modelInputs),
  contexts: structuredClone(preparation.contexts), acceptedOutputs: structuredClone(preparation.acceptedOutputs), hashLocks: structuredClone(preparation.hashLocks),
  isolation: structuredClone(preparation.isolation), repairContract: structuredClone(preparation.repairContract), executionPolicy: structuredClone(preparation.executionPolicy),
  deterministicValidation: structuredClone(preparation.deterministicValidation), stopRules: structuredClone(preparation.stopRules), sourceHashes: structuredClone(preparation.sourceHashes),
  authorization: { repairModelExecution: true, deterministicOutputValidation: true, deterministicMergeAndCohortReplay: true, retry: false, timeoutExtension: false, recursiveRepair: false, paidServices: false, productionMutation: false, nextBatchSelection: false },
  artifacts: structuredClone(preparation.artifacts),
  futureOutputPathsExcludedFromSourceHashes: preparation.futureOutputPathsExcludedFromSourceHashes.filter((file) => file !== ACTIVATION),
  nextRequiredAction: "execute-exactly-four-frozen-bounded-debate-27-publication-repair-contexts-once"
};
if (shouldWrite) await writeFile(path.resolve(ACTIVATION), `${JSON.stringify(activation, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? activation.status : "validated-preview", contexts: 4, partitions: [2, 2, 2, 1], model: activation.model, schedulerRamp: [1, 2], attemptsPerContext: 1, retriesMaximum: 0, directIncrementalCostUsdMaximum: 0, nextRequiredAction: activation.nextRequiredAction }, null, 2));
