#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const ROOT = "docs/calibration/v4.2.21.17.25/hard-route-independent-judgments";
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const MANIFEST = `${ROOT}/execution-manifest.json`;
const EXECUTION = `${ROOT}/model-execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const phaseIndexes = [[0], [1, 2], [3, 4, 5, 6, 7, 8, 9]];
const simulatedAttemptedIndexes = (phasePasses) => {
  const attempted = [];
  for (let index = 0; index < phaseIndexes.length; index += 1) {
    attempted.push(...phaseIndexes[index]);
    if (index < 2 && !phasePasses[index]) break;
  }
  return attempted;
};
assert.deepEqual(simulatedAttemptedIndexes([false]), [0]);
assert.deepEqual(simulatedAttemptedIndexes([true, false]), [0, 1, 2]);
assert.deepEqual(simulatedAttemptedIndexes([true, true, false]), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
assert.deepEqual(simulatedAttemptedIndexes([true, true, true]), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

const preparation = JSON.parse(await readFile(PREPARATION, "utf8"));
assert.equal(preparation.status, "ten-hard-route-independent-judgment-contexts-prepared");
assert.equal(preparation.contexts.length, 10);
assert.equal(preparation.totals.debates, 5);
assert.equal(preparation.totals.uniqueMoves, 100);
assert.equal(preparation.totals.movesJudgedAcrossPasses, 200);
assert.equal(preparation.totals.maximumCopiedInputBytes, 114958);
assert(preparation.contexts.every((context) => context.copiedInputBytes <= 115000));
for (const debateNumber of ["51", "63", "90", "153", "165"]) {
  const pair = preparation.contexts.filter((context) => context.debateNumber === debateNumber);
  assert.deepEqual(pair.map((context) => context.reviewerPass), ["A", "B"]);
  assert.equal(pair[0].lockedInventoryCanonicalSha256, pair[1].lockedInventoryCanonicalSha256);
}

if (!(await exists(MANIFEST))) {
  for (const context of preparation.contexts) for (const future of [context.judgmentOutput, context.rawOutput, context.validationOutput, context.provenanceOutput]) assert.equal(await exists(future), false, `prefreeze future output exists: ${future}`);
  assert.equal(await exists(EXECUTION), false);
  assert.equal(await exists(ANALYSIS), false);
  console.log(JSON.stringify({ status: "passed-prefreeze", contexts: 10, maximumCopiedInputBytes: 114958, modelContextsExecuted: 0, scoresDerived: 0 }, null, 2));
  process.exit(0);
}

const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
assert.equal(manifest.status, "frozen-ten-hard-route-independent-judgment-contexts-authorized");
assert.equal(manifest.contexts.length, 10);
assert.equal(manifest.executionPolicy.maximumConcurrency, 2);
assert.equal(manifest.executionPolicy.attemptsPerContext, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.stopBeforeExpansionOnRampFailure, true);
assert.deepEqual(manifest.executionPolicy.rampPhases.map((phase) => phase.contextIndexes), phaseIndexes);
assert.equal(manifest.authorization.modelContexts, true);
assert.equal(manifest.authorization.disagreementExtraction, false);
assert.equal(manifest.authorization.audioVerification, false);
assert.equal(manifest.authorization.adjudication, false);
assert.equal(manifest.authorization.scoreDerivation, false);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert.equal(sha256(await readFile(file)), digest, `source hash mismatch: ${file}`);

if (!(await exists(EXECUTION))) {
  for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assert.equal(await exists(future), false, `prefrozen future output exists: ${future}`);
  console.log(JSON.stringify({ status: "passed-frozen", contexts: 10, ramp: [1, 2, 7], maximumConcurrency: 2, retries: 0, modelContextsExecuted: 0, scoresDerived: 0 }, null, 2));
  process.exit(0);
}

const execution = JSON.parse(await readFile(EXECUTION, "utf8"));
assert.equal(execution.contextsPlanned, 10);
assert.equal(execution.attempts, execution.contextsAttempted);
assert.equal(execution.retries, 0);
assert.equal(execution.scoresDerived, 0);
assert(execution.contextsAttempted >= 1 && execution.contextsAttempted <= 10);
assert.equal(execution.results.length, execution.contextsAttempted);
assert.equal(new Set(execution.results.map((result) => result.contextIndex)).size, execution.results.length);
assert(execution.results.every((result) => result.attemptCount === 1 && result.retryCount === 0));
assert.deepEqual(execution.rampPhases.map((phase) => phase.contextIndexes), phaseIndexes);
const [phaseOne, phaseTwo, phaseThree] = execution.rampPhases;
if (!phaseOne.passed) {
  assert.deepEqual(phaseTwo.attemptedContextIndexes, []);
  assert.deepEqual(phaseThree.attemptedContextIndexes, []);
} else if (!phaseTwo.passed) {
  assert.deepEqual(phaseThree.attemptedContextIndexes, []);
} else {
  assert.deepEqual(phaseThree.attemptedContextIndexes, phaseThree.contextIndexes);
}
if (execution.status === "ten-hard-route-independent-judgment-contexts-passed") {
  assert.equal(execution.contextsAttempted, 10);
  assert.equal(execution.validContexts, 10);
  assert.equal(execution.invalidContexts, 0);
  assert.deepEqual(execution.unattemptedContextIndexes, []);
  assert(execution.rampPhases.every((phase) => phase.passed));
  for (const debateNumber of ["51", "63", "90", "153", "165"]) {
    const pair = execution.results.filter((result) => result.debateNumber === debateNumber);
    assert.equal(pair.length, 2);
    assert(pair.every((result) => result.accepted && result.judgmentSha256 && result.rawOutputSha256));
    assert.notEqual(pair[0].judgmentSha256, pair[1].judgmentSha256);
  }
} else {
  assert.equal(execution.status, "hard-route-independent-judgment-gate-complete-with-failure");
  assert(execution.invalidContexts > 0 || execution.unattemptedContextIndexes.length > 0);
}

if (!(await exists(ANALYSIS))) {
  console.log(JSON.stringify({ status: "passed-executed", executionStatus: execution.status, contextsAttempted: execution.contextsAttempted, validContexts: execution.validContexts, retries: 0, scoresDerived: 0 }, null, 2));
  process.exit(0);
}

const analysis = JSON.parse(await readFile(ANALYSIS, "utf8"));
assert.equal(analysis.contexts.length, execution.contextsAttempted);
assert.equal(analysis.pairs.length, 5);
assert.equal(analysis.acceptance.scores, 0);
assert.equal(analysis.authorization.audioVerificationPreparation, false);
assert.equal(analysis.authorization.adjudicationPreparation, false);
assert.equal(analysis.authorization.scoreDerivation, false);
assert.equal(analysis.authorization.all195Debates, false);
if (analysis.acceptance.passed) {
  assert.equal(analysis.status, "ten-hard-route-independent-judgments-passed-disagreement-extraction-authorized");
  assert.equal(analysis.authorization.disagreementExtraction, true);
  assert(analysis.pairs.every((pair) => pair.bothAccepted && pair.sameLockedInventory && pair.separateOutputHashes));
  assert(analysis.pairs.find((pair) => pair.debateNumber === "153").repositoryBelowHighAttributionMoves.length >= 1);
} else {
  assert.equal(analysis.status, "hard-route-independent-judgment-gate-failed-analysis-only");
  assert.equal(analysis.authorization.disagreementExtraction, false);
}
console.log(JSON.stringify({ status: "passed-analyzed", analysisStatus: analysis.status, contextsAttempted: execution.contextsAttempted, validContexts: execution.validContexts, audioVerificationQueueLength: analysis.audioVerificationQueue.length, retries: 0, scoresDerived: 0 }, null, 2));
