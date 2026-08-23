import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const POST_CANARY_BATCH_07_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-07";
export const POST_CANARY_BATCH_07_STANDING_AUTHORIZATION =
  `${POST_CANARY_BATCH_07_ROOT}/standing-authorization.json`;
export const POST_CANARY_BATCH_07_STANDING_AUTHORIZATION_PROTOCOL_ID =
  "assessment-production-post-canary-batch-07-standing-authorization";
export const POST_CANARY_BATCH_07_STANDING_AUTHORIZATION_STATUS =
  "frozen-active-batch-07-complete-remaining-workflow-standing-authorization";
export const POST_CANARY_BATCH_07_STANDING_AUTHORIZATION_INSTRUCTION_PATH =
  POST_CANARY_BATCH_07_ROOT + "/standing-authorization-instruction.txt";
export const POST_CANARY_BATCH_07_STANDING_AUTHORIZATION_INSTRUCTION = readFileSync(
  path.resolve(POST_CANARY_BATCH_07_STANDING_AUTHORIZATION_INSTRUCTION_PATH),
  "utf8"
).trimEnd();

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function validatePostCanaryBatch07StandingAuthorization(record) {
  assertV4(
    record?.schemaVersion ===
        "1.0-assessment-production-post-canary-batch-07-standing-authorization" &&
      record.protocolId ===
        POST_CANARY_BATCH_07_STANDING_AUTHORIZATION_PROTOCOL_ID &&
      record.status === POST_CANARY_BATCH_07_STANDING_AUTHORIZATION_STATUS &&
      record.productionCanary === false &&
      record.batchNumber === 7 &&
      record.sourcePacketCommit === "eee5afef2d581ba14ff883591579292651ae606a" &&
      record.stagingOnly === true &&
      !Number.isNaN(Date.parse(record.authorizedAt)) &&
      record.userAuthorization?.instruction ===
        POST_CANARY_BATCH_07_STANDING_AUTHORIZATION_INSTRUCTION &&
      record.userAuthorization?.resolvedAntecedent ===
        "The next step requires your Batch 7 standing authorization." &&
      record.userAuthorization?.scopeInterpretation ===
        "Create and use a complete-workflow Batch 7 standing authorization for the ten frozen selections, beginning with the separately frozen score-blind source packets, while preserving the established campaign controls and stopping before Batch 8 selection." &&
      record.userAuthorization?.directIncrementalCostUsdMaximumForSubscriptionAndLocalWork === 0 &&
      record.userAuthorization?.conditionalPaidAudioMaximumUsd === 1,
    "Batch 7 standing-authorization identity changed"
  );
  assertV4(
    canonicalJson(record.selectedDebates) ===
      canonicalJson(["193", "80", "121", "100", "78", "113", "180", "02", "182", "56"]),
    "Batch 7 standing-authorization debate boundary changed"
  );
  assertV4(
    canonicalJson(record.model) ===
      canonicalJson({
        label: "5.6 Sol",
        slug: "gpt-5.6-sol",
        reasoningEffort: "low",
        authentication: "ChatGPT subscription"
      }),
    "Batch 7 standing-authorization model changed"
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
    "Batch 7 standing-authorization execution controls changed"
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
    "Batch 7 standing-authorization scheduler changed"
  );
  const { nextBatchSelection, ...authorizedActions } = record.authorization ?? {};
  assertV4(
    Object.values(authorizedActions).every(Boolean) &&
      nextBatchSelection === false,
    "Batch 7 standing-authorization scope changed"
  );
  assertV4(
    record.costBoundary?.subscriptionAndLocalDirectIncrementalCostUsdMaximum === 0 &&
      record.costBoundary?.conditionalPaidAudioMaximumUsd === 1 &&
      record.costBoundary?.audioEstimateMustBeFrozenAndReportedBeforeFirstCall === true &&
      record.costBoundary?.audioSequentialExecutionRequired === true,
    "Batch 7 standing-authorization cost boundary changed"
  );
  assertV4(
    Object.values(record.stopRules ?? {}).every(Boolean),
    "Batch 7 standing-authorization stop rule disabled"
  );
  assertV4(
    record.recoveryControls?.boundedFirstRecoveryAuthorized === true &&
      record.recoveryControls?.recoveryAttemptsPerFailedContextMaximum === 2 &&
      record.recoveryControls?.ordinaryRetriesMaximum === 0 &&
      record.recoveryControls?.timeoutExtensionsMaximum === 0 &&
      record.recoveryControls?.recursiveCorrectionsMaximum === 1 &&
      record.recoveryControls?.failedPartialOutputReusable === false &&
      record.recoveryControls?.fieldDisjointShardingPermitted === true &&
      record.recoveryControls?.minimumShardCountRequired === true &&
      record.recoveryControls?.eachOriginalFieldAcceptedExactlyOnce === true,
    "Batch 7 standing-authorization recovery controls changed"
  );
  return record;
}

export async function loadAndValidatePostCanaryBatch07StandingAuthorization() {
  const bytes = await readFile(
    path.resolve(POST_CANARY_BATCH_07_STANDING_AUTHORIZATION)
  );
  const record = validatePostCanaryBatch07StandingAuthorization(JSON.parse(bytes));
  for (const [file, digest] of Object.entries(record.sourceHashes)) {
    assertV4(
      sha256(await readFile(path.resolve(file))) === digest,
      `${file}: standing-authorization source drifted`
    );
  }
  return { record, bytes, sha256: sha256(bytes) };
}
