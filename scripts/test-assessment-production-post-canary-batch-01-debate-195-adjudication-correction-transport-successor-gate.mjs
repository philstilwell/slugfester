#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

import { canonicalJson } from "./lib/v4-lean-production.mjs";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-01/dispute-only-adjudication/correction-2";
const preparationPath = `${ROOT}/execution-preparation-manifest.json`;
const activationPath = `${ROOT}/execution-activation.json`;
const outputPath = `${ROOT}/correction-output.json`;
const executionPath = `${ROOT}/model-execution.json`;
const validationPath = `${ROOT}/correction-validation.json`;
const analysisPath = `${ROOT}/analysis.json`;
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const preparationBytes = await readFile(preparationPath);
const preparation = JSON.parse(preparationBytes);
assert.equal(
  preparation.status,
  "frozen-one-score-blind-debate-195-burden-adjustment-transport-successor-context-prepared-not-authorized"
);
assert.equal(preparation.correctionNumber, 2);
assert.equal(preparation.contexts.length, 1);
assert.equal(preparation.contexts[0].debateNumber, "195");
assert.equal(preparation.contexts[0].burdenAdjustmentDisputes, 2);
assert.equal(preparation.contexts[0].candidateSelections, 2);
assert.equal(preparation.contexts[0].moveDecisions, 0);
assert.equal(preparation.preservedInputs.packetReusedByteForByte, true);
assert.equal(preparation.transportSuccessor.arrayItemsValueType, "object");
assert.equal(preparation.transportSuccessor.APITransportAcceptanceProven, false);
assert.equal(preparation.model.label, "5.6 Sol");
assert.equal(preparation.model.slug, "gpt-5.6-sol");
assert.equal(preparation.model.reasoningEffort, "low");
assert.equal(preparation.model.authentication, "ChatGPT subscription");
assert.equal(preparation.model.scoreBlind, true);
assert.equal(preparation.model.roundedIntegerScoreTiesPermitted, true);
assert.equal(preparation.executionPolicy.contexts, 1);
assert.equal(preparation.executionPolicy.attemptsPerContext, 1);
assert.equal(preparation.executionPolicy.retriesMaximum, 0);
assert.equal(preparation.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(preparation.executionPolicy.recursiveCorrectionContextsMaximum, 0);
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
        debateNumber: "195",
        correctionNumber: 2,
        contexts: 1,
        packetReusedByteForByte: true,
        attemptsPerContext: 1,
        retriesMaximum: 0,
        correctionModelExecutionAuthorized: false,
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
  "frozen-one-score-blind-debate-195-burden-adjustment-transport-successor-context-authorized"
);
assert.equal(activation.preparationManifest.sha256, sha256(preparationBytes));
assert.equal(activation.userExecutionAuthorization.instruction, "I approve.");
assert.equal(activation.userExecutionAuthorization.contexts, 1);
assert.equal(activation.userExecutionAuthorization.debateNumber, "195");
assert.equal(activation.userExecutionAuthorization.correctionNumber, 2);
assert.equal(activation.userExecutionAuthorization.burdenAdjustmentDecisions, 2);
assert.equal(activation.userExecutionAuthorization.preservedMoveDecisions, 18);
assert.equal(activation.userExecutionAuthorization.model, "5.6 Sol");
assert.equal(activation.userExecutionAuthorization.modelSlug, "gpt-5.6-sol");
assert.equal(activation.userExecutionAuthorization.reasoningEffort, "low");
assert.equal(
  activation.userExecutionAuthorization.authentication,
  "ChatGPT subscription"
);
assert.equal(
  activation.userExecutionAuthorization.directIncrementalCostUsdMaximum,
  0
);
assert.equal(activation.userExecutionAuthorization.scheduler, "single-context");
assert.equal(activation.userExecutionAuthorization.attemptsPerContext, 1);
assert.equal(activation.userExecutionAuthorization.retriesMaximum, 0);
assert.equal(activation.userExecutionAuthorization.timeoutExtensionsMaximum, 0);
assert.equal(
  activation.userExecutionAuthorization.recursiveCorrectionContextsMaximum,
  0
);
assert.equal(activation.authorization.correctionModelContext, true);
assert.equal(activation.authorization.deterministicCorrectionValidation, true);
assert.equal(activation.authorization.adjudicationModelContext, false);
assert.equal(activation.authorization.judgmentModelContexts, false);
assert.equal(activation.authorization.deterministicMerge, false);
assert.equal(activation.authorization.paidServices, false);
assert.equal(activation.authorization.finalLedgerAssembly, false);
assert.equal(activation.authorization.scoreDerivation, false);
assert.equal(activation.authorization.publicationReconstruction, false);
assert.equal(activation.authorization.productionMutation, false);
assert.equal(activation.authorization.nextBatchSelection, false);
assert.equal(Object.keys(activation.executionToolHashes).length, 2);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assert.equal(
    sha256(await readFile(file)),
    digest,
    `source hash mismatch: ${file}`
  );
}

