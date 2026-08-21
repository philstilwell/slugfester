import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const POST_CANARY_BATCH_04_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-04";
export const POST_CANARY_BATCH_04_STANDING_AUTHORIZATION =
  `${POST_CANARY_BATCH_04_ROOT}/standing-authorization.json`;
export const POST_CANARY_BATCH_04_STANDING_AUTHORIZATION_PROTOCOL_ID =
  "assessment-production-post-canary-batch-04-standing-authorization";
export const POST_CANARY_BATCH_04_STANDING_AUTHORIZATION_STATUS =
  "frozen-active-batch-04-complete-remaining-workflow-standing-authorization";
export const POST_CANARY_BATCH_04_STANDING_AUTHORIZATION_INSTRUCTION = `I authorize creation and use of a Batch 4 standing-authorization record covering the complete remaining reassessment and publication workflow for exactly these ten debates:

127, 67, 85, 49, 186, 81, 148, 47, 03, and 185.

Continue automatically through all remaining stages:

1. Prepare, validate, freeze, activate, execute, analyze, commit, and push the 44 frozen score-blind discovery contexts.
2. Prepare and execute candidate-census planning and candidate-sharded side selection.
3. Execute two isolated independent judgments per debate.
4. Deterministically extract disagreements.
5. Prepare local audio sources and clips when required, including one public-source download attempt per missing video and local FFmpeg processing, without playing or semantically evaluating audio.
6. Prepare and validate the audio-verification manifest and usage-derived cost estimate.
7. Execute required audio verification using gpt-4o-transcribe-diarize.
8. Prepare and execute dispute-only adjudication and bounded corrections.
9. Assemble final ledgers and perform exactly one deterministic repository score pass.
10. Perform score-locked publication reconstruction and bounded field-level repairs.
11. Compile, finalize, render-verify, stage compatibility, publish the frozen Batch 4 production mutation, update frozen generated SEO derivatives, run the complete repository validation chain, and commit and push the completed transaction.

Preserve these controls:

- Use 5.6 Sol with low reasoning effort through my ChatGPT subscription for discovery, selection, judgment, adjudication, correction, and publication contexts.
- Keep every model context isolated and score-blind wherever required.
- Do not expose legacy scores, winners, assessments, prohibited publication material, or unrelated debate records.
- Hash-lock every context, schema, source, packet, candidate, output path, validator, ledger, merge rule, production mutation, and generated-file inventory before execution.
- Use the frozen stage-specific scheduler and concurrency.
- Use one attempt per context or deterministic pass, with no ordinary retries, reruns, timeout extensions, automatic repairs, rollback, or hand-adjusted scores.
- Permit integer-rounded ties under the active v2.2 score-stability policy.
- Models must never calculate numerical scores. Use exactly one repository score pass.
- Repairs may expose no more than two explicitly diagnosed writable fields per packet and must preserve all accepted fields, sources, identities, moves, scores, references, and protected hashes.
- Production publication may replace only the ten Batch 4 debate records and their ten validated ledgers. Keep references and every unrelated production record byte-identical.
- Write generated derivatives only from a frozen inventory produced by an isolated generator comparison.
- Commit and push every successful frozen checkpoint to main.
- Subscription-backed model execution and local work have a direct incremental cost cap of $0.

For paid audio verification, freeze and report the usage-derived estimate before making the first call. I give conditional advance approval if the total frozen estimate is no more than $1.00. Execute calls sequentially, with one attempt per clip and no retries. Stop all remaining calls after a request-level failure or usage-derived cap exceedance.

I also authorize one bounded first recovery for any preserved deterministic-validation, transport, timeout, response-schema, rendering, compilation, compatibility, or generated-derivative failure. For such a failure, you may automatically:

1. Diagnose it using only preserved records and local repository evidence.
2. Validate, freeze, commit, and push the diagnosis.
3. Prepare and hash-lock one bounded correction or resumption plan.
4. Activate and execute that correction once.
5. Merge accepted results where applicable, replay the complete affected cohort, validate, analyze, commit, and push.
6. Resume this standing authorization after every successful gate.

Permitted first recoveries include deterministic harness corrections, response-schema or transport corrections, validation overlays that preserve original evidence, resumption of only unattempted contexts, and partitioning an oversized or timed-out context into the minimum number of score-blind, field-disjoint shards. Do not reuse failed partial model output as accepted content. Each original field may be decided exactly once in an accepted output.

Continue automatically while every frozen gate passes. Routine preparation, validation, execution, analysis, bounded first correction, resumption, merge, cohort replay, commit, and push do not require further approval.

Stop and request new approval only before:

- projected or actual paid-service cost above $1.00;
- any debate outside Batch 4;
- a second failure of the same corrected context or a failed bounded repair;
- more than one recovery attempt for a failed context;
- an unexpected validation category not covered above;
- changing an accepted judgment, source, identity, numerical score, reference, validator meaning, or protected field outside a frozen diagnosis;
- retry, rerun, timeout extension, recursive correction, rollback, or manual score adjustment;
- production mutation differing from its frozen manifest;
- selecting Batch 5; or
- any action outside this standing authorization.`;

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function validatePostCanaryBatch04StandingAuthorization(record) {
  assertV4(
    record?.schemaVersion ===
        "1.0-assessment-production-post-canary-batch-04-standing-authorization" &&
      record.protocolId ===
        POST_CANARY_BATCH_04_STANDING_AUTHORIZATION_PROTOCOL_ID &&
      record.status === POST_CANARY_BATCH_04_STANDING_AUTHORIZATION_STATUS &&
      record.productionCanary === false &&
      record.batchNumber === 4 &&
      record.stagingOnly === true &&
      !Number.isNaN(Date.parse(record.authorizedAt)) &&
      record.userAuthorization?.instruction ===
        POST_CANARY_BATCH_04_STANDING_AUTHORIZATION_INSTRUCTION &&
      record.userAuthorization?.directIncrementalCostUsdMaximumForSubscriptionAndLocalWork === 0 &&
      record.userAuthorization?.conditionalPaidAudioMaximumUsd === 1,
    "Batch 4 standing-authorization identity changed"
  );
  assertV4(
    canonicalJson(record.selectedDebates) ===
      canonicalJson(["127", "67", "85", "49", "186", "81", "148", "47", "03", "185"]),
    "Batch 4 standing-authorization debate boundary changed"
  );
  assertV4(
    canonicalJson(record.model) ===
      canonicalJson({
        label: "5.6 Sol",
        slug: "gpt-5.6-sol",
        reasoningEffort: "low",
        authentication: "ChatGPT subscription"
      }),
    "Batch 4 standing-authorization model changed"
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
    "Batch 4 standing-authorization execution controls changed"
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
    "Batch 4 standing-authorization scheduler changed"
  );
  const { nextBatchSelection, ...authorizedActions } = record.authorization ?? {};
  assertV4(
    Object.values(authorizedActions).every(Boolean) &&
      nextBatchSelection === false,
    "Batch 4 standing-authorization scope changed"
  );
  assertV4(
    record.costBoundary?.subscriptionAndLocalDirectIncrementalCostUsdMaximum === 0 &&
      record.costBoundary?.conditionalPaidAudioMaximumUsd === 1 &&
      record.costBoundary?.audioEstimateMustBeFrozenAndReportedBeforeFirstCall === true &&
      record.costBoundary?.audioSequentialExecutionRequired === true,
    "Batch 4 standing-authorization cost boundary changed"
  );
  assertV4(
    Object.values(record.stopRules ?? {}).every(Boolean),
    "Batch 4 standing-authorization stop rule disabled"
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
    "Batch 4 standing-authorization recovery controls changed"
  );
  return record;
}

export async function loadAndValidatePostCanaryBatch04StandingAuthorization() {
  const bytes = await readFile(
    path.resolve(POST_CANARY_BATCH_04_STANDING_AUTHORIZATION)
  );
  const record = validatePostCanaryBatch04StandingAuthorization(JSON.parse(bytes));
  for (const [file, digest] of Object.entries(record.sourceHashes)) {
    assertV4(
      sha256(await readFile(path.resolve(file))) === digest,
      `${file}: standing-authorization source drifted`
    );
  }
  return { record, bytes, sha256: sha256(bytes) };
}
