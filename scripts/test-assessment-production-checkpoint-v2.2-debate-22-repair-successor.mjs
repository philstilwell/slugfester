#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { validateCheckpointV22PublicationOutput } from "./lib/assessment-production-checkpoint-v2.2-publication-validation.mjs";
import {
  CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ORDER,
  CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ROOT
} from "./lib/assessment-production-checkpoint-v2.2-debate-22-repair-successor.mjs";

const readJson = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const preparation = await readJson(`${CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ROOT}/preparation-manifest.json`);
assert.equal(preparation.status, "explicit-order-model-free-complete-cohort-successor-prepared-and-frozen");
assert.deepEqual(preparation.intendedOrder, CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ORDER);
assert.equal(preparation.repairPackets.length, 7);
assert.equal(preparation.preparationReplay.totals.debates, 10);
assert.equal(preparation.preparationReplay.totals.moves, 188);
assert.equal(preparation.preparationReplay.totals.critiques, 188);
assert.equal(preparation.modelExecution, false);
assert.equal(preparation.directCostUsd, 0);
assert.equal(preparation.controls.iterateExplicitOrderArrayDirectly, true);
assert.equal(preparation.controls.deterministicCompilationForbidden, true);
assert.equal(preparation.controls.productionMutationForbidden, true);

const activationPath = `${CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ROOT}/execution-activation.json`;
if (await exists(activationPath)) {
  const activation = await readJson(activationPath);
  assert.equal(activation.status, "explicit-order-model-free-complete-cohort-successor-authorized-and-frozen");
  assert.deepEqual(activation.intendedOrder, CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ORDER);
  assert.equal(activation.authorization.deterministicSuccessorExecution, true);
  assert.equal(activation.authorization.modelExecution, false);
  assert.equal(activation.authorization.retry, false);
  assert.equal(activation.authorization.deterministicCompilation, false);
  assert.equal(activation.authorization.productionMutation, false);
  assert.equal(activation.directCostUsdMaximum, 0);
  for (const [file, digest] of Object.entries(activation.sourceHashes)) {
    assert.equal(sha256(await readFile(path.resolve(file))), digest, `source hash mismatch: ${file}`);
  }
  if (await exists(activation.artifacts.execution)) {
    const [execution, analysis] = await Promise.all([
      readJson(activation.artifacts.execution),
      readJson(activation.artifacts.analysis)
    ]);
    assert.equal(execution.repairOutputsReused, 7);
    assert.equal(execution.repairAttempts, 0);
    assert.equal(execution.modelContexts, 0);
    assert.equal(execution.retries, 0);
    assert.equal(execution.directCostUsd, 0);
    assert.deepEqual(execution.explicitOrder, CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ORDER);
    assert.equal(execution.deterministicCompilationPerformed, false);
    assert.equal(execution.productionMutationPerformed, false);
    assert.equal(analysis.authorization.deterministicCompilation, false);
    assert.equal(analysis.authorization.productionMutation, false);
    if (analysis.status === "complete-ten-debate-publication-cohort-validation-passed") {
      assert.equal(execution.status, "explicit-order-complete-cohort-successor-passed");
      assert.equal(execution.outputArtifactsWritten, true);
      assert.equal(analysis.gate.debate22CompleteValidationPassed, true);
      assert.equal(analysis.gate.completeCohortValidationPassed, true);
      const [mergedBytes, merged, completeDebate, mergeAudit, cohort] = await Promise.all([
        readFile(path.resolve(activation.artifacts.mergedOutput)),
        readJson(activation.artifacts.mergedOutput),
        readJson(activation.artifacts.completeDebateValidation),
        readJson(activation.artifacts.mergeAudit),
        readJson(activation.artifacts.completeCohortValidation)
      ]);
      assert.equal(completeDebate.status, "passed");
      assert.equal(completeDebate.mergedOutputSha256, sha256(mergedBytes));
      assert.equal(completeDebate.immutableFieldsChanged, 0);
      assert.equal(mergeAudit.authorizedFieldsChanged, 13);
      assert.equal(mergeAudit.immutableFieldsChanged, 0);
      assert.equal(cohort.status, "passed");
      assert.equal(cohort.explicitOrderLoop, true);
      assert.deepEqual(cohort.cohortOrder, CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ORDER);
      assert.equal(cohort.totals.debates, 10);
      assert.equal(cohort.totals.moves, 188);
      assert.equal(cohort.totals.critiques, 188);
      assert.equal(cohort.totals.exactSourceQuotes, 20);
      assert.equal(cohort.totals.overallCommentarySides, 20);
      assert.equal(cohort.totals.aiExtensionSides, 20);
      assert.equal(cohort.scoresRecalculated, false);
      assert.equal(cohort.scoresChanged, false);
      assert.equal(cohort.modelAuthoredScores, 0);
      assert.equal(cohort.deterministicCompilationPerformed, false);
      assert.equal(cohort.productionMutationPerformed, false);
      for (const row of cohort.rows) {
        const [outputBytes, output, packetBytes, packet] = await Promise.all([
          readFile(path.resolve(row.output)),
          readJson(row.output),
          readFile(path.resolve(row.packet)),
          readJson(row.packet)
        ]);
        assert.equal(sha256(outputBytes), row.outputSha256);
        assert.equal(sha256(packetBytes), row.packetSha256);
        assert.equal(validateCheckpointV22PublicationOutput(output, packet).status, "passed");
      }
      assert.equal(validateCheckpointV22PublicationOutput(merged, await readJson(preparation.cohortPackets["22"])).status, "passed");
    }
  }
}
console.log(JSON.stringify({
  status: "passed",
  successor: "explicit-order-model-free-complete-cohort-validation",
  intendedOrder: CHECKPOINT_V22_DEBATE_22_REPAIR_SUCCESSOR_ORDER,
  repairOutputsReused: 7,
  repairAttempts: 0,
  modelContexts: 0,
  expectedDebates: 10,
  expectedMoves: 188,
  directCostUsd: 0,
  productionMutation: false
}, null, 2));
