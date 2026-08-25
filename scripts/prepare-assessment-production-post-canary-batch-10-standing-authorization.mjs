#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_10_STANDING_AUTHORIZATION,
  POST_CANARY_BATCH_10_STANDING_AUTHORIZATION_INSTRUCTION,
  POST_CANARY_BATCH_10_STANDING_AUTHORIZATION_INSTRUCTION_PATH,
  POST_CANARY_BATCH_10_STANDING_AUTHORIZATION_PROTOCOL_ID,
  POST_CANARY_BATCH_10_STANDING_AUTHORIZATION_STATUS,
  validatePostCanaryBatch10StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-10-standing-authorization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const authorizedAtIndex = process.argv.indexOf("--authorized-at");
const authorizedAt =
  authorizedAtIndex >= 0 ? process.argv[authorizedAtIndex + 1] : null;
assertV4(
  authorizedAt && !Number.isNaN(Date.parse(authorizedAt)),
  "--authorized-at requires an ISO timestamp"
);

const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-10";
const SELECTION = `${ROOT}/selection.json`;
const SELECTION_ANALYSIS = `${ROOT}/selection-analysis.json`;
const SOURCE_PREPARATION = `${ROOT}/source-preparation/preparation-manifest.json`;
const SOURCE_VALIDATION = `${ROOT}/source-preparation/validation.json`;
const SELECTION_FREEZE_COMMIT = "047e7f012eb08cc3b7bd3bf5e4d49ea1d4902752";
const SOURCE_PACKET_COMMIT = "1974c96793f2c62ffe7f4c300d899e08d8186f9a";
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
  SOURCE_PREPARATION,
  SOURCE_VALIDATION,
  `${ROOT}/source-preparation-transport/plan.json`,
  POST_CANARY_BATCH_10_STANDING_AUTHORIZATION_INSTRUCTION_PATH,
  "scripts/lib/assessment-production-post-canary-batch-10-standing-authorization.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-10-standing-authorization.mjs",
  "scripts/test-assessment-production-post-canary-batch-10-standing-authorization.mjs"
];
const REQUIRED_ORDER = ["21", "74", "107", "142", "123", "177", "68", "147", "61", "130"];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

assertV4(
  !(await exists(POST_CANARY_BATCH_10_STANDING_AUTHORIZATION)),
  `${POST_CANARY_BATCH_10_STANDING_AUTHORIZATION} already exists`
);
const [selectionBytes, analysisBytes, sourcePreparationBytes, sourceValidationBytes] = await Promise.all([
  readFile(SELECTION),
  readFile(SELECTION_ANALYSIS),
  readFile(SOURCE_PREPARATION),
  readFile(SOURCE_VALIDATION)
]);
const selection = JSON.parse(selectionBytes);
const analysis = JSON.parse(analysisBytes);
const sourcePreparation = JSON.parse(sourcePreparationBytes);
const sourceValidation = JSON.parse(sourceValidationBytes);
assertV4(
  selection.status ===
      "tenth-post-canary-ten-debate-batch-selection-frozen-source-gate-passed" &&
    selection.batchNumber === 10 &&
    selection.checkpointCommit ===
      "ad85204c0ac32190633fcf60d87267f36f298e76" &&
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
      "tenth-post-canary-batch-selection-analysis-passed-awaiting-standing-authorization" &&
    analysis.selection.sha256 === sha256(selectionBytes) &&
    sourcePreparation.status ===
      "post-canary-batch-10-ten-complete-score-blind-source-packets-prepared-awaiting-validation" &&
    sourcePreparation.totals.discoveryContexts === 36 &&
    sourcePreparation.totals.modelContextsExecuted === 0 &&
    sourceValidation.status ===
      "post-canary-batch-10-score-blind-source-packet-validation-passed-frozen-under-standing-authorization" &&
    JSON.stringify(sourceValidation.selectedDebates) === JSON.stringify(REQUIRED_ORDER) &&
    sourceValidation.totals.discoveryContexts === 36 &&
    sourceValidation.totals.modelContextsExecuted === 0 &&
    sourceValidation.directIncrementalCostUsd === 0,
  "the frozen Batch 10 selection or source-packet boundary changed"
);
assertV4(
  execFileSync("git", ["show", `${SELECTION_FREEZE_COMMIT}:${SELECTION}`]).equals(selectionBytes),
  "Batch 10 selection differs from the user-authorized selection commit"
);
execFileSync("git", ["merge-base", "--is-ancestor", SELECTION_FREEZE_COMMIT, "HEAD"]);
execFileSync("git", ["merge-base", "--is-ancestor", SOURCE_PACKET_COMMIT, "HEAD"]);
assertV4(
  execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    encoding: "utf8"
  }).trim() === "main" &&
    execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() ===
      execFileSync("git", ["rev-parse", "origin/main"], { encoding: "utf8" }).trim(),
  "Batch 10 standing authorization must freeze at the pushed source-packet commit"
);

