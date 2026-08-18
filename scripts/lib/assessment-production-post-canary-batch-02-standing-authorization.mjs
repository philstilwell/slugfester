import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { assertV4, canonicalJson } from "./v4-lean-production.mjs";

export const POST_CANARY_BATCH_02_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-02";
export const POST_CANARY_BATCH_02_STANDING_AUTHORIZATION =
  `${POST_CANARY_BATCH_02_ROOT}/publication-standing-authorization.json`;
export const POST_CANARY_BATCH_02_STANDING_AUTHORIZATION_PROTOCOL_ID =
  "assessment-production-post-canary-batch-02-publication-standing-authorization";
export const POST_CANARY_BATCH_02_STANDING_AUTHORIZATION_STATUS =
  "frozen-active-batch-02-remaining-publication-standing-authorization";
export const POST_CANARY_BATCH_02_STANDING_AUTHORIZATION_INSTRUCTION =
  "I authorize creation and use of a Batch 2 standing-authorization record for the remaining publication workflow. Within a direct incremental cost cap of $0, you may diagnose the preserved Debate 103 failure; prepare, freeze, activate, and execute bounded score-locked repair and resumption contexts using 5.6 Sol with low reasoning through my ChatGPT subscription; merge accepted repairs; resume the nine unattempted frozen publication contexts; validate, compile, finalize, render-verify, commit, and push each checkpoint. Every model context must be hash-locked before execution, isolated, limited to one attempt, and use no retries, timeout extensions, or recursive repairs. Repairs may expose no more than two writable fields per packet and must preserve scores, sources, and accepted fields. Continue automatically while gates pass. Stop before any paid service, production mutation, next-batch selection, score or source change, failed repair, unexpected validation category, or action outside this authorization.";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function validatePostCanaryBatch02StandingAuthorization(record) {
  assertV4(
    record?.schemaVersion ===
        "1.0-assessment-production-post-canary-batch-02-publication-standing-authorization" &&
      record.protocolId ===
        POST_CANARY_BATCH_02_STANDING_AUTHORIZATION_PROTOCOL_ID &&
      record.status === POST_CANARY_BATCH_02_STANDING_AUTHORIZATION_STATUS &&
      record.productionCanary === false &&
      record.batchNumber === 2 &&
      record.stagingOnly === true &&
      !Number.isNaN(Date.parse(record.authorizedAt)) &&
      record.userAuthorization?.instruction ===
        POST_CANARY_BATCH_02_STANDING_AUTHORIZATION_INSTRUCTION &&
      record.userAuthorization?.directIncrementalCostUsdMaximum === 0,
    "Batch 2 publication standing authorization identity changed"
  );
  assertV4(
    canonicalJson(record.model) ===
      canonicalJson({
        label: "5.6 Sol",
        slug: "gpt-5.6-sol",
        reasoningEffort: "low",
        authentication: "ChatGPT subscription"
      }),
    "Batch 2 publication standing authorization model changed"
  );
  assertV4(
    record.executionControls?.everyContextEnumeratedAndHashLockedBeforeExecution ===
        true &&
      record.executionControls?.freshIsolatedContextRequired === true &&
      record.executionControls?.attemptsPerContext === 1 &&
      record.executionControls?.retriesMaximum === 0 &&
      record.executionControls?.timeoutExtensionsMaximum === 0 &&
      record.executionControls?.recursiveRepairsMaximum === 0 &&
      record.executionControls?.repairWritableFieldsMaximumPerPacket === 2 &&
      record.executionControls?.schedulerRamp.join(",") === "1,2",
    "Batch 2 publication standing execution controls changed"
  );
  assertV4(
    record.authorization?.failureDiagnosis === true &&
      record.authorization?.repairPacketPreparation === true &&
      record.authorization?.repairModelExecution === true &&
      record.authorization?.publicationResumption === true &&
      record.authorization?.deterministicCompilation === true &&
      record.authorization?.publicationFinalization === true &&
      record.authorization?.renderingVerification === true &&
      record.authorization?.paidServices === false &&
      record.authorization?.productionMutation === false &&
      record.authorization?.nextBatchSelection === false,
    "Batch 2 publication standing scope changed"
  );
  assertV4(
    Object.values(record.stopRules ?? {}).every(Boolean),
    "Batch 2 publication standing stop rule disabled"
  );
  assertV4(
    record.costBoundary?.directIncrementalCostUsdMaximum === 0 &&
      record.costBoundary?.meteredApiCostUsdMaximum === 0 &&
      record.costBoundary?.paidServiceCallsMaximum === 0,
    "Batch 2 publication standing cost boundary changed"
  );
  return record;
}

export async function loadAndValidatePostCanaryBatch02StandingAuthorization() {
  const bytes = await readFile(
    path.resolve(POST_CANARY_BATCH_02_STANDING_AUTHORIZATION)
  );
  const record = validatePostCanaryBatch02StandingAuthorization(
    JSON.parse(bytes)
  );
  for (const [file, digest] of Object.entries(record.sourceHashes)) {
    assertV4(
      sha256(await readFile(path.resolve(file))) === digest,
      `${file}: standing-authorization source drifted`
    );
  }
  return { record, bytes, sha256: sha256(bytes) };
}
