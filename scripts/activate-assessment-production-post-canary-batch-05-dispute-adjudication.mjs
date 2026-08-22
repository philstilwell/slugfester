#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";

import { POST_CANARY_BATCH_05_DISPUTE_ADJ_ROOT } from "./lib/assessment-production-post-canary-batch-05-dispute-adjudication.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const authorizedIndex = process.argv.indexOf("--authorized-at");
const authorizedAt =
  authorizedIndex >= 0 ? process.argv[authorizedIndex + 1] : null;
assertV4(
  authorizedAt && !Number.isNaN(Date.parse(authorizedAt)),
  "--authorized-at requires an ISO timestamp"
);
const preparationPath =
  `${POST_CANARY_BATCH_05_DISPUTE_ADJ_ROOT}/execution-preparation-manifest.json`;
const activationPath =
  `${POST_CANARY_BATCH_05_DISPUTE_ADJ_ROOT}/execution-activation.json`;
const standingAuthorizationPath =
  "docs/assessment-production/post-canary-continuation-v1/batch-05/standing-authorization.json";
const standingAuthorization = JSON.parse(
  await readFile(standingAuthorizationPath, "utf8")
);
const userInstruction = standingAuthorization.userAuthorization.instruction;
const approvedScope =
  "Standing authorization activates exactly the ten frozen Batch 5 score-blind dispute-only adjudication contexts using 5.6 Sol with low reasoning effort through the ChatGPT subscription, the frozen 1→2 scheduler, one attempt per context, no retries or timeout extensions, and a $0 direct incremental cost cap.";
const executionTools = [
  "scripts/activate-assessment-production-post-canary-batch-05-dispute-adjudication.mjs",
  "scripts/run-assessment-production-post-canary-batch-05-dispute-adjudication.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-05-dispute-adjudication.mjs",
  "scripts/test-assessment-production-post-canary-batch-05-dispute-adjudication-gate.mjs"
];
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assertV4(!(await exists(activationPath)), `${activationPath} already exists`);
const preparationBytes = await readFile(preparationPath);
const preparation = JSON.parse(preparationBytes);
assertV4(
  preparation.status ===
      "frozen-ten-post-canary-batch-05-dispute-only-adjudication-contexts-prepared-not-authorized" &&
    preparation.productionCanary === false &&
    preparation.batchNumber === 5 &&
    preparation.stagingOnly === true &&
    preparation.contexts.length === 10 &&
    preparation.executionPolicy.attemptsPerContext === 1 &&
    preparation.executionPolicy.retriesMaximum === 0 &&
    preparation.executionPolicy.timeoutExtensionsMaximum === 0 &&
    JSON.stringify(preparation.executionPolicy.schedulerRamp) ===
      JSON.stringify([1, 2]) &&
    preparation.executionPolicy.maximumParallelContexts === 2 &&
    preparation.executionPolicy.separateActivationRequired === true,
  "Batch 5 adjudication activation is not prepared"
);
assertV4(
  standingAuthorization.status ===
      "frozen-active-batch-05-complete-remaining-workflow-standing-authorization" &&
    standingAuthorization.userAuthorization
      .directIncrementalCostUsdMaximumForSubscriptionAndLocalWork === 0 &&
    standingAuthorization.stageConcurrency.adjudication === 2 &&
    JSON.stringify(standingAuthorization.schedulerRamps.adjudication) ===
      JSON.stringify([1, 2]),
  "Batch 5 standing adjudication authorization changed"
);
assertV4(
  preparation.model.label === "5.6 Sol" &&
    preparation.model.slug === "gpt-5.6-sol" &&
    preparation.model.reasoningEffort === "low" &&
    preparation.model.authentication === "ChatGPT subscription" &&
    preparation.model.scoreBlind === true &&
    preparation.model.roundedIntegerScoreTiesPermitted === true,
  "Batch 5 model, authentication, score-blindness, or tie boundary changed"
);
assertV4(
  Object.values(preparation.authorization).every((value) => value === false),
  "execution-preparation authorization boundary changed"
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
}
for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(future)), `future output exists: ${future}`);
}
const sourceHashes = structuredClone(preparation.sourceHashes);
const executionToolHashes = {};
for (const file of executionTools) {
  const digest = sha256(await readFile(file));
  executionToolHashes[file] = digest;
  sourceHashes[file] = digest;
}
const activation = {
  ...preparation,
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-05-dispute-only-adjudication-execution-activation",
  status:
    "frozen-ten-post-canary-batch-05-dispute-only-adjudication-contexts-authorized",
  authorizedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  preparationManifest: {
    path: preparationPath,
    sha256: sha256(preparationBytes)
  },
  userExecutionAuthorization: {
    instruction: userInstruction,
    interpretedScope: approvedScope,
    contexts: 10,
    model: "5.6 Sol",
    modelSlug: "gpt-5.6-sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
    directIncrementalCostUsdMaximum: 0,
    schedulerRamp: [1, 2],
    attemptsPerContext: 1,
    retriesMaximum: 0,
    judgmentModelsAuthorized: false,
    paidServicesAuthorized: false,
    finalLedgerAssemblyAuthorized: false,
    scoreDerivationAuthorized: false,
    publicationReconstructionAuthorized: false,
    productionMutationAuthorized: false,
    nextBatchSelectionAuthorized: false
  },
  executionToolHashes,
  sourceHashes,
  authorization: {
    ...preparation.authorization,
    adjudicationModelContexts: true,
    deterministicValidation: true,
    deterministicAnalysis: true
  },
  futureOutputPathsExcludedFromSourceHashes:
    preparation.futureOutputPathsExcludedFromSourceHashes.filter(
      (file) => file !== activationPath
    ),
  nextAuthorizedAction:
    "execute-exactly-ten-ramped-post-canary-batch-05-dispute-only-adjudication-contexts-once"
};
assertV4(
  activation.authorization.executionActivation === false &&
    activation.authorization.adjudicationModelContexts === true &&
    activation.authorization.judgmentModelContexts === false &&
    activation.authorization.paidServices === false &&
    activation.authorization.finalLedgerAssembly === false &&
    activation.authorization.scoreDerivation === false &&
    activation.authorization.publicationReconstruction === false &&
    activation.authorization.productionMutation === false &&
    activation.authorization.nextBatchSelection === false,
  "Batch 5 execution authorization expanded beyond the user instruction"
);
if (shouldWrite) {
  await writeFile(activationPath, `${JSON.stringify(activation, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? "frozen-authorized" : "preview-authorized",
      authorizedAt,
      contexts: activation.contexts.length,
      schedulerRamp: activation.executionPolicy.schedulerRamp,
      maximumParallelContexts:
        activation.executionPolicy.maximumParallelContexts,
      attemptsPerContext: 1,
      retriesMaximum: 0,
      authentication: activation.model.authentication,
      directIncrementalCostUsdMaximum: 0,
      modelExecutionAuthorized: shouldWrite,
      judgmentModelExecutionAuthorized: false,
      scoresDerived: 0
    },
    null,
    2
  )
);
