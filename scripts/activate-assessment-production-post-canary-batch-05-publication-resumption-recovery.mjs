#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_RECOVERY_PROTOCOL_ID,
  POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_RECOVERY_ROOT
} from "./lib/assessment-production-post-canary-batch-05-publication-resumption-recovery.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const activatedIndex = process.argv.indexOf("--activated-at");
const activatedAt = activatedIndex >= 0 ? process.argv[activatedIndex + 1] : null;
assertV4(activatedAt && !Number.isNaN(Date.parse(activatedAt)),
  "--activated-at requires an ISO timestamp");
const ROOT = POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_RECOVERY_ROOT;
const PREPARATION = `${ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(!(await exists(ACTIVATION)), `${ACTIVATION} already exists`);
const preparationBytes = await readFile(path.resolve(PREPARATION));
const preparation = JSON.parse(preparationBytes);
assertV4(
  preparation.protocolId === POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_RECOVERY_PROTOCOL_ID &&
    preparation.status ===
      "frozen-six-context-batch-05-publication-resumption-recovery-prepared-and-authorized" &&
    preparation.batchNumber === 5 && preparation.contexts?.length === 6 &&
    preparation.contexts.slice(0, 4).every((row) => row.debateNumber === "189" && row.writableFieldCount === 2) &&
    preparation.contexts.slice(4).every((row) => row.debateNumber === "109" && row.writableFieldCount === 13) &&
    preparation.model?.slug === "gpt-5.6-sol" &&
    preparation.model?.reasoningEffort === "low" &&
    preparation.model?.authentication === "ChatGPT subscription" &&
    preparation.executionPolicy?.attemptsPerContext === 1 &&
    preparation.executionPolicy?.retriesMaximum === 0 &&
    preparation.executionPolicy?.timeoutExtensionsMaximum === 0 &&
    preparation.executionPolicy?.recursiveCorrectionContextsMaximum === 0 &&
    preparation.executionPolicy?.maximumParallelContexts === 2 &&
    canonicalJson(preparation.executionPolicy?.schedulerRamp) === canonicalJson([1, 2]),
  "the six-context publication recovery is not prepared"
);
assertV4(execFileSync(preparation.executionEnvironment.codexPath, ["--version"],
  { encoding: "utf8" }).trim() === preparation.executionEnvironment.codexCliVersion,
"the frozen Codex command-line version changed");
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `${file}: frozen recovery source drifted`);
}
for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
  if (future !== ACTIVATION) assertV4(!(await exists(future)), `future recovery output exists: ${future}`);
}
const activation = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-publication-resumption-recovery-activation",
  protocolId: preparation.protocolId,
  status: "frozen-six-context-batch-05-publication-resumption-recovery-authorized",
  activatedAt, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false, batchNumber: 5, stagingOnly: true, AIOnly: true,
  userAuthorization: preparation.userAuthorization,
  preparation: { path: PREPARATION, sha256: sha256(preparationBytes) },
  model: preparation.model, contexts: preparation.contexts,
  modelInputs: preparation.modelInputs, isolation: preparation.isolation,
  recoveryContract: preparation.recoveryContract,
  executionEnvironment: preparation.executionEnvironment,
  executionPolicy: preparation.executionPolicy, stopRules: preparation.stopRules,
  sourceHashes: { ...preparation.sourceHashes, [PREPARATION]: sha256(preparationBytes) },
  futureOutputPathsExcludedFromSourceHashes:
    preparation.futureOutputPathsExcludedFromSourceHashes.filter((file) => file !== ACTIVATION),
  artifacts: preparation.artifacts,
  authorization: { recoveryModelContexts: true, recoveryModelExecution: true,
    deterministicOutputValidation: true, deterministicMergeAndCompleteValidation: true,
    fourContextResumptionPreparation: true, retry: false, timeoutExtension: false,
    recursiveCorrectionModelExecution: false, paidServices: false,
    publicationCompilation: false, productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: "execute-exactly-six-frozen-publication-resumption-recovery-contexts"
};
if (shouldWrite) await writeFile(path.resolve(ACTIVATION), `${JSON.stringify(activation, null, 2)}\n`);
console.log(JSON.stringify({ status: activation.status, contextsAuthorized: 6,
  debate189RepairContexts: 4, debate109ResumptionShards: 2,
  model: activation.model, schedulerRamp: [1, 2], attemptsPerContext: 1,
  retriesMaximum: 0, timeoutExtensionsMaximum: 0,
  directIncrementalCostUsdMaximum: 0, nextAuthorizedAction: activation.nextAuthorizedAction }, null, 2));
