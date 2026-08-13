#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { CHECKPOINT_V22_DEBATE_192_REPAIR_PARTITIONS, CHECKPOINT_V22_DEBATE_192_REPAIR_ROOT, mergeAndValidateDebate192Repairs, validateDebate192RepairOutput } from "./lib/assessment-production-checkpoint-v2.2-debate-192-repair.mjs";

const readJson = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const preparation = await readJson(`${CHECKPOINT_V22_DEBATE_192_REPAIR_ROOT}/preparation-manifest.json`);
assert.equal(preparation.status, "four-isolated-seven-field-debate-192-publication-repair-packets-prepared-and-frozen");
assert.deepEqual(preparation.contexts.map(({ writableFields }) => writableFields), CHECKPOINT_V22_DEBATE_192_REPAIR_PARTITIONS);
assert.deepEqual(preparation.contexts.map(({ correctedFieldCount }) => correctedFieldCount), [2, 2, 2, 1]);
assert.equal(preparation.policy.attemptsPerContext, 1); assert.equal(preparation.policy.retriesMaximum, 0); assert.equal(preparation.policy.maximumParallelContexts, 2);
assert.equal(preparation.authorization.repairModelExecution, false); assert.equal(preparation.authorization.productionMutation, false);
const activationPath = `${CHECKPOINT_V22_DEBATE_192_REPAIR_ROOT}/execution-activation.json`;
if (await exists(activationPath)) {
  const activation = await readJson(activationPath);
  assert.equal(activation.authorization.repairModelContexts, true); assert.equal(activation.authorization.retry, false); assert.equal(activation.authorization.productionMutation, false);
  assert.equal(activation.model.label, "5.6 Sol"); assert.equal(activation.model.reasoningEffort, "low"); assert.equal(activation.model.authentication, "ChatGPT subscription");
  for (const [file, digest] of Object.entries(activation.sourceHashes)) assert.equal(sha256(await readFile(path.resolve(file))), digest, `source hash mismatch: ${file}`);
  if (await exists(activation.artifacts.execution)) {
    const execution = await readJson(activation.artifacts.execution);
    assert.equal(execution.contextsPlanned, 4); assert.equal(execution.attempts, execution.contextsAttempted); assert.equal(execution.retries, 0); assert.equal(execution.modelAuthoredScores, 0); assert.equal(execution.maximumObservedConcurrency <= 2, true);
    for (const result of execution.results.filter(({ gateAcceptancePassed }) => gateAcceptancePassed)) {
      const context = activation.contexts[result.contextIndex];
      assert.equal(validateDebate192RepairOutput(await readJson(context.repairOutput), await readJson(context.packet)).status, "passed");
    }
    if (await exists(activation.artifacts.analysis)) {
      const analysis = await readJson(activation.artifacts.analysis);
      assert.equal(analysis.gate.retries, 0); assert.equal(analysis.gate.modelAuthoredScores, 0); assert.equal(analysis.authorization.productionMutation, false);
      if (analysis.status === "debate-192-four-packet-repair-and-complete-publication-validation-passed") {
        const [baseOutput, publicationPacket, repairs, repairPackets, mergedOutput] = await Promise.all([
          readJson(preparation.inputs.immutableBaseOutput), readJson(preparation.inputs.publicationPacket),
          Promise.all(activation.contexts.map((context) => readJson(context.repairOutput))), Promise.all(activation.contexts.map((context) => readJson(context.packet))), readJson(activation.artifacts.mergedOutput)
        ]);
        const replay = mergeAndValidateDebate192Repairs({ baseOutput, repairs, repairPackets, publicationPacket });
        assert.deepEqual(replay.merged, mergedOutput); assert.equal(replay.fullValidation.status, "passed"); assert.equal(replay.transformations.length, 7);
        assert.equal((await readJson(activation.artifacts.mergeAudit)).immutableFieldsChanged, 0); assert.equal(analysis.authorization.eightContextResumptionPlanPreparation, true);
      }
    }
  }
}
console.log(JSON.stringify({ status: "passed", debateNumber: "192", repairPackets: 4, writableFields: 7, partitionSizes: [2, 2, 2, 1], attemptsPerContext: 1, retriesMaximum: 0, maximumParallelContexts: 2, modelAuthoredScores: 0, productionMutation: false }, null, 2));
