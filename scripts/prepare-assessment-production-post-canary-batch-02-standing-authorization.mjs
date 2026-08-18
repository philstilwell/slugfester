#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_02_STANDING_AUTHORIZATION,
  POST_CANARY_BATCH_02_STANDING_AUTHORIZATION_INSTRUCTION,
  POST_CANARY_BATCH_02_STANDING_AUTHORIZATION_PROTOCOL_ID,
  POST_CANARY_BATCH_02_STANDING_AUTHORIZATION_STATUS,
  validatePostCanaryBatch02StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-02-standing-authorization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const authorizedAtIndex = process.argv.indexOf("--authorized-at");
const authorizedAt =
  authorizedAtIndex >= 0 ? process.argv[authorizedAtIndex + 1] : null;
assertV4(
  authorizedAt && !Number.isNaN(Date.parse(authorizedAt)),
  "--authorized-at requires an ISO timestamp"
);

const PUBLICATION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-02/publication-reconstruction";
const SOURCE_FILES = [
  "docs/assessment-production-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  "docs/assessment-production/manifest-v1.json",
  `${PUBLICATION_ROOT}/execution-preparation-manifest.json`,
  `${PUBLICATION_ROOT}/execution-activation.json`,
  `${PUBLICATION_ROOT}/model-execution.json`,
  `${PUBLICATION_ROOT}/analysis.json`,
  `${PUBLICATION_ROOT}/packets/debate-103.json`,
  `${PUBLICATION_ROOT}/schemas/debate-103.schema.json`,
  `${PUBLICATION_ROOT}/outputs/debate-103.json`,
  `${PUBLICATION_ROOT}/validations/debate-103.json`,
  `${PUBLICATION_ROOT}/provenance/debate-103.json`,
  "scripts/lib/assessment-production-post-canary-batch-02-publication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-02-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-02-standing-authorization.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-02-standing-authorization.mjs",
  "scripts/test-assessment-production-post-canary-batch-02-standing-authorization.mjs"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

assertV4(
  !(await exists(POST_CANARY_BATCH_02_STANDING_AUTHORIZATION)),
  `${POST_CANARY_BATCH_02_STANDING_AUTHORIZATION} already exists`
);
const [execution, analysis, validation, preparation] = await Promise.all([
  readFile(`${PUBLICATION_ROOT}/model-execution.json`, "utf8").then(JSON.parse),
  readFile(`${PUBLICATION_ROOT}/analysis.json`, "utf8").then(JSON.parse),
  readFile(`${PUBLICATION_ROOT}/validations/debate-103.json`, "utf8").then(
    JSON.parse
  ),
  readFile(`${PUBLICATION_ROOT}/execution-preparation-manifest.json`, "utf8").then(
    JSON.parse
  )
]);
assertV4(
  preparation.status ===
      "frozen-ten-post-canary-batch-02-score-locked-publication-contexts-prepared-not-authorized" &&
    execution.status ===
      "post-canary-batch-02-publication-gate-complete-with-failure" &&
    execution.contextsAttempted === 1 &&
    execution.contextsUnattempted === 9 &&
    execution.validContexts === 0 &&
    execution.invalidContexts === 1 &&
    execution.retries === 0 &&
    execution.timeoutExtensions === 0 &&
    analysis.status ===
      "post-canary-batch-02-publication-output-gate-failed" &&
    analysis.nextAuthorizedAction ===
      "user-approval-required-before-batch-02-publication-failure-diagnosis-only" &&
    validation.status === "failed" &&
    validation.debateNumber === "103",
  "the preserved Batch 2 publication failure boundary changed"
);

const sourceHashes = {};
for (const file of [...SOURCE_FILES].sort()) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}
const record = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-02-publication-standing-authorization",
  protocolId: POST_CANARY_BATCH_02_STANDING_AUTHORIZATION_PROTOCOL_ID,
  status: POST_CANARY_BATCH_02_STANDING_AUTHORIZATION_STATUS,
  authorizedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: false,
  batchNumber: 2,
  stagingOnly: true,
  userAuthorization: {
    instruction: POST_CANARY_BATCH_02_STANDING_AUTHORIZATION_INSTRUCTION,
    directIncrementalCostUsdMaximum: 0,
    supersedesPerStageUserApprovalPausesWithinFrozenScope: true,
    preservesAllContentValidationCostAndFailureStops: true
  },
  model: {
    label: "5.6 Sol",
    slug: "gpt-5.6-sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription"
  },
  authorizedSequence: [
    "deterministic-debate-103-failure-diagnosis",
    "bounded-field-repair-preparation-and-execution",
    "complete-debate-103-validation-after-merge",
    "nine-context-publication-resumption",
    "bounded-expected-publication-repair-if-required",
    "ten-debate-cohort-validation",
    "deterministic-publication-compilation",
    "deterministic-publication-finalization",
    "deterministic-rendering-verification"
  ],
  executionControls: {
    everyContextEnumeratedAndHashLockedBeforeExecution: true,
    freshIsolatedContextRequired: true,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
    recursiveRepairsMaximum: 0,
    repairWritableFieldsMaximumPerPacket: 2,
    schedulerRamp: [1, 2],
    automaticContinuationOnlyAfterPassingGate: true,
    separateFrozenActivationArtifactStillRequired: true
  },
  costBoundary: {
    authentication: "ChatGPT subscription",
    directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0,
    paidServiceCallsMaximum: 0
  },
  authorization: {
    failureDiagnosis: true,
    repairPacketPreparation: true,
    repairModelExecution: true,
    publicationResumption: true,
    deterministicCompilation: true,
    publicationFinalization: true,
    renderingVerification: true,
    commitAndPushPassingOrPreservedFailureCheckpoints: true,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  stopRules: {
    sourceOrScoreChangeBlocks: true,
    frozenHashMismatchBlocks: true,
    unenumeratedModelContextBlocks: true,
    moreThanTwoWritableRepairFieldsBlocks: true,
    retryBlocks: true,
    timeoutExtensionBlocks: true,
    recursiveRepairBlocks: true,
    failedRepairBlocks: true,
    unexpectedValidationCategoryBlocks: true,
    paidServiceBlocks: true,
    directIncrementalCostAboveZeroBlocks: true,
    productionMutationBlocks: true,
    nextBatchSelectionBlocks: true,
    actionOutsideAuthorizationBlocks: true
  },
  sourceHashes,
  nextAuthorizedAction:
    "deterministically-diagnose-the-preserved-debate-103-publication-failure"
};
validatePostCanaryBatch02StandingAuthorization(record);
if (shouldWrite) {
  await writeFile(
    path.resolve(POST_CANARY_BATCH_02_STANDING_AUTHORIZATION),
    `${JSON.stringify(record, null, 2)}\n`
  );
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? record.status : "preview",
      model: record.model,
      authorizedSequence: record.authorizedSequence,
      stopRules: Object.keys(record.stopRules),
      directIncrementalCostUsdMaximum: 0,
      productionMutationAuthorized: false,
      nextAuthorizedAction: record.nextAuthorizedAction
    },
    null,
    2
  )
);
