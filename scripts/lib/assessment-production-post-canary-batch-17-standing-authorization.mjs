import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const POST_CANARY_BATCH_17_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-17";
export const POST_CANARY_BATCH_17_STANDING_AUTHORIZATION =
  `${POST_CANARY_BATCH_17_ROOT}/standing-authorization.json`;
export const POST_CANARY_BATCH_17_STANDING_AUTHORIZATION_PROTOCOL_ID =
  "assessment-production-post-canary-batch-17-standing-authorization";
export const POST_CANARY_BATCH_17_STANDING_AUTHORIZATION_STATUS =
  "frozen-active-batch-17-complete-remaining-workflow-standing-authorization";
export const POST_CANARY_BATCH_17_STANDING_AUTHORIZATION_INSTRUCTION_PATH =
  POST_CANARY_BATCH_17_ROOT + "/standing-authorization-instruction.txt";
export const POST_CANARY_BATCH_17_STANDING_AUTHORIZATION_INSTRUCTION = readFileSync(
  path.resolve(POST_CANARY_BATCH_17_STANDING_AUTHORIZATION_INSTRUCTION_PATH),
  "utf8"
).trimEnd();

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function validatePostCanaryBatch17StandingAuthorization(record) {
  assertV4(
    record?.schemaVersion ===
        "1.0-assessment-production-post-canary-batch-17-standing-authorization" &&
      record.protocolId ===
        POST_CANARY_BATCH_17_STANDING_AUTHORIZATION_PROTOCOL_ID &&
      record.status === POST_CANARY_BATCH_17_STANDING_AUTHORIZATION_STATUS &&
      record.productionCanary === false &&
      record.batchNumber === 17 &&
      record.sourcePacketCommit === "ebcab73d49e4bf66813770266527d45acc0eaec4" &&
      record.stagingOnly === true &&
      !Number.isNaN(Date.parse(record.authorizedAt)) &&
      record.userAuthorization?.instruction ===
        POST_CANARY_BATCH_17_STANDING_AUTHORIZATION_INSTRUCTION &&
      record.userAuthorization?.resolvedAntecedent ===
        "The user explicitly authorized the complete Batch 17 workflow and then authorized Batch 17 as the final short batch of the four remaining frozen-pool debates under all existing standing approvals." &&
      record.userAuthorization?.scopeInterpretation ===
        "Create and use a complete-workflow Batch 17 standing authorization for Debates 77, 44, 171, and 62. The short-batch amendment changes only the final population and proportional artifact counts; it preserves the established source, isolation, scoring, audio, recovery, publication, validation, Git, cleanup, and Batch 18 stop controls." &&
      record.userAuthorization?.directIncrementalCostUsdMaximumForSubscriptionAndLocalWork === 0 &&
      record.userAuthorization?.conditionalPaidAudioMaximumUsd === 1,
    "Batch 17 standing-authorization identity changed"
  );
  assertV4(
    canonicalJson(record.selectedDebates) ===
      canonicalJson(["77", "44", "171", "62"]),
    "Batch 17 standing-authorization debate boundary changed"
  );
  assertV4(
    canonicalJson(record.model) ===
      canonicalJson({
        label: "5.6 Sol",
        slug: "gpt-5.6-sol",
        reasoningEffort: "low",
        authentication: "ChatGPT subscription"
      }),
    "Batch 17 standing-authorization model changed"
  );
  assertV4(
    record.executionControls?.everyContextEnumeratedAndHashLockedBeforeExecution === true &&
      record.executionControls?.freshIsolatedContextRequired === true &&
      record.executionControls?.attemptsPerContextOrPass === 1 &&
      record.executionControls?.retriesMaximum === 0 &&
      record.executionControls?.rerunsMaximum === 0 &&
      record.executionControls?.timeoutExtensionsMaximum === 0 &&
      record.executionControls?.recursiveRepairsMaximum === 1 &&
      record.executionControls?.automaticRepairsMaximum === 0 &&
      record.executionControls?.rollbacksMaximum === 0 &&
      record.executionControls?.repairWritableFieldsMaximumPerPacket === 2 &&
      record.executionControls?.scorePassesMaximum === 1 &&
      record.executionControls?.modelAuthoredScoresAllowed === false &&
      record.executionControls?.roundedIntegerScoreTiesPermitted === true &&
      record.executionControls?.failedPartialOutputReusable === false &&
      record.executionControls?.eachOriginalFieldAcceptedExactlyOnce === true,
    "Batch 17 standing-authorization execution controls changed"
  );
  assertV4(
    canonicalJson(record.stageConcurrency) ===
      canonicalJson({
        discovery: 4,
        inventory: 2,
        judgments: 2,
        audio: 1,
        adjudication: 2,
        publication: 2
      }) &&
      canonicalJson(record.schedulerRamps) ===
        canonicalJson({
          discovery: [1, 2, 4],
          inventory: [1, 2],
          judgments: [1, 2],
          audioVerification: [1],
          adjudication: [1, 2],
          publication: [1, 2]
        }),
    "Batch 17 standing-authorization scheduler changed"
  );
  const { nextBatchSelection, ...authorizedActions } = record.authorization ?? {};
  assertV4(
    Object.values(authorizedActions).every(Boolean) &&
      nextBatchSelection === false,
    "Batch 17 standing-authorization scope changed"
  );
  assertV4(
    record.costBoundary?.subscriptionAndLocalDirectIncrementalCostUsdMaximum === 0 &&
      record.costBoundary?.conditionalPaidAudioMaximumUsd === 1 &&
      record.costBoundary?.publicSourceRecoveryDirectIncrementalCostUsdMaximum === 0 &&
      record.costBoundary?.audioEstimateMustBeFrozenAndReportedBeforeFirstCall === true &&
      record.costBoundary?.audioSequentialExecutionRequired === true &&
      record.audioRecoveryControls?.primaryPaidAttemptPerRequiredFrozenClip === 1 &&
      record.audioRecoveryControls?.successfulCallsMayNotRepeat === true &&
      record.audioRecoveryControls?.transportOrServiceInterruptionReplacementAttemptsMaximumPerClip === 1 &&
      record.audioRecoveryControls?.longClipSecondTransportFailureFinalSplitRecoveryAuthorized === true &&
      record.audioRecoveryControls?.finalSplitSubclipsMaximum === 2 &&
      record.audioRecoveryControls?.finalSplitMustBeContiguousCoverageCompleteAndMinimal === true &&
      record.audioRecoveryControls?.paidAttemptsPerFinalSplitSubclipMaximum === 1 &&
      record.audioRecoveryControls?.otherPaidRetriesAllowed === false &&
      record.audioRecoveryControls?.unresolvedAttributionFreshShardAttemptsMaximum === 2 &&
      record.audioRecoveryControls?.attributionShardMustBeFieldRestrictedAndAudioEvidenceLocked === true &&
      record.audioRecoveryControls?.everyFailureAndUsageRecordMustBePreserved === true,
    "Batch 17 standing-authorization cost boundary changed"
  );
  assertV4(
    record.sourceRecoveryControls?.verifiedEquivalentSourceDiscoveryAllowed === true &&
      record.sourceRecoveryControls?.publicSourceAcquisitionsMaximumPerVideo === 1 &&
      record.sourceRecoveryControls?.freshMediaUrlResolutionsMaximumPerVideo === 1 &&
      record.sourceRecoveryControls?.redirectsMaximumPerNonOverlappingRange === 3 &&
      record.sourceRecoveryControls?.httpsRedirectsOnly === true &&
      record.sourceRecoveryControls?.redirectDestinationHostSuffix === "googlevideo.com" &&
      record.sourceRecoveryControls?.finalMediaResponseStatus === 206 &&
      record.sourceRecoveryControls?.repeatedByteRangesAllowed === false &&
      record.sourceRecoveryControls?.automaticTransportRetriesMaximum === 0 &&
      record.sourceRecoveryControls?.purchasesAllowed === false &&
      record.sourceRecoveryControls?.playbackDuringSourceRecoveryAllowed === false &&
      record.sourceRecoveryControls?.semanticAudioEvaluationDuringSourceRecoveryAllowed === false,
    "Batch 17 standing-authorization source-recovery controls changed"
  );
  assertV4(
    Object.values(record.stopRules ?? {}).every(Boolean),
    "Batch 17 standing-authorization stop rule disabled"
  );
  assertV4(
    record.recoveryControls?.boundedFirstRecoveryAuthorized === true &&
      record.recoveryControls?.recoveryAttemptsPerFailedContextMaximum === 2 &&
      record.recoveryControls?.recoveryLevelsMaximum === 2 &&
      record.recoveryControls?.ordinaryRetriesMaximum === 0 &&
      record.recoveryControls?.timeoutExtensionsMaximum === 0 &&
      record.recoveryControls?.recursiveCorrectionsMaximum === 1 &&
      record.recoveryControls?.failedPartialOutputReusable === false &&
      record.recoveryControls?.fieldDisjointShardingPermitted === true &&
      record.recoveryControls?.minimumShardCountRequired === true &&
      record.recoveryControls?.eachOriginalFieldAcceptedExactlyOnce === true,
    "Batch 17 standing-authorization recovery controls changed"
  );
  assertV4(
    record.atomicShardPreservationGapStandingAuthorization?.status ===
      "frozen-active-standing-authorization-for-current-and-future-similar-blocks" &&
      record.atomicShardPreservationGapStandingAuthorization?.sameFailureMechanismRequired === true &&
      record.atomicShardPreservationGapStandingAuthorization?.minimumFreshFieldDisjointShardsRequired === true &&
      record.atomicShardPreservationGapStandingAuthorization?.attemptsPerShardMaximum === 1 &&
      record.atomicShardPreservationGapStandingAuthorization?.retriesMaximum === 0 &&
      record.atomicShardPreservationGapStandingAuthorization?.acceptedFieldsMustRemainImmutable === true &&
      record.atomicShardPreservationGapStandingAuthorization?.scorePassRerunAllowed === false &&
      record.atomicShardPreservationGapStandingAuthorization?.ordinaryRecoveryLevelsMaximum === 2 &&
      record.atomicShardPreservationGapStandingAuthorization?.exceptionalRecoveryLevel === 3 &&
      record.atomicShardPreservationGapStandingAuthorization?.recoverOnlyUnavailableFields === true &&
      record.atomicShardPreservationGapStandingAuthorization?.fourthRecoveryLevelAllowed === false,
    "Batch 17 atomic-shard preservation-gap standing authorization changed"
  );
  assertV4(
    Object.values(record.deterministicCorrectionControls ?? {}).every((value) => value === true || value === false) &&
      record.deterministicCorrectionControls?.staleSeoSummariesSitemapsCalibrationAnalysesTestsControlLabelsAndSimilarDerivedFilesAuthorized === true &&
      record.deterministicCorrectionControls?.exactCorrectionRequired === true &&
      record.deterministicCorrectionControls?.scorePassRerunAllowed === false &&
      record.deterministicCorrectionControls?.calculatedScoreChangesAllowed === false &&
      record.deterministicCorrectionControls?.acceptedFieldChangesAllowed === false &&
      record.renderingControls?.controllerOrServerStartupFailureBeforeAnyViewportDoesNotCountAsViewportRetry === true &&
      record.renderingControls?.diagnosisAndCorrectionAuthorized === true &&
      record.renderingControls?.failureRecordMustBePreserved === true &&
      record.renderingControls?.screenshotsPerDebateRequired === 4 &&
      record.renderingControls?.screenshotsRequiredForFinalShortBatch === 16 &&
      record.renderingControls?.screenshotsMustBeFrozenCommittedAndInventoriedBeforeCompatibility === true,
    "Batch 17 deterministic correction or rendering controls changed"
  );
  assertV4(
    record.gitControls?.fetchBeforePushRequired === true &&
      record.gitControls?.cleanConflictFreeRebaseOntoOriginMainAuthorized === true &&
      record.gitControls?.forcePushAllowed === false &&
      record.gitControls?.localRemoteCommitEqualityVerificationRequired === true,
    "Batch 17 standing-authorization Git controls changed"
  );
  assertV4(
    Object.values(record.cleanupControls ?? {}).every(Boolean),
    "Batch 17 cleanup controls changed"
  );
  return record;
}
export async function loadAndValidatePostCanaryBatch17StandingAuthorization() {
  const bytes = await readFile(
    path.resolve(POST_CANARY_BATCH_17_STANDING_AUTHORIZATION)
  );
  const record = validatePostCanaryBatch17StandingAuthorization(JSON.parse(bytes));
  for (const [file, digest] of Object.entries(record.sourceHashes)) {
    assertV4(
      sha256(await readFile(path.resolve(file))) === digest,
      `${file}: standing-authorization source drifted`
    );
  }
  return { record, bytes, sha256: sha256(bytes) };
}
