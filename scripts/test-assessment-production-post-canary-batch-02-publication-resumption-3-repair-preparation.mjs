#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

import {
  POST_CANARY_BATCH_02_RESUMPTION_3_REPAIR_FIELDS,
  POST_CANARY_BATCH_02_RESUMPTION_3_REPAIR_PARTITIONS,
  POST_CANARY_BATCH_02_RESUMPTION_3_REPAIR_PROTOCOL_ID,
  POST_CANARY_BATCH_02_RESUMPTION_3_REPAIR_ROOT,
  buildResumption3RepairSchema,
  mergeAndValidateResumption3Repairs,
  validateResumption3RepairOutput
} from "./lib/assessment-production-post-canary-batch-02-publication-resumption-3-repair.mjs";

const MANIFEST = `${POST_CANARY_BATCH_02_RESUMPTION_3_REPAIR_ROOT}/execution-preparation-manifest.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const wordCount = (value) =>
  String(value).trim().split(/\s+/).filter(Boolean).length;

const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
assert.equal(
  manifest.status,
  "frozen-five-isolated-nine-field-batch-02-publication-resumption-3-repair-contexts-prepared-under-standing-authorization"
);
assert.equal(manifest.protocolId, POST_CANARY_BATCH_02_RESUMPTION_3_REPAIR_PROTOCOL_ID);
assert.equal(manifest.productionCanary, false);
assert.equal(manifest.batchNumber, 2);
assert.equal(manifest.stagingOnly, true);
assert.deepEqual(manifest.model, {
  label: "5.6 Sol",
  slug: "gpt-5.6-sol",
  reasoningEffort: "low",
  authentication: "ChatGPT subscription"
});
assert.equal(manifest.contexts.length, 5);
assert.deepEqual(
  manifest.contexts.map((context) => context.contextIndex),
  [0, 1, 2, 3, 4]
);
assert.deepEqual(
  manifest.contexts.map((context) => context.writableFields),
  POST_CANARY_BATCH_02_RESUMPTION_3_REPAIR_PARTITIONS.map(
    (partition) => partition.writableFields
  )
);
assert.deepEqual(
  manifest.contexts.flatMap((context) => context.writableFields),
  POST_CANARY_BATCH_02_RESUMPTION_3_REPAIR_FIELDS
);
assert.equal(manifest.executionPolicy.contexts, 5);
assert.equal(manifest.executionPolicy.attemptsPerContext, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(manifest.executionPolicy.recursiveCorrectionContextsMaximum, 0);
assert.equal(manifest.executionPolicy.maximumParallelContexts, 2);
assert.deepEqual(manifest.executionPolicy.schedulerRamp, [1, 2]);
assert.deepEqual(
  manifest.executionPolicy.rampPhases.map((phase) => phase.contextIndexes),
  [[0], [1, 2], [3, 4]]
);
assert.equal(manifest.executionPolicy.separateActivationRequired, true);
assert.equal(manifest.executionPolicy.authentication, "ChatGPT subscription");
assert.equal(manifest.executionPolicy.APIKeysRemoved, true);
assert.equal(manifest.costEstimate.directIncrementalCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.meteredApiCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.transcriptionCostUsdMaximum, 0);
assert.deepEqual(manifest.costEstimate.expectedParallelWallMinutes, [4, 12]);
assert.equal(Object.values(manifest.stopRules).every(Boolean), true);
assert.equal(manifest.authorization.executionActivationPreparation, true);
assert.equal(manifest.authorization.standingAuthorizationPermitsActivation, true);
for (const [key, value] of Object.entries(manifest.authorization)) {
  if (
    key !== "executionActivationPreparation" &&
    key !== "standingAuthorizationPermitsActivation"
  ) {
    assert.equal(value, false, `${key}: must remain unauthorized`);
  }
}
assert.equal(manifest.totals.contexts, 5);
assert.equal(manifest.totals.writableFields, 9);
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
  assert.equal(packet.debateNumber, "99");
  assert(packet.corrections.length >= 1 && packet.corrections.length <= 2);
  assert.deepEqual(packet.constraints.writableFields, context.writableFields);
  assert.equal(packet.constraints.scoresUnavailableAsOutputFields, true);
  assert(
    packet.corrections.every(
      (item) => item.originalWords < 105 || item.originalWords > 130
    )
  );
  assert(packet.corrections.every((item) => item.originalCharacters >= 880));
  assert.deepEqual(schema, buildResumption3RepairSchema(packet));
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
    if (wordCount(sentences.join(" ")) < 105) {
      assert.equal(wordCount(sentences.join(" ")), 101);
      sentences[1] = sentences[1].replace(
        /([.!?]["')\]]?)$/,
        " with adequate evidential specificity$1"
      );
    }
    const critique = sentences.join(" ");
    assert(wordCount(critique) >= 105 && wordCount(critique) <= 130);
    assert(critique.length >= 880);
    correctedCritiques[correction.moveId] = critique;
  }
  const repair = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-02-publication-resumption-3-repair-output",
    protocolId: POST_CANARY_BATCH_02_RESUMPTION_3_REPAIR_PROTOCOL_ID,
    packetIndex: context.contextIndex,
    debateNumber: context.debateNumber,
    debateId: context.debateId,
    assessmentModel: "5.6 Sol",
    completedAt: manifest.frozenAt,
    correctedCritiques
  };
  assert.equal(validateResumption3RepairOutput(repair, packet).status, "passed");
  repairPackets.push(packet);
  syntheticRepairs.push(repair);
}

const baseOutputs = Object.fromEntries(
  await Promise.all(
    Object.entries(manifest.inputs.immutableBaseOutputs).map(
      async ([debateNumber, file]) => [
        debateNumber,
        JSON.parse(await readFile(file, "utf8"))
      ]
    )
  )
);
const publicationPackets = Object.fromEntries(
  await Promise.all(
    Object.entries(manifest.inputs.publicationPackets).map(
      async ([debateNumber, file]) => [
        debateNumber,
        JSON.parse(await readFile(file, "utf8"))
      ]
    )
  )
);
const merged = mergeAndValidateResumption3Repairs({
  baseOutputs,
  repairs: syntheticRepairs,
  repairPackets,
  publicationPackets
});
assert.equal(merged.transformations.length, 9);
assert.equal(merged.fullValidations["99"].status, "passed");
assert.equal(merged.fullValidations["99"].moves, 20);
assert(
  Object.values(merged.fullValidations).every(
    (validation) => validation.lockedScoresUnchanged
  )
);

console.log(JSON.stringify({
  status: "passed",
  contexts: 5,
  writableFields: 9,
  syntheticCompleteDebateValidations: Object.fromEntries(
    Object.entries(merged.fullValidations).map(([debate, value]) => [
      debate,
      value.status
    ])
  ),
  modelContextsExecuted: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0
}, null, 2));
