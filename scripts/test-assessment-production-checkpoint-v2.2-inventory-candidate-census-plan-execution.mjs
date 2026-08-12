#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  candidateShardedInventoryPlanSha256,
  validateCandidateShardedInventoryPlan,
} from "./lib/assessment-production-score-stability-v2-inventory-candidate-sharded.mjs";

const ROOT =
  "docs/assessment-production/production-checkpoint-v2.2-1/inventory-chronology-fallback";
const ACTIVATION = `${ROOT}/plan-execution-activation.json`;
const EXECUTION = `${ROOT}/plan-model-execution.json`;
const ANALYSIS = `${ROOT}/plan-analysis.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const [activationBytes, executionBytes, analysisBytes] = await Promise.all([
  readFile(ACTIVATION),
  readFile(EXECUTION),
  readFile(ANALYSIS),
]);
const activation = JSON.parse(activationBytes);
const execution = JSON.parse(executionBytes);
const analysis = JSON.parse(analysisBytes);

assert.equal(
  activation.status,
  "frozen-ten-production-checkpoint-v2.2-candidate-census-plan-contexts-authorized"
);
assert.equal(activation.productionCanary, true);
assert.equal(activation.developmentValidationOnly, false);
assert.deepEqual(activation.model, {
  label: "5.6 Sol",
  slug: "gpt-5.6-sol",
  reasoningEffort: "low",
  authentication: "ChatGPT subscription",
  scoreBlind: true,
});
assert.equal(activation.authorization.planModelContexts, true);
assert.equal(activation.authorization.independentJudgmentModelExecution, false);
assert.equal(activation.authorization.scoreDerivation, false);
assert.equal(activation.authorization.productionMutation, false);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source drifted`);
}

const [plannerManifestBytes, inventoryPreparationBytes] = await Promise.all([
  readFile(activation.preparationManifest),
  readFile(activation.sourcePreparation),
]);
assert.equal(
  sha256(plannerManifestBytes),
  activation.preparationManifestSha256
);
assert.equal(
  sha256(inventoryPreparationBytes),
  activation.sourcePreparationSha256
);
const plannerManifest = JSON.parse(plannerManifestBytes);
const inventoryPreparation = JSON.parse(inventoryPreparationBytes);

assert.equal(
  execution.schemaVersion,
  "1.0-production-checkpoint-v2.2-candidate-census-plan-model-execution"
);
assert.equal(
  execution.status,
  "ten-production-checkpoint-v2.2-candidate-census-plan-contexts-passed"
);
assert.equal(execution.protocolId, activation.protocolId);
assert.equal(execution.activationSha256, sha256(activationBytes));
assert.equal(execution.productionCanary, true);
assert.equal(execution.developmentValidationOnly, false);
assert.equal(execution.stagingOnly, true);
assert.equal(execution.contextsPlanned, 10);
assert.equal(execution.contextsAttempted, 10);
assert.equal(execution.contextsUnattempted, 0);
assert.equal(execution.validContexts, 10);
assert.equal(execution.invalidContexts, 0);
assert.equal(execution.attempts, 10);
assert.equal(execution.retries, 0);
assert.equal(execution.timeoutExtensions, 0);
assert.equal(execution.semanticCorrections, 0);
assert.equal(execution.parallelismMaximumAllowed, 2);
assert.equal(execution.maximumParallelContextsObserved, 2);
assert.deepEqual(execution.schedulerRamp, [1, 2]);
assert.equal(execution.rampPassed, true);
assert.equal(execution.rampPhases.length, 2);
assert.deepEqual(execution.rampPhases[0].contextIndexesPlanned, [0]);
assert.deepEqual(execution.rampPhases[0].contextIndexesAttempted, [0]);
assert.equal(execution.rampPhases[0].maximumParallelContexts, 1);
assert.equal(execution.rampPhases[0].passed, true);
assert.deepEqual(
  execution.rampPhases[1].contextIndexesPlanned,
  [1, 2, 3, 4, 5, 6, 7, 8, 9]
);
assert.deepEqual(
  execution.rampPhases[1].contextIndexesAttempted,
  [1, 2, 3, 4, 5, 6, 7, 8, 9]
);
assert.equal(execution.rampPhases[1].maximumParallelContexts, 2);
assert.equal(execution.rampPhases[1].passed, true);
assert.equal(execution.authentication, "ChatGPT subscription");
assert.equal(execution.scoreBlind, true);
assert.equal(execution.meteredApiCostUsd, 0);
assert.equal(execution.transcriptionCostUsd, 0);
assert.equal(execution.failedProductionCanaryV1Reclassified, false);
assert.equal(execution.priorValidationCohortsReclassified, false);
assert.equal(execution.activePolicyVersion, "v2.2");
assert.equal(execution.scoresDerived, 0);
assert.deepEqual(execution.authorization, {
  deterministicPlanAnalysis: true,
  exactSidePacketPreparation: false,
  sideSelectorModelExecution: false,
  retry: false,
  timeoutExtension: false,
  semanticCorrection: false,
  independentJudgmentModelExecution: false,
  scoreDerivation: false,
  policyPromotion: false,
  productionMutation: false,
});

