#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const ROOT =
  "docs/assessment-production/score-stability-v2.2-validation-cohort/discovery";
const ACTIVATION = `${ROOT}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const activation = JSON.parse(await readFile(ACTIVATION, "utf8"));
assert.equal(
  activation.status,
  "frozen-thirty-eight-v2.2-validation-discovery-contexts-authorized"
);
assert.equal(activation.developmentValidationOnly, true);
assert.equal(activation.productionCanary, false);
assert.equal(activation.stagingOnly, true);
assert.equal(
  activation.failedGateDisposition.v213ScoreGatePreservedFailed,
  true
);
assert.equal(
  activation.failedGateDisposition.v213FailureUsedForSuccessorAcceptance,
  false
);
assert.equal(
  activation.failedGateDisposition.v213FailureUsedAsFreshSuccessorModelInput,
  false
);
assert.equal(
  activation.proposedPolicy.agreedWinningSideMayCollapseToIntegerRoundedTie,
  true
);
assert.equal(
  activation.proposedPolicy.agreedInitialTieImposesNoDirectionConstraint,
  true
);
assert.equal(activation.proposedPolicy.numericalThresholdsChanged, false);
assert.equal(activation.proposedPolicy.promoted, false);
assert.equal(
  activation.inventorySuccessorContract.planAndSideIsolationPreserved,
  true
);
assert.equal(
  activation.inventorySuccessorContract.fallbackConditionRepositoryOwned,
  true
);
assert.equal(activation.inventorySuccessorContract.scoreFieldsAvailable, false);
assert.deepEqual(activation.discoverySuccessorContract.sourceSelectionShape, [
  "startEvent",
  "endEvent",
]);
assert.equal(
  activation.discoverySuccessorContract.repositoryDerivedLexicalTokenCount,
  true
);
assert.equal(
  activation.discoverySuccessorContract.requestedLexicalTokensRemoved,
  true
);
assert.deepEqual(activation.model, {
  label: "5.6 Sol",
  slug: "gpt-5.6-sol",
  reasoningEffort: "low",
  authentication: "ChatGPT subscription",
  scoreBlind: true,
});
assert.equal(activation.userAuthorization.directIncrementalCostEstimateUsd, 0);
assert.equal(activation.userAuthorization.discoveryModelsAuthorized, true);
assert.equal(activation.userAuthorization.judgmentModelsAuthorized, false);
assert.equal(activation.costBoundary.directIncrementalCostUsdMaximum, 0);
assert.equal(activation.costBoundary.meteredApiCostUsdMaximum, 0);
assert.equal(activation.costBoundary.transcriptionCostUsdMaximum, 0);
assert.equal(activation.executionPolicy.contexts, 38);
assert.equal(activation.executionPolicy.attemptsPerContext, 1);
assert.equal(activation.executionPolicy.retriesMaximum, 0);
assert.equal(activation.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(activation.executionPolicy.timeoutMsPerContext, 300000);
assert.equal(activation.executionPolicy.maximumParallelContexts, 4);
assert.deepEqual(activation.executionPolicy.schedulerRamp, [1, 2, 4]);
assert.equal(activation.isolation.oneChunkPerContext, true);
assert.equal(
  activation.isolation.modelReceivesTokenCountedLedgerNotValidationLedger,
  true
);
assert.equal(activation.schemaHardening.modelAuthoredEndEventRequired, true);
assert.equal(
  activation.schemaHardening.modelAuthoredEndEventLockedContextBounds,
  true
);
assert.equal(
  activation.schemaHardening.repositoryDerivedLexicalTokenCount,
  true
);
assert.equal(activation.schemaHardening.minimumLexicalTokens, 12);
assert.equal(
  activation.schemaHardening.deterministicValidatorRetained,
  true
);
assert.equal(activation.schemaHardening.requestedLexicalTokensProhibited, true);
assert.equal(activation.schemaHardening.tokenCountedLedgerRequired, true);
assert.equal(activation.authorization.modelContexts, true);
for (const key of [
  "retry",
  "timeoutExtension",
  "semanticCorrection",
  "inventoryPreparation",
  "inventoryModelExecution",
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
  assert.equal(activation.authorization[key], false, `${key}: must be false`);
}
assert.equal(Object.values(activation.stopRules).every(Boolean), true);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source drift`);
}

if (!(await exists(activation.artifacts.execution))) {
  for (const future of activation.futureOutputPathsExcludedFromSourceHashes) {
    assert.equal(await exists(future), false, `${future}: future output exists`);
  }
  console.log(
    JSON.stringify(
      {
        status: "passed-activation",
        contexts: 38,
        modelContextsAuthorized: true,
        judgmentModelContextsAuthorized: false,
        retriesMaximum: 0,
        timeoutExtensionsMaximum: 0,
        directIncrementalCostUsdMaximum: 0,
        scoresDerived: 0,
      },
      null,
      2
    )
  );
  process.exit(0);
}

