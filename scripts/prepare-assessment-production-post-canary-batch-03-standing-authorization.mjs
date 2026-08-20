#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_03_STANDING_AUTHORIZATION,
  POST_CANARY_BATCH_03_STANDING_AUTHORIZATION_INSTRUCTION,
  POST_CANARY_BATCH_03_STANDING_AUTHORIZATION_PROTOCOL_ID,
  POST_CANARY_BATCH_03_STANDING_AUTHORIZATION_STATUS,
  validatePostCanaryBatch03StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-03-standing-authorization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const authorizedAtIndex = process.argv.indexOf("--authorized-at");
const authorizedAt =
  authorizedAtIndex >= 0 ? process.argv[authorizedAtIndex + 1] : null;
assertV4(
  authorizedAt && !Number.isNaN(Date.parse(authorizedAt)),
  "--authorized-at requires an ISO timestamp"
);

const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-03";
const SELECTION = `${ROOT}/selection.json`;
const SELECTION_ANALYSIS = `${ROOT}/selection-analysis.json`;
const SOURCE_FILES = [
  "docs/assessment-production-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  "docs/assessment-production/manifest-v1.json",
  "docs/assessment-production/score-stability-policy-v2.2-proposal.md",
  "docs/assessment-production/score-stability-policy-v2.2-promotion.json",
  "scripts/lib/assessment-production-score-stability-policy-active.mjs",
  "scripts/test-assessment-production-score-stability-policy-active.mjs",
  SELECTION,
  SELECTION_ANALYSIS,
  "scripts/lib/assessment-production-post-canary-batch-03-standing-authorization.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-03-standing-authorization.mjs",
  "scripts/test-assessment-production-post-canary-batch-03-standing-authorization.mjs"
];
const REQUIRED_ORDER = ["124", "14", "58", "150", "157", "102", "09", "181", "138", "27"];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

assertV4(
  !(await exists(POST_CANARY_BATCH_03_STANDING_AUTHORIZATION)),
  `${POST_CANARY_BATCH_03_STANDING_AUTHORIZATION} already exists`
);
const [selectionBytes, analysisBytes] = await Promise.all([
  readFile(SELECTION),
  readFile(SELECTION_ANALYSIS)
]);
const selection = JSON.parse(selectionBytes);
const analysis = JSON.parse(analysisBytes);
assertV4(
  selection.status ===
      "third-post-canary-ten-debate-batch-selection-frozen-source-gate-passed" &&
    selection.batchNumber === 3 &&
    selection.checkpointCommit ===
      "9b00bb7df367f65d6b278b3b818efc2d6c6d1511" &&
    JSON.stringify(selection.selected.map((item) => item.debateNumber)) ===
      JSON.stringify(REQUIRED_ORDER) &&
    selection.sourceGate.selectedSourceFilesHashMatched === 30 &&
    selection.sourceGate.canonicalEventDebatesPassed === 10 &&
    selection.modelBoundary.label === "5.6 Sol" &&
    selection.modelBoundary.reasoningEffort === "low" &&
    selection.modelBoundary.authentication === "ChatGPT subscription" &&
    selection.modelBoundary.scoreBlind === true &&
    selection.modelBoundary.roundedIntegerScoreTiesPermitted === true &&
    analysis.status ===
      "third-post-canary-batch-selection-analysis-passed-awaiting-source-packet-preparation-decision" &&
    analysis.selection.sha256 === sha256(selectionBytes),
  "the frozen Batch 3 selection boundary changed"
);
assertV4(
  execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    encoding: "utf8"
  }).trim() === "main" &&
    execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() ===
      "a2e2c7ea2a9c0cde152e6be01800ec5982ff13dd" &&
    execFileSync("git", ["rev-parse", "origin/main"], {
      encoding: "utf8"
    }).trim() === "a2e2c7ea2a9c0cde152e6be01800ec5982ff13dd",
  "Batch 3 standing authorization must freeze at the pushed selection commit"
);

