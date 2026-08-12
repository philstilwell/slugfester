#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

import {
  CHECKPOINT_V22_PUBLICATION_DEBATES,
  CHECKPOINT_V22_PUBLICATION_ROOT
} from "./lib/assessment-production-checkpoint-v2.2-publication.mjs";

const ROOT = CHECKPOINT_V22_PUBLICATION_ROOT;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
const preparationBytes = await readFile(manifest.packetPreparation);
const preparation = JSON.parse(preparationBytes);

assert.equal(
  manifest.schemaVersion,
  "1.0-production-checkpoint-v2.2-publication-execution-preparation-manifest"
);
assert.equal(
  manifest.status,
  "frozen-ten-production-checkpoint-v2.2-publication-contexts-prepared-not-authorized"
);
assert.equal(manifest.protocolId, preparation.protocolId);
assert.equal(manifest.developmentValidationOnly, false);
assert.equal(manifest.productionCanary, true);
assert.equal(manifest.stagingOnly, true);
assert.equal(manifest.AIOnly, true);
assert.equal(sha256(preparationBytes), manifest.packetPreparationSha256);
assert.deepEqual(manifest.model, {
  label: "5.6 Sol",
  slug: "gpt-5.6-sol",
  reasoningEffort: "low",
  authentication: "ChatGPT subscription"
});

assert.equal(manifest.contexts.length, 10);
assert.deepEqual(
  manifest.contexts.map((context) => context.contextIndex),
  Array.from({ length: 10 }, (_, index) => index)
);
assert.deepEqual(
  manifest.contexts.map((context) => context.debateNumber),
  [...CHECKPOINT_V22_PUBLICATION_DEBATES]
);
assert.equal(preparation.totals.moves, 188);
assert.equal(preparation.totals.sections, 51);
assert.equal(preparation.totals.quoteEligibleMoves, 188);
assert.equal(preparation.totals.audioVerifiedMoves, 2);

assert.equal(manifest.costEstimate.contexts, 10);
assert.equal(manifest.costEstimate.authentication, "ChatGPT subscription");
assert.equal(manifest.costEstimate.directIncrementalCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.meteredApiCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.transcriptionCostUsdMaximum, 0);
assert.deepEqual(manifest.costEstimate.expectedParallelWallMinutes, [24, 45]);
assert.deepEqual(manifest.costEstimate.expectedAggregateModelMinutes, [42, 70]);
assert.equal(manifest.costEstimate.absoluteGateTimeoutMinutes, 120);
assert.equal(manifest.executionEnvironment.authentication, "ChatGPT subscription");
assert.equal(manifest.executionEnvironment.APIKeysRemoved, true);
assert.equal(manifest.executionEnvironment.isolatedTemporaryCodexHomes, true);
assert.equal(manifest.executionEnvironment.isolatedTemporaryWorkingDirectories, true);

assert.equal(manifest.isolation.oneDebatePerContext, true);
assert.equal(manifest.isolation.onlyFrozenModelInputsAvailable, true);
assert.equal(manifest.isolation.participantJudgmentClosed, true);
assert.equal(manifest.isolation.participantJudgmentWasScoreBlind, true);
assert.equal(
  manifest.isolation.ownDebateScoresAvailableOnlyAsImmutablePacketFields,
  true
);
assert.equal(manifest.isolation.otherDebateOutputsUnavailable, true);
assert.equal(manifest.isolation.failedProductionCanaryOutputsUnavailable, true);
assert.equal(manifest.isolation.validationCohortOutputsUnavailable, true);
assert.equal(manifest.isolation.legacyAssessmentsUnavailable, true);
assert.equal(manifest.isolation.rankingsAndWinnerComparisonsUnavailable, true);
assert.equal(manifest.isolation.aiExtensionPostScoringOnly, true);

