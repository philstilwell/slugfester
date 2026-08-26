#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-12/dispute-only-adjudication";
const preparationPath = `${ROOT}/execution-preparation-manifest.json`;
const activationPath = `${ROOT}/execution-activation.json`;
const executionPath = `${ROOT}/model-execution.json`;
const analysisPath = `${ROOT}/analysis.json`;
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const preparationBytes = await readFile(preparationPath);
const preparation = JSON.parse(preparationBytes);

assert.equal(
  preparation.status,
  "frozen-ten-post-canary-batch-12-dispute-only-adjudication-contexts-prepared-not-authorized"
);
assert.equal(preparation.contexts.length, 10);
assert.equal(preparation.executionPolicy.attemptsPerContext, 1);
assert.equal(preparation.executionPolicy.retriesMaximum, 0);
assert.equal(preparation.executionPolicy.timeoutExtensionsMaximum, 0);
assert.deepEqual(preparation.executionPolicy.schedulerRamp, [1, 2]);
assert.equal(preparation.executionPolicy.maximumParallelContexts, 2);
assert.equal(preparation.model.label, "5.6 Sol");
assert.equal(preparation.model.slug, "gpt-5.6-sol");
assert.equal(preparation.model.reasoningEffort, "low");
assert.equal(preparation.model.authentication, "ChatGPT subscription");
assert.equal(preparation.model.scoreBlind, true);
assert.equal(preparation.model.roundedIntegerScoreTiesPermitted, true);
assert.equal(
  Object.values(preparation.authorization).every((value) => value === false),
  true
);

if (!(await exists(activationPath))) {
  for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
    assert.equal(await exists(future), false, `future output exists: ${future}`);
  }
  console.log(
    JSON.stringify(
      {
        status: "passed-frozen-not-authorized",
        contexts: 10,
        schedulerRamp: [1, 2],
        attemptsPerContext: 1,
        retriesMaximum: 0,
        modelExecutionAuthorized: false,
        scoresDerived: 0
      },
      null,
      2
    )
  );
  process.exit(0);
}

const activation = JSON.parse(await readFile(activationPath, "utf8"));
assert.equal(
  activation.status,
  "frozen-ten-post-canary-batch-12-dispute-only-adjudication-contexts-authorized"
);
assert.equal(
  activation.preparationManifest.sha256,
  sha256(preparationBytes)
);
assert.equal(activation.userExecutionAuthorization.contexts, 10);
assert.equal(activation.userExecutionAuthorization.model, "5.6 Sol");
assert.equal(activation.userExecutionAuthorization.reasoningEffort, "low");
assert.equal(
  activation.userExecutionAuthorization.authentication,
  "ChatGPT subscription"
);
assert.equal(
  activation.userExecutionAuthorization.directIncrementalCostUsdMaximum,
  0
);
assert.deepEqual(activation.userExecutionAuthorization.schedulerRamp, [1, 2]);
assert.equal(activation.userExecutionAuthorization.attemptsPerContext, 1);
assert.equal(activation.userExecutionAuthorization.retriesMaximum, 0);
assert.equal(activation.authorization.adjudicationModelContexts, true);
assert.equal(activation.authorization.deterministicValidation, true);
assert.equal(activation.authorization.deterministicAnalysis, true);
assert.equal(activation.authorization.judgmentModelContexts, false);
assert.equal(activation.authorization.paidServices, false);
assert.equal(activation.authorization.finalLedgerAssembly, false);
assert.equal(activation.authorization.scoreDerivation, false);
assert.equal(activation.authorization.publicationReconstruction, false);
assert.equal(activation.authorization.productionMutation, false);
assert.equal(activation.authorization.nextBatchSelection, false);
assert.equal(Object.keys(activation.executionToolHashes).length, 4);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `source hash mismatch: ${file}`);
}

if (!(await exists(executionPath))) {
  for (const future of activation.futureOutputPathsExcludedFromSourceHashes) {
    assert.equal(await exists(future), false, `future output exists: ${future}`);
  }
  console.log(
    JSON.stringify(
      {
        status: "passed-activated",
        contexts: 10,
        schedulerRamp: [1, 2],
        attemptsPerContext: 1,
        retriesMaximum: 0,
        modelExecutionAuthorized: true,
        judgmentModelExecutionAuthorized: false,
        scoresDerived: 0
      },
      null,
      2
    )
  );
  process.exit(0);
}

