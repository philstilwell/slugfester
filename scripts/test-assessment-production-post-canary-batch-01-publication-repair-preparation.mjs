#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

import {
  POST_CANARY_BATCH_01_DEBATE_31_REPAIR_FIELDS,
  POST_CANARY_BATCH_01_DEBATE_31_REPAIR_PARTITIONS,
  POST_CANARY_BATCH_01_DEBATE_31_REPAIR_PROTOCOL_ID,
  POST_CANARY_BATCH_01_DEBATE_31_REPAIR_ROOT,
  buildDebate31RepairSchema,
  mergeAndValidateDebate31Repairs,
  validateDebate31RepairOutput
} from "./lib/assessment-production-post-canary-batch-01-publication-repair.mjs";

const MANIFEST = `${POST_CANARY_BATCH_01_DEBATE_31_REPAIR_ROOT}/execution-preparation-manifest.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const wordCount = (value) =>
  String(value).trim().split(/\s+/).filter(Boolean).length;

const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
assert.equal(
  manifest.status,
  "frozen-seven-isolated-fourteen-field-batch-01-debate-31-publication-repair-contexts-prepared-not-authorized"
);
assert.equal(manifest.protocolId, POST_CANARY_BATCH_01_DEBATE_31_REPAIR_PROTOCOL_ID);
assert.equal(manifest.productionCanary, false);
assert.equal(manifest.batchNumber, 1);
assert.equal(manifest.stagingOnly, true);
assert.deepEqual(manifest.model, {
  label: "5.6 Sol",
  slug: "gpt-5.6-sol",
  reasoningEffort: "low",
  authentication: "ChatGPT subscription"
});
assert.equal(manifest.contexts.length, 7);
assert.deepEqual(
  manifest.contexts.map((context) => context.contextIndex),
  [0, 1, 2, 3, 4, 5, 6]
);
assert.deepEqual(
  manifest.contexts.map((context) => context.writableFields),
  POST_CANARY_BATCH_01_DEBATE_31_REPAIR_PARTITIONS
);
assert.deepEqual(
  manifest.contexts.flatMap((context) => context.writableFields),
  POST_CANARY_BATCH_01_DEBATE_31_REPAIR_FIELDS
);
assert.equal(manifest.executionPolicy.contexts, 7);
assert.equal(manifest.executionPolicy.attemptsPerContext, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(manifest.executionPolicy.recursiveCorrectionContextsMaximum, 0);
assert.equal(manifest.executionPolicy.maximumParallelContexts, 2);
assert.deepEqual(manifest.executionPolicy.schedulerRamp, [1, 2]);
assert.deepEqual(
  manifest.executionPolicy.rampPhases.map((phase) => phase.contextIndexes),
  [[0], [1, 2], [3, 4, 5, 6]]
);
assert.equal(manifest.executionPolicy.separateActivationRequired, true);
assert.equal(manifest.executionPolicy.authentication, "ChatGPT subscription");
assert.equal(manifest.executionPolicy.APIKeysRemoved, true);
assert.equal(manifest.costEstimate.directIncrementalCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.meteredApiCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.transcriptionCostUsdMaximum, 0);
assert.deepEqual(manifest.costEstimate.expectedParallelWallMinutes, [5, 12]);
assert.equal(Object.values(manifest.stopRules).every(Boolean), true);
assert.equal(manifest.authorization.executionActivationPreparation, true);
for (const [key, value] of Object.entries(manifest.authorization)) {
  if (key !== "executionActivationPreparation") {
    assert.equal(value, false, `${key}: must remain unauthorized`);
  }
}
assert.equal(manifest.totals.contexts, 7);
assert.equal(manifest.totals.writableFields, 14);
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

const repairPackets = [];
const syntheticRepairs = [];
for (const context of manifest.contexts) {
  const [packetBytes, schemaBytes] = await Promise.all([
    readFile(context.packet),
    readFile(context.schema)
  ]);
  assert.equal(sha256(packetBytes), context.packetSha256);
  assert.equal(sha256(schemaBytes), context.schemaSha256);
  const packet = JSON.parse(packetBytes);
  const schema = JSON.parse(schemaBytes);
  assert.equal(packet.packetIndex, context.contextIndex);
  assert.equal(packet.debateNumber, "31");
  assert.equal(packet.corrections.length, 2);
  assert.deepEqual(packet.constraints.writableFields, context.writableFields);
  assert.equal(packet.constraints.scoresUnavailableAsOutputFields, true);
  assert(packet.corrections.every((item) => item.originalWords > 130));
  assert(packet.corrections.every((item) => item.originalCharacters >= 880));
  assert.deepEqual(schema, buildDebate31RepairSchema(packet));
  assert.equal(Object.hasOwn(schema.properties, "scores"), false);
  assert.deepEqual(
    Object.keys(schema.properties.correctedCritiques.properties).sort(),
    packet.corrections.map((item) => item.moveId).sort()
  );

  const correctedCritiques = {};
  for (const correction of packet.corrections) {
    const sentences = correction.originalCritique
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean);
    assert.equal(sentences.length, 4);
    let tokens = sentences[1].split(/\s+/);
    while (wordCount(sentences.join(" ")) > 130) {
      tokens.splice(-2, 1);
      sentences[1] = tokens.join(" ");
    }
    const critique = sentences.join(" ");
    assert(wordCount(critique) >= 105 && wordCount(critique) <= 130);
    assert(critique.length >= 880);
    correctedCritiques[correction.moveId] = critique;
  }
  const repair = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-01-debate-31-publication-repair-output",
    protocolId: POST_CANARY_BATCH_01_DEBATE_31_REPAIR_PROTOCOL_ID,
    packetIndex: context.contextIndex,
    debateNumber: "31",
    debateId: context.debateId,
    assessmentModel: "5.6 Sol",
    completedAt: manifest.frozenAt,
    correctedCritiques
  };
  assert.equal(validateDebate31RepairOutput(repair, packet).status, "passed");
  repairPackets.push(packet);
  syntheticRepairs.push(repair);
}

const [baseOutput, publicationPacket] = await Promise.all([
  readFile(manifest.inputs.immutableBaseOutput, "utf8").then(JSON.parse),
  readFile(manifest.inputs.publicationPacket, "utf8").then(JSON.parse)
]);
const merged = mergeAndValidateDebate31Repairs({
  baseOutput,
  repairs: syntheticRepairs,
  repairPackets,
  publicationPacket
});
assert.equal(merged.transformations.length, 14);
assert.equal(merged.fullValidation.status, "passed");
assert.equal(merged.fullValidation.moves, 14);
assert.equal(merged.fullValidation.lockedScoresUnchanged, true);

console.log(JSON.stringify({
  status: "passed",
  contexts: 7,
  writableFields: 14,
  syntheticCompleteDebateValidation: merged.fullValidation.status,
  modelContextsExecuted: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0
}, null, 2));