if (!(await exists(executionPath))) {
  for (const future of activation.futureOutputPathsExcludedFromSourceHashes) {
    assert.equal(await exists(future), false, `future output exists: ${future}`);
  }
  console.log(
    JSON.stringify(
      {
        status: "passed-activated",
        debateNumber: "195",
        correctionNumber: 2,
        contexts: 1,
        burdenAdjustmentDecisions: 2,
        preservedMoveDecisions: 18,
        attemptsPerContext: 1,
        retriesMaximum: 0,
        correctionModelExecutionAuthorized: true,
        deterministicMergeAuthorized: false,
        scoresDerived: 0
      },
      null,
      2
    )
  );
  process.exit(0);
}

const [execution, validation] = await Promise.all(
  [executionPath, validationPath].map((file) =>
    readFile(file, "utf8").then(JSON.parse)
  )
);
assert.equal(execution.correctionNumber, 2);
assert.equal(execution.contextsPlanned, 1);
assert.equal(execution.contextsAttempted, 1);
assert.equal(execution.attempts, 1);
assert.equal(execution.retries, 0);
assert.equal(execution.timeoutExtensions, 0);
assert.equal(execution.recursiveCorrections, 0);
assert.equal(execution.maximumObservedConcurrency, 1);
assert.equal(execution.correctionModelContexts, 1);
assert.equal(execution.adjudicationModelContexts, 0);
assert.equal(execution.judgmentModelContexts, 0);
assert.equal(execution.paidServiceCalls, 0);
assert.equal(execution.directIncrementalCostUsd, 0);
assert.equal(execution.deterministicMerges, 0);
assert.equal(execution.finalLedgersAssembled, 0);
assert.equal(execution.scoresDerived, 0);
assert.equal(execution.results.length, 1);
const result = execution.results[0];
assert.equal(result.debateNumber, "195");
assert.equal(result.correctionNumber, 2);
assert.equal(result.model, "5.6 Sol");
assert.equal(result.modelSlug, "gpt-5.6-sol");
assert.equal(result.reasoningEffort, "low");
assert.equal(result.authentication, "ChatGPT subscription");
assert.equal(result.scoreBlind, true);
assert.equal(result.apiKeysRemoved, true);
assert.equal(result.attemptCount, 1);
assert.equal(result.retryCount, 0);
assert.equal(result.timeoutExtensionCount, 0);
assert.equal(result.recursiveCorrectionCount, 0);
assert.equal(result.paidServiceCalls, 0);
assert.equal(result.meteredApiCostUsd, 0);
assert.equal(validation.debateNumber, "195");
assert.equal(validation.correctionNumber, 2);
assert.equal(validation.preservedMoveDecisions, 18);
assert.equal(validation.originalOutputUnchanged, true);
assert.equal(validation.deterministicMergeAuthorized, false);
assert.equal(validation.scoresDerived, 0);

