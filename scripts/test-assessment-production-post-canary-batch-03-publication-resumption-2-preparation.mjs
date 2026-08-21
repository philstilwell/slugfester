#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

import { buildPostCanaryBatch03PublicationSchema } from "./lib/assessment-production-post-canary-batch-03-publication.mjs";
import { validatePostCanaryBatch03PublicationOutput } from "./lib/assessment-production-post-canary-batch-03-publication-validation.mjs";
import {
  POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_2_DEBATES,
  POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_2_PROTOCOL_ID,
  POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_2_ROOT
} from "./lib/assessment-production-post-canary-batch-03-publication-resumption-2.mjs";

const MANIFEST = `${POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_2_ROOT}/execution-preparation-manifest.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));

assert.equal(
  manifest.status,
  "frozen-six-untouched-post-canary-batch-03-publication-resumption-2-contexts-prepared-under-standing-authorizations"
);
assert.equal(manifest.protocolId, POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_2_PROTOCOL_ID);
assert.equal(manifest.batchNumber, 3);
assert.equal(manifest.productionCanary, false);
assert.equal(manifest.stagingOnly, true);
assert.deepEqual(manifest.model, {
  label: "5.6 Sol",
  slug: "gpt-5.6-sol",
  reasoningEffort: "low",
  authentication: "ChatGPT subscription"
});
assert.deepEqual(
  manifest.contexts.map(({ debateNumber }) => debateNumber),
  POST_CANARY_BATCH_03_PUBLICATION_RESUMPTION_2_DEBATES
);
assert.deepEqual(manifest.contexts.map(({ contextIndex }) => contextIndex), [0, 1, 2, 3, 4, 5]);
assert.deepEqual(manifest.contexts.map(({ originalContextIndex }) => originalContextIndex), [4, 5, 6, 7, 8, 9]);
assert.deepEqual(manifest.contexts.map(({ firstResumptionContextIndex }) => firstResumptionContextIndex), [3, 4, 5, 6, 7, 8]);
assert.equal(manifest.userAuthorization.directIncrementalCostUsdMaximum, 0);
assert.equal(manifest.userAuthorization.contextsPrepared, 6);
assert.equal(manifest.userAuthorization.existingPacketsReused, 6);
assert.equal(manifest.userAuthorization.packetsGenerated, 0);
assert.equal(manifest.executionPolicy.contexts, 6);
assert.equal(manifest.executionPolicy.attemptsPerContext, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(manifest.executionPolicy.correctionContextsMaximum, 0);
assert.equal(manifest.executionPolicy.maximumParallelContexts, 2);
assert.deepEqual(manifest.executionPolicy.schedulerRamp, [1, 2]);
assert.deepEqual(
  manifest.executionPolicy.rampPhases.map(({ contextIndexes }) => contextIndexes),
  [[0], [1, 2], [3, 4, 5]]
);
assert.equal(Object.values(manifest.stopRules).every(Boolean), true);
assert.equal(manifest.totals.acceptedDebates, 4);
assert.equal(manifest.totals.acceptedMoves, 80);
assert.equal(manifest.totals.resumptionContexts, 6);
assert.equal(manifest.totals.resumptionMoves, 120);
assert.equal(manifest.totals.resumptionSections, 32);
assert.equal(manifest.totals.resumptionAudioVerifiedMoves, 3);
assert.equal(manifest.totals.cohortDebates, 10);
assert.equal(manifest.totals.cohortMoves, 200);
assert.equal(manifest.totals.modelContextsExecuted, 0);
assert.equal(manifest.totals.directIncrementalCostUsd, 0);

for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source drift`);
}
for (const file of manifest.futureOutputPathsExcludedFromSourceHashes) {
  assert.equal(Object.hasOwn(manifest.sourceHashes, file), false);
  assert.equal(await exists(file), false, `${file}: future output exists`);
}

const original = JSON.parse(await readFile(manifest.inputs.originalPreparation, "utf8"));
let moves = 0;
let sections = 0;
let audio = 0;
for (const context of manifest.contexts) {
  const source = original.contexts[context.originalContextIndex];
  assert.equal(source.debateNumber, context.debateNumber);
  assert.equal(source.packet, context.packet);
  assert.equal(source.schema, context.schema);
  assert.equal(await exists(context.originalUnattemptedOutput), false);
  assert.equal(await exists(context.firstResumptionUnattemptedOutput), false);
  const [packetBytes, schemaBytes] = await Promise.all([
    readFile(context.packet),
    readFile(context.schema)
  ]);
  assert.equal(sha256(packetBytes), context.packetSha256);
  assert.equal(sha256(schemaBytes), context.schemaSha256);
  const packet = JSON.parse(packetBytes);
  assert.deepEqual(JSON.parse(schemaBytes), buildPostCanaryBatch03PublicationSchema(packet));
  assert(packet.moves.every((move) => Number.isInteger(move.finalScore)));
  assert(packet.moves.every((move) => move.sourceExcerptAudit.sourceExact));
  moves += context.moves;
  sections += context.sections;
  audio += context.audioVerifiedMoves;
}
assert.equal(moves, 120);
assert.equal(sections, 32);
assert.equal(audio, 3);

let acceptedMoves = 0;
for (const accepted of Object.values(manifest.acceptedOutputs)) {
  const [outputBytes, packetBytes] = await Promise.all([
    readFile(accepted.output),
    readFile(accepted.packet)
  ]);
  assert.equal(sha256(outputBytes), accepted.outputSha256);
  const replay = validatePostCanaryBatch03PublicationOutput(
    JSON.parse(outputBytes),
    JSON.parse(packetBytes)
  );
  assert.equal(replay.status, "passed");
  assert.equal(replay.lockedScoresUnchanged, true);
  acceptedMoves += replay.moves;
}
assert.equal(acceptedMoves, 80);

console.log(JSON.stringify({
  status: "passed",
  acceptedDebates: 4,
  acceptedMoves: 80,
  resumptionContexts: 6,
  resumptionMoves: 120,
  cohortDebates: 10,
  cohortMoves: 200,
  existingPacketsReused: 6,
  packetsGenerated: 0,
  modelContextsExecuted: 0,
  directIncrementalCostUsd: 0
}, null, 2));
