#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_09_PUBLICATION_RESUMPTION_PROTOCOL_ID,
  POST_CANARY_BATCH_09_PUBLICATION_RESUMPTION_ROOT
} from "./lib/assessment-production-post-canary-batch-09-publication-resumption.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const activatedAtIndex = process.argv.indexOf("--activated-at");
const activatedAt =
  activatedAtIndex >= 0 ? process.argv[activatedAtIndex + 1] : null;
assertV4(
  activatedAt && !Number.isNaN(Date.parse(activatedAt)),
  "--activated-at requires an ISO timestamp"
);

const ROOT = POST_CANARY_BATCH_09_PUBLICATION_RESUMPTION_ROOT;
const PREPARATION = `${ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) =>
  access(path.resolve(file)).then(() => true, () => false);

assertV4(!(await exists(ACTIVATION)), `${ACTIVATION} already exists`);
const preparationBytes = await readFile(path.resolve(PREPARATION));
const preparation = JSON.parse(preparationBytes);
assertV4(
  preparation.protocolId ===
      POST_CANARY_BATCH_09_PUBLICATION_RESUMPTION_PROTOCOL_ID &&
    preparation.status ===
      "frozen-nine-untouched-post-canary-batch-09-publication-resumption-contexts-prepared-not-authorized" &&
    preparation.productionCanary === false &&
    preparation.batchNumber === 8 &&
    preparation.stagingOnly === true &&
    preparation.contexts?.length === 9 &&
    preparation.totals?.resumptionMoves === 160 &&
    preparation.totals?.cohortMoves === 180 &&
    preparation.model?.label === "5.6 Sol" &&
    preparation.model?.slug === "gpt-5.6-sol" &&
    preparation.model?.reasoningEffort === "low" &&
    preparation.model?.authentication === "ChatGPT subscription" &&
    preparation.executionPolicy?.attemptsPerContext === 1 &&
    preparation.executionPolicy?.retriesMaximum === 0 &&
    preparation.executionPolicy?.timeoutExtensionsMaximum === 0 &&
    preparation.executionPolicy?.correctionContextsMaximum === 0 &&
    preparation.executionPolicy?.maximumParallelContexts === 2 &&
    JSON.stringify(preparation.executionPolicy?.schedulerRamp) ===
      JSON.stringify([1, 2]) &&
    preparation.executionPolicy?.separateActivationRequired === true &&
    preparation.authorization?.executionActivationPreparation === true &&
    preparation.authorization?.publicationModelExecution === false &&
    preparation.authorization?.repairPacketPreparation === false &&
    preparation.authorization?.publicationCompilation === false &&
    preparation.authorization?.publicationFinalization === false &&
    preparation.authorization?.paidServices === false &&
    preparation.authorization?.productionMutation === false &&
    Object.values(preparation.stopRules).every(Boolean) &&
    preparation.nextAuthorizedAction ===
      "activate-and-execute-exactly-nine-frozen-batch-09-publication-resumption-contexts-under-standing-authorization",
  "the Batch 9 publication resumption is not prepared"
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
    `${file}: frozen resumption source drifted`
  );
}
for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
  if (future !== ACTIVATION) {
    assertV4(!(await exists(future)), `future resumption output exists: ${future}`);
  }
}

const activation = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-09-publication-resumption-execution-activation",
  protocolId: preparation.protocolId,
  status:
    "frozen-nine-untouched-post-canary-batch-09-publication-resumption-contexts-authorized",
  activatedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: false,
  batchNumber: 9,
  stagingOnly: true,
  AIOnly: true,
  userAuthorization: {
    instruction:
      "The Batch 9 standing authorization permits activation and execution of exactly the nine frozen score-locked publication-resumption contexts using 5.6 Sol with low reasoning through the ChatGPT subscription, one attempt per context, no retries, and direct incremental cost $0.",
    directIncrementalCostUsdMaximum: 0,
    publicationModelContexts: 9,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    repairPacketPreparation: false,
    correctionModelExecution: false,
    paidServices: false,
    publicationCompilation: false,
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
  acceptedDebate170: structuredClone(preparation.acceptedDebate170),
  contexts: structuredClone(preparation.contexts),
  isolation: structuredClone(preparation.isolation),
  publicationContract: structuredClone(preparation.publicationContract),
  executionPolicy: structuredClone(preparation.executionPolicy),
  deterministicValidation: structuredClone(preparation.deterministicValidation),
  acceptanceContract: structuredClone(preparation.acceptanceContract),
  stopRules: structuredClone(preparation.stopRules),
  authorization: {
    modelContexts: true,
    publicationModelExecution: true,
    deterministicOutputValidation: true,
    deterministicCohortAnalysis: true,
    retry: false,
    timeoutExtension: false,
    repairPacketPreparation: false,
    correctionModelExecution: false,
    publicationCompilation: false,
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
    "execute-the-nine-frozen-batch-09-publication-resumption-contexts-once"
};

if (shouldWrite) {
  await writeFile(path.resolve(ACTIVATION), `${JSON.stringify(activation, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: shouldWrite ? activation.status : "preview",
  debates: activation.contexts.map((context) => context.debateNumber),
  contexts: 9,
  resumptionMoves: 160,
  model: activation.model,
  schedulerRamp: [1, 2],
  attemptsPerContext: 1,
  retriesMaximum: 0,
  directIncrementalCostUsdMaximum: 0,
  publicationModelContextsAuthorized: true,
  repairPacketPreparationAuthorized: false,
  publicationCompilationAuthorized: false,
  productionMutationAuthorized: false,
  nextRequiredAction: activation.nextRequiredAction
}, null, 2));
