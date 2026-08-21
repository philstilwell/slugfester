import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const ROOT = "docs/assessment-production/post-canary-continuation-v1/batch-03";
export const RECOVERY_AUTHORIZATION = `${ROOT}/failure-recovery-standing-authorization.json`;
export const PROTOCOL_ID =
  "assessment-production-post-canary-batch-03-failure-recovery-standing-authorization";
export const STATUS =
  "frozen-active-batch-03-first-failure-recovery-standing-authorization";
export const SELECTED_DEBATES =
  ["124", "14", "58", "150", "157", "102", "09", "181", "138", "27"];
export const USER_INSTRUCTION = `I authorize creation and use of a Batch 3 failure-recovery standing authorization for the remainder of the existing Batch 3 workflow.

For any preserved deterministic-validation, transport, timeout, response-schema, rendering, compilation, compatibility, or generated-derivative failure, you may automatically:

1. Diagnose the failure using only preserved records and local repository evidence.
2. Validate, freeze, commit, and push the diagnosis.
3. Prepare and hash-lock one bounded correction or resumption plan.
4. Activate and execute that correction once.
5. Validate, merge accepted results where applicable, replay the complete affected cohort, analyze, commit, and push.
6. Resume the existing Batch 3 standing authorization automatically after every successful gate.

This authorization specifically includes the preserved Debate 124 adjudication timeout.

Permitted corrections include:

- deterministic execution-harness corrections;
- response-schema or transport corrections;
- partitioning an oversized or timed-out model context into the minimum number of score-blind, field-disjoint shards;
- resuming only unattempted contexts;
- deterministic validation overlays that do not alter protected evidence;
- publication repairs exposing no more than two diagnosed writable fields per packet;
- compatibility and generated-derivative corrections limited to diagnosed files.

Preserve these controls:

- Use 5.6 Sol with low reasoning effort through my ChatGPT subscription.
- Keep every model context isolated and score-blind where required.
- Hash-lock every corrected context, schema, input, output path, validator, and merge rule before execution.
- Each original field may be decided exactly once in an accepted output.
- Use one attempt per newly frozen correction or resumption context.
- No ordinary retries, recursive repairs, automatic score changes, manual score adjustments, rollback, or reuse of a failed partial output.
- Preserve every accepted field, source, identity, move, score, reference, packet hash, and unrelated production record unless the frozen diagnosis explicitly proves that field is the failure source.
- Models must never calculate scores. Retain the single repository score-pass limit.
- Commit and push every successful checkpoint to main.
- Subscription-backed models and local work have a direct incremental cost cap of $0.

Continue automatically through final-ledger assembly, scoring, publication reconstruction, bounded repairs, compilation, finalization, rendering verification, compatibility staging, production publication, generated derivatives, and complete repository validation while every gate passes.

Stop and request new approval only before:

- a second failure of the same corrected context or a failed bounded repair;
- any paid service or direct incremental cost above $0;
- changing a source, accepted judgment, identity, numerical score, reference, validator meaning, or production target outside a frozen diagnosis;
- modifying a debate outside Batch 3;
- using more than one recovery attempt for a failed context;
- recursive correction, manual score adjustment, rollback, or production mutation differing from its frozen manifest;
- selecting Batch 4; or
- any action outside this authorization.

Routine diagnoses, bounded first corrections, deterministic validations, successful model contexts, merges, cohort replays, commits, and pushes do not require further approval.`;

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function validateRecoveryAuthorization(record) {
  assertV4(
    record?.schemaVersion ===
        "1.0-assessment-production-post-canary-batch-03-failure-recovery-standing-authorization" &&
      record.protocolId === PROTOCOL_ID &&
      record.status === STATUS &&
      record.batchNumber === 3 &&
      record.productionCanary === false &&
      record.stagingOnly === true &&
      record.userAuthorization?.instruction === USER_INSTRUCTION &&
      record.userAuthorization?.directIncrementalCostUsdMaximum === 0,
    "Batch 3 failure-recovery authorization identity changed"
  );
  assertV4(
    canonicalJson(record.selectedDebates) === canonicalJson(SELECTED_DEBATES) &&
      canonicalJson(record.model) === canonicalJson({
        label: "5.6 Sol",
        slug: "gpt-5.6-sol",
        reasoningEffort: "low",
        authentication: "ChatGPT subscription"
      }),
    "Batch 3 failure-recovery cohort or model changed"
  );
  assertV4(
    record.recoveryControls?.recoveryAttemptsPerFailedContextMaximum === 1 &&
      record.recoveryControls?.ordinaryRetriesMaximum === 0 &&
      record.recoveryControls?.recursiveRepairsMaximum === 0 &&
      record.recoveryControls?.timeoutExtensionsMaximum === 0 &&
      record.recoveryControls?.failedPartialOutputReusable === false &&
      record.recoveryControls?.fieldDisjointShardingPermitted === true &&
      record.recoveryControls?.scorePassesMaximum === 1 &&
      record.recoveryControls?.modelAuthoredScoresAllowed === false,
    "Batch 3 failure-recovery controls changed"
  );
  assertV4(
    record.authorization?.diagnosis === true &&
      record.authorization?.boundedFirstCorrection === true &&
      record.authorization?.unattemptedContextResumption === true &&
      record.authorization?.commitAndPush === true &&
      record.authorization?.paidServices === false &&
      record.authorization?.nextBatchSelection === false,
    "Batch 3 failure-recovery scope changed"
  );
  assertV4(
    Object.values(record.stopRules ?? {}).every(Boolean),
    "Batch 3 failure-recovery stop rule disabled"
  );
  return record;
}

export async function loadAndValidateRecoveryAuthorization() {
  const bytes = await readFile(path.resolve(RECOVERY_AUTHORIZATION));
  const record = validateRecoveryAuthorization(JSON.parse(bytes));
  for (const [file, digest] of Object.entries(record.sourceHashes)) {
    assertV4(
      sha256(await readFile(path.resolve(file))) === digest,
      `${file}: failure-recovery authorization source drifted`
    );
  }
  return { record, bytes, sha256: sha256(bytes) };
}
