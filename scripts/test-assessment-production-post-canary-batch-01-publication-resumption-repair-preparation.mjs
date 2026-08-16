#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

import {
  POST_CANARY_BATCH_01_RESUMPTION_REPAIR_FIELDS,
  POST_CANARY_BATCH_01_RESUMPTION_REPAIR_OUTPUT_VERSION,
  POST_CANARY_BATCH_01_RESUMPTION_REPAIR_PARTITIONS,
  POST_CANARY_BATCH_01_RESUMPTION_REPAIR_PROTOCOL_ID,
  POST_CANARY_BATCH_01_RESUMPTION_REPAIR_ROOT,
  buildResumptionRepairSchema,
  mergeAndValidateResumptionRepairs,
  validateResumptionRepairOutput
} from "./lib/assessment-production-post-canary-batch-01-publication-resumption-repair.mjs";

const MANIFEST = `${POST_CANARY_BATCH_01_RESUMPTION_REPAIR_ROOT}/execution-preparation-manifest.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const wordCount = (value) =>
  String(value).trim().split(/\s+/).filter(Boolean).length;

const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
assert.equal(
  manifest.status,
  "frozen-three-isolated-four-field-batch-01-publication-resumption-repair-contexts-prepared-not-authorized"
);
assert.equal(
  manifest.protocolId,
  POST_CANARY_BATCH_01_RESUMPTION_REPAIR_PROTOCOL_ID
);
assert.equal(manifest.productionCanary, false);
assert.equal(manifest.batchNumber, 1);
assert.equal(manifest.stagingOnly, true);
assert.deepEqual(manifest.model, {
  label: "5.6 Sol",
  slug: "gpt-5.6-sol",
  reasoningEffort: "low",
  authentication: "ChatGPT subscription"
});
assert.equal(manifest.contexts.length, 3);
assert.deepEqual(
  manifest.contexts.map(({ contextIndex }) => contextIndex),
  [0, 1, 2]
);
assert.deepEqual(
  manifest.contexts.map(({ debateNumber, writableFields }) => ({
    debateNumber,
    writableFields
  })),
  POST_CANARY_BATCH_01_RESUMPTION_REPAIR_PARTITIONS
);
assert.deepEqual(
  manifest.contexts.flatMap(({ writableFields }) => writableFields),
  POST_CANARY_BATCH_01_RESUMPTION_REPAIR_FIELDS
);
assert.deepEqual(
  manifest.contexts.map(({ writableFieldCount }) => writableFieldCount),
  [1, 2, 1]
);
assert.equal(manifest.executionPolicy.contexts, 3);
assert.equal(manifest.executionPolicy.attemptsPerContext, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(manifest.executionPolicy.recursiveCorrectionContextsMaximum, 0);
assert.equal(manifest.executionPolicy.maximumParallelContexts, 2);
assert.deepEqual(manifest.executionPolicy.schedulerRamp, [1, 2]);
assert.deepEqual(
  manifest.executionPolicy.rampPhases.map(({ contextIndexes }) => contextIndexes),
  [[0], [1, 2]]
);
assert.equal(manifest.executionPolicy.separateActivationRequired, true);
assert.equal(manifest.executionPolicy.authentication, "ChatGPT subscription");
assert.equal(manifest.executionPolicy.APIKeysRemoved, true);
assert.equal(manifest.costEstimate.directIncrementalCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.meteredApiCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.transcriptionCostUsdMaximum, 0);
assert.deepEqual(manifest.costEstimate.expectedParallelWallMinutes, [3, 8]);
assert.equal(Object.values(manifest.stopRules).every(Boolean), true);
assert.equal(manifest.authorization.executionActivationPreparation, true);
for (const [key, value] of Object.entries(manifest.authorization)) {
  if (key !== "executionActivationPreparation") {
    assert.equal(value, false, `${key}: must remain unauthorized`);
  }
}
assert.equal(manifest.totals.debates, 2);
assert.equal(manifest.totals.contexts, 3);
assert.equal(manifest.totals.writableFields, 4);
assert.equal(manifest.totals.modelContextsExecuted, 0);
assert.equal(manifest.totals.repairMerges, 0);
assert.equal(manifest.totals.publicationCompilationPasses, 0);
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
  assert.equal(packet.debateNumber, context.debateNumber);
  assert.equal(packet.corrections.length, context.writableFieldCount);
  assert.deepEqual(packet.constraints.writableFields, context.writableFields);
  assert.equal(packet.constraints.maximumWritableFields, 2);
  assert.equal(packet.constraints.scoreFieldsUnavailableAsOutputs, true);
  assert.deepEqual(schema, buildResumptionRepairSchema(packet));
  assert.equal(Object.hasOwn(schema.properties, "scores"), false);
  assert.deepEqual(
    Object.keys(schema.properties.correctedFields.properties).sort(),
    context.writableFields.slice().sort()
  );

  const correctedFields = {};
  for (const correction of packet.corrections) {
    if (correction.repairType === "representative-quote") {
      const tokens = correction.sourceExcerpt.split(/\s+/).filter(Boolean);
      let candidate = null;
      for (let length = 14; length >= 6 && candidate === null; length -= 1) {
        for (let start = 0; start + length <= tokens.length; start += 1) {
          const value = tokens.slice(start, start + length).join(" ");
          if (correction.sourceExcerpt.includes(value)) {
            candidate = value;
            break;
          }
        }
      }
      assert(candidate);
      assert(wordCount(candidate) >= 3 && wordCount(candidate) <= 18);
      correctedFields[correction.field] = candidate;
      continue;
    }
    const sentences = correction.originalCritique
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean);
    while (wordCount(sentences.join(" ")) > 130) {
      const tokens = sentences[1].split(/\s+/);
      tokens.splice(tokens.length - 2, 1);
      sentences[1] = tokens.join(" ");
    }
    const critique = sentences.join(" ");
    assert(wordCount(critique) >= 105 && wordCount(critique) <= 130);
    assert(critique.length >= 880);
    correctedFields[correction.field] = critique;
  }
  const repair = {
    schemaVersion: POST_CANARY_BATCH_01_RESUMPTION_REPAIR_OUTPUT_VERSION,
    protocolId: POST_CANARY_BATCH_01_RESUMPTION_REPAIR_PROTOCOL_ID,
    packetIndex: context.contextIndex,
    debateNumber: context.debateNumber,
    debateId: context.debateId,
    assessmentModel: "5.6 Sol",
    completedAt: manifest.frozenAt,
    correctedFields
  };
  assert.equal(validateResumptionRepairOutput(repair, packet).status, "passed");
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
const merged = mergeAndValidateResumptionRepairs({
  baseOutputs,
  repairs: syntheticRepairs,
  repairPackets,
  publicationPackets
});
assert.equal(merged.transformations.length, 4);
assert.equal(merged.fullValidations["91"].status, "passed");
assert.equal(merged.fullValidations["13"].status, "passed");
assert.equal(merged.fullValidations["91"].moves, 18);
assert.equal(merged.fullValidations["13"].moves, 12);
assert.equal(merged.fullValidations["91"].lockedScoresUnchanged, true);
assert.equal(merged.fullValidations["13"].lockedScoresUnchanged, true);

console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: 2,
      contexts: 3,
      writableFields: 4,
      partition: [1, 2, 1],
      syntheticCompleteDebateValidations: 2,
      modelContextsExecuted: 0,
      repairMerges: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
