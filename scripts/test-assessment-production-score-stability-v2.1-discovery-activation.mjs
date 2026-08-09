#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const ROOT =
  "docs/assessment-production/score-stability-v2.1-validation-cohort/discovery";
const ACTIVATION = `${ROOT}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const activation = JSON.parse(await readFile(ACTIVATION, "utf8"));
assert.equal(
  activation.status,
  "frozen-forty-v2.1-validation-discovery-contexts-authorized"
);
assert.equal(activation.developmentValidationOnly, true);
assert.equal(activation.productionCanary, false);
assert.equal(activation.stagingOnly, true);
assert.equal(activation.model.label, "5.6 Sol");
assert.equal(activation.model.slug, "gpt-5.6-sol");
assert.equal(activation.model.reasoningEffort, "low");
assert.equal(activation.model.authentication, "ChatGPT subscription");
assert.equal(activation.userAuthorization.directIncrementalCostEstimateUsd, 0);
assert.equal(activation.userAuthorization.discoveryModelsAuthorized, true);
assert.equal(activation.userAuthorization.judgmentModelsAuthorized, false);
assert.equal(activation.costBoundary.meteredApiCostUsdMaximum, 0);
assert.equal(activation.costBoundary.transcriptionCostUsdMaximum, 0);
assert.equal(activation.executionPolicy.contexts, 40);
assert.equal(activation.executionPolicy.attemptsPerContext, 1);
assert.equal(activation.executionPolicy.retriesMaximum, 0);
assert.equal(activation.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(activation.executionPolicy.timeoutMsPerContext, 300000);
assert.equal(activation.executionPolicy.maximumParallelContexts, 4);
assert.deepEqual(activation.executionPolicy.schedulerRamp, [1, 2, 4]);
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
        contexts: 40,
        modelContextsAuthorized: true,
        judgmentModelContextsAuthorized: false,
        retriesMaximum: 0,
        timeoutExtensionsMaximum: 0,
        meteredApiCostUsdMaximum: 0,
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
assert.equal(execution.contextsPlanned, 40);
assert(execution.contextsAttempted >= 1 && execution.contextsAttempted <= 40);
assert.equal(execution.contextsUnattempted, 40 - execution.contextsAttempted);
assert.equal(execution.attempts, execution.contextsAttempted);
assert.equal(execution.retries, 0);
assert.equal(execution.timeoutExtensions, 0);
assert(execution.maximumParallelContextsObserved <= 4);
assert.deepEqual(execution.schedulerRamp, [1, 2, 4]);
assert(execution.rampPhases.length >= 1 && execution.rampPhases.length <= 3);
assert.equal(execution.rampPhases[0].phase, "operational-canary-one");
assert.deepEqual(execution.rampPhases[0].contextIndexes, [0]);
for (const result of execution.results) {
  assert.equal(result.attemptCount, 1);
  assert.equal(result.retryCount, 0);
  assert.equal(result.authentication, "ChatGPT subscription");
  assert.equal(result.apiKeysRemoved, true);
  assert.equal(result.meteredApiCostUsd, 0);
  if (result.rawOutputWritten) {
    const preparation = JSON.parse(
      await readFile(activation.preparationManifest, "utf8")
    );
    assert.equal(
      result.rawOutputSha256,
      sha256(await readFile(preparation.contexts[result.contextIndex].rawOutput))
    );
  }
}

if (execution.status !== "forty-v2.1-validation-discovery-contexts-passed") {
  assert(execution.invalidContexts >= 1);
  if (!execution.rampPhases[0].passed) {
    assert.equal(execution.contextsAttempted, 1);
  } else if (execution.rampPhases[1] && !execution.rampPhases[1].passed) {
    assert.equal(execution.contextsAttempted, 3);
  }
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

assert.equal(execution.contextsAttempted, 40);
assert.equal(execution.contextsUnattempted, 0);
assert.equal(execution.validContexts, 40);
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
        validContexts: 40,
        wallElapsedMinutes: Number(
          (execution.wallElapsedMs / 60000).toFixed(2)
        ),
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
  "v2.1-validation-discovery-passed-candidate-sharded-inventory-preparation-authorized"
);
assert.equal(analysis.debates.length, 10);
assert.equal(analysis.audit.validContexts, 40);
assert.equal(analysis.audit.invalidContexts, 0);
assert.equal(analysis.audit.retries, 0);
assert.equal(analysis.audit.timeoutExtensions, 0);
assert.equal(analysis.audit.rampPassed, true);
assert.equal(analysis.audit.allDiscoveredCandidatesTransported, true);
assert.equal(analysis.audit.silentSemanticDeduplication, false);
assert.equal(analysis.audit.currentCanaryReclassified, false);
assert.equal(analysis.audit.priorV2ValidationPassed, false);
assert.equal(analysis.audit.proposedPolicyPromoted, false);
assert.equal(analysis.audit.scoresDerived, 0);
for (const debate of analysis.debates) {
  assert(debate.candidates >= 8);
  assert(debate.pro >= 4);
  assert(debate.con >= 4);
  assert.equal(debate.candidateSpansIncluded, true);
  assert.equal(debate.allDiscoveredCandidatesTransported, true);
  assert.equal(debate.semanticDeduplicationPerformed, false);
  assert.equal(sha256(await readFile(debate.bundlePath)), debate.bundleSha256);
  assert.equal(sha256(await readFile(debate.sparsePath)), debate.sparseSha256);
}
assert.equal(analysis.totals.modelContextsExecuted, 40);
assert.equal(analysis.totals.meteredApiCostUsd, 0);
assert.equal(analysis.totals.transcriptionCostUsd, 0);
assert.equal(analysis.totals.scoresDerived, 0);
assert.equal(
  analysis.authorization.candidateShardedInventoryPreparation,
  true
);
for (const key of [
  "inventoryExecutionActivation",
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
  assert.equal(analysis.authorization[key], false, `${key}: must be false`);
}

console.log(
  JSON.stringify(
    {
      status: "passed-complete",
      debates: analysis.totals.debates,
      contexts: analysis.totals.modelContextsExecuted,
      candidates: analysis.totals.candidates,
      belowHighAttributionCandidates:
        analysis.totals.belowHighAttributionCandidates,
      wallElapsedMinutes: Number(
        (analysis.totals.wallElapsedMs / 60000).toFixed(2)
      ),
      aggregateModelMinutes: Number(
        (analysis.totals.modelWorkElapsedMs / 60000).toFixed(2)
      ),
      retries: 0,
      timeoutExtensions: 0,
      scoresDerived: 0,
      nextAuthorized: "candidate-sharded-inventory-preparation-only",
    },
    null,
    2
  )
);
