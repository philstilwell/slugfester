#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const ROOT =
  "docs/assessment-production/production-checkpoint-v2.2-1/inventory-chronology-fallback";
const ACTIVATION = `${ROOT}/side-execution-activation.json`;
const EXECUTION = `${ROOT}/side-model-execution.json`;
const ANALYSIS = `${ROOT}/inventory-analysis.json`;
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
  "frozen-twenty-production-checkpoint-v2.2-side-selector-contexts-authorized"
);
assert.equal(activation.productionCanary, true);
assert.equal(activation.developmentValidationOnly, false);
assert.equal(activation.model.label, "5.6 Sol");
assert.equal(activation.model.slug, "gpt-5.6-sol");
assert.equal(activation.model.reasoningEffort, "low");
assert.equal(activation.model.authentication, "ChatGPT subscription");
assert.equal(activation.model.scoreBlind, true);
assert.equal(activation.activePolicy.version, "v2.2");
assert.equal(
  activation.activePolicy.agreedWinningSideMayCollapseToIntegerRoundedTie,
  true
);
assert.equal(activation.activePolicy.scorePassesMaximum, 1);
assert.equal(activation.authorization.independentJudgmentModelExecution, false);
assert.equal(activation.authorization.scoreDerivation, false);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source drifted`);
}

assert.equal(
  execution.schemaVersion,
  "1.0-production-checkpoint-v2.2-side-selector-model-execution"
);
assert.equal(
  execution.status,
  "twenty-production-checkpoint-v2.2-side-selector-contexts-passed"
);
assert.equal(execution.activationSha256, sha256(activationBytes));
assert.equal(execution.productionCanary, true);
assert.equal(execution.developmentValidationOnly, false);
assert.equal(execution.contextsPlanned, 20);
assert.equal(execution.contextsAttempted, 20);
assert.equal(execution.contextsUnattempted, 0);
assert.equal(execution.validContexts, 20);
assert.equal(execution.invalidContexts, 0);
assert.equal(execution.attempts, 20);
assert.equal(execution.retries, 0);
assert.equal(execution.timeoutExtensions, 0);
assert.equal(execution.semanticCorrections, 0);
assert.equal(execution.maximumParallelContextsObserved, 2);
assert.deepEqual(execution.schedulerRamp, [1, 2]);
assert.equal(execution.rampPassed, true);
assert.equal(execution.authentication, "ChatGPT subscription");
assert.equal(execution.scoreBlind, true);
assert.equal(execution.meteredApiCostUsd, 0);
assert.equal(execution.transcriptionCostUsd, 0);
assert.equal(execution.failedProductionCanaryV1Reclassified, false);
assert.equal(execution.priorValidationCohortsReclassified, false);
assert.equal(execution.activePolicyVersion, "v2.2");
assert.equal(execution.scoresDerived, 0);
assert.equal(execution.results.length, 20);
assert.deepEqual(
  execution.rampPhases.map((phase) => ({
    phase: phase.phase,
    maximumParallelContexts: phase.maximumParallelContexts,
    passed: phase.passed,
  })),
  [
    {
      phase: "operational-canary-one",
      maximumParallelContexts: 1,
      passed: true,
    },
    { phase: "steady-two", maximumParallelContexts: 2, passed: true },
  ]
);
assert.deepEqual(
  execution.results.map((result) => result.contextIndex),
  Array.from({ length: 20 }, (_, index) => index)
);
for (const result of execution.results) {
  assert.equal(result.model, "5.6 Sol");
  assert.equal(result.modelSlug, "gpt-5.6-sol");
  assert.equal(result.reasoningEffort, "low");
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
  assert.equal(result.status, "completed-valid");
  assert.equal(result.accepted, true);
  assert.equal(result.outputWritten, true);
  assert.equal(result.validationSummary.status, "passed");
  const context = JSON.parse(
    await readFile(activation.preparationManifest, "utf8")
  ).contexts[result.contextIndex];
  assert.equal(result.debateNumber, context.debateNumber);
  assert.equal(result.side, context.side);
  assert.equal(sha256(await readFile(context.output)), result.outputSha256);
}
assert.deepEqual(execution.authorization, {
  deterministicInventoryAnalysis: true,
  inventoryCompilation: false,
  independentJudgmentPacketPreparation: false,
  retry: false,
  timeoutExtension: false,
  semanticCorrection: false,
  scoreDerivation: false,
  policyPromotion: false,
  productionMutation: false,
});

assert.equal(
  analysis.schemaVersion,
  "1.0-production-checkpoint-v2.2-chronology-fallback-inventory-analysis"
);
assert.equal(
  analysis.status,
  "production-checkpoint-v2.2-chronology-fallback-inventory-gate-passed-independent-judgment-packet-preparation-authorized"
);
assert.equal(analysis.activationSha256, sha256(activationBytes));
assert.equal(analysis.executionSha256, sha256(executionBytes));
assert.equal(analysis.productionCanary, true);
assert.equal(analysis.developmentValidationOnly, false);
assert.equal(analysis.activePolicy.version, "v2.2");
assert.equal(analysis.debates.length, 10);
assert.deepEqual(
  analysis.debates.map((debate) => debate.debateNumber),
  ["50", "192", "129", "40", "25", "104", "22", "10", "167", "122"]
);
assert.deepEqual(analysis.totals, {
  debates: 10,
  sideContextsAttempted: 20,
  acceptedSideSelections: 20,
  inventoryProposalsCompiled: 10,
  lockedInventoriesCompiled: 10,
  sections: 51,
  moves: 188,
  proMoves: 97,
  conMoves: 91,
  nominatedCandidates: 188,
  deterministicallyDeferredCandidates: 0,
  belowHighAttributionMoves: 0,
  chronologyFallbacks: 8,
  retries: 0,
  timeoutExtensions: 0,
  semanticCorrections: 0,
  audioCalls: 0,
  transcriptionCalls: 0,
  scoresDerived: 0,
  meteredApiCostUsd: 0,
  transcriptionCostUsd: 0,
});
assert.equal(analysis.audit.everySelectorSingleAttempt, true);
assert.equal(analysis.audit.everySelectorSchemaAndSemanticValidationPassed, true);
assert.equal(analysis.audit.everyPlanAndSideHashReplayed, true);
assert.equal(analysis.audit.everyLockedInventoryValidated, true);
assert.equal(analysis.audit.everyLockedMoveUsesExactSourceEvidence, true);
assert.equal(analysis.audit.ratingsAbsent, true);
assert.equal(analysis.audit.responseTopologyAbsent, true);
assert.equal(analysis.audit.semanticRepairPerformed, false);
assert.equal(
  analysis.audit.chronologyFallbackAppliedOnlyToRetainedOrphanReply,
  true
);
assert.equal(analysis.audit.scoresDerived, false);
assert.deepEqual(analysis.audioPolicy.belowHighAttributionMoveIds, []);
assert.equal(analysis.audioPolicy.audioCalls, 0);
for (const [file, digest] of Object.entries(analysis.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: output drifted`);
}
for (const debate of analysis.debates) {
  assert.equal(debate.validated, true);
  assert.deepEqual(debate.belowHighAttributionMoveIds, []);
  const validation = JSON.parse(await readFile(debate.validation, "utf8"));
  assert.equal(validation.status, "passed");
  assert.equal(validation.productionCanary, true);
  assert.equal(validation.developmentValidationOnly, false);
  assert.equal(validation.finalEvidenceSourceExact, true);
  assert.equal(validation.ratingsAbsent, true);
  assert.equal(validation.responseTopologyAbsent, true);
  assert.equal(validation.semanticRepairPerformed, false);
  assert.equal(validation.scoresDerived, 0);
}
assert.deepEqual(analysis.authorization, {
  independentJudgmentPacketPreparation: true,
  independentJudgmentExecutionManifestPreparation: false,
  independentJudgmentModelExecution: false,
  paidTranscription: false,
  audioVerification: false,
  disputeExtraction: false,
  adjudicationModelExecution: false,
  scoreDerivation: false,
  policyPromotion: false,
  publicationPreparation: false,
  productionMutation: false,
  remainingProductionBatches: false,
});
assert.equal(
  analysis.nextAuthorizedAction,
  "prepare-and-freeze-twenty-production-checkpoint-v2.2-independent-judgment-packets-model-free-only"
);

console.log(
  JSON.stringify(
    {
      status: "passed-production-checkpoint-v2.2-side-selector-execution-and-inventory-analysis",
      debates: analysis.totals.debates,
      selectors: execution.validContexts,
      lockedInventories: analysis.totals.lockedInventoriesCompiled,
      moves: analysis.totals.moves,
      belowHighAttributionMoves: analysis.totals.belowHighAttributionMoves,
      retries: execution.retries,
      timeoutExtensions: execution.timeoutExtensions,
      scoresDerived: execution.scoresDerived,
      independentJudgmentModelExecutionAuthorized:
        analysis.authorization.independentJudgmentModelExecution,
      nextAuthorizedAction: analysis.nextAuthorizedAction,
    },
    null,
    2
  )
);
