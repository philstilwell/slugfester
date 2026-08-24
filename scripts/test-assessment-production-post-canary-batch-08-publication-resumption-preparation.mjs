#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

import {
  buildPostCanaryBatch08PublicationSchema
} from "./lib/assessment-production-post-canary-batch-08-publication.mjs";
import {
  validatePostCanaryBatch08PublicationOutput
} from "./lib/assessment-production-post-canary-batch-08-publication-validation.mjs";
import {
  POST_CANARY_BATCH_08_PUBLICATION_RESUMPTION_DEBATES,
  POST_CANARY_BATCH_08_PUBLICATION_RESUMPTION_PROTOCOL_ID,
  POST_CANARY_BATCH_08_PUBLICATION_RESUMPTION_ROOT
} from "./lib/assessment-production-post-canary-batch-08-publication-resumption.mjs";

const MANIFEST =
  `${POST_CANARY_BATCH_08_PUBLICATION_RESUMPTION_ROOT}/execution-preparation-manifest.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
assert.equal(
  manifest.status,
  "frozen-nine-untouched-post-canary-batch-08-publication-resumption-contexts-prepared-not-authorized"
);
assert.equal(
  manifest.protocolId,
  POST_CANARY_BATCH_08_PUBLICATION_RESUMPTION_PROTOCOL_ID
);
assert.equal(manifest.productionCanary, false);
assert.equal(manifest.batchNumber, 8);
assert.equal(manifest.stagingOnly, true);
assert.deepEqual(manifest.model, {
  label: "5.6 Sol",
  slug: "gpt-5.6-sol",
  reasoningEffort: "low",
  authentication: "ChatGPT subscription"
});
assert.deepEqual(
  manifest.contexts.map((context) => context.debateNumber),
  POST_CANARY_BATCH_08_PUBLICATION_RESUMPTION_DEBATES
);
assert.deepEqual(
  manifest.contexts.map((context) => context.contextIndex),
  [0, 1, 2, 3, 4, 5, 6, 7, 8]
);
assert.deepEqual(
  manifest.contexts.map((context) => context.originalContextIndex),
  [1, 2, 3, 4, 5, 6, 7, 8, 9]
);
assert.equal(manifest.userAuthorization.directIncrementalCostUsdMaximum, 0);
assert.equal(manifest.userAuthorization.contextsPrepared, 9);
assert.equal(manifest.userAuthorization.existingPacketsReused, 9);
assert.equal(manifest.userAuthorization.packetsGenerated, 0);
assert.equal(manifest.userAuthorization.publicationModelExecution, false);
assert.equal(manifest.userAuthorization.paidServices, false);
assert.equal(manifest.userAuthorization.publicationCompilation, false);
assert.equal(manifest.userAuthorization.publicationFinalization, false);
assert.equal(manifest.userAuthorization.productionMutation, false);
assert.equal(manifest.userAuthorization.nextBatchSelection, false);

assert.equal(manifest.executionPolicy.contexts, 9);
assert.equal(manifest.executionPolicy.attemptsPerContext, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(manifest.executionPolicy.correctionContextsMaximum, 0);
assert.equal(manifest.executionPolicy.maximumParallelContexts, 2);
assert.deepEqual(manifest.executionPolicy.schedulerRamp, [1, 2]);
assert.deepEqual(
  manifest.executionPolicy.rampPhases.map((phase) => phase.contextIndexes),
  [[0], [1, 2], [3, 4, 5, 6, 7, 8]]
);
assert.equal(manifest.executionPolicy.separateActivationRequired, true);
assert.equal(manifest.executionPolicy.authentication, "ChatGPT subscription");
assert.equal(manifest.executionPolicy.APIKeysRemoved, true);
assert.equal(manifest.costEstimate.directIncrementalCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.meteredApiCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.transcriptionCostUsdMaximum, 0);
assert.deepEqual(manifest.costEstimate.expectedParallelWallMinutes, [22, 42]);
assert.equal(Object.values(manifest.stopRules).every(Boolean), true);
assert.equal(manifest.authorization.executionActivationPreparation, true);
for (const [key, value] of Object.entries(manifest.authorization)) {
  if (key !== "executionActivationPreparation") {
    assert.equal(value, false, `${key}: must remain unauthorized`);
  }
}
assert.equal(manifest.totals.acceptedDebates, 1);
assert.equal(manifest.totals.acceptedMoves, 20);
assert.equal(manifest.totals.resumptionContexts, 9);
assert.equal(manifest.totals.resumptionMoves, 162);
assert.equal(manifest.totals.resumptionSections, 46);
assert.equal(manifest.totals.resumptionAudioVerifiedMoves, 6);
assert.equal(manifest.totals.cohortDebates, 10);
assert.equal(manifest.totals.cohortMoves, 182);
assert.equal(manifest.totals.modelContextsExecuted, 0);
assert.equal(manifest.totals.paidServiceCallsThisStage, 0);
assert.equal(manifest.totals.directIncrementalCostUsd, 0);

for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source drift`);
}
for (const file of manifest.futureOutputPathsExcludedFromSourceHashes) {
  assert.equal(Object.hasOwn(manifest.sourceHashes, file), false);
  assert.equal(await exists(file), false, `${file}: future output already exists`);
}

