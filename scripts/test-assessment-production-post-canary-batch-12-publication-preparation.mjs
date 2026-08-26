#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

import {
  buildPostCanaryBatch12PublicationSchema,
  POST_CANARY_BATCH_12_PUBLICATION_DEBATES,
  POST_CANARY_BATCH_12_PUBLICATION_OUTPUT_VERSION,
  POST_CANARY_BATCH_12_PUBLICATION_PROTOCOL_ID,
  POST_CANARY_BATCH_12_PUBLICATION_ROOT
} from "./lib/assessment-production-post-canary-batch-12-publication.mjs";

const MANIFEST =
  `${POST_CANARY_BATCH_12_PUBLICATION_ROOT}/execution-preparation-manifest.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
assert.equal(
  manifest.schemaVersion,
  "1.0-assessment-production-post-canary-batch-12-publication-execution-preparation-manifest"
);
assert.equal(
  manifest.status,
  "frozen-ten-post-canary-batch-12-score-locked-publication-contexts-prepared-not-activated"
);
assert.equal(manifest.protocolId, POST_CANARY_BATCH_12_PUBLICATION_PROTOCOL_ID);
assert.equal(manifest.productionCanary, false);
assert.equal(manifest.batchNumber, 12);
assert.equal(manifest.stagingOnly, true);
assert.equal(manifest.developmentValidationOnly, false);
assert.equal(manifest.AIOnly, true);
assert.deepEqual(manifest.model, {
  label: "5.6 Sol",
  slug: "gpt-5.6-sol",
  reasoningEffort: "low",
  authentication: "ChatGPT subscription"
});
assert.equal(manifest.userAuthorization.directIncrementalCostUsdMaximum, 0);
assert.equal(manifest.userAuthorization.contextsPrepared, 10);
assert.equal(manifest.userAuthorization.publicationModelExecution, false);
assert.equal(manifest.userAuthorization.paidServices, false);
assert.equal(manifest.userAuthorization.publicationFinalization, false);
assert.equal(manifest.userAuthorization.productionMutation, false);
assert.equal(manifest.userAuthorization.nextBatchSelection, false);

assert.equal(manifest.contexts.length, 10);
assert.deepEqual(
  manifest.contexts.map((context) => context.contextIndex),
  Array.from({ length: 10 }, (_, index) => index)
);
assert.deepEqual(
  manifest.contexts.map((context) => context.debateNumber),
  [...POST_CANARY_BATCH_12_PUBLICATION_DEBATES]
);
assert.equal(manifest.totals.debates, 10);
assert.equal(manifest.totals.contexts, 10);
assert.equal(manifest.totals.moves, 204);
assert.equal(manifest.totals.sections, 54);
assert.equal(manifest.totals.audioVerifiedMoves, 3);
assert.equal(manifest.totals.modelContextsExecuted, 0);
assert.equal(manifest.totals.modelAuthoredScores, 0);
assert.equal(manifest.totals.scorePassesExecutedThisStage, 0);
assert.equal(manifest.totals.paidServiceCallsThisStage, 0);
assert.equal(manifest.totals.directIncrementalCostUsd, 0);

assert.equal(manifest.costEstimate.contexts, 10);
assert.equal(manifest.costEstimate.authentication, "ChatGPT subscription");
assert.equal(manifest.costEstimate.directIncrementalCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.meteredApiCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.transcriptionCostUsdMaximum, 0);
assert.deepEqual(manifest.costEstimate.expectedParallelWallMinutes, [24, 45]);
assert.deepEqual(manifest.costEstimate.expectedAggregateModelMinutes, [42, 70]);
assert.equal(manifest.executionEnvironment.authentication, "ChatGPT subscription");
assert.equal(manifest.executionEnvironment.APIKeysRemoved, true);
assert.equal(manifest.executionEnvironment.isolatedTemporaryCodexHomes, true);
assert.equal(
  manifest.executionEnvironment.isolatedTemporaryWorkingDirectories,
  true
);

assert.equal(manifest.isolation.oneDebatePerContext, true);
assert.equal(manifest.isolation.separateFreshModelContextPerDebateRequired, true);
assert.equal(manifest.isolation.onlyFrozenModelInputsAvailable, true);
assert.equal(manifest.isolation.participantJudgmentClosed, true);
assert.equal(manifest.isolation.participantJudgmentWasScoreBlind, true);
assert.equal(
  manifest.isolation.ownDebateScoresAvailableOnlyAsImmutablePacketFields,
  true
);
assert.equal(
  manifest.isolation.modelCannotAuthorIdentityStructureMoveSelectionOrScores,
  true
);
assert.equal(manifest.isolation.legacyAssessmentsUnavailable, true);
assert.equal(manifest.isolation.otherDebateOutputsUnavailable, true);
assert.equal(manifest.isolation.failedProductionCanaryOutputsUnavailable, true);
assert.equal(manifest.isolation.validationCohortOutputsUnavailable, true);
assert.equal(manifest.isolation.rankingsAndWinnerComparisonsUnavailable, true);
assert.equal(manifest.isolation.aiExtensionPostScoringOnly, true);

assert.deepEqual(manifest.publicationContract.summaryTargetWords, [18, 28]);
assert.deepEqual(manifest.publicationContract.summaryAcceptanceWords, [8, 35]);
assert.deepEqual(manifest.publicationContract.quotationTargetWords, [6, 14]);
assert.deepEqual(manifest.publicationContract.quotationAcceptanceWords, [3, 18]);
assert.equal(
  manifest.publicationContract.quotationExactSourceSubstringRequired,
  true
);
assert.deepEqual(manifest.publicationContract.critiqueTargetWords, [112, 118]);
assert.deepEqual(manifest.publicationContract.critiqueAcceptanceWords, [105, 130]);
assert.equal(manifest.publicationContract.critiqueMinimumCharacters, 880);
assert.equal(manifest.publicationContract.critiqueMaximumCharacters, null);
assert.equal(manifest.publicationContract.critiqueSentences, 4);
assert.deepEqual(manifest.publicationContract.critiqueOrderedLabels, [
  "Strongest feature:",
  "Principal limitation:",
  "Live burden:",
  "Locked score:"
]);
assert.equal(manifest.publicationContract.aiExtensionExcludedFromScores, true);
assert.equal(manifest.publicationContract.exactBylineRequired, true);

assert.equal(manifest.executionPolicy.contexts, 10);
assert.equal(manifest.executionPolicy.attemptsPerContext, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.correctionContextsMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(manifest.executionPolicy.maximumParallelContexts, 2);
assert.deepEqual(manifest.executionPolicy.schedulerRamp, [1, 2]);
assert.deepEqual(
  manifest.executionPolicy.rampPhases.map((phase) => phase.contextIndexes),
  [[0], [1, 2], Array.from({ length: 7 }, (_, index) => index + 3)]
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

const scores = JSON.parse(await readFile(manifest.inputs.calculatedScores, "utf8"));
const scoreByDebate = new Map(
  scores.debates.map((debate) => [debate.debateNumber, debate])
);
let moves = 0;
let sections = 0;
let quoteEligibleMoves = 0;
let audioVerifiedMoves = 0;
for (const context of manifest.contexts) {
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
  assert(context.copiedInputBytes <= manifest.executionPolicy.copiedInputBytesMaximum);
  const packet = JSON.parse(packetBytes);
  const schema = JSON.parse(schemaBytes);
  const scoreDebate = scoreByDebate.get(context.debateNumber);
  assert.equal(packet.protocolId, POST_CANARY_BATCH_12_PUBLICATION_PROTOCOL_ID);
  assert.equal(packet.productionCanary, false);
  assert.equal(packet.stagingOnly, true);
  assert.equal(packet.debateNumber, context.debateNumber);
  assert.equal(packet.debateId, context.debateId);
  assert.equal(packet.calculatedScores.overall.pro.score, scoreDebate.final.overall.pro.score);
  assert.equal(packet.calculatedScores.overall.con.score, scoreDebate.final.overall.con.score);
  assert.equal(packet.calculatedScores.winner, scoreDebate.final.winner);
  assert(packet.moves.every((move) => Number.isInteger(move.finalScore)));
  assert(packet.moves.every((move) => move.sourceExcerptAudit.sourceExact === true));
  assert(packet.moves.every((move) => move.sourceExcerptAudit.wholeWordBoundaries === true));
  assert.equal(packet.publicationBoundary.participantJudgmentClosed, true);
  assert.equal(packet.publicationBoundary.participantJudgmentWasScoreBlind, true);
  assert.equal(packet.publicationBoundary.scoresLocked, true);
  assert.equal(packet.publicationBoundary.legacyAssessmentUnavailable, true);
  assert.equal(packet.publicationBoundary.otherDebatesUnavailable, true);
  assert.equal(packet.publicationBoundary.aiExtensionNeverScored, true);
  assert.deepEqual(schema, buildPostCanaryBatch12PublicationSchema(packet));
  assert.equal(schema.properties.schemaVersion.const, POST_CANARY_BATCH_12_PUBLICATION_OUTPUT_VERSION);
  assert.equal(schema.properties.protocolId.const, POST_CANARY_BATCH_12_PUBLICATION_PROTOCOL_ID);
  assert.equal(schema.properties.productionCanary.const, false);
  assert.equal(
    Object.hasOwn(
      schema.properties.moveProse.properties[packet.moves[0].moveId].properties.critique,
      "maxLength"
    ),
    false
  );
  moves += packet.moves.length;
  sections += packet.sections.length;
  quoteEligibleMoves += packet.moves.filter((move) => move.quoteEligible).length;
  audioVerifiedMoves += packet.moves.filter((move) => move.audioVerified).length;
}
assert.equal(moves, 204);
assert.equal(sections, 54);
assert.equal(quoteEligibleMoves, manifest.totals.quoteEligibleMoves);
assert.equal(audioVerifiedMoves, 3);
assert.equal(
  manifest.nextAuthorizedAction,
  "standing-authorization-permits-activation-and-execution-of-the-ten-frozen-batch-12-publication-contexts"
);

console.log(
  JSON.stringify(
    {
      status: "passed-frozen-not-activated",
      debates: 10,
      contexts: 10,
      moves,
      sections,
      quoteEligibleMoves,
      audioVerifiedMoves,
      exactSourceScoreAndSchemaReplay: true,
      model: manifest.model,
      maximumCopiedInputBytes: manifest.totals.maximumCopiedInputBytes,
      maximumParallelContexts: 2,
      schedulerRamp: [1, 2],
      attemptsPerContext: 1,
      retriesMaximum: 0,
      modelContextsAuthorized: false,
      directIncrementalCostUsd: 0,
      nextAuthorizedAction: manifest.nextAuthorizedAction
    },
    null,
    2
  )
);
