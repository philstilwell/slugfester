#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  CHECKPOINT_V22_REPAIR_FIELDS,
  CHECKPOINT_V22_REPAIR_ROOT,
  mergeAndValidateCheckpointV22Repair,
  validateCheckpointV22RepairOutput
} from "./lib/assessment-production-checkpoint-v2.2-publication-repair.mjs";

const readJson = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const preparation = await readJson(`${CHECKPOINT_V22_REPAIR_ROOT}/preparation-manifest.json`);
assert.equal(preparation.status, "one-isolated-two-field-debate-50-publication-repair-prepared-and-frozen");
assert.deepEqual(preparation.context.writableFields, CHECKPOINT_V22_REPAIR_FIELDS);
assert.equal(preparation.policy.attemptsPerContext, 1);
assert.equal(preparation.policy.retriesMaximum, 0);
assert.equal(preparation.authorization.repairModelExecution, false);
assert.equal(preparation.authorization.productionMutation, false);
const packet = await readJson(preparation.context.packet);
assert.equal(packet.corrections.length, 2);
assert.deepEqual(packet.corrections.map(({ field }) => field), CHECKPOINT_V22_REPAIR_FIELDS);
assert.deepEqual(packet.corrections.map(({ originalWords }) => originalWords), [131, 133]);

const activationPath = `${CHECKPOINT_V22_REPAIR_ROOT}/execution-activation.json`;
if (await exists(activationPath)) {
  const activation = await readJson(activationPath);
  assert.equal(activation.authorization.repairModelContext, true);
  assert.equal(activation.authorization.retry, false);
  assert.equal(activation.authorization.productionMutation, false);
  assert.equal(activation.executionPolicy.attemptsPerContext, 1);
  assert.equal(activation.executionPolicy.retriesMaximum, 0);
  assert.equal(activation.model.label, "5.6 Sol");
  assert.equal(activation.model.reasoningEffort, "low");
  assert.equal(activation.model.authentication, "ChatGPT subscription");
  for (const [file, digest] of Object.entries(activation.sourceHashes)) {
    assert.equal(sha256(await readFile(path.resolve(file))), digest, `source hash mismatch: ${file}`);
  }
  if (await exists(activation.artifacts.execution)) {
    const execution = await readJson(activation.artifacts.execution);
    assert.equal(execution.contextsAttempted, 1);
    assert.equal(execution.attempts, 1);
    assert.equal(execution.retries, 0);
    assert.equal(execution.modelAuthoredScores, 0);
    if (execution.result.gateAcceptancePassed) {
      const repair = await readJson(activation.artifacts.repairOutput);
      const replay = validateCheckpointV22RepairOutput(repair, packet);
      assert.equal(replay.correctedFields.length, 2);
      assert.equal(replay.modelAuthoredScores, 0);
    }
    if (await exists(activation.artifacts.analysis)) {
      const analysis = await readJson(activation.artifacts.analysis);
      assert.equal(analysis.gate.attempts, 1);
      assert.equal(analysis.gate.retries, 0);
      assert.equal(analysis.authorization.productionMutation, false);
      if (analysis.gate.completeDebateValidationPassed) {
        const [baseOutput, repair, publicationPacket, mergedOutput] = await Promise.all([
          readJson(preparation.inputs.immutableBaseOutput),
          readJson(activation.artifacts.repairOutput),
          readJson(preparation.inputs.publicationPacket),
          readJson(activation.artifacts.mergedOutput)
        ]);
        const replay = mergeAndValidateCheckpointV22Repair({
          baseOutput,
          repair,
          repairPacket: packet,
          publicationPacket
        });
        assert.deepEqual(replay.merged, mergedOutput);
        assert.equal(replay.fullValidation.status, "passed");
        assert.equal(replay.transformations.length, 2);
        assert.equal((await readJson(activation.artifacts.mergeAudit)).immutableFieldsChanged, 0);
      }
    }
  }
}
console.log(JSON.stringify({
  status: "passed",
  debateNumber: "50",
  repairPackets: 1,
  writableFields: 2,
  attemptsMaximum: 1,
  retriesMaximum: 0,
  modelAuthoredScores: 0,
  productionMutation: false
}, null, 2));
