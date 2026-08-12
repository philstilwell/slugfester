#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

import { canonicalJson } from "./lib/v4-lean-production.mjs";
import { normalizeV418Events } from "./lib/v418-source-integrity.mjs";

const MANIFEST =
  "docs/assessment-production/production-checkpoint-v2.2-1/independent-judgments/execution-preparation-manifest.json";
const EXPECTED_DEBATES = [
  "50",
  "192",
  "129",
  "40",
  "25",
  "104",
  "22",
  "10",
  "167",
  "122",
];
const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
const preparation = JSON.parse(await readFile(manifest.preparation, "utf8"));
const sourcePreparation = JSON.parse(
  await readFile(
    "docs/assessment-production/production-checkpoint-v2.2-1/source-preparation/preparation-manifest.json",
    "utf8"
  )
);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

assert.equal(
  manifest.schemaVersion,
  "1.0-production-checkpoint-v2.2-independent-judgment-execution-preparation-manifest"
);
assert.equal(
  manifest.status,
  "frozen-twenty-production-checkpoint-v2.2-independent-judgment-contexts-prepared-not-authorized"
);
assert.equal(manifest.developmentValidationOnly, false);
assert.equal(manifest.productionCanary, true);
assert.equal(manifest.stagingOnly, true);
assert.equal(manifest.activePolicy.version, "v2.2");
assert.equal(
  manifest.activePolicy.agreedWinningSideMayCollapseToIntegerRoundedTie,
  true
);
assert.equal(manifest.activePolicy.scorePassesMaximum, 1);
assert.equal(
  manifest.gateDisposition.failedProductionCanaryV1PreservedFailed,
  true
);
assert.equal(
  manifest.gateDisposition.failedProductionCanaryV1OutputsUsedAsModelInput,
  false
);
assert.equal(manifest.gateDisposition.priorValidationCohortsReclassified, false);
assert.equal(
  manifest.validatedInventoryContract.planAndSideIsolationPreserved,
  true
);
assert.equal(manifest.validatedInventoryContract.scoreFieldsAvailable, false);
assert.deepEqual(manifest.model, {
  label: "5.6 Sol",
  slug: "gpt-5.6-sol",
  reasoningEffort: "low",
  authentication: "ChatGPT subscription",
  scoreBlind: true,
});
assert.equal(manifest.contexts.length, 20);
assert.deepEqual(
  manifest.contexts.map((context) => context.contextIndex),
  Array.from({ length: 20 }, (_, index) => index)
);
assert.deepEqual(
  [...new Set(manifest.contexts.map((context) => context.debateNumber))],
  EXPECTED_DEBATES
);
assert.equal(preparation.totals.uniqueMoves, 188);
assert.equal(preparation.totals.movesJudgedAcrossPasses, 376);
assert.equal(preparation.totals.maximumCopiedInputBytes, 110174);

assert.equal(manifest.executionPolicy.contexts, 20);
assert.equal(manifest.executionPolicy.attemptsPerContext, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutMsPerContext, 900000);
assert.equal(manifest.executionPolicy.absoluteGateTimeoutMs, 10800000);
assert.equal(manifest.executionPolicy.copiedInputBytesMaximum, 115000);
assert.equal(manifest.executionPolicy.maximumParallelContexts, 2);
assert.deepEqual(manifest.executionPolicy.schedulerRamp, [1, 2]);
assert.deepEqual(
  manifest.executionPolicy.rampPhases.map((phase) => phase.contextIndexes),
  [[0], [1, 2], Array.from({ length: 17 }, (_, index) => index + 3)]
);
assert.equal(manifest.executionPolicy.firstRealContextOperationalCanary, true);
assert.equal(manifest.executionPolicy.stopBeforeExpansionOnRampFailure, true);
assert.equal(
  manifest.executionPolicy
    .continueIndependentContextsWithinStartedSteadyPhaseAfterFailure,
  true
);
assert.equal(manifest.executionPolicy.separateActivationRequired, true);
assert.equal(manifest.executionPolicy.APIKeysRemoved, true);
assert.deepEqual(manifest.executionPolicy.removedEnvironmentVariables, [
  "OPENAI_API_KEY",
  "OPENAI_ORG_ID",
  "OPENAI_PROJECT_ID",
  "OPENAI_BASE_URL",
  "AZURE_OPENAI_API_KEY",
  "CODEX_API_KEY",
]);