const sourceHashes = {};
for (const file of [...SOURCE_FILES].sort()) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}
const record = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-03-standing-authorization",
  protocolId: POST_CANARY_BATCH_03_STANDING_AUTHORIZATION_PROTOCOL_ID,
  status: POST_CANARY_BATCH_03_STANDING_AUTHORIZATION_STATUS,
  authorizedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: false,
  batchNumber: 3,
  stagingOnly: true,
  selectedDebates: REQUIRED_ORDER,
  selection: {
    path: SELECTION,
    sha256: sha256(selectionBytes),
    bytes: selectionBytes.length,
    status: selection.status
  },
  userAuthorization: {
    instruction: POST_CANARY_BATCH_03_STANDING_AUTHORIZATION_INSTRUCTION,
    directIncrementalCostUsdMaximumForSubscriptionAndLocalWork: 0,
    conditionalPaidAudioMaximumUsd: 1,
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
    "score-blind-source-packet-preparation-and-discovery",
    "candidate-census-planning-and-candidate-sharded-side-selection",
    "two-isolated-independent-judgments-per-debate",
    "deterministic-disagreement-extraction",
    "local-audio-source-and-clip-preparation",
    "audio-verification-manifest-cost-estimation-and-conditional-execution",
    "dispute-only-adjudication-and-bounded-deterministic-corrections",
    "final-ledger-assembly-and-one-deterministic-score-pass",
    "score-locked-publication-reconstruction-and-bounded-repairs",
    "deterministic-compilation-finalization-and-rendering-verification",
    "compatibility-staging-production-publication-and-generated-seo-correction"
  ],
  executionControls: {
    everyContextEnumeratedAndHashLockedBeforeExecution: true,
    freshIsolatedContextRequired: true,
    attemptsPerContextOrPass: 1,
    retriesMaximum: 0,
    rerunsMaximum: 0,
    timeoutExtensionsMaximum: 0,
    recursiveRepairsMaximum: 0,
    automaticRepairsMaximum: 0,
    rollbacksMaximum: 0,
    repairWritableFieldsMaximumPerPacket: 2,
    scorePassesMaximum: 1,
    modelAuthoredScoresAllowed: false,
    roundedIntegerScoreTiesPermitted: true,
    separateFrozenActivationArtifactRequired: true,
    automaticContinuationOnlyAfterPassingGate: true
  },
  stageConcurrency: {
    discovery: 4,
    inventory: 2,
    judgments: 2,
    audio: 1,
    adjudication: 2,
    publication: 2
  },
  schedulerRamps: {
    discovery: [1, 2, 4],
    inventory: [1, 2],
    judgments: [1, 2],
    audioVerification: [1],
    adjudication: [1, 2],
    publication: [1, 2]
  },
  costBoundary: {
    authentication: "ChatGPT subscription",
    subscriptionAndLocalDirectIncrementalCostUsdMaximum: 0,
    conditionalPaidAudioMaximumUsd: 1,
    audioEstimateMustBeFrozenAndReportedBeforeFirstCall: true,
    audioSequentialExecutionRequired: true,
    audioAttemptsPerClip: 1,
    audioRetriesMaximum: 0,
    stopAfterRequestFailureOrUsageDerivedCapExceedance: true
  },
  authorization: {
    sourcePacketPreparation: true,
    discoveryModelExecution: true,
    inventoryPreparationAndModelExecution: true,
    independentJudgmentPreparationAndModelExecution: true,
    disagreementExtraction: true,
    localAudioPreparation: true,
    conditionalPaidAudioVerification: true,
    adjudicationPreparationAndModelExecution: true,
    boundedCorrections: true,
    finalLedgerAssembly: true,
    singleScorePass: true,
    publicationPreparationAndModelExecution: true,
    boundedPublicationRepairs: true,
    deterministicCompilation: true,
    publicationFinalization: true,
    renderingVerification: true,
    compatibilityStaging: true,
    productionMutation: true,
    generatedSeoCorrection: true,
    completeRepositoryValidation: true,
    commitAndPushPassingCheckpoints: true,
    nextBatchSelection: false
  },
  stopRules: {
    paidServiceEstimateAboveOneDollarBlocks: true,
    actualPaidServiceCostAboveOneDollarBlocks: true,
    outsideBatchThreeDebateBlocks: true,
    unfrozenSourceScoreIdentityReferenceValidatorOrAcceptedFieldChangeBlocks: true,
    failedModelOutputBlocks: true,
    failedBoundedRepairBlocks: true,
    unexpectedValidationCategoryBlocks: true,
    retryRerunRecursiveCorrectionRollbackOrManualScoreAdjustmentBlocks: true,
    productionMutationDifferentFromFrozenManifestBlocks: true,
    batchFourSelectionBlocks: true,
    actionOutsideAuthorizationBlocks: true
  },
  sourceHashes,
  futureArtifactsExcludedFromSourceHashes: {
    sourcePreparation: `${ROOT}/source-preparation/preparation-manifest.json`,
    batchCompletion: `${ROOT}/production-publication/generated-seo-correction/analysis.json`
  },
  nextAuthorizedAction:
    "prepare-validate-freeze-commit-and-push-batch-03-score-blind-source-packets"
};
validatePostCanaryBatch03StandingAuthorization(record);
if (shouldWrite) {
  await writeFile(
    path.resolve(POST_CANARY_BATCH_03_STANDING_AUTHORIZATION),
    `${JSON.stringify(record, null, 2)}\n`
  );
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? record.status : "preview",
      selectedDebates: record.selectedDebates,
      authorizedStages: record.authorizedSequence.length,
      model: record.model,
      directIncrementalCostUsdMaximumForSubscriptionAndLocalWork: 0,
      conditionalPaidAudioMaximumUsd: 1,
      productionMutationAuthorized: true,
      nextBatchSelectionAuthorized: false,
      nextAuthorizedAction: record.nextAuthorizedAction
    },
    null,
    2
  )
);
