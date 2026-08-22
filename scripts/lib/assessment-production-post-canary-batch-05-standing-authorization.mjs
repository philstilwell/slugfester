import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const POST_CANARY_BATCH_05_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-05";
export const POST_CANARY_BATCH_05_STANDING_AUTHORIZATION =
  `${POST_CANARY_BATCH_05_ROOT}/standing-authorization.json`;
export const POST_CANARY_BATCH_05_STANDING_AUTHORIZATION_PROTOCOL_ID =
  "assessment-production-post-canary-batch-05-standing-authorization";
export const POST_CANARY_BATCH_05_STANDING_AUTHORIZATION_STATUS =
  "frozen-active-batch-05-complete-remaining-workflow-standing-authorization";
export const POST_CANARY_BATCH_05_STANDING_AUTHORIZATION_INSTRUCTION = `I authorize creation and use of a Batch 5 standing-authorization and bounded failure-recovery record covering the complete reassessment and publication workflow for exactly these ten frozen debates:

158, 46, 64, 132, 189, 109, 179, 05, 42, and 59.

Use the frozen Batch 5 selection at commit cd13bce04689bc6e3cbf4efad5e0a35d9b40c099.

Automatically prepare, validate, freeze, activate, execute, analyze, commit, and push every successful checkpoint for:

1. Score-blind source packets and discovery.
2. Candidate-census planning and candidate-sharded side selection.
3. Two isolated independent judgments per debate.
4. Deterministic disagreement extraction.
5. Local audio-source preparation, one public-source download attempt per missing video, and local FFmpeg clip creation when required. Do not play or semantically evaluate audio.
6. Audio-verification manifest preparation, cost estimation, transcription, and deterministic validation.
7. Dispute-only adjudication and final-ledger assembly.
8. Exactly one deterministic repository score pass.
9. Score-locked publication reconstruction and bounded field-level repairs.
10. Compilation, finalization, rendering verification, compatibility staging, production publication, generated-search-engine-optimization derivatives, and complete repository validation.

Preserve these controls:

- Use 5.6 Sol with low reasoning effort through my ChatGPT subscription for discovery, inventory, judgment, adjudication, correction, and publication contexts.
- Keep model contexts isolated and score-blind wherever required. Exclude legacy scores, winners, assessments, publication prose, and prohibited material.
- Hash-lock every context, substantive input, schema, validator, output path, merge rule, candidate, ledger, and production manifest before the applicable execution.
- Use the frozen stage-specific scheduler and concurrency.
- Permit one attempt per newly frozen context or deterministic pass, with no ordinary retries, reruns, timeout extensions, rollback, manual score adjustments, or reuse of failed partial outputs.
- Preserve source identity, accepted fields, evidence, references, packet hashes, and unrelated production records.
- Models must never calculate numerical scores. Use exactly one repository score pass, permit integer-rounded ties under the active v2.2 policy, and do not rerun scoring.
- Publication repairs may expose no more than two explicitly diagnosed writable fields per packet and must preserve scores, sources, quotations, identities, and all accepted fields.
- Production publication may replace only these ten Batch 5 debate records and their ten validated ledgers. Keep references and every unrelated production record byte-identical.
- Generated derivatives may be written only from a frozen inventory produced through an isolated generator comparison.
- Commit and push every successful checkpoint to main.
- Subscription-backed model execution and local work have a direct incremental cost cap of $0.

For paid audio verification:

- Freeze and report the usage-derived estimate before the first paid call.
- I give conditional advance approval when the complete frozen estimate is no more than $1.00.
- Use gpt-4o-transcribe-diarize through the OpenAI Transcription API, with frozen same-debate speaker references where required.
- Execute sequentially, with one attempt per clip and no retries.
- Stop remaining calls after a request-level failure or if usage-derived cost would exceed $1.00.

For any preserved deterministic-validation, transport, response-schema, timeout, rendering, compilation, compatibility, or generated-derivative failure, you may automatically:

1. Diagnose it using only preserved records and repository evidence.
2. Freeze, validate, commit, and push the diagnosis.
3. Prepare and hash-lock one bounded correction or resumption plan.
4. Execute that correction once.
5. Merge accepted results where applicable, replay the complete affected cohort, validate, analyze, commit, and push.
6. Resume the standing-authorized workflow after every successful recovery.

Permitted first recoveries include deterministic execution-harness corrections, response-schema or transport corrections, minimum field-disjoint partitioning of an oversized or timed-out context, resumption of only unattempted contexts, validation overlays that preserve original evidence, publication repairs limited to two diagnosed fields, and compatibility or generated-derivative corrections limited to diagnosed files. Each original field may be decided exactly once in an accepted output.

Continue automatically while every frozen gate passes. Routine preparation, activation, execution, diagnosis, first bounded correction, merge, cohort replay, validation, commit, and push require no additional approval.

Stop and request new approval only before:

- a projected or actual paid-service cost above $1.00;
- a second failure of the same corrected context or a failed bounded repair;
- a second or recursive recovery attempt;
- a retry, rerun, timeout extension, rollback, or manual score adjustment;
- changing a source, speaker identity, accepted judgment, numerical score, reference, validator meaning, or protected field outside a frozen diagnosis;
- accessing a debate outside Batch 5;
- production mutation that differs from its frozen manifest;
- an unexpected validation category, missing canonical source, ambiguous speaker count, or unresolved audio requirement;
- selecting Batch 6; or
- any action outside this authorization.`;

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function validatePostCanaryBatch05StandingAuthorization(record) {
  assertV4(
    record?.schemaVersion ===
        "1.0-assessment-production-post-canary-batch-05-standing-authorization" &&
      record.protocolId ===
        POST_CANARY_BATCH_05_STANDING_AUTHORIZATION_PROTOCOL_ID &&
      record.status === POST_CANARY_BATCH_05_STANDING_AUTHORIZATION_STATUS &&
      record.productionCanary === false &&
      record.batchNumber === 5 &&
      record.stagingOnly === true &&
      !Number.isNaN(Date.parse(record.authorizedAt)) &&
      record.userAuthorization?.instruction ===
        POST_CANARY_BATCH_05_STANDING_AUTHORIZATION_INSTRUCTION &&
      record.userAuthorization?.directIncrementalCostUsdMaximumForSubscriptionAndLocalWork === 0 &&
      record.userAuthorization?.conditionalPaidAudioMaximumUsd === 1,
    "Batch 5 standing-authorization identity changed"
  );
  assertV4(
    canonicalJson(record.selectedDebates) ===
      canonicalJson(["158", "46", "64", "132", "189", "109", "179", "05", "42", "59"]),
    "Batch 5 standing-authorization debate boundary changed"
  );
  assertV4(
    canonicalJson(record.model) ===
      canonicalJson({
        label: "5.6 Sol",
        slug: "gpt-5.6-sol",
        reasoningEffort: "low",
        authentication: "ChatGPT subscription"
      }),
    "Batch 5 standing-authorization model changed"
  );
  assertV4(
    record.executionControls?.everyContextEnumeratedAndHashLockedBeforeExecution === true &&
      record.executionControls?.freshIsolatedContextRequired === true &&
      record.executionControls?.attemptsPerContextOrPass === 1 &&
      record.executionControls?.retriesMaximum === 0 &&
      record.executionControls?.rerunsMaximum === 0 &&
      record.executionControls?.timeoutExtensionsMaximum === 0 &&
      record.executionControls?.recursiveRepairsMaximum === 0 &&
      record.executionControls?.automaticRepairsMaximum === 0 &&
      record.executionControls?.rollbacksMaximum === 0 &&
      record.executionControls?.repairWritableFieldsMaximumPerPacket === 2 &&
      record.executionControls?.scorePassesMaximum === 1 &&
      record.executionControls?.modelAuthoredScoresAllowed === false &&
      record.executionControls?.roundedIntegerScoreTiesPermitted === true &&
      record.executionControls?.failedPartialOutputReusable === false &&
      record.executionControls?.eachOriginalFieldAcceptedExactlyOnce === true,
    "Batch 5 standing-authorization execution controls changed"
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
    "Batch 5 standing-authorization scheduler changed"
  );
  const { nextBatchSelection, ...authorizedActions } = record.authorization ?? {};
  assertV4(
    Object.values(authorizedActions).every(Boolean) &&
      nextBatchSelection === false,
    "Batch 5 standing-authorization scope changed"
  );
  assertV4(
    record.costBoundary?.subscriptionAndLocalDirectIncrementalCostUsdMaximum === 0 &&
      record.costBoundary?.conditionalPaidAudioMaximumUsd === 1 &&
      record.costBoundary?.audioEstimateMustBeFrozenAndReportedBeforeFirstCall === true &&
      record.costBoundary?.audioSequentialExecutionRequired === true,
    "Batch 5 standing-authorization cost boundary changed"
  );
  assertV4(
    Object.values(record.stopRules ?? {}).every(Boolean),
    "Batch 5 standing-authorization stop rule disabled"
  );
  assertV4(
    record.recoveryControls?.boundedFirstRecoveryAuthorized === true &&
      record.recoveryControls?.recoveryAttemptsPerFailedContextMaximum === 1 &&
      record.recoveryControls?.ordinaryRetriesMaximum === 0 &&
      record.recoveryControls?.timeoutExtensionsMaximum === 0 &&
      record.recoveryControls?.recursiveCorrectionsMaximum === 0 &&
      record.recoveryControls?.failedPartialOutputReusable === false &&
      record.recoveryControls?.fieldDisjointShardingPermitted === true &&
      record.recoveryControls?.minimumShardCountRequired === true &&
      record.recoveryControls?.eachOriginalFieldAcceptedExactlyOnce === true,
    "Batch 5 standing-authorization recovery controls changed"
  );
  return record;
}

export async function loadAndValidatePostCanaryBatch05StandingAuthorization() {
  const bytes = await readFile(
    path.resolve(POST_CANARY_BATCH_05_STANDING_AUTHORIZATION)
  );
  const record = validatePostCanaryBatch05StandingAuthorization(JSON.parse(bytes));
  for (const [file, digest] of Object.entries(record.sourceHashes)) {
    assertV4(
      sha256(await readFile(path.resolve(file))) === digest,
      `${file}: standing-authorization source drifted`
    );
  }
  return { record, bytes, sha256: sha256(bytes) };
}
