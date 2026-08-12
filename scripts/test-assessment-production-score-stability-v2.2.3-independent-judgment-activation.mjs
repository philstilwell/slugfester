#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const ROOT =
  "docs/assessment-production/score-stability-v2.2.3-validation-cohort/independent-judgments";
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXPECTED_DEBATES = [
  "17",
  "39",
  "121",
  "21",
  "75",
  "168",
  "177",
  "56",
  "49",
  "132",
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const activation = JSON.parse(await readFile(ACTIVATION, "utf8"));
assert.equal(
  activation.status,
  "frozen-twenty-v2.2.3-independent-judgment-contexts-authorized"
);
assert.equal(activation.developmentValidationOnly, true);
assert.equal(activation.productionCanary, false);
assert.equal(activation.stagingOnly, true);
assert.equal(
  activation.userAuthorization.instruction,
  "Ok, proceed at your discretion."
);
assert.equal(activation.userAuthorization.directIncrementalCostEstimateUsd, 0);
assert.equal(
  activation.userAuthorization.independentJudgmentModelsAuthorized,
  true
);
assert.equal(activation.userAuthorization.audioModelsAuthorized, false);
assert.equal(activation.userAuthorization.adjudicationModelsAuthorized, false);
assert.equal(activation.userAuthorization.publicationModelsAuthorized, false);
assert.deepEqual(activation.model, {
  label: "5.6 Sol",
  slug: "gpt-5.6-sol",
  reasoningEffort: "low",
  authentication: "ChatGPT subscription",
  scoreBlind: true,
});
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
  activation.failedGateDisposition.v221PlanningGatePreservedFailed,
  true
);
assert.equal(
  activation.failedGateDisposition.v22DiscoveryGatePreservedFailed,
  true
);
assert.equal(
  activation.failedGateDisposition.v213ScoreGatePreservedFailed,
  true
);
assert.equal(
  activation.inventorySuccessorContract.planAndSideIsolationPreserved,
  true
);
assert.equal(activation.inventorySuccessorContract.scoreFieldsAvailable, false);
assert.equal(activation.costBoundary.directIncrementalCostUsdMaximum, 0);
assert.equal(activation.costBoundary.meteredApiCostUsdMaximum, 0);
assert.equal(activation.costBoundary.transcriptionCostUsdMaximum, 0);
assert.deepEqual(
  activation.costBoundary.expectedParallelWallMinutes,
  [48, 75]
);
assert.equal(activation.contexts.length, 20);
assert.deepEqual(
  activation.contexts.map((context) => context.contextIndex),
  Array.from({ length: 20 }, (_, index) => index)
);
assert.deepEqual(
  [...new Set(activation.contexts.map((context) => context.debateNumber))],
  EXPECTED_DEBATES
);
assert.equal(activation.executionPolicy.contexts, 20);
assert.equal(activation.executionPolicy.attemptsPerContext, 1);
assert.equal(activation.executionPolicy.retriesMaximum, 0);
assert.equal(activation.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(activation.executionPolicy.timeoutMsPerContext, 900000);
assert.equal(activation.executionPolicy.absoluteGateTimeoutMs, 10800000);
assert.equal(activation.executionPolicy.maximumParallelContexts, 2);
assert.deepEqual(activation.executionPolicy.schedulerRamp, [1, 2]);
assert.deepEqual(
  activation.executionPolicy.rampPhases.map((phase) => phase.contextIndexes),
  [[0], [1, 2], Array.from({ length: 17 }, (_, index) => index + 3)]
);
assert.equal(activation.executionPolicy.APIKeysRemoved, true);
assert.equal(activation.executionPolicy.retriesMaximum, 0);
assert.equal(activation.isolation.oneDebateAndOnePassPerContext, true);
assert.equal(
  activation.isolation.onlyManualSourcePacketJudgmentPacketAndSchemaAvailable,
  true
);
assert.equal(activation.isolation.otherPassOutputUnavailable, true);
assert.equal(activation.isolation.otherDebateOutputsUnavailable, true);
assert.equal(activation.isolation.candidateSelectionUnavailable, true);
assert.equal(activation.acceptanceContract.validContextsRequired, 20);
assert.equal(activation.acceptanceContract.semanticRepairsMaximum, 0);
assert.equal(activation.acceptanceContract.modelAuthoredScoresMaximum, 0);
assert.equal(activation.acceptanceContract.scoresDerived, 0);
assert.deepEqual(
  activation.audioPolicy.pendingAttributionVerificationMoves,
  []
);
assert.equal(Object.values(activation.stopRules).every(Boolean), true);
assert.equal(activation.authorization.modelContexts, true);
assert.equal(activation.authorization.independentJudgmentModelExecution, true);
assert.equal(activation.authorization.deterministicValidation, true);
assert.equal(activation.authorization.deterministicCompilation, true);
assert.equal(activation.authorization.deterministicAnalysis, true);
for (const key of [
  "retry",
  "timeoutExtension",
  "semanticCorrection",
  "disagreementExtraction",
  "paidTranscription",
  "audioVerification",
  "adjudicationExecution",
  "scoreDerivation",
  "policyPromotion",
  "publicationFinalization",
  "productionMutation",
  "remainingProductionBatches",
]) {
  assert.equal(activation.authorization[key], false, `${key}: must be false`);
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
    "execute-frozen-v2.2.3-independent-judgment-gate-once"
  );
  console.log(
    JSON.stringify(
      {
        status: "passed-activation",
        debates: 10,
        contexts: 20,
        independentJudgmentModelContextsAuthorized: true,
        audioModelContextsAuthorized: false,
        retriesMaximum: 0,
        timeoutExtensionsMaximum: 0,
        expectedParallelWallMinutes:
          activation.costBoundary.expectedParallelWallMinutes,
        directIncrementalCostUsdMaximum: 0,
        scoresDerived: 0,
        nextRequiredAction: activation.nextRequiredAction,
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
assert.equal(execution.contextsPlanned, 20);
assert(execution.contextsAttempted >= 1 && execution.contextsAttempted <= 20);
assert.equal(execution.contextsUnattempted, 20 - execution.contextsAttempted);
assert.equal(execution.attempts, execution.contextsAttempted);
assert.equal(execution.retries, 0);
assert.equal(execution.timeoutExtensions, 0);
assert.equal(execution.semanticCorrections, 0);
assert.equal(execution.modelAuthoredScores, 0);
assert.equal(execution.scoresDerived, 0);
assert.equal(execution.results.length, execution.contextsAttempted);
assert.equal(
  new Set(execution.results.map((result) => result.contextIndex)).size,
  execution.results.length
);
assert(
  execution.results.every(
    (result) =>
      result.attemptCount === 1 &&
      result.retryCount === 0 &&
      result.timeoutExtensionCount === 0 &&
      result.semanticCorrectionCount === 0 &&
      result.authentication === "ChatGPT subscription" &&
      result.apiKeysRemoved === true &&
      result.scoreBlind === true &&
      result.meteredApiCostUsd === 0
  )
);
assert(execution.maximumParallelContextsObserved <= 2);
assert.deepEqual(execution.schedulerRamp, [1, 2]);
const [phaseOne, phaseTwo, phaseThree] = execution.rampPhases;
if (!phaseOne.passed) {
  assert.deepEqual(phaseTwo.attemptedContextIndexes, []);
  assert.deepEqual(phaseThree.attemptedContextIndexes, []);
} else if (!phaseTwo.passed) {
  assert.deepEqual(phaseThree.attemptedContextIndexes, []);
} else {
  assert.deepEqual(
    phaseThree.attemptedContextIndexes,
    Array.from({ length: 17 }, (_, index) => index + 3)
  );
}
for (const result of execution.results) {
  const context = activation.contexts[result.contextIndex];
  if (result.judgmentWritten) {
    assert.equal(
      result.judgmentSha256,
      sha256(await readFile(context.judgmentOutput))
    );
  }
  if (result.accepted) {
    assert.equal(
      result.rawOutputSha256,
      sha256(await readFile(context.rawOutput))
    );
    assert.equal(
      result.validationSha256,
      sha256(await readFile(context.validationOutput))
    );
    assert.equal(
      result.provenanceSha256,
      sha256(await readFile(context.provenanceOutput))
    );
  }
}

if (
  execution.status === "twenty-v2.2.3-independent-judgment-contexts-passed"
) {
  assert.equal(execution.contextsAttempted, 20);
  assert.equal(execution.contextsUnattempted, 0);
  assert.equal(execution.validContexts, 20);
  assert.equal(execution.invalidContexts, 0);
  assert(execution.rampPhases.every((phase) => phase.passed));
  for (const debateNumber of EXPECTED_DEBATES) {
    const pair = execution.results.filter(
      (result) => result.debateNumber === debateNumber
    );
    assert.equal(pair.length, 2);
    assert(pair.every((result) => result.accepted));
    assert.notEqual(pair[0].judgmentSha256, pair[1].judgmentSha256);
  }
} else {
  assert.equal(
    execution.status,
    "v2.2.3-independent-judgment-gate-complete-with-failure"
  );
  assert(
    execution.invalidContexts > 0 ||
      execution.unattemptedContextIndexes.length > 0
  );
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
assert.equal(analysis.contexts.length, execution.contextsAttempted);
assert.equal(analysis.pairs.length, 10);
assert.equal(analysis.proposedPolicy.promoted, false);
assert.equal(analysis.acceptance.modelAuthoredScores, 0);
assert.equal(analysis.acceptance.scores, 0);
assert.equal(analysis.authorization.independentJudgmentModelExecution, false);
assert.equal(analysis.authorization.audioVerificationPreparation, false);
assert.equal(analysis.authorization.adjudicationPreparation, false);
assert.equal(analysis.authorization.scoreDerivation, false);
assert.equal(analysis.authorization.policyPromotion, false);
assert.equal(analysis.authorization.publicationFinalization, false);
assert.equal(analysis.authorization.productionMutation, false);
if (analysis.acceptance.passed) {
  assert.equal(
    analysis.status,
    "twenty-v2.2.3-independent-judgments-passed-disagreement-extraction-authorized"
  );
  assert.equal(analysis.authorization.disagreementExtraction, true);
  assert.equal(analysis.acceptance.preparedSourceHashReplays, 20);
  assert.equal(analysis.acceptance.unchangedV4220ValidatorPasses, 20);
  assert.equal(analysis.acceptance.canonicalEventProjectionReplays, 20);
  assert.equal(analysis.acceptance.semanticRepairs, 0);
  assert(
    analysis.pairs.every(
      (pair) =>
        pair.bothAccepted &&
        pair.sameLockedInventory &&
        pair.separateOutputHashes
    )
  );
} else {
  assert.equal(
    analysis.status,
    "v2.2.3-independent-judgment-gate-failed-analysis-only"
  );
  assert.equal(analysis.authorization.disagreementExtraction, false);
}
console.log(
  JSON.stringify(
    {
      status: "passed-analysis",
      analysisStatus: analysis.status,
      contextsAttempted: execution.contextsAttempted,
      validContexts: execution.validContexts,
      audioVerificationQueueLength: analysis.audioPolicy.queue.length,
      retries: 0,
      timeoutExtensions: 0,
      scoresDerived: 0,
      productionMutation: false,
      nextAuthorizedAction: analysis.nextAuthorizedAction,
    },
    null,
    2
  )
);
