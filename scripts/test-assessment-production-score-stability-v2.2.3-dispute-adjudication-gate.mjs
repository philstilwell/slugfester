#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const root =
  "docs/assessment-production/score-stability-v2.2.3-validation-cohort/dispute-only-adjudication";
const manifestPath = `${root}/execution-manifest.json`;
const executionPath = `${root}/model-execution.json`;
const analysisPath = `${root}/analysis.json`;
const exists = (file) =>
  access(file).then(
    () => true,
    () => false
  );
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const preparation = JSON.parse(
  await readFile(`${root}/preparation-manifest.json`, "utf8")
);
assert.equal(
  preparation.status,
  "prepared-ten-isolated-v2.2.3-dispute-only-adjudication-contexts"
);
assert.equal(preparation.contexts.length, 10);
assert.equal(preparation.totals.disputedMoves, 185);
assert.equal(preparation.totals.candidateSelections, 490);
assert.equal(preparation.totals.audioVerifiedMoves, 4);
assert.equal(preparation.totals.scoresDerived, 0);
assert.equal(preparation.model.slug, "gpt-5.6-sol");
assert.equal(preparation.model.reasoningEffort, "low");
assert.equal(preparation.model.authentication, "ChatGPT subscription");
if (!(await exists(manifestPath))) {
  for (const context of preparation.contexts) {
    assert.equal(await exists(context.output), false);
  }
  console.log(
    JSON.stringify(
      {
        status: "passed-prefreeze",
        contexts: 10,
        disputedMoves: 185,
        candidateSelections: 490,
        modelContextsExecuted: 0,
        scoresDerived: 0
      },
      null,
      2
    )
  );
  process.exit(0);
}
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
assert.equal(
  manifest.status,
  "frozen-ten-isolated-v2.2.3-dispute-only-adjudication-contexts-authorized"
);
assert.equal(manifest.productionCanary, false);
assert.equal(manifest.stagingOnly, true);
assert.equal(manifest.developmentValidationOnly, true);
assert.equal(manifest.model.slug, "gpt-5.6-sol");
assert.equal(manifest.model.reasoningEffort, "low");
assert.equal(manifest.model.authentication, "ChatGPT subscription");
assert.equal(manifest.executionPolicy.maximumConcurrency, 2);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.maximumMinutesPerContext, 12);
assert.equal(manifest.executionPolicy.maximumMeanMinutes, 9.5);
assert.deepEqual(
  manifest.executionPolicy.rampPhases.map((phase) => phase.contextIndexes),
  [[0], [1, 2], [3, 4, 5, 6, 7, 8, 9]]
);
assert.equal(manifest.authorization.finalLedgerAssembly, false);
assert.equal(manifest.authorization.scoreDerivation, false);
assert.equal(manifest.authorization.productionMutation, false);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assert.equal(
    sha256(await readFile(file)),
    digest,
    `source hash mismatch: ${file}`
  );
}
if (!(await exists(executionPath))) {
  for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) {
    assert.equal(await exists(future), false, `future output exists: ${future}`);
  }
  console.log(
    JSON.stringify(
      {
        status: "passed-frozen",
        contexts: 10,
        ramp: [1, 2, 7],
        maximumConcurrency: 2,
        retries: 0,
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
assert.equal(execution.corrections, 0);
assert.equal(execution.scoresDerived, 0);
assert(execution.contextsAttempted >= 1 && execution.contextsAttempted <= 10);
assert(
  execution.results.every(
    (result) => result.attemptCount === 1 && result.retryCount === 0
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
  "ten-isolated-v2.2.3-dispute-only-adjudication-contexts-passed"
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
    "v2.2.3-dispute-only-adjudication-gate-complete-with-failure"
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
assert.equal(analysis.gate.scoresDerived, 0);
assert.equal(analysis.evidenceBoundary.audioTranscriptInputs, 4);
assert.equal(analysis.authorization.scoreDerivation, false);
assert.equal(analysis.authorization.remainingProductionBatches, false);
if (analysis.status === "v2.2.3-dispute-only-adjudication-gate-passed") {
  assert.equal(analysis.gate.semanticPass, true);
  assert.equal(analysis.gate.timingPass, true);
  assert.equal(analysis.gate.scoreBlindPass, true);
  assert.equal(analysis.authorization.finalLedgerAssembly, true);
} else {
  assert.equal(analysis.authorization.finalLedgerAssembly, false);
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
      scoresDerived: 0
    },
    null,
    2
  )
);