assert.equal(execution.results.length, 10);
for (const [index, result] of execution.results.entries()) {
  const context = plannerManifest.contexts[index];
  const prepared = inventoryPreparation.contexts[index];
  assert.equal(result.contextIndex, index);
  assert.equal(result.debateNumber, context.debateNumber);
  assert.equal(result.status, "completed-valid");
  assert.equal(result.accepted, true);
  assert.equal(result.attemptCount, 1);
  assert.equal(result.retryCount, 0);
  assert.equal(result.timedOut, false);
  assert.equal(result.commandExitCode, 0);
  assert.equal(result.terminationSignal, null);
  assert.equal(result.authentication, "ChatGPT subscription");
  assert.equal(result.apiKeysRemoved, true);
  assert.equal(result.scoreBlind, true);
  assert.equal(result.meteredApiCostUsd, 0);
  assert.equal(result.transcriptionCostUsd, 0);
  assert.equal(result.planOutputWritten, true);
  const [planBytes, legacySchema, candidateTransport, candidateCensus] =
    await Promise.all([
      readFile(context.output),
      readFile(prepared.compilerSchema, "utf8").then(JSON.parse),
      readFile(prepared.fullCandidateTransport, "utf8").then(JSON.parse),
      readFile(prepared.candidateCensus, "utf8").then(JSON.parse),
    ]);
  assert.equal(sha256(planBytes), result.planSha256);
  const plan = JSON.parse(planBytes);
  assert.equal(
    validateCandidateShardedInventoryPlan({
      plan,
      legacySchema,
      candidateTransport,
      candidateCensus,
    }).status,
    "passed"
  );
  assert.equal(
    candidateShardedInventoryPlanSha256(plan),
    result.inventoryPlanCanonicalSha256
  );
}

assert.equal(
  analysis.schemaVersion,
  "1.0-production-checkpoint-v2.2-candidate-census-plan-analysis"
);
assert.equal(
  analysis.status,
  "production-checkpoint-v2.2-candidate-census-plan-gate-passed-exact-side-packet-preparation-authorized"
);
assert.equal(analysis.protocolId, activation.protocolId);
assert.equal(analysis.activationSha256, sha256(activationBytes));
assert.equal(analysis.executionSha256, sha256(executionBytes));
assert.equal(analysis.productionCanary, true);
assert.equal(analysis.developmentValidationOnly, false);
assert.equal(analysis.stagingOnly, true);
assert.equal(analysis.activePolicy.version, "v2.2");
assert.equal(
  analysis.gateDisposition.failedProductionCanaryV1PreservedFailed,
  true
);
assert.equal(analysis.gateDisposition.priorValidationCohortsReclassified, false);
assert.equal(
  analysis.validatedInventoryContract.planAndSideIsolationPreserved,
  true
);
assert.deepEqual(analysis.audit, {
  exactPlanCount: 10,
  everyPlanSingleAttempt: true,
  everyPlanSchemaAndSemanticValidationPassed: true,
  everyPlanCanonicalHashReplayed: true,
  everyPlanHasOneRoutePerSide: true,
  everyPlanHasFourToSixSections: true,
  everyPlanWeightsTotalOneHundred: true,
  candidateSelectionPerformed: false,
  exactSidePacketsFrozen: 0,
  scoresDerived: false,
});
assert.deepEqual(analysis.totals, {
  debates: 10,
  planContextsAttempted: 10,
  acceptedPlans: 10,
  exactSidePacketsFrozen: 0,
  retries: 0,
  timeoutExtensions: 0,
  semanticCorrections: 0,
  audioCalls: 0,
  transcriptionCalls: 0,
  scoresDerived: 0,
  meteredApiCostUsd: 0,
  transcriptionCostUsd: 0,
});
assert.equal(analysis.plans.length, 10);
for (const [index, planRecord] of analysis.plans.entries()) {
  const result = execution.results[index];
  const plan = JSON.parse(await readFile(planRecord.output, "utf8"));
  assert.equal(planRecord.contextIndex, index);
  assert.equal(planRecord.debateNumber, result.debateNumber);
  assert.equal(planRecord.outputSha256, result.planSha256);
  assert.equal(planRecord.canonicalSha256, result.inventoryPlanCanonicalSha256);
  assert.equal(planRecord.routes, 2);
  assert(planRecord.sections >= 4 && planRecord.sections <= 6);
  assert.equal(planRecord.weightPercentTotal, 100);
  assert.equal(planRecord.validated, true);
  assert.equal(plan.routes.length, 2);
  assert.equal(
    plan.sections.reduce((sum, section) => sum + section.weightPercent, 0),
    100
  );
}
assert.equal(analysis.authorization.exactSidePacketPreparation, true);
for (const key of [
  "sideSelectorExecutionManifestPreparation",
  "sideSelectorModelExecution",
  "inventoryModelExecution",
  "retry",
  "timeoutExtension",
  "semanticCorrection",
  "independentJudgmentPacketPreparation",
  "independentJudgmentModelExecution",
  "paidTranscription",
  "audioVerification",
  "adjudicationModelExecution",
  "scoreDerivation",
  "policyPromotion",
  "publicationPreparation",
  "productionMutation",
  "remainingProductionBatches",
]) {
  assert.equal(analysis.authorization[key], false, `${key}: must be false`);
}
assert.equal(
  analysis.nextAuthorizedAction,
  "prepare-and-freeze-twenty-exact-production-checkpoint-v2.2-side-selector-packets-model-free-only"
);

console.log(
  JSON.stringify(
    {
      status: "passed-analysis",
      debates: 10,
      acceptedPlans: 10,
      wallElapsedMinutes: Number((execution.wallElapsedMs / 60000).toFixed(2)),
      aggregateModelMinutes: Number(
        (execution.modelWorkElapsedMs / 60000).toFixed(2)
      ),
      retries: 0,
      timeoutExtensions: 0,
      scoresDerived: 0,
      nextAuthorizedAction: analysis.nextAuthorizedAction,
    },
    null,
    2
  )
);