assert.equal(manifest.executionPolicy.contexts, 10);
assert.equal(manifest.executionPolicy.attemptsPerContext, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.correctionContextsMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutMsPerContext, 600000);
assert.equal(manifest.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(manifest.executionPolicy.absoluteGateTimeoutMs, 7200000);
assert.equal(manifest.executionPolicy.copiedInputBytesMaximum, 400000);
assert.equal(manifest.executionPolicy.maximumParallelContexts, 2);
assert.deepEqual(manifest.executionPolicy.schedulerRamp, [1, 2]);
assert.deepEqual(
  manifest.executionPolicy.rampPhases.map((phase) => phase.contextIndexes),
  [[0], [1, 2], Array.from({ length: 7 }, (_, index) => index + 3)]
);
assert.equal(manifest.executionPolicy.firstRealContextOperationalCanary, true);
assert.equal(manifest.executionPolicy.stopBeforeExpansionOnRampFailure, true);
assert.equal(
  manifest.executionPolicy
    .continueIndependentContextsWithinStartedSteadyPhaseAfterFailure,
  true
);
assert.equal(manifest.executionPolicy.separateActivationRequired, true);
assert.equal(manifest.executionPolicy.authentication, "ChatGPT subscription");
assert.equal(manifest.executionPolicy.APIKeysRemoved, true);
assert.deepEqual(manifest.executionPolicy.removedEnvironmentVariables, [
  "OPENAI_API_KEY",
  "OPENAI_ORG_ID",
  "OPENAI_PROJECT_ID",
  "OPENAI_BASE_URL",
  "AZURE_OPENAI_API_KEY",
  "CODEX_API_KEY"
]);

assert.equal(manifest.deterministicValidation.everyLockedMoveAuthoredExactlyOnce, true);
assert.equal(manifest.deterministicValidation.exactQuoteSubstringRequired, true);
assert.equal(
  manifest.deterministicValidation
    .critiqueWordCharacterSentenceAndLabelContractRequired,
  true
);
assert.equal(manifest.deterministicValidation.emptyReferenceTagsAllowed, true);
assert.equal(
  manifest.deterministicValidation.aiExtensionDisclosureAndNoveltyMapComplete,
  true
);
assert.equal(manifest.deterministicValidation.lockedScoresUnchanged, true);
assert.equal(manifest.deterministicValidation.modelAuthoredScores, 0);
assert.deepEqual(manifest.acceptanceContract, {
  validContextsRequired: 10,
  movesAuthoredRequired: 188,
  critiquesRequired: 188,
  exactSourceQuotesRequired: 20,
  overallCommentarySidesRequired: 20,
  aiExtensionSidesRequired: 20,
  semanticRepairsMaximum: 0,
  retriesMaximum: 0,
  correctionContextsMaximum: 0,
  modelAuthoredScoresMaximum: 0,
  scorePassesExecutedThisStage: 0
});
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

for (const context of manifest.contexts) {
  assert(context.copiedInputBytes <= manifest.executionPolicy.copiedInputBytesMaximum);
  const [packetBytes, schemaBytes, sourcePacketBytes, transcriptBytes, eventsBytes, localManifestBytes] =
    await Promise.all([
      readFile(context.packet),
      readFile(context.schema),
      readFile(context.sourcePacket),
      readFile(context.transcript),
      readFile(context.events),
      readFile(context.localManifest)
    ]);
  assert.equal(sha256(packetBytes), context.packetSha256);
  assert.equal(sha256(schemaBytes), context.schemaSha256);
  assert.equal(sha256(sourcePacketBytes), context.sourcePacketSha256);
  assert.equal(sha256(transcriptBytes), context.transcriptSha256);
  assert.equal(sha256(eventsBytes), context.eventsSha256);
  assert.equal(sha256(localManifestBytes), context.localManifestSha256);
  assert.equal(context.rawOutput, context.output);
}

assert.equal(
  manifest.nextAuthorizedAction,
  "prepare-separate-production-checkpoint-v2.2-publication-execution-activation-only"
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: 10,
      contexts: 10,
      moves: 188,
      exactContextOrder: true,
      sourceAndPacketHashesReplayed: true,
      maximumCopiedInputBytes: preparation.totals.maximumCopiedInputBytes,
      maximumParallelContexts: 2,
      retriesMaximum: 0,
      correctionContextsMaximum: 0,
      expectedParallelWallMinutes: manifest.costEstimate.expectedParallelWallMinutes,
      authentication: manifest.model.authentication,
      directIncrementalCostUsdMaximum: 0,
      modelContextsAuthorized: false,
      productionMutationAuthorized: false,
      nextAuthorizedAction: manifest.nextAuthorizedAction
    },
    null,
    2
  )
);
