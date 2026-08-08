#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { validateOpenAIStructuredOutputSubset } from "./lib/v42211733-hard-route-publication-transport.mjs";
import { V42211735_ROOT } from "./lib/v42211735-hard-route-publication-stability.mjs";

const manifestPath = `${V42211735_ROOT}/execution-manifest.json`, executionPath = `${V42211735_ROOT}/model-execution.json`, analysisPath = `${V42211735_ROOT}/analysis.json`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const preparation = JSON.parse(await readFile(path.resolve(`${V42211735_ROOT}/preparation-manifest.json`), "utf8"));
assert.equal(preparation.status, "prepared-five-isolated-hard-route-publication-stability-contexts");
assert.equal(preparation.contexts.length, 5);
assert.equal(preparation.totals.moves, 100);
assert.equal(preparation.totals.modelAuthoredScores, 0);
assert.equal(preparation.repair.counterfactualOnlyCritiqueReplacementPassed, true);
assert.deepEqual(preparation.repair.modelCritiqueTargetWords, [112, 122]);
assert.deepEqual(preparation.repair.repositoryCritiqueAcceptanceWords, [105, 130]);
assert.deepEqual(preparation.repair.structuredCritiqueCharacters, [880, 1020]);
assert.equal(preparation.policy.maximumMinutesPerDebate, 10);
assert.equal(preparation.policy.maximumMeanMinutes, 6.5);
assert.equal(preparation.repair.priorGateTreatedAsRetry, false);
assert.match(await readFile(path.resolve(preparation.inputs.workflow), "utf8"), /880–1,020 characters/);
assert.match(await readFile(path.resolve("scripts/run-v42211735-hard-route-publication-stability.mjs"), "utf8"), /880–1,020 characters/);
for (const context of preparation.contexts) {
  const schema = JSON.parse(await readFile(path.resolve(context.schema), "utf8"));
  validateOpenAIStructuredOutputSubset(schema);
  for (const moveSchema of Object.values(schema.properties.moveProse.properties)) {
    assert.equal(moveSchema.properties.critique.minLength, 880);
    assert.equal(moveSchema.properties.critique.maxLength, 1020);
  }
}
if (!(await exists(manifestPath))) {
  for (const context of preparation.contexts) assert.equal(await exists(context.output), false);
  console.log(JSON.stringify({ status: "passed-prefreeze", contexts: 5, moves: 100, modelContextsExecuted: 0, modelAuthoredScores: 0 }, null, 2));
  process.exit(0);
}
const manifest = JSON.parse(await readFile(path.resolve(manifestPath), "utf8"));
assert.equal(manifest.status, "frozen-five-isolated-hard-route-publication-contexts-authorized");
assert.equal(manifest.executionPolicy.maximumConcurrency, 2);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.correctionContextsMaximum, 0);
assert.deepEqual(manifest.executionPolicy.rampPhases.map((phase) => phase.contextIndexes), [[0], [1, 2, 3, 4]]);
assert.equal(manifest.authorization.deterministicCompilation, false);
assert.equal(manifest.authorization.all195Debates, false);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert.equal(sha256(await readFile(path.resolve(file))), digest, `source hash mismatch: ${file}`);
if (!(await exists(executionPath))) {
  for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assert.equal(await exists(future), false, `future output exists: ${future}`);
  console.log(JSON.stringify({ status: "passed-frozen", contexts: 5, ramp: [1, 4], maximumConcurrency: 2, retries: 0, correctionContexts: 0, modelAuthoredScores: 0 }, null, 2));
  process.exit(0);
}
const execution = JSON.parse(await readFile(path.resolve(executionPath), "utf8"));
assert.equal(execution.contextsPlanned, 5);
assert.equal(execution.attempts, execution.contextsAttempted);
assert.equal(execution.retries, 0);
assert.equal(execution.correctionContexts, 0);
assert.equal(execution.modelAuthoredScores, 0);
assert(execution.contextsAttempted >= 1 && execution.contextsAttempted <= 5);
assert(execution.results.every((result) => result.attemptCount === 1 && result.retryCount === 0 && result.modelAuthoredScores === 0));
if (!execution.rampPhases[0].passed) assert.deepEqual(execution.rampPhases[1].attemptedContextIndexes, []);
else assert.deepEqual(execution.rampPhases[1].attemptedContextIndexes, [1, 2, 3, 4]);
if (execution.status === "five-hard-route-publication-contexts-passed") {
  assert.equal(execution.contextsAttempted, 5);
  assert.equal(execution.validContexts, 5);
  assert.equal(execution.invalidContexts, 0);
  assert.deepEqual(execution.unattemptedContextIndexes, []);
  assert(execution.results.every((result) => result.gateAcceptancePassed && result.validationSummary?.calculatedScoresAuthoredByModel === 0));
} else {
  assert.equal(execution.status, "hard-route-publication-gate-complete-with-failure");
  assert(execution.invalidContexts > 0 || execution.unattemptedContextIndexes.length > 0);
}
if (!(await exists(analysisPath))) {
  console.log(JSON.stringify({ status: "passed-executed", executionStatus: execution.status, contextsAttempted: execution.contextsAttempted, validContexts: execution.validContexts, retries: 0, correctionContexts: 0, modelAuthoredScores: 0 }, null, 2));
  process.exit(0);
}
const analysis = JSON.parse(await readFile(path.resolve(analysisPath), "utf8"));
assert.equal(analysis.contexts.length, 5);
assert.equal(analysis.gate.modelAuthoredScores, 0);
assert.equal(analysis.authorization.productionMutation, false);
assert.equal(analysis.authorization.all195Debates, false);
if (analysis.status === "hard-route-publication-model-gate-passed") {
  assert.equal(analysis.gate.semanticPass, true);
  assert.equal(analysis.gate.timingPass, true);
  assert.equal(analysis.authorization.deterministicCompilation, true);
} else assert.equal(analysis.authorization.deterministicCompilation, false);
console.log(JSON.stringify({ status: "passed-analyzed", analysisStatus: analysis.status, validContexts: analysis.gate.validContexts, movesAuthored: analysis.gate.movesAuthored, exactSourceQuotes: analysis.gate.exactSourceQuotes, retries: 0, correctionContexts: 0, modelAuthoredScores: 0 }, null, 2));
