#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_17_PUBLICATION_ROOT
} from "./lib/assessment-production-post-canary-batch-17-publication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const activatedAtIndex = process.argv.indexOf("--activated-at");
const activatedAt =
  activatedAtIndex >= 0 ? process.argv[activatedAtIndex + 1] : null;
assertV4(
  activatedAt && !Number.isNaN(Date.parse(activatedAt)),
  "--activated-at requires an ISO timestamp"
);

const ROOT = POST_CANARY_BATCH_17_PUBLICATION_ROOT;
const PREPARATION = `${ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) =>
  access(path.resolve(file)).then(() => true, () => false);

assertV4(!(await exists(ACTIVATION)), `${ACTIVATION} already exists`);
const preparationBytes = await readFile(path.resolve(PREPARATION));
const preparation = JSON.parse(preparationBytes);
assertV4(
  preparation.status ===
      "frozen-four-post-canary-batch-17-score-locked-publication-contexts-prepared-not-activated" &&
    preparation.productionCanary === false &&
    preparation.batchNumber === 17 &&
    preparation.stagingOnly === true &&
    preparation.contexts?.length === 4 &&
    preparation.totals?.moves === 79 &&
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
    preparation.authorization?.productionMutation === false &&
    Object.values(preparation.stopRules).every(Boolean) &&
    preparation.nextAuthorizedAction ===
      "standing-authorization-permits-activation-and-execution-of-the-four-frozen-batch-17-publication-contexts",
  "Batch 17 publication execution is not prepared"
);
assertV4(
  execFileSync(preparation.executionEnvironment.codexPath, ["--version"], {
    encoding: "utf8"
  }).trim() === preparation.executionEnvironment.codexCliVersion,
  "the frozen Codex CLI version changed"
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `${file}: frozen source drifted`
  );
}
for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
  if (future !== ACTIVATION) {
    assertV4(!(await exists(future)), `future output already exists: ${future}`);
  }
}

const activation = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-17-publication-execution-activation",
  protocolId: preparation.protocolId,
  status:
    "frozen-four-post-canary-batch-17-publication-contexts-authorized",
  activatedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: false,
  batchNumber: 17,
  stagingOnly: true,
  developmentValidationOnly: false,
  AIOnly: true,
  userAuthorization: {
    instruction:
      "The frozen Batch 17 standing authorization permits activation and execution of exactly the four frozen score-locked publication contexts using 5.6 Sol with low reasoning effort through ChatGPT subscription, the frozen 1→2 scheduler, one attempt per context, and no retries.",
    directIncrementalCostUsdMaximum: 0,
    publicationModelContexts: 4,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    repairPacketPreparation: false,
    repairModelExecution: false,
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
  contexts: structuredClone(preparation.contexts),
  isolation: structuredClone(preparation.isolation),
  executionPolicy: structuredClone(preparation.executionPolicy),
  deterministicValidation: structuredClone(preparation.deterministicValidation),
  acceptanceContract: structuredClone(preparation.acceptanceContract),
  stopRules: structuredClone(preparation.stopRules),
  authorization: {
    modelContexts: true,
    publicationModelExecution: true,
    deterministicOutputValidation: true,
    deterministicAnalysis: true,
    retry: false,
    timeoutExtension: false,
    repairPacketPreparation: false,
    correctionModelExecution: false,
    publicationFinalization: false,
    renderingVerification: false,
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
    "execute-frozen-post-canary-batch-17-publication-gate-once"
};

if (shouldWrite) {
  await writeFile(
    path.resolve(ACTIVATION),
    `${JSON.stringify(activation, null, 2)}\n`
  );
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? activation.status : "preview",
      debates: activation.contexts.map((context) => context.debateNumber),
      contexts: activation.contexts.length,
      moves: activation.acceptanceContract.movesAuthoredRequired,
      model: activation.model,
      schedulerRamp: activation.executionPolicy.schedulerRamp,
      attemptsPerContext: 1,
      retriesMaximum: 0,
      directIncrementalCostUsdMaximum: 0,
      publicationModelContextsAuthorized: true,
      productionMutationAuthorized: false,
      nextRequiredAction: activation.nextRequiredAction
    },
    null,
    2
  )
);