const execution = JSON.parse(await readFile(executionPath, "utf8"));
assert.equal(execution.contextsPlanned, 10);
assert.equal(execution.attempts, execution.contextsAttempted);
assert.equal(execution.retries, 0);
assert.equal(execution.timeoutExtensions, 0);
assert.equal(execution.corrections, 0);
assert.equal(execution.judgmentModelContexts, 0);
assert.equal(execution.paidServiceCalls, 0);
assert.equal(execution.directIncrementalCostUsd, 0);
assert.equal(execution.scoresDerived, 0);
assert(execution.contextsAttempted >= 1 && execution.contextsAttempted <= 10);
assert(
  execution.results.every(
    (result) =>
      result.attemptCount === 1 &&
      result.retryCount === 0 &&
      result.timeoutExtensionCount === 0 &&
      result.model === "5.6 Sol" &&
      result.modelSlug === "gpt-5.6-sol" &&
      result.reasoningEffort === "low" &&
      result.authentication === "ChatGPT subscription" &&
      result.scoreBlind === true &&
      result.apiKeysRemoved === true &&
      result.meteredApiCostUsd === 0 &&
      result.paidServiceCalls === 0
  )
);
if (!execution.rampPhases[0].passed) {
  assert.deepEqual(execution.rampPhases[1].attemptedContextIndexes, []);
  assert.deepEqual(execution.rampPhases[2].attemptedContextIndexes, []);
} else {
  assert.deepEqual(execution.rampPhases[1].attemptedContextIndexes, [1, 2]);
  if (!execution.rampPhases[1].passed) {
    assert.deepEqual(execution.rampPhases[2].attemptedContextIndexes, []);
  } else {
    assert.deepEqual(
      execution.rampPhases[2].attemptedContextIndexes,
      [3, 4, 5, 6, 7, 8, 9]
    );
  }
}
if (
  execution.status ===
  "ten-post-canary-batch-12-dispute-only-adjudication-contexts-passed"
) {
  assert.equal(execution.contextsAttempted, 10);
  assert.equal(execution.validContexts, 10);
  assert.equal(execution.invalidContexts, 0);
  assert.deepEqual(execution.unattemptedContextIndexes, []);
  assert(
    execution.results.every(
      (result) =>
        result.gateAcceptancePassed &&
        result.validationSummary?.calculatedScores === 0
    )
  );
} else {
  assert.equal(
    execution.status,
    "post-canary-batch-12-dispute-only-adjudication-gate-complete-with-failure"
  );
  assert(
    execution.invalidContexts > 0 ||
      execution.unattemptedContextIndexes.length > 0
  );
}

if (!(await exists(analysisPath))) {
  console.log(
    JSON.stringify(
      {
        status: "passed-executed",
        executionStatus: execution.status,
        contextsAttempted: execution.contextsAttempted,
        validContexts: execution.validContexts,
        retries: 0,
        scoresDerived: 0
      },
      null,
      2
    )
  );
  process.exit(0);
}

const analysis = JSON.parse(await readFile(analysisPath, "utf8"));
assert.equal(analysis.contexts.length, 10);
assert.equal(analysis.gate.attempts, execution.contextsAttempted);
assert.equal(analysis.gate.retries, 0);
assert.equal(analysis.gate.timeoutExtensions, 0);
assert.equal(analysis.gate.corrections, 0);
assert.equal(analysis.gate.scoresDerived, 0);
assert.equal(analysis.evidenceBoundary.audioTranscriptInputs, 3);
assert.equal(analysis.evidenceBoundary.judgmentModelContexts, 0);
assert.equal(analysis.totals.paidServiceCalls, 0);
assert.equal(analysis.totals.directIncrementalCostUsd, 0);
assert.equal(analysis.totals.scoresDerived, 0);
assert.equal(
  Object.values(analysis.authorization).every((value) => value === false),
  true
);
if (
  analysis.status ===
  "post-canary-batch-12-dispute-only-adjudication-gate-passed-standing-authorization-active-for-final-ledger-assembly"
) {
  assert.equal(analysis.gate.semanticPass, true);
  assert.equal(analysis.gate.timingPass, true);
  assert.equal(analysis.gate.scoreBlindPass, true);
  assert.equal(analysis.gate.isolationPass, true);
  assert.equal(analysis.gate.validContexts, 10);
  assert.equal(analysis.gate.disputedMovesDecided, 196);
  assert.equal(analysis.gate.candidateSelections, 528);
  assert.equal(
    analysis.nextAuthorizedAction,
    "standing-authorization-permits-batch-12-deterministic-final-ledger-assembly"
  );
} else {
  assert.equal(
    analysis.nextAuthorizedAction,
    "new-user-approval-required-after-batch-12-adjudication-failure-before-downstream-work"
  );
}
console.log(
  JSON.stringify(
    {
      status: "passed-analyzed",
      analysisStatus: analysis.status,
      validContexts: analysis.gate.validContexts,
      disputedMovesDecided: analysis.gate.disputedMovesDecided,
      candidateSelections: analysis.gate.candidateSelections,
      retries: 0,
      paidServiceCalls: 0,
      scoresDerived: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
