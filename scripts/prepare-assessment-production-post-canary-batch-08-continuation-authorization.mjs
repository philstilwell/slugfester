#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";

const root = "docs/assessment-production/post-canary-continuation-v1/batch-08";
const outputPath = `${root}/continuation-standing-authorization.json`;
const attachmentPath = "/Users/philstilwell/.codex/attachments/d14b5374-5ca2-4472-8bcf-706db234dda4/pasted-text.txt";
const attachmentSha256 = "4d7cb5fa15a362d2953e93e2542c95e61b4afe0c631cb380a8ddd49e089064d3";
const checkpointCommit = "f238095b23e38d58fae65c1f36476a85f91cc6f8";
const toolPath = "scripts/prepare-assessment-production-post-canary-batch-08-continuation-authorization.mjs";
const testPath = "scripts/test-assessment-production-post-canary-batch-08-continuation-authorization.mjs";
const shouldWrite = process.argv.includes("--write");
const authorizedAtIndex = process.argv.indexOf("--authorized-at");
const authorizedAt = authorizedAtIndex >= 0 ? process.argv[authorizedAtIndex + 1] : null;
assert(authorizedAt && !Number.isNaN(Date.parse(authorizedAt)), "--authorized-at requires an ISO timestamp");

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const readJson = (file) => readFile(file, "utf8").then(JSON.parse);
const exists = (file) => access(file).then(() => true, () => false);

const lockedSources = Object.freeze({
  "docs/assessment-production-workflow.md": "41a61ee605bc1dfd4f21a5738c709560a98c9598fe16c2b385d013cdbb43a3ee",
  "docs/reassessment-rubric-v2.1.md": "9b5ae4e0b8b0be9cb6bbdccd7cf37fe441c44110d1696ffb86aa55cf3714692c",
  "docs/assessment-workflow-v4.2.21.17.41.md": "234907ae007a0c36603d497bd6064a6d080501cd2c6c413746793462ae570315",
  "docs/assessment-production/score-stability-policy-v2.2-promotion.json": "2a018107434edb8a31020e441a2088e2d259596d49bedd8ccc89eaee0880f666",
  [`${root}/standing-authorization.json`]: "ae02079b7d456a5d75c554348bbb496c5a7edc57dfb2e40536059d41b5bfccc9",
  [`${root}/audio-verification/failure-diagnosis.json`]: "94929a6c979dab21e8e8c421916e1fac572837eecc2220f0c27f576e0be87411",
  "scripts/lib/v416-audio-verification.mjs": "9f7c2a6dc40b33de092503350994b3198588c5e9b7aaf9d547365e81ceb138d7",
});