const original = JSON.parse(
  await readFile(manifest.inputs.originalPreparation, "utf8")
);
let moves = 0;
let sections = 0;
let audioVerifiedMoves = 0;
for (const context of manifest.contexts) {
  const source = original.contexts[context.originalContextIndex];
  assert.equal(source.debateNumber, context.debateNumber);
  assert.equal(source.packet, context.packet);
  assert.equal(source.schema, context.schema);
  assert.equal(context.packetSha256, source.packetSha256);
  assert.equal(context.schemaSha256, source.schemaSha256);
  assert.equal(await exists(context.originalUnattemptedOutput), false);
  assert.equal(await exists(context.originalUnattemptedValidation), false);
  assert.equal(await exists(context.originalUnattemptedProvenance), false);
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
  const packet = JSON.parse(packetBytes);
  const schema = JSON.parse(schemaBytes);
  assert.equal(packet.debateNumber, context.debateNumber);
  assert.equal(packet.debateId, context.debateId);
  assert.deepEqual(schema, buildPostCanaryBatch08PublicationSchema(packet));
  assert(packet.moves.every((move) => Number.isInteger(move.finalScore)));
  assert(packet.moves.every((move) => move.sourceExcerptAudit.sourceExact));
  assert.equal(packet.publicationBoundary.participantJudgmentWasScoreBlind, true);
  assert.equal(packet.publicationBoundary.scoresLocked, true);
  moves += context.moves;
  sections += context.sections;
  audioVerifiedMoves += context.audioVerifiedMoves;
}
assert.equal(moves, 162);
assert.equal(sections, 46);
assert.equal(audioVerifiedMoves, 6);

const [repairedBytes, debate88PacketBytes, completeValidation] =
  await Promise.all([
    readFile(manifest.acceptedDebate88.output),
    readFile(manifest.acceptedDebate88.packet),
    readFile(manifest.acceptedDebate88.validation, "utf8").then(JSON.parse)
  ]);
const repairedValidation = validatePostCanaryBatch08PublicationOutput(
  JSON.parse(repairedBytes),
  JSON.parse(debate88PacketBytes)
);
assert.equal(repairedValidation.status, "passed");
assert.equal(repairedValidation.moves, 20);
assert.equal(repairedValidation.critiques, 20);
assert.equal(repairedValidation.lockedScoresUnchanged, true);
assert.equal(completeValidation.authorizedFieldsChanged, 2);
assert.equal(completeValidation.immutableFieldsChanged, 0);

console.log(JSON.stringify({
  status: "passed",
  acceptedDebates: 1,
  resumptionContexts: 9,
  resumptionMoves: 162,
  cohortDebates: 10,
  cohortMoves: 182,
  existingPacketsReused: 9,
  packetsGenerated: 0,
  modelContextsExecuted: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0
}, null, 2));
