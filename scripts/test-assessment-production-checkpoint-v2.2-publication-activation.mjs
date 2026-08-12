#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

import {
  CHECKPOINT_V22_PUBLICATION_DEBATES,
  CHECKPOINT_V22_PUBLICATION_ROOT
} from "./lib/assessment-production-checkpoint-v2.2-publication.mjs";

const ROOT = CHECKPOINT_V22_PUBLICATION_ROOT;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const activation = JSON.parse(await readFile(ACTIVATION, "utf8"));
assert.equal(
  activation.schemaVersion,
  "1.0-production-checkpoint-v2.2-publication-execution-activation"
);
assert.equal(
  activation.status,
  "frozen-ten-production-checkpoint-v2.2-publication-contexts-authorized"
);
assert.equal(activation.developmentValidationOnly, false);
assert.equal(activation.productionCanary, true);
assert.equal(activation.stagingOnly, true);
assert.equal(activation.AIOnly, true);
assert.equal(activation.userAuthorization.instruction, "Continue at your discretion.");
assert.equal(activation.userAuthorization.directIncrementalCostEstimateUsd, 0);
assert.equal(activation.userAuthorization.publicationModelsAuthorized, true);
assert.equal(activation.userAuthorization.scoreModelsAuthorized, false);
assert.equal(activation.userAuthorization.audioModelsAuthorized, false);
assert.equal(activation.userAuthorization.adjudicationModelsAuthorized, false);
assert.equal(activation.userAuthorization.productionMutationAuthorized, false);
assert.deepEqual(activation.model, {
  label: "5.6 Sol",
  slug: "gpt-5.6-sol",
  reasoningEffort: "low",
  authentication: "ChatGPT subscription"
});
assert.equal(activation.costBoundary.directIncrementalCostUsdMaximum, 0);
assert.equal(activation.costBoundary.meteredApiCostUsdMaximum, 0);
assert.equal(activation.costBoundary.transcriptionCostUsdMaximum, 0);
assert.deepEqual(activation.costBoundary.expectedParallelWallMinutes, [24, 45]);
assert.equal(activation.executionEnvironment.authentication, "ChatGPT subscription");
assert.equal(activation.executionEnvironment.APIKeysRemoved, true);
assert.equal(activation.contexts.length, 10);
assert.deepEqual(
  activation.contexts.map((context) => context.contextIndex),
  Array.from({ length: 10 }, (_, index) => index)
);
assert.deepEqual(
  activation.contexts.map((context) => context.debateNumber),
  [...CHECKPOINT_V22_PUBLICATION_DEBATES]
);
assert.equal(activation.isolation.oneDebatePerContext, true);
assert.equal(activation.isolation.participantJudgmentWasScoreBlind, true);
assert.equal(
  activation.isolation.ownDebateScoresAvailableOnlyAsImmutablePacketFields,
  true
);
assert.equal(activation.isolation.legacyAssessmentsUnavailable, true);
assert.equal(activation.isolation.otherDebateOutputsUnavailable, true);
assert.equal(activation.isolation.rankingsAndWinnerComparisonsUnavailable, true);
assert.equal(activation.executionPolicy.contexts, 10);
assert.equal(activation.executionPolicy.attemptsPerContext, 1);
assert.equal(activation.executionPolicy.retriesMaximum, 0);
assert.equal(activation.executionPolicy.correctionContextsMaximum, 0);
assert.equal(activation.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(activation.executionPolicy.maximumParallelContexts, 2);
assert.deepEqual(activation.executionPolicy.schedulerRamp, [1, 2]);
assert.deepEqual(
  activation.executionPolicy.rampPhases.map((phase) => phase.contextIndexes),
  [[0], [1, 2], Array.from({ length: 7 }, (_, index) => index + 3)]
);
assert.equal(activation.executionPolicy.authentication, "ChatGPT subscription");
assert.equal(activation.executionPolicy.APIKeysRemoved, true);
assert.equal(activation.acceptanceContract.validContextsRequired, 10);
assert.equal(activation.acceptanceContract.movesAuthoredRequired, 188);
assert.equal(activation.acceptanceContract.critiquesRequired, 188);
assert.equal(activation.acceptanceContract.exactSourceQuotesRequired, 20);
assert.equal(activation.acceptanceContract.semanticRepairsMaximum, 0);
assert.equal(activation.acceptanceContract.retriesMaximum, 0);
assert.equal(activation.acceptanceContract.correctionContextsMaximum, 0);
assert.equal(activation.acceptanceContract.modelAuthoredScoresMaximum, 0);
assert.equal(activation.acceptanceContract.scorePassesExecutedThisStage, 0);
assert.equal(Object.values(activation.stopRules).every(Boolean), true);

for (const key of [
  "modelContexts",
  "publicationModelExecution",
  "deterministicValidation",
  "deterministicAnalysis"
]) {
  assert.equal(activation.authorization[key], true, `${key}: must be authorized`);
}
for (const key of [
  "retry",
  "timeoutExtension",
  "correctionModelExecution",
  "deterministicCompilation",
  "publicationFinalization",
  "renderingVerification",
  "productionMutation",
  "remainingProductionBatches"
]) {
  assert.equal(activation.authorization[key], false, `${key}: must remain unauthorized`);
}
assert.equal(
  sha256(await readFile(activation.preparationManifest)),
  activation.preparationManifestSha256
);
assert.equal(
  sha256(await readFile(activation.packetPreparation)),
  activation.packetPreparationSha256
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source drift`);
}

if (!(await exists(activation.artifacts.execution))) {
  for (const future of activation.futureOutputPathsExcludedFromSourceHashes) {
    assert.equal(await exists(future), false, `${future}: future output exists`);
  }
  assert.equal(
    activation.nextRequiredAction,
    "execute-frozen-production-checkpoint-v2.2-publication-gate-once"
  );
  console.log(
    JSON.stringify(
      {
        status: "passed-activation",
        debates: 10,
        contexts: 10,
        publicationModelContextsAuthorized: true,
        scoreModelContextsAuthorized: false,
        retriesMaximum: 0,
        correctionContextsMaximum: 0,
        expectedParallelWallMinutes:
          activation.costBoundary.expectedParallelWallMinutes,
        directIncrementalCostUsdMaximum: 0,
        productionMutationAuthorized: false,
        nextRequiredAction: activation.nextRequiredAction
      },
      null,
      2
    )
  );
  process.exit(0);
}

const execution = JSON.parse(await readFile(activation.artifacts.execution, "utf8"));
assert.equal(
  execution.schemaVersion,
  "1.0-production-checkpoint-v2.2-publication-model-execution"
);
assert.equal(execution.contextsPlanned, 10);
assert(execution.contextsAttempted >= 1 && execution.contextsAttempted <= 10);
assert.equal(execution.contextsUnattempted, 10 - execution.contextsAttempted);
assert.equal(execution.attempts, execution.contextsAttempted);
assert.equal(execution.retries, 0);
assert.equal(execution.correctionContexts, 0);
assert.equal(execution.timeoutExtensions, 0);
assert.equal(execution.modelAuthoredScores, 0);
assert.equal(execution.scorePassesExecutedThisStage, 0);
assert.equal(execution.participantJudgmentWasScoreBlind, true);
assert.equal(execution.ownDebateScoresImmutable, true);
assert(execution.maximumObservedConcurrency <= 2);
assert.deepEqual(execution.schedulerRamp, [1, 2]);
assert.equal(execution.results.length, execution.contextsAttempted);
assert(
  execution.results.every(
    (result) =>
      result.attemptCount === 1 &&
      result.retryCount === 0 &&
      result.correctionContextCount === 0 &&
      result.timeoutExtensionCount === 0 &&
      result.authentication === "ChatGPT subscription" &&
      result.apiKeysRemoved === true &&
      result.participantJudgmentWasScoreBlind === true &&
      result.ownDebateScoresImmutable === true &&
      result.meteredApiCostUsd === 0 &&
      result.modelAuthoredScores === 0 &&
      result.scorePassesExecutedThisStage === 0
  )
);
const [phaseOne, phaseTwo, phaseThree] = execution.rampPhases;
if (!phaseOne.passed) {
  assert.deepEqual(phaseTwo.attemptedContextIndexes, []);
  assert.deepEqual(phaseThree.attemptedContextIndexes, []);
} else if (!phaseTwo.passed) {
  assert.deepEqual(phaseThree.attemptedContextIndexes, []);
} else {
  assert.deepEqual(
    phaseThree.attemptedContextIndexes,
    Array.from({ length: 7 }, (_, index) => index + 3)
  );
}
for (const result of execution.results) {
  const context = activation.contexts[result.contextIndex];
  if (result.outputWritten) {
    assert.equal(result.outputSha256, sha256(await readFile(context.rawOutput)));
  }
  if (result.validationWritten) {
    assert.equal(result.validationSha256, sha256(await readFile(context.validation)));
  }
  if (result.provenanceWritten) {
    assert.equal(result.provenanceSha256, sha256(await readFile(context.provenance)));
  }
}
if (execution.status === "ten-production-checkpoint-v2.2-publication-contexts-passed") {
  assert.equal(execution.contextsAttempted, 10);
  assert.equal(execution.contextsUnattempted, 0);
  assert.equal(execution.validContexts, 10);
  assert.equal(execution.invalidContexts, 0);
  assert(execution.rampPhases.every((phase) => phase.passed));
} else {
  assert.equal(
    execution.status,
    "production-checkpoint-v2.2-publication-gate-complete-with-failure"
  );
  assert(execution.invalidContexts > 0 || execution.unattemptedContextIndexes.length > 0);
}

if (!(await exists(activation.artifacts.analysis))) {
  console.log(
    JSON.stringify(
      {
        status: "passed-execution-record",
        executionStatus: execution.status,
        contextsAttempted: execution.contextsAttempted,
        validContexts: execution.validContexts,
        retries: 0,
        correctionContexts: 0,
        modelAuthoredScores: 0,
        productionMutationAuthorized: false
      },
      null,
      2
    )
  );
  process.exit(0);
}

const analysis = JSON.parse(await readFile(activation.artifacts.analysis, "utf8"));
assert.equal(
  analysis.schemaVersion,
  "1.0-production-checkpoint-v2.2-publication-analysis"
);
assert.equal(analysis.contexts.length, 10);
assert.equal(analysis.totals.modelContexts, execution.contextsAttempted);
assert.equal(analysis.totals.retries, 0);
assert.equal(analysis.totals.correctionContexts, 0);
assert.equal(analysis.totals.modelAuthoredScores, 0);
assert.equal(analysis.totals.scorePassesExecutedThisStage, 0);
assert.equal(analysis.authorization.publicationFinalization, false);
assert.equal(analysis.authorization.renderingVerification, false);
assert.equal(analysis.authorization.productionMutation, false);
assert.equal(analysis.authorization.remainingProductionBatches, false);
if (analysis.status === "production-checkpoint-v2.2-publication-model-gate-passed") {
  assert.equal(analysis.gate.semanticPass, true);
  assert.equal(analysis.gate.timingPass, true);
  assert.equal(analysis.gate.validContexts, 10);
  assert.equal(analysis.gate.movesAuthored, 188);
  assert.equal(analysis.gate.critiques, 188);
  assert.equal(analysis.gate.exactSourceQuotes, 20);
  assert.equal(analysis.gate.minimumCritiqueCharacters >= 880, true);
  assert.equal(analysis.authorization.deterministicCompilation, true);
} else {
  assert.equal(analysis.authorization.deterministicCompilation, false);
}
console.log(
  JSON.stringify(
    {
      status: "passed-analyzed",
      analysisStatus: analysis.status,
      validContexts: analysis.gate.validContexts,
      movesAuthored: analysis.gate.movesAuthored,
      exactSourceQuotes: analysis.gate.exactSourceQuotes,
      retries: 0,
      correctionContexts: 0,
      modelAuthoredScores: 0,
      productionMutationAuthorized: false,
      nextAuthorizedAction: analysis.nextAuthorizedAction
    },
    null,
    2
  )
);
