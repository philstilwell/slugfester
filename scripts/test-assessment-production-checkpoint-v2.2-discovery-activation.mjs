#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const ROOT =
  "docs/assessment-production/production-checkpoint-v2.2-1/discovery";
const ACTIVATION = `${ROOT}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const activation = JSON.parse(await readFile(ACTIVATION, "utf8"));
assert.equal(
  activation.status,
  "frozen-thirty-six-production-checkpoint-v2.2-discovery-contexts-authorized"
);
assert.equal(activation.developmentValidationOnly, false);
assert.equal(activation.productionCanary, true);
assert.equal(activation.stagingOnly, true);
assert.equal(
  activation.historicalDisposition.failedProductionCanaryV1PreservedFailed,
  true
);
assert.equal(
  activation.historicalDisposition.priorFailedValidationCohortsPreserved,
  true
);
assert.equal(
  activation.historicalDisposition.historicalFailuresUsedAsProductionModelInputs,
  false
);
assert.equal(activation.activePolicy.version, "v2.2");
assert.equal(activation.activePolicy.scorePassesMaximum, 1);
assert.equal(activation.activePolicy.modelAuthoredScoresAllowed, false);
assert.equal(activation.activePolicy.automaticRerunAllowed, false);
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
assert.equal(activation.userAuthorization.instruction, "Proceed at your discretion.");
assert.equal(activation.userAuthorization.directIncrementalCostEstimateUsd, 0);
assert.equal(activation.userAuthorization.discoveryModelsAuthorized, true);
assert.equal(activation.userAuthorization.judgmentModelsAuthorized, false);
assert.equal(activation.costBoundary.directIncrementalCostUsdMaximum, 0);
assert.equal(activation.costBoundary.meteredApiCostUsdMaximum, 0);
assert.equal(activation.costBoundary.transcriptionCostUsdMaximum, 0);
assert.deepEqual(activation.costBoundary.expectedParallelWallMinutes, [18, 35]);
assert.equal(activation.executionPolicy.contexts, 36);
assert.equal(activation.executionPolicy.attemptsPerContext, 1);
assert.equal(activation.executionPolicy.retriesMaximum, 0);
assert.equal(activation.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(activation.executionPolicy.timeoutMsPerContext, 300000);
assert.equal(activation.executionPolicy.copiedInputBytesMaximum, 82270);
assert.equal(activation.executionPolicy.maximumParallelContexts, 4);
assert.deepEqual(activation.executionPolicy.schedulerRamp, [1, 2, 4]);
assert.equal(
  activation.copiedInputBoundary.frozenObservedCopiedInputBytesMaximum,
  82270
);
assert.equal(
  activation.copiedInputBoundary.sourceOrPacketTruncationAllowed,
  false
);
assert.equal(activation.copiedInputBoundary.semanticRepartitionAllowed, false);
assert.equal(activation.isolation.oneChunkPerContext, true);
assert.equal(activation.isolation.exactCopiedFilesPerContext, 4);
assert.equal(
  activation.isolation.modelReceivesTokenCountedLedgerNotValidationLedger,
  true
);
assert.equal(activation.isolation.otherChunksUnavailable, true);
assert.equal(activation.isolation.otherOutputsUnavailable, true);
assert.equal(activation.isolation.ratingsScoresWinnersUnavailable, true);
assert.equal(activation.isolation.scorePolicyAnalysisUnavailable, true);
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
assert.equal(activation.authorization.deterministicValidation, true);
assert.equal(activation.authorization.deterministicCandidateCompilation, true);
assert.equal(activation.authorization.analysis, true);
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
        contexts: 36,
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
assert.equal(execution.contextsPlanned, 36);
assert(execution.contextsAttempted >= 1 && execution.contextsAttempted <= 36);
assert.equal(execution.contextsUnattempted, 36 - execution.contextsAttempted);
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
assert.equal(execution.activePolicyVersion, "v2.2");
assert.equal(execution.failedCanaryV1Reclassified, false);
assert.equal(execution.priorValidationCohortsReclassified, false);
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
  "thirty-six-production-checkpoint-v2.2-discovery-contexts-passed"
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

assert.equal(execution.contextsAttempted, 36);
assert.equal(execution.contextsUnattempted, 0);
assert.equal(execution.validContexts, 36);
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
        validContexts: 36,
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
  "production-checkpoint-v2.2-discovery-passed-chronology-fallback-inventory-preparation-authorized"
);
assert.equal(analysis.debates.length, 10);
assert.equal(analysis.audit.validContexts, 36);
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
assert.equal(analysis.audit.failedCanaryV1Reclassified, false);
assert.equal(analysis.audit.priorValidationCohortsReclassified, false);
assert.equal(analysis.audit.activePolicyVersion, "v2.2");
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
assert.equal(analysis.totals.modelContextsExecuted, 36);
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
  "prepare-production-checkpoint-v2.2-chronology-fallback-inventory-packets-model-free-only"
);

console.log(
  JSON.stringify(
    {
      status: "passed-analysis",
      debates: 10,
      candidates: analysis.totals.candidates,
      validContexts: 36,
      retries: 0,
      timeoutExtensions: 0,
      scoresDerived: 0,
      nextAuthorizedAction: analysis.nextAuthorizedAction,
    },
    null,
    2
  )
);
