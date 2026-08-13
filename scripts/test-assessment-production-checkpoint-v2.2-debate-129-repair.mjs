#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { CHECKPOINT_V22_DEBATE_129_REPAIR_FIELDS, CHECKPOINT_V22_DEBATE_129_REPAIR_ROOT, mergeAndValidateDebate129Repair, validateDebate129RepairOutput } from "./lib/assessment-production-checkpoint-v2.2-debate-129-repair.mjs";
const readJson = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse), exists = (file) => access(path.resolve(file)).then(() => true, () => false), sha256 = (value) => createHash("sha256").update(value).digest("hex");
const preparation = await readJson(`${CHECKPOINT_V22_DEBATE_129_REPAIR_ROOT}/preparation-manifest.json`);
assert.equal(preparation.status, "one-isolated-two-field-debate-129-publication-repair-packet-prepared-and-frozen"); assert.deepEqual(preparation.context.writableFields, CHECKPOINT_V22_DEBATE_129_REPAIR_FIELDS); assert.equal(preparation.policy.attemptsPerContext, 1); assert.equal(preparation.policy.retriesMaximum, 0); assert.equal(preparation.authorization.productionMutation, false);
const activationPath = `${CHECKPOINT_V22_DEBATE_129_REPAIR_ROOT}/execution-activation.json`;
if (await exists(activationPath)) {
  const activation = await readJson(activationPath); assert.equal(activation.authorization.repairModelContext, true); assert.equal(activation.authorization.retry, false); assert.equal(activation.authorization.productionMutation, false); assert.equal(activation.model.label, "5.6 Sol"); assert.equal(activation.model.reasoningEffort, "low"); assert.equal(activation.model.authentication, "ChatGPT subscription");
  for (const [file, digest] of Object.entries(activation.sourceHashes)) assert.equal(sha256(await readFile(path.resolve(file))), digest, `source hash mismatch: ${file}`);
  if (await exists(activation.artifacts.execution)) {
    const execution = await readJson(activation.artifacts.execution); assert.equal(execution.contextsAttempted, 1); assert.equal(execution.attempts, 1); assert.equal(execution.retries, 0); assert.equal(execution.modelAuthoredScores, 0);
    if (execution.result.gateAcceptancePassed) assert.equal(validateDebate129RepairOutput(await readJson(activation.artifacts.repairOutput), await readJson(activation.context.packet)).status, "passed");
    if (await exists(activation.artifacts.analysis)) {
      const analysis = await readJson(activation.artifacts.analysis); assert.equal(analysis.gate.retries, 0); assert.equal(analysis.authorization.productionMutation, false);
      if (analysis.status === "debate-129-bounded-repair-and-complete-publication-validation-passed") {
        const [baseOutput, repair, repairPacket, publicationPacket, mergedOutput] = await Promise.all([readJson(preparation.inputs.immutableBaseOutput), readJson(activation.artifacts.repairOutput), readJson(activation.context.packet), readJson(preparation.inputs.publicationPacket), readJson(activation.artifacts.mergedOutput)]);
        const replay = mergeAndValidateDebate129Repair({ baseOutput, repair, repairPacket, publicationPacket }); assert.deepEqual(replay.merged, mergedOutput); assert.equal(replay.fullValidation.status, "passed"); assert.equal(replay.transformations.length, 2); assert.equal((await readJson(activation.artifacts.mergeAudit)).immutableFieldsChanged, 0); assert.equal(analysis.authorization.sevenContextResumptionPlanPreparation, true);
      }
    }
  }
}
console.log(JSON.stringify({ status: "passed", debateNumber: "129", repairPackets: 1, writableFields: 2, attemptsPerContext: 1, retriesMaximum: 0, modelAuthoredScores: 0, productionMutation: false }, null, 2));
