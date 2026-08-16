#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_01_DEBATE_31_REPAIR_PROTOCOL_ID,
  POST_CANARY_BATCH_01_DEBATE_31_REPAIR_ROOT
} from "./lib/assessment-production-post-canary-batch-01-publication-repair.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const activatedAtIndex = process.argv.indexOf("--activated-at");
const activatedAt =
  activatedAtIndex >= 0 ? process.argv[activatedAtIndex + 1] : null;
assertV4(
  activatedAt && !Number.isNaN(Date.parse(activatedAt)),
  "--activated-at requires an ISO timestamp"
);

const ROOT = POST_CANARY_BATCH_01_DEBATE_31_REPAIR_ROOT;
const PREPARATION = `${ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) =>
  access(path.resolve(file)).then(() => true, () => false);

assertV4(!(await exists(ACTIVATION)), `${ACTIVATION} already exists`);
const preparationBytes = await readFile(path.resolve(PREPARATION));
const preparation = JSON.parse(preparationBytes);
assertV4(
  preparation.protocolId === POST_CANARY_BATCH_01_DEBATE_31_REPAIR_PROTOCOL_ID &&
    preparation.status ===
      "frozen-seven-isolated-fourteen-field-batch-01-debate-31-publication-repair-contexts-prepared-not-authorized" &&
    preparation.productionCanary === false &&
    preparation.batchNumber === 1 &&
    preparation.stagingOnly === true &&
    preparation.contexts?.length === 7 &&
    preparation.contexts.every((context) => context.writableFieldCount === 2) &&
    preparation.model?.label === "5.6 Sol" &&
    preparation.model?.slug === "gpt-5.6-sol" &&
    preparation.model?.reasoningEffort === "low" &&
    preparation.model?.authentication === "ChatGPT subscription" &&
    preparation.executionPolicy?.attemptsPerContext === 1 &&
    preparation.executionPolicy?.retriesMaximum === 0 &&
    preparation.executionPolicy?.timeoutExtensionsMaximum === 0 &&
    preparation.executionPolicy?.recursiveCorrectionContextsMaximum === 0 &&
    preparation.executionPolicy?.maximumParallelContexts === 2 &&
    JSON.stringify(preparation.executionPolicy?.schedulerRamp) ===
      JSON.stringify([1, 2]) &&
    preparation.executionPolicy?.separateActivationRequired === true &&
    preparation.authorization?.executionActivationPreparation === true &&
    preparation.authorization?.repairModelExecution === false &&
    preparation.authorization?.remainingNineContextExecution === false &&
    preparation.authorization?.paidServices === false &&
    preparation.authorization?.productionMutation === false &&
    Object.values(preparation.stopRules).every(Boolean) &&
    preparation.nextAuthorizedAction ===
      "user-approval-required-before-activation-and-execution-of-exactly-seven-frozen-debate-31-publication-repair-contexts",
  "the Debate 31 repair execution is not prepared"
);
assertV4(
  execFileSync(preparation.executionEnvironment.codexPath, ["--version"], {
    encoding: "utf8"
  }).trim() === preparation.executionEnvironment.codexCliVersion,
  "the frozen Codex command-line version changed"
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `${file}: frozen repair source drifted`
  );
}
for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
  if (future !== ACTIVATION) {
    assertV4(!(await exists(future)), `future repair output exists: ${future}`);
  }
}

const activation = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-01-debate-31-publication-repair-execution-activation",
  protocolId: preparation.protocolId,
  status:
    "frozen-seven-isolated-fourteen-field-batch-01-debate-31-publication-repair-contexts-authorized",
  activatedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: false,
  batchNumber: 1,
  stagingOnly: true,
  AIOnly: true,
  userAuthorization: {
    instruction:
      "I approve activation and execution of exactly the seven frozen Batch 1 Debate 31 score-blind publication-repair contexts using 5.6 Sol with low reasoning effort through my ChatGPT subscription, with a direct incremental cost cap of $0. Use the frozen 1→2 scheduler, one attempt per context, and no retries. Stop after deterministic repair-output validation, merge, complete Debate 31 publication validation, analysis, committing, and pushing. Do not execute the remaining nine publication contexts, prepare or execute further correction packets, use paid services, finalize publication, mutate production, or select the next batch.",
    directIncrementalCostUsdMaximum: 0,
    repairModelContexts: 7,
    writableFields: 14,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    remainingNineContextExecution: false,
    paidServices: false,
    publicationFinalization: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  preparationManifest: PREPARATION,
  preparationManifestSha256: sha256(preparationBytes),
  model: structuredClone(preparation.model),
  costBoundary: structuredClone(preparation.costEstimate),
  executionEnvironment: structuredClone(preparation.executionEnvironment),
  modelInputs: structuredClone(preparation.modelInputs),
  inputs: structuredClone(preparation.inputs),
  contexts: structuredClone(preparation.contexts),
  isolation: structuredClone(preparation.isolation),
  repairContract: structuredClone(preparation.repairContract),
  executionPolicy: structuredClone(preparation.executionPolicy),
  deterministicValidation: structuredClone(preparation.deterministicValidation),
  stopRules: structuredClone(preparation.stopRules),
  authorization: {
    repairModelContexts: true,
    repairModelExecution: true,
    deterministicRepairOutputValidation: true,
    deterministicMergeAndCompleteValidation: true,
    deterministicAnalysis: true,
    retry: false,
    timeoutExtension: false,
    recursiveCorrectionModelExecution: false,
    remainingNineContextExecution: false,
    publicationFinalization: false,
    renderingVerification: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  artifacts: structuredClone(preparation.artifacts),
  futureOutputPathsExcludedFromSourceHashes:
    preparation.futureOutputPathsExcludedFromSourceHashes.filter(
      (file) => file !== ACTIVATION
    ),
  sourceHashes: structuredClone(preparation.sourceHashes),
  nextRequiredAction:
    "execute-the-seven-frozen-debate-31-publication-repair-contexts-once"
};

if (shouldWrite) {
  await writeFile(path.resolve(ACTIVATION), `${JSON.stringify(activation, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: shouldWrite ? activation.status : "preview",
  debateNumber: "31",
  contexts: 7,
  writableFields: 14,
  model: activation.model,
  schedulerRamp: [1, 2],
  attemptsPerContext: 1,
  retriesMaximum: 0,
  directIncrementalCostUsdMaximum: 0,
  repairModelContextsAuthorized: true,
  remainingNineContextExecutionAuthorized: false,
  productionMutationAuthorized: false,
  nextRequiredAction: activation.nextRequiredAction
}, null, 2));