const originalOutputBytes = await readFile(activation.preservedOriginal.output);
const originalOutput = JSON.parse(originalOutputBytes);
assert.equal(sha256(originalOutputBytes), activation.preservedOriginal.outputSha256);
assert.equal(originalOutput.moveDecisions.length, 18);
assert.equal(
  sha256(Buffer.from(canonicalJson(originalOutput.moveDecisions))),
  activation.preservedOriginal.moveDecisionsSha256
);

if (!(await exists(analysisPath))) {
  console.log(
    JSON.stringify(
      {
        status: "passed-executed",
        executionStatus: execution.status,
        debateNumber: "195",
        correctionNumber: 2,
        contextsAttempted: 1,
        validContexts: execution.validContexts,
        retries: 0,
        deterministicMerges: 0,
        scoresDerived: 0
      },
      null,
      2
    )
  );
  process.exit(0);
}

const analysis = JSON.parse(await readFile(analysisPath, "utf8"));
assert.equal(analysis.context.debateNumber, "195");
assert.equal(analysis.correctionNumber, 2);
assert.equal(analysis.gate.attempts, 1);
assert.equal(analysis.gate.retries, 0);
assert.equal(analysis.gate.timeoutExtensions, 0);
assert.equal(analysis.gate.recursiveCorrections, 0);
assert.equal(analysis.gate.deterministicMerges, 0);
assert.equal(analysis.gate.preservedMoveDecisions, 18);
assert.equal(analysis.gate.originalOutputUnchanged, true);
assert.equal(analysis.gate.preservedMoveDecisionsUnchanged, true);
assert.equal(analysis.totals.correctionModelContexts, 1);
assert.equal(analysis.totals.judgmentModelContexts, 0);
assert.equal(analysis.totals.paidServiceCalls, 0);
assert.equal(analysis.totals.deterministicMerges, 0);
assert.equal(analysis.totals.finalLedgersAssembled, 0);
assert.equal(analysis.totals.scoresDerived, 0);
assert.equal(analysis.totals.directIncrementalCostUsd, 0);
assert.equal(
  Object.values(analysis.authorization).every((value) => value === false),
  true
);
if (analysis.gate.passed) {
  assert.equal(result.status, "completed-valid");
  assert.equal(result.outputWritten, true);
  assert.equal(result.gateAcceptancePassed, true);
  assert.equal(await exists(outputPath), true);
  assert.equal(sha256(await readFile(outputPath)), result.outputSha256);
  assert.equal(validation.outputAvailable, true);
  assert.equal(validation.gateAcceptancePassed, true);
  assert.equal(
    analysis.status,
    "debate-195-burden-adjustment-correction-transport-successor-gate-passed-awaiting-separate-deterministic-merge-approval"
  );
  assert.equal(analysis.gate.validContexts, 1);
  assert.equal(analysis.gate.burdenAdjustmentDecisions, 2);
  assert.equal(analysis.gate.candidateSelections, 2);
  assert.equal(
    analysis.nextAuthorizedAction,
    "user-approval-required-before-deterministic-debate-195-correction-merge-and-complete-adjudication-revalidation"
  );
} else {
  assert.equal(analysis.gate.validContexts, 0);
  assert.equal(
    analysis.status,
    "debate-195-burden-adjustment-correction-transport-successor-gate-failed"
  );
  assert.equal(
    analysis.nextAuthorizedAction,
    "user-approval-required-before-any-debate-195-correction-transport-successor-failure-diagnosis-or-downstream-work"
  );
}

console.log(
  JSON.stringify(
    {
      status: "passed-analyzed",
      analysisStatus: analysis.status,
      debateNumber: "195",
      correctionNumber: 2,
      validContexts: analysis.gate.validContexts,
      burdenAdjustmentDecisions: analysis.gate.burdenAdjustmentDecisions,
      candidateSelections: analysis.gate.candidateSelections,
      preservedMoveDecisions: 18,
      retries: 0,
      deterministicMerges: 0,
      paidServiceCalls: 0,
      scoresDerived: 0,
      directIncrementalCostUsd: 0,
      nextAuthorizedAction: analysis.nextAuthorizedAction
    },
    null,
    2
  )
);