assert.equal(manifest.costEstimate.contexts, 20);
assert.equal(manifest.costEstimate.directIncrementalCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.meteredApiCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.transcriptionCostUsdMaximum, 0);
assert.deepEqual(manifest.costEstimate.expectedParallelWallMinutes, [48, 75]);
assert.equal(manifest.costEstimate.absoluteGateTimeoutMinutes, 180);
assert.equal(manifest.executionEnvironment.authentication, "ChatGPT subscription");
assert.equal(manifest.executionEnvironment.APIKeysRemoved, true);
assert.equal(manifest.isolation.oneDebateAndOnePassPerContext, true);
assert.equal(
  manifest.isolation.onlyManualSourcePacketJudgmentPacketAndSchemaAvailable,
  true
);
assert.equal(manifest.isolation.otherPassOutputUnavailable, true);
assert.equal(manifest.isolation.otherDebateOutputsUnavailable, true);
assert.equal(manifest.isolation.candidateSelectionUnavailable, true);
assert.equal(
  manifest.isolation.failedProductionCanaryOutputsUnavailable,
  true
);
assert.equal(manifest.isolation.validationCohortOutputsUnavailable, true);
assert.equal(
  manifest.isolation
    .legacyAssessmentsScoresWinnersTagsAndPublicationProseUnavailable,
  true
);
assert.equal(manifest.acceptanceContract.validContextsRequired, 20);
assert.equal(manifest.acceptanceContract.semanticRepairsMaximum, 0);
assert.equal(manifest.acceptanceContract.modelAuthoredScoresMaximum, 0);
assert.equal(manifest.acceptanceContract.scoresDerived, 0);
assert.deepEqual(
  manifest.audioPolicy.pendingAttributionVerificationMoves,
  []
);
assert.equal(manifest.audioPolicy.audioAccessedDuringPreparation, false);

for (const [key, value] of Object.entries(sourcePreparation.stopRules)) {
  assert.equal(value, true, `${key}: source stop rule must be true`);
  assert.equal(manifest.stopRules[key], true, `${key}: stop rule not preserved`);
}
assert.equal(Object.values(manifest.stopRules).every(Boolean), true);
assert.equal(manifest.authorization.executionActivationPreparation, true);
for (const [key, value] of Object.entries(manifest.authorization)) {
  if (key !== "executionActivationPreparation") {
    assert.equal(value, false, `${key}: must remain unauthorized`);
  }
}

for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source drift`);
}
for (const file of manifest.futureOutputPathsExcludedFromSourceHashes) {
  assert.equal(Object.hasOwn(manifest.sourceHashes, file), false);
  assert.equal(await exists(file), false, `${file}: future output already exists`);
}

const manualBytes = await readFile(manifest.modelInputs.manual);
for (const debateNumber of EXPECTED_DEBATES) {
  const pair = manifest.contexts.filter(
    (context) => context.debateNumber === debateNumber
  );
  assert.deepEqual(pair.map((context) => context.reviewerPass), ["A", "B"]);
  assert.equal(
    pair[0].lockedInventoryCanonicalSha256,
    pair[1].lockedInventoryCanonicalSha256
  );
  assert.equal(pair[0].sourcePacketSha256, pair[1].sourcePacketSha256);
  const [ledgerBytes, originalEventsDocument] = await Promise.all([
    readFile(pair[0].fullLedger),
    readFile(pair[0].originalEvents, "utf8").then(JSON.parse),
  ]);
  const ledgerProjection = ledgerBytes
    .toString("utf8")
    .trimEnd()
    .split("\n")
    .map((line, index) => {
      const row = JSON.parse(line);
      assert.deepEqual(row.slice(0, 1), [index]);
      return { startMs: row[1], durationMs: row[2], text: row[3] };
    });
  const originalProjection = normalizeV418Events(originalEventsDocument).map(
    (event) => ({
      startMs: event.startMs,
      durationMs: event.durationMs,
      text: event.text,
    })
  );
  assert.equal(canonicalJson(ledgerProjection), canonicalJson(originalProjection));
}
for (const context of manifest.contexts) {
  assert.equal(
    context.copiedInputBytes <=
      manifest.executionPolicy.copiedInputBytesMaximum,
    true,
    `${context.debateNumber}/${context.reviewerPass}: copied-input ceiling exceeded`
  );
  const [inventoryBytes, sourcePacketBytes, judgmentPacketBytes, schemaBytes] =
    await Promise.all([
      readFile(context.lockedInventory),
      readFile(context.sourcePacket),
      readFile(context.judgmentPacket),
      readFile(context.schema),
    ]);
  assert.equal(sha256(inventoryBytes), context.lockedInventorySha256);
  assert.equal(sha256(sourcePacketBytes), context.sourcePacketSha256);
  assert.equal(sha256(judgmentPacketBytes), context.judgmentPacketSha256);
  assert.equal(sha256(schemaBytes), context.schemaSha256);
  assert.equal(
    manualBytes.length +
      sourcePacketBytes.length +
      judgmentPacketBytes.length +
      schemaBytes.length,
    context.copiedInputBytes
  );
}
assert.equal(
  manifest.nextAuthorizedAction,
  "prepare-separate-production-checkpoint-v2.2-independent-judgment-execution-activation-only"
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: 10,
      contexts: 20,
      uniqueMoves: 188,
      movesJudgedAcrossPasses: 376,
      exactContextOrder: true,
      pairwiseInventoryAndSourceIdentity: true,
      canonicalEventProjectionReplay: true,
      maximumCopiedInputBytes: preparation.totals.maximumCopiedInputBytes,
      maximumParallelContexts: 2,
      retriesMaximum: 0,
      timeoutExtensionsMaximum: 0,
      expectedParallelWallMinutes:
        manifest.costEstimate.expectedParallelWallMinutes,
      authentication: manifest.model.authentication,
      directIncrementalCostUsdMaximum: 0,
      modelContextsAuthorized: false,
      audioCalls: 0,
      scoresDerived: 0,
      nextAuthorizedAction: manifest.nextAuthorizedAction,
    },
    null,
    2
  )
);
