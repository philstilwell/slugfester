import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const POST_CANARY_BATCH_03_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-03";
export const POST_CANARY_BATCH_03_STANDING_AUTHORIZATION =
  `${POST_CANARY_BATCH_03_ROOT}/standing-authorization.json`;
export const POST_CANARY_BATCH_03_STANDING_AUTHORIZATION_PROTOCOL_ID =
  "assessment-production-post-canary-batch-03-standing-authorization";
export const POST_CANARY_BATCH_03_STANDING_AUTHORIZATION_STATUS =
  "frozen-active-batch-03-complete-remaining-workflow-standing-authorization";
export const POST_CANARY_BATCH_03_STANDING_AUTHORIZATION_INSTRUCTION = `I authorize creation and use of a Batch 3 standing-authorization record covering the complete remaining Batch 3 reassessment and publication workflow for exactly the ten frozen selected debates.

Automatically prepare, validate, freeze, activate, execute, analyze, commit, and push each successful checkpoint for:

1. Score-blind source-packet preparation and discovery.
2. Candidate-census planning and candidate-sharded side selection.
3. Two isolated independent judgments per debate.
4. Deterministic disagreement extraction.
5. Local audio-source preparation, public-source download attempts, and FFmpeg clip creation when required, without playing or semantically evaluating audio.
6. Audio-verification manifest preparation and cost estimation.
7. Required audio verification using gpt-4o-transcribe-diarize.
8. Dispute-only adjudication and bounded deterministic corrections.
9. Final-ledger assembly and the single deterministic score pass.
10. Score-locked publication reconstruction and bounded field-level repairs.
11. Deterministic compilation, finalization, rendering verification, compatibility staging, production publication, generated-SEO correction, and complete repository validation.

Preserve these controls throughout:

- Use 5.6 Sol with low reasoning effort through my ChatGPT subscription for every judgment, adjudication, and publication context.
- Keep model passes isolated, score-blind where required, and free of legacy scores, winners, assessments, and other prohibited material.
- Hash-lock every model context, schema, input, candidate, ledger, validator, and production mutation before execution.
- Use the frozen stage-specific scheduler and concurrency.
- Allow exactly one attempt per context or deterministic pass, with no retries, reruns, timeout extensions, recursive repairs, automatic repairs, rollback, or hand-adjusted scores.
- Permit integer-rounded ties under the active v2.2 score-stability policy.
- Repairs may expose no more than two explicitly diagnosed writable fields per packet and must preserve every accepted field, source, identity, move, score, and protected hash.
- Models must never derive numerical scores. Use exactly one repository score pass.
- Production publication may replace only the ten Batch 3 debate records and their ten validated ledgers. Keep references and all unrelated production records byte-identical.
- Generated derivatives may be written only from a frozen inventory after an isolated generator comparison.
- Commit and push every successful frozen checkpoint to main.
- Direct incremental cost for subscription-backed models and local work must remain $0.

For paid audio verification, freeze and report the usage-derived estimate before the first call. I give conditional advance approval only if the frozen estimate is no more than $1.00 total. Execute sequentially with one attempt per clip, no retries, and stop remaining calls after any request failure or usage-derived cap exceedance.

Continue automatically while every frozen gate passes. Stop and obtain new approval only before:

- a projected or actual paid-service cost above $1.00;
- an action involving a debate outside Batch 3;
- a source, score, identity, reference, validator, or accepted-field change not already frozen;
- a failed model output or failed bounded repair;
- an unexpected validation category;
- a proposed retry, rerun, recursive correction, rollback, or manual score adjustment;
- production mutation that differs from its frozen manifest;
- Batch 4 selection; or
- any action outside this standing authorization.

A routine successful checkpoint, expected validation result, bounded diagnosed repair, commit, or push does not require additional approval.`;

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function validatePostCanaryBatch03StandingAuthorization(record) {
  assertV4(
    record?.schemaVersion ===
        "1.0-assessment-production-post-canary-batch-03-standing-authorization" &&
      record.protocolId ===
        POST_CANARY_BATCH_03_STANDING_AUTHORIZATION_PROTOCOL_ID &&
      record.status === POST_CANARY_BATCH_03_STANDING_AUTHORIZATION_STATUS &&
      record.productionCanary === false &&
      record.batchNumber === 3 &&
      record.stagingOnly === true &&
      !Number.isNaN(Date.parse(record.authorizedAt)) &&
      record.userAuthorization?.instruction ===
        POST_CANARY_BATCH_03_STANDING_AUTHORIZATION_INSTRUCTION &&
      record.userAuthorization?.directIncrementalCostUsdMaximumForSubscriptionAndLocalWork === 0 &&
      record.userAuthorization?.conditionalPaidAudioMaximumUsd === 1,
    "Batch 3 standing-authorization identity changed"
  );
  assertV4(
    canonicalJson(record.selectedDebates) ===
      canonicalJson(["124", "14", "58", "150", "157", "102", "09", "181", "138", "27"]),
    "Batch 3 standing-authorization debate boundary changed"
  );
  assertV4(
    canonicalJson(record.model) ===
      canonicalJson({
        label: "5.6 Sol",
        slug: "gpt-5.6-sol",
        reasoningEffort: "low",
        authentication: "ChatGPT subscription"
      }),
    "Batch 3 standing-authorization model changed"
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
      record.executionControls?.roundedIntegerScoreTiesPermitted === true,
    "Batch 3 standing-authorization execution controls changed"
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
    "Batch 3 standing-authorization scheduler changed"
  );
  const { nextBatchSelection, ...authorizedActions } = record.authorization ?? {};
  assertV4(
    Object.values(authorizedActions).every(Boolean) &&
      nextBatchSelection === false,
    "Batch 3 standing-authorization scope changed"
  );
  assertV4(
    record.costBoundary?.subscriptionAndLocalDirectIncrementalCostUsdMaximum === 0 &&
      record.costBoundary?.conditionalPaidAudioMaximumUsd === 1 &&
      record.costBoundary?.audioEstimateMustBeFrozenAndReportedBeforeFirstCall === true &&
      record.costBoundary?.audioSequentialExecutionRequired === true,
    "Batch 3 standing-authorization cost boundary changed"
  );
  assertV4(
    Object.values(record.stopRules ?? {}).every(Boolean),
    "Batch 3 standing-authorization stop rule disabled"
  );
  return record;
}

export async function loadAndValidatePostCanaryBatch03StandingAuthorization() {
  const bytes = await readFile(
    path.resolve(POST_CANARY_BATCH_03_STANDING_AUTHORIZATION)
  );
  const record = validatePostCanaryBatch03StandingAuthorization(JSON.parse(bytes));
  for (const [file, digest] of Object.entries(record.sourceHashes)) {
    assertV4(
      sha256(await readFile(path.resolve(file))) === digest,
      `${file}: standing-authorization source drifted`
    );
  }
  return { record, bytes, sha256: sha256(bytes) };
}