for (const [file, digest] of Object.entries(lockedSources)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: frozen source changed`);
}
assert.equal(sha256(await readFile(attachmentPath)), attachmentSha256, "authorization attachment changed");
assert(!(await exists(outputPath)), "Batch 8 continuation standing authorization already exists");

const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const origin = execFileSync("git", ["rev-parse", "origin/main"], { encoding: "utf8" }).trim();
assert.equal(head, checkpointCommit, "authorization must freeze at the diagnosed checkpoint");
assert.equal(origin, head, "diagnosed checkpoint must already be pushed");

const instruction = await readFile(attachmentPath, "utf8");
assert(instruction.startsWith("I authorize creation and use of a Batch 8 continuation and failure-recovery standing-authorization amendment"));
assert(instruction.includes("aggregate Batch 8 usage-derived cost—including the already recorded $0.156225—must remain at or below $1.00"));
assert(instruction.includes("selecting Batch 9"));

const standing = await readJson(`${root}/standing-authorization.json`);
const diagnosis = await readJson(`${root}/audio-verification/failure-diagnosis.json`);
assert.equal(standing.status, "frozen-active-batch-08-complete-remaining-workflow-standing-authorization");
assert.deepEqual(standing.selectedDebates, ["88", "194", "137", "08", "65", "140", "156", "120", "118", "145"]);
assert.equal(diagnosis.status, "frozen-three-batch-08-debate-156-audio-unresolved-diagnosed");
assert.equal(diagnosis.attributionDiagnosis.unresolvedMoves, 3);
assert.deepEqual(
  diagnosis.attributionDiagnosis.unresolved.map((item) => item.moveId),
  [
    "con-conscious-capacity-grounds-moral-distinctions",
    "con-conception-dogma-obstructs-abortion-inquiry",
    "pro-scripture-character-historical-progress",
  ],
);

const record = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-08-continuation-standing-authorization",
  protocolId: "assessment-production-post-canary-batch-08-continuation-standing-authorization",
  status: "frozen-active-batch-08-continuation-and-failure-recovery-standing-authorization",
  authorizedAt,
  checkpointCommit,
  productionCanary: false,
  batchNumber: 8,
  stagingOnly: true,
  selectedDebates: standing.selectedDebates,
  supersedes: {
    path: `${root}/standing-authorization.json`,
    sha256: lockedSources[`${root}/standing-authorization.json`],
    onlyWhereConflictingStopRulesAreExplicitlyExpanded: true,
    allOtherControlsPreserved: true,
  },
  authorizationSource: {
    originalAttachmentPath: attachmentPath,
    originalAttachmentSha256: attachmentSha256,
    instruction,
    instructionSha256: sha256(instruction),
  },
  model: {
    label: "5.6 Sol",
    slug: "gpt-5.6-sol",
    reasoningEffort: "low",
    authentication: "ChatGPT subscription",
  },
  currentFailure: {
    diagnosisPath: `${root}/audio-verification/failure-diagnosis.json`,
    diagnosisSha256: lockedSources[`${root}/audio-verification/failure-diagnosis.json`],
    debateNumber: "156",
    moveIds: diagnosis.attributionDiagnosis.unresolved.map((item) => item.moveId),
    classification: diagnosis.attributionDiagnosis.classification,
    failedCheck: "expectedSpeakerExcerptRecovered",
    frozenThreshold: 0.8,
    deterministicTextOnlyRecoveryMustBeAttemptedFirst: true,
  },
  authorizedSequence: [
    "bounded-debate-156-audio-verification-resolution",
    "dispute-only-adjudication-and-complete-cohort-validation",
    "final-ledger-assembly",
    "single-deterministic-score-pass-and-v2.2-stability-validation",
    "score-locked-publication-reconstruction-and-bounded-field-repairs",
    "deterministic-compilation-and-finalization",
    "desktop-and-mobile-rendering-verification",
    "compatibility-staging-and-regressions",
    "frozen-production-publication",
    "generated-seo-inventory-isolated-comparison-bounded-write-and-complete-validation",
    "batch-08-completion-analysis",
  ],
  recoveryControls: {
    diagnosisRequiredBeforeEveryCorrection: true,
    correctedContextOrHarnessHashLockRequired: true,
    attemptsPerNewCorrection: 1,
    boundedCorrectionLevelsPerUnderlyingProblemMaximum: 2,
    ordinaryRetriesMaximum: 0,
    rerunsMaximum: 0,
    timeoutExtensionsMaximum: 0,
    rollbacksMaximum: 0,
    manualScoreAdjustmentsMaximum: 0,
    fieldDisjointShardingPermitted: true,
    minimumShardCountRequired: true,
    unattemptedContextResumptionPermitted: true,
    validationOnlyOverlaysMustPreserveOriginalEvidence: true,
    publicationWritableFieldsPerPacketMaximum: 2,
    rejectedOutputMayBeImmutableRepairBaseOnly: true,
    rejectedOutputMayNeverBeAcceptedDirectly: true,
    eachOriginalFieldAcceptedExactlyOnce: true,
    completeAffectedCohortReplayRequired: true,
  },
  audioResolutionControls: {
    unresolvedMoves: 3,
    deterministicMethodsPermitted: [
      "authenticated-verification-reference-reconstruction-from-frozen-canonical-text",
      "validation-only-in-memory-overlay",
      "source-preimage-authentication",
      "corrected-deterministic-execution-harness",
    ],
    originalRequestsTranscriptsReferencesOutputsValidatorsThresholdsAndCorrectionEvidenceImmutable: true,
    semanticSourceContentChangePermitted: false,
    speakerIdentityChangePermitted: false,
    audioPlaybackPermitted: false,
    manualSemanticAudioEvaluationPermitted: false,
    newlyFrozenPaidCorrectionCallsMaximumPerAffectedClip: 1,
    paidCorrectionCallPermittedOnlyAfterDeterministicMethodsCannotResolve: true,
  },
  executionControls: {
    everyContextPacketSchemaValidatorInputOutputCandidateLedgerAndMutationHashLockedBeforeExecution: true,
    freshIsolatedContextsRequired: true,
    scoreBlindnessRequiredWhereApplicable: true,
    attemptsPerContextOrDeterministicPass: 1,
    stageSpecificFrozenSchedulerAndConcurrencyRequired: true,
    modelAuthoredScoresAllowed: false,
    scorePassesMaximum: 1,
    activeScoreStabilityPolicy: "v2.2",
    integerRoundedTiesPermitted: true,
    commitAndPushEveryPassingOrPreservedFailureCheckpoint: true,
  },
  costControls: {
    subscriptionBackedModelsAndLocalWorkDirectIncrementalCostUsdMaximum: 0,
    priorUsageDerivedAudioCostUsd: 0.156225,
    aggregateBatchEightPaidAudioMaximumUsd: 1,
    maximumRemainingUsageDerivedAudioCostUsd: 0.843775,
    aggregateEstimateMustBeFrozenAndReportedBeforeAdditionalPaidCall: true,
    conditionalAdvanceApprovalWithinAggregateMaximum: true,
    paidCallsSequential: true,
    paidAttemptsPerClip: 1,
    paidRetriesMaximum: 0,
    stopRemainingAfterRequestFailureOrUsageDerivedCapExceedance: true,
    otherPaidServicesAuthorized: false,
  },
  productionControls: {
    mutableDebateNumbers: standing.selectedDebates,
    productionLedgersMaximum: 10,
    referencesMustRemainByteIdentical: true,
    unrelatedProductionRecordsMustRemainByteIdentical: true,
    productionMutationMustMatchFrozenAuthenticatedManifest: true,
    generatedDerivativesRequireFrozenInventoryAndIsolatedComparison: true,
  },
  automaticContinuation: {
    whileEveryFrozenGatePasses: true,
    routinePreparationActivationExecutionValidationRecoveryReplayAnalysisCommitAndPushRequireNoAdditionalApproval: true,
    pauseOnlyOnCompletionOrStopRule: true,
  },
  stopRules: {
    thirdCorrectionLevelOrThirdFailureSameUnderlyingProblemBlocks: true,
    failedRecursiveCorrectionOrBoundedPublicationRepairBlocks: true,
    aggregateBatchEightPaidAudioCostAboveOneDollarBlocks: true,
    unapprovedPaidServiceBlocks: true,
    outsideBatchEightDebateBlocks: true,
    unfrozenAcceptedSourceIdentityJudgmentScoreReferenceValidatorMeaningOrProtectedFieldChangeBlocks: true,
    unexpectedUnrecoverableValidationCategoryBlocks: true,
    ordinaryRetryRerunTimeoutExtensionRollbackOrManualScoreAdjustmentBlocks: true,
    productionMutationManifestMismatchBlocks: true,
    batchNineSelectionBlocks: true,
    outsideAuthorizationBlocks: true,
  },
  sourceHashes: {
    ...lockedSources,
    [toolPath]: sha256(await readFile(toolPath)),
    [testPath]: sha256(await readFile(testPath)),
  },
  nextAuthorizedAction: "prepare-freeze-validate-and-push-minimum-bounded-deterministic-debate-156-audio-resolution-plan",
};

assert.equal(record.recoveryControls.boundedCorrectionLevelsPerUnderlyingProblemMaximum, 2);
assert.equal(record.executionControls.scorePassesMaximum, 1);
assert.equal(record.costControls.aggregateBatchEightPaidAudioMaximumUsd, 1);
assert.equal(record.costControls.otherPaidServicesAuthorized, false);
assert.equal(record.productionControls.mutableDebateNumbers.length, 10);
assert.equal(record.stopRules.batchNineSelectionBlocks, true);

if (shouldWrite) await writeFile(outputPath, `${JSON.stringify(record, null, 2)}\n`);
console.log(JSON.stringify({
  status: shouldWrite ? record.status : "passed-continuation-authorization-preview",
  checkpointCommit,
  selectedDebates: record.selectedDebates.length,
  unresolvedAudioMoves: record.currentFailure.moveIds.length,
  boundedCorrectionLevelsPerProblem: record.recoveryControls.boundedCorrectionLevelsPerUnderlyingProblemMaximum,
  aggregatePaidAudioMaximumUsd: record.costControls.aggregateBatchEightPaidAudioMaximumUsd,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: record.nextAuthorizedAction,
}, null, 2));
