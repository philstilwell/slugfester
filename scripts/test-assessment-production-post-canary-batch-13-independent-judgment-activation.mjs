#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import {
  POST_CANARY_BATCH_13_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch13StandingAuthorization,
} from "./lib/assessment-production-post-canary-batch-13-standing-authorization.mjs";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-13/independent-judgments";
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXPECTED_DEBATES = [
  "26",
  "190",
  "87",
  "20",
  "70",
  "30",
  "37",
  "117",
  "111",
  "34",
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const allBooleanLeavesTrue = (value) => {
  if (typeof value === "boolean") return value;
  if (!value || typeof value !== "object") return true;
  return Object.values(value).every(allBooleanLeavesTrue);
};
const forbiddenAggregateKeys = new Set([
  "score",
  "scores",
  "winner",
  "winningSide",
  "calculatedTotal",
  "overallScore",
]);
const findForbiddenKeys = (value, path = []) => {
  if (Array.isArray(value)) {
    return value.flatMap((child, index) =>
      findForbiddenKeys(child, [...path, String(index)])
    );
  }
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => [
    ...(forbiddenAggregateKeys.has(key) ? [[...path, key].join(".")] : []),
    ...findForbiddenKeys(child, [...path, key]),
  ]);
};

const activation = JSON.parse(await readFile(ACTIVATION, "utf8"));
const standingAuthorization =
  await loadAndValidatePostCanaryBatch13StandingAuthorization();