const sourceHashes = {};
for (const file of [...SOURCE_FILES].sort()) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}
const record = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-10-standing-authorization",
  protocolId: POST_CANARY_BATCH_10_STANDING_AUTHORIZATION_PROTOCOL_ID,
  status: POST_CANARY_BATCH_10_STANDING_AUTHORIZATION_STATUS,
  authorizedAt,
  sourcePacketCommit: SOURCE_PACKET_COMMIT,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: false,
  batchNumber: 10,
  stagingOnly: true,
  selectedDebates: REQUIRED_ORDER,
  selection: {
    path: SELECTION,
    sha256: sha256(selectionBytes),
    bytes: selectionBytes.length,
    status: selection.status
  },
  sourcePreparation: {
    path: SOURCE_PREPARATION,
    sha256: sha256(sourcePreparationBytes),
    bytes: sourcePreparationBytes.length,
    status: sourcePreparation.status,
    frozenDiscoveryContexts: 36
  },
  sourceValidation: {
    path: SOURCE_VALIDATION,
    sha256: sha256(sourceValidationBytes),
    bytes: sourceValidationBytes.length,
    status: sourceValidation.status
  },
  userAuthorization: {
    instruction: POST_CANARY_BATCH_10_STANDING_AUTHORIZATION_INSTRUCTION,
    resolvedAntecedent: "The frozen Batch 10 selection identified the next approval as creation of the standing authorization and score-blind source-packet workflow.",
    scopeInterpretation: "Create and use a complete-workflow Batch 10 standing authorization for the ten frozen selections, beginning with the separately frozen score-blind source packets, while preserving the established campaign controls and stopping before Batch 11 selection.",
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
    "thirty-six-frozen-score-blind-discovery-contexts",
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
    recursiveRepairsMaximum: 1,
    automaticRepairsMaximum: 0,
    rollbacksMaximum: 0,
    repairWritableFieldsMaximumPerPacket: 2,
    scorePassesMaximum: 1,
    modelAuthoredScoresAllowed: false,
    roundedIntegerScoreTiesPermitted: true,
    failedPartialOutputReusable: false,
    eachOriginalFieldAcceptedExactlyOnce: true,
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
  recoveryControls: {
    boundedFirstRecoveryAuthorized: true,
    recoveryAttemptsPerFailedContextMaximum: 2,
    ordinaryRetriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
    recursiveCorrectionsMaximum: 1,
    failedPartialOutputReusable: false,
    diagnosisUsesOnlyPreservedRecordsAndLocalEvidence: true,
    correctedContextAndMergeRuleHashLockRequired: true,
    unattemptedContextResumptionPermitted: true,
    validationOverlayMustPreserveOriginalEvidence: true,
    fieldDisjointShardingPermitted: true,
    minimumShardCountRequired: true,
    eachOriginalFieldAcceptedExactlyOnce: true,
    completeAffectedCohortReplayRequired: true,
    resumeStandingAuthorizationAfterPassingRecovery: true
  },
  recoveryHistory: {
    sourcePreparationTransportShape: {
      plan: `${ROOT}/source-preparation-transport/plan.json`,
      precedentDiagnosis: "docs/assessment-production/post-canary-continuation-v1/batch-09/source-preparation-recovery/failure-diagnosis.json",
      precedentCorrectionPlan: "docs/assessment-production/post-canary-continuation-v1/batch-09/source-preparation-recovery/correction-plan.json",
      affectedDebate: "68",
      prospectivePatternApplications: 1,
      failureCorrectionsUsed: 0,
      recursiveCorrectionsRemaining: 1,
      sharedValidatorChanged: false
    }
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
    outsideBatchTenDebateBlocks: true,
    unfrozenSourceScoreIdentityReferenceValidatorOrAcceptedFieldChangeBlocks: true,
    thirdFailureOfSameUnderlyingProblemBlocks: true,
    moreThanTwoRecoveryLevelsBlocks: true,
    failedSecondBoundedCorrectionBlocks: true,
    unexpectedValidationCategoryBlocks: true,
    ordinaryRetryRerunTimeoutExtensionRollbackOrManualScoreAdjustmentBlocks: true,
    productionMutationDifferentFromFrozenManifestBlocks: true,
    batchElevenSelectionBlocks: true,
    actionOutsideAuthorizationBlocks: true
  },
  sourceHashes,
  futureArtifactsExcludedFromSourceHashes: {
    discoveryExecution: `${ROOT}/discovery/execution-manifest.json`,
    batchCompletion: `${ROOT}/production-publication/generated-seo-correction/analysis.json`
  },
  nextAuthorizedAction:
    "prepare-validate-freeze-commit-and-push-batch-10-discovery-execution-manifest"
};
validatePostCanaryBatch10StandingAuthorization(record);
if (shouldWrite) {
  await writeFile(
    path.resolve(POST_CANARY_BATCH_10_STANDING_AUTHORIZATION),
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