const execution = JSON.parse(
  await readFile(activation.artifacts.execution, "utf8")
);
const preparation = JSON.parse(
  await readFile(activation.preparationManifest, "utf8")
);
assert.equal(execution.contextsPlanned, 38);
assert(execution.contextsAttempted >= 1 && execution.contextsAttempted <= 38);
assert.equal(execution.contextsUnattempted, 38 - execution.contextsAttempted);
assert.equal(execution.attempts, execution.contextsAttempted);
assert.equal(execution.retries, 0);
assert.equal(execution.timeoutExtensions, 0);
assert.equal(execution.semanticCorrections, 0);
assert(execution.maximumParallelContextsObserved <= 4);
assert.deepEqual(execution.schedulerRamp, [1, 2, 4]);
assert(execution.rampPhases.length >= 1 && execution.rampPhases.length <= 3);
assert.equal(execution.rampPhases[0].phase, "operational-canary-one");
assert.deepEqual(execution.rampPhases[0].contextIndexes, [0]);
assert.equal(execution.repositoryDerivedLexicalTokenCounts, true);
assert.equal(execution.modelAuthoredLexicalTokenCounts, false);
assert.equal(execution.modelAuthoredBoundedEndEvents, true);
assert.equal(
  execution.startDependentLockedLookaheadCapacityStructurallyBounded,
  true
);
for (const result of execution.results) {
  assert.equal(result.attemptCount, 1);
  assert.equal(result.retryCount, 0);
  assert.equal(result.authentication, "ChatGPT subscription");
  assert.equal(result.apiKeysRemoved, true);
  assert.equal(result.scoreBlind, true);
  assert.equal(result.meteredApiCostUsd, 0);
  if (result.rawOutputWritten) {
    const context = preparation.contexts[result.contextIndex];
    assert.equal(result.rawOutputSha256, sha256(await readFile(context.rawOutput)));
  }
}

if (
  execution.status !==
  "thirty-eight-v2.2-validation-discovery-contexts-passed"
) {
  assert(execution.invalidContexts >= 1);
  assert.equal(await exists(activation.artifacts.analysis), false);
  console.log(
    JSON.stringify(
      {
        status: "passed-recorded-failure",
        contextsAttempted: execution.contextsAttempted,
        contextsUnattempted: execution.contextsUnattempted,
        validContexts: execution.validContexts,
        invalidContexts: execution.invalidContexts,
        retries: 0,
        timeoutExtensions: 0,
        scoresDerived: 0,
      },
      null,
      2
    )
  );
  process.exit(0);
}

assert.equal(execution.contextsAttempted, 38);
assert.equal(execution.contextsUnattempted, 0);
assert.equal(execution.validContexts, 38);
assert.equal(execution.invalidContexts, 0);
assert.equal(execution.rampPassed, true);
assert.equal(execution.rampPhases.length, 3);
assert(execution.rampPhases.every((phase) => phase.passed));
assert.equal(execution.maximumParallelContextsObserved, 4);
if (!(await exists(activation.artifacts.analysis))) {
  console.log(
    JSON.stringify(
      {
        status: "passed-execution",
        validContexts: 38,
        wallElapsedMinutes: Number((execution.wallElapsedMs / 60000).toFixed(2)),
        aggregateModelMinutes: Number(
          (execution.modelWorkElapsedMs / 60000).toFixed(2)
        ),
        retries: 0,
        timeoutExtensions: 0,
        scoresDerived: 0,
      },
      null,
      2
    )
  );
  process.exit(0);
}

const analysis = JSON.parse(
  await readFile(activation.artifacts.analysis, "utf8")
);
assert.equal(
  analysis.status,
  "v2.2-validation-discovery-passed-chronology-fallback-inventory-preparation-authorized"
);
assert.equal(analysis.debates.length, 10);
assert.equal(analysis.audit.validContexts, 38);
assert.equal(analysis.audit.invalidContexts, 0);
assert.equal(analysis.audit.retries, 0);
assert.equal(analysis.audit.timeoutExtensions, 0);
assert.equal(analysis.audit.semanticCorrections, 0);
assert.equal(analysis.audit.rampPassed, true);
assert.equal(analysis.audit.repositoryDerivedLexicalTokenCount, true);
assert.equal(analysis.audit.minimumLexicalTokens, 12);
assert.equal(analysis.audit.requestedLexicalTokensProhibited, true);
assert.equal(analysis.audit.allDiscoveredCandidatesTransported, true);
assert.equal(analysis.audit.silentSemanticDeduplication, false);
assert.equal(analysis.audit.automaticSemanticCorrection, false);
assert.equal(analysis.audit.predecessorV212InventoryGateReclassified, false);
assert.equal(analysis.audit.predecessorV213ScoreGateReclassified, false);
assert.equal(analysis.audit.proposedPolicyPromoted, false);
assert.equal(analysis.audit.scoresDerived, 0);
for (const debate of analysis.debates) {
  assert(debate.candidates >= 8);
  assert(debate.pro >= 4);
  assert(debate.con >= 4);
  assert.equal(debate.candidateSpansIncluded, true);
  assert.equal(debate.allDiscoveredCandidatesTransported, true);
  assert.equal(debate.semanticDeduplicationPerformed, false);
  assert.equal(debate.semanticCorrectionPerformed, false);
  assert.equal(sha256(await readFile(debate.bundlePath)), debate.bundleSha256);
  assert.equal(sha256(await readFile(debate.sparsePath)), debate.sparseSha256);
}
assert.equal(analysis.totals.modelContextsExecuted, 38);
assert.equal(analysis.totals.retries, 0);
assert.equal(analysis.totals.timeoutExtensions, 0);
assert.equal(analysis.totals.semanticCorrections, 0);
assert.equal(analysis.totals.meteredApiCostUsd, 0);
assert.equal(analysis.totals.transcriptionCostUsd, 0);
assert.equal(analysis.totals.scoresDerived, 0);
assert.equal(
  analysis.authorization.chronologyFallbackInventoryPreparation,
  true
);
assert.equal(
  analysis.nextAuthorizedAction,
  "prepare-v2.2-chronology-fallback-inventory-packets-model-free-only"
);

console.log(
  JSON.stringify(
    {
      status: "passed-analysis",
      debates: 10,
      candidates: analysis.totals.candidates,
      validContexts: 38,
      retries: 0,
      timeoutExtensions: 0,
      scoresDerived: 0,
      nextAuthorizedAction: analysis.nextAuthorizedAction,
    },
    null,
    2
  )
);