assert.equal(
  activation.schemaVersion,
  "1.0-assessment-production-post-canary-batch-13-independent-judgment-execution-activation"
);
assert.equal(
  activation.status,
  "frozen-twenty-post-canary-batch-13-independent-judgment-contexts-authorized"
);
assert.equal(activation.developmentValidationOnly, false);
assert.equal(activation.productionCanary, false);
assert.equal(activation.batchNumber, 13);
assert.equal(activation.stagingOnly, true);
assert.equal(
  activation.userAuthorization.standingAuthorization,
  POST_CANARY_BATCH_13_STANDING_AUTHORIZATION
);
assert.equal(
  activation.userAuthorization.standingAuthorizationSha256,
  standingAuthorization.sha256
);
assert.equal(
  activation.userAuthorization.directIncrementalCostUsdMaximum,
  0
);
assert.equal(
  activation.userAuthorization.independentJudgmentModelsAuthorized,
  true
);
for (const key of [
  "disagreementExtractionAuthorized",
  "audioModelsAuthorized",
  "adjudicationModelsAuthorized",
  "scoreDerivationAuthorized",
  "publicationModelsAuthorized",
  "productionMutationAuthorized",
]) {
  assert.equal(activation.userAuthorization[key], false, `${key}: must be false`);
}
assert.deepEqual(activation.model, {
  label: "5.6 Sol",
  slug: "gpt-5.6-sol",
  reasoningEffort: "low",
  authentication: "ChatGPT subscription",
  scoreBlind: true,
  roundedIntegerScoreTiesPermitted: true,
});
assert.equal(activation.activePolicy.version, "v2.2");
assert.equal(
  activation.activePolicy.agreedWinningSideMayCollapseToIntegerRoundedTie,
  true
);
assert.equal(
  activation.activePolicy.agreedInitialTieImposesNoDirectionConstraint,
  true
);
assert.equal(activation.activePolicy.scorePassesMaximum, 1);
assert.equal(
  activation.validatedInventoryContract.planAndSideIsolationPreserved,
  true
);
assert.equal(
  activation.validatedInventoryContract.scoreFieldsAvailable,
  false
);
assert.equal(
  activation.sourceCompatibility.status,
  "all-source-rows-have-positive-repository-lexical-token-count"
);
assert.equal(activation.sourceCompatibility.sourceRowsInjected, 0);
assert.equal(activation.sourceCompatibility.sourceRowsOmitted, 0);
assert.equal(activation.sourceCompatibility.sourceRowsRewritten, 0);
assert.equal(activation.sourceCompatibility.occurrences.length, 0);
assert.equal(activation.transport.maximumCopiedInputBytes <= 115000, true);
assert.equal(activation.transport.validationKeywordsRemoved, 0);
assert.equal(activation.transport.validationKeywordsRelaxed, 0);
assert.equal(activation.transport.targetEnumsChanged, 0);
assert.equal(activation.costBoundary.directIncrementalCostUsdMaximum, 0);
assert.equal(activation.costBoundary.meteredApiCostUsdMaximum, 0);
assert.equal(activation.costBoundary.transcriptionCostUsdMaximum, 0);
assert.deepEqual(
  activation.costBoundary.expectedParallelWallMinutes,
  [50, 80]
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
assert.equal(activation.isolation.oneDebateAndOnePassPerContext, true);
assert.equal(
  activation.isolation.onlyManualSourcePacketJudgmentPacketAndSchemaAvailable,
  true
);
assert.equal(activation.isolation.otherPassOutputUnavailable, true);
assert.equal(activation.isolation.otherDebateOutputsUnavailable, true);
assert.equal(activation.isolation.candidateSelectionUnavailable, true);
assert.equal(activation.isolation.failedProductionCanaryOutputsUnavailable, true);
assert.equal(activation.isolation.validationCohortOutputsUnavailable, true);
assert.equal(activation.acceptanceContract.validContextsRequired, 20);
assert.equal(activation.acceptanceContract.semanticRepairsMaximum, 0);
assert.equal(activation.acceptanceContract.modelAuthoredScoresMaximum, 0);
assert.equal(activation.acceptanceContract.scoresDerived, 0);
assert.deepEqual(
  activation.audioPolicy.pendingAttributionVerificationMoves,
  [
    {
      debateNumber: "70",
      moveId: "con-shared-liability-neutrality",
    },
    {
      debateNumber: "37",
      moveId: "con-impartial-source-standards",
    },
  ]
);
assert.equal(allBooleanLeavesTrue(activation.stopRules), true);
for (const key of [
  "modelContexts",
  "independentJudgmentModelExecution",
  "deterministicValidation",
  "deterministicCompilation",
  "deterministicAnalysis",
]) {
  assert.equal(activation.authorization[key], true, `${key}: must be true`);
}
for (const key of [
  "retry",
  "timeoutExtension",
  "semanticCorrection",
  "disagreementExtraction",
  "paidTranscription",
  "unexpectedPaidService",
  "audioVerification",
  "adjudicationExecution",
  "scoreDerivation",
  "policyPromotion",
  "publicationFinalization",
  "publicationModelExecution",
  "productionMutation",
  "nextBatchSelection",
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
    "execute-frozen-post-canary-batch-13-independent-judgment-gate-once"
  );
  console.log(
    JSON.stringify(
      {
        status: "passed-activation",
        debates: 10,
        contexts: 20,
        independentJudgmentModelContextsAuthorized: true,
        disagreementExtractionAuthorized: false,
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
assert.deepEqual(execution.sourceCompatibility, activation.sourceCompatibility);
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
      result.model === "5.6 Sol" &&
      result.modelSlug === "gpt-5.6-sol" &&
      result.reasoningEffort === "low" &&
      result.authentication === "ChatGPT subscription" &&
      result.apiKeysRemoved === true &&
      result.scoreBlind === true &&
      result.roundedIntegerScoreTiesPermitted === true &&
      result.meteredApiCostUsd === 0 &&
      result.transcriptionCostUsd === 0
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
    const judgmentBytes = await readFile(context.judgmentOutput);
    assert.equal(result.judgmentSha256, sha256(judgmentBytes));
    assert.deepEqual(
      findForbiddenKeys(JSON.parse(judgmentBytes)),
      [],
      `${result.debateNumber}/${result.reviewerPass}: aggregate score key found`
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
  execution.status ===
  "twenty-post-canary-batch-13-independent-judgment-contexts-passed"
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
    "post-canary-batch-13-independent-judgment-gate-complete-with-failure"
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
assert.equal(analysis.activePolicy.version, "v2.2");
assert.deepEqual(analysis.sourceCompatibility, activation.sourceCompatibility);
assert.equal(analysis.acceptance.modelAuthoredScores, 0);
assert.equal(analysis.acceptance.scores, 0);
assert.equal(analysis.totals.disagreementFieldsExtracted, 0);
assert.equal(analysis.totals.audioCalls, 0);
assert.equal(analysis.totals.adjudicationModelContexts, 0);
assert.equal(analysis.totals.scoresDerived, 0);
assert.equal(analysis.totals.publicationModelContexts, 0);
assert.equal(analysis.totals.productionMutations, 0);
assert.equal(
  analysis.audioPolicy.queueCompiledDeterministicallyWithoutAudioAccess,
  true
);
for (const [key, value] of Object.entries(analysis.authorization)) {
  assert.equal(value, false, `${key}: analysis authorization must remain false`);
}
if (analysis.acceptance.passed) {
  assert.equal(
    analysis.status,
    "twenty-post-canary-batch-13-independent-judgments-passed-standing-authorization-active-for-disagreement-extraction"
  );
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
  assert.equal(analysis.totals.uniqueMoves, 199);
  assert.equal(analysis.totals.movesJudgedAcrossPasses, 398);
  assert.equal(
    analysis.nextAuthorizedAction,
    "extract-freeze-and-analyze-batch-13-disagreements-under-standing-authorization"
  );
} else {
  assert.equal(
    analysis.status,
    "post-canary-batch-13-independent-judgment-gate-failed-analysis-only"
  );
}
console.log(
  JSON.stringify(
    {
      status: "passed-analysis",
      analysisStatus: analysis.status,
      contextsAttempted: execution.contextsAttempted,
      validContexts: execution.validContexts,
      audioVerificationQueueLength: analysis.audioPolicy.queue.length,
      disagreementFieldsExtracted: 0,
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
