#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const stage = "docs/assessment-production/post-canary-continuation-v1/batch-09/audio-verification-debate-183-21/evidence-boundary-correction-1";
const planPath = `${stage}/correction-plan.json`;
const activationPath = `${stage}/execution-activation.json`;
const executionPath = `${stage}/execution.json`;
const cohortPath = `${stage}/cohort-replay.json`;
const analysisPath = `${stage}/analysis.json`;
const hash = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");
const readJson = async (path) => JSON.parse(await readFile(path));

const plan = await readJson(planPath);
assert.equal(plan.status, "frozen-batch-09-debate-183-single-field-audio-evidence-boundary-correction-1-ready");
assert.equal(plan.correction.moveId, "con-informed-deliberator-method");
assert.equal(plan.correction.writableFields, 1);
assert.deepEqual(plan.correction.selectedSegmentIds, ["seg_14", "seg_15"]);
assert.equal(plan.correction.selectedOrderedTokenMatchCount, 32);
assert.deepEqual(plan.correction.selectedOriginalTokenSpan, [41, 73]);
assert.equal(plan.executionPolicy.attemptsMaximum, 1);
assert.equal(plan.executionPolicy.modelContextsMaximum, 0);
assert.equal(plan.executionPolicy.paidServiceCallsMaximum, 0);
assert.equal(plan.executionPolicy.directIncrementalCostUsdMaximum, 0);
for (const [path, expected] of Object.entries(plan.authenticatedInputs)) assert.equal(await hash(path), expected, `${path}: hash mismatch`);
for (const [path, expected] of Object.entries(plan.sourceHashes)) assert.equal(await hash(path), expected, `${path}: source hash mismatch`);

if (process.argv.includes("--activation") || process.argv.includes("--execution")) {
  const activation = await readJson(activationPath);
  assert.equal(activation.status, "active-for-exactly-one-batch-09-debate-183-audio-evidence-boundary-correction-1");
  assert.equal(activation.plan.sha256, await hash(planPath));
  for (const [path, expected] of Object.entries(activation.sourceHashes)) assert.equal(await hash(path), expected, `${path}: activation source hash mismatch`);
}

if (process.argv.includes("--execution")) {
  const execution = await readJson(executionPath);
  const cohort = await readJson(cohortPath);
  const analysis = await readJson(analysisPath);
  assert.equal(execution.status, "completed-one-batch-09-debate-183-deterministic-audio-evidence-boundary-correction");
  assert.equal(execution.attempts, 1);
  assert.equal(execution.correction.correctedVerification.status, "verified");
  assert.equal(execution.correction.correctedVerification.expectedSpeakerExcerptRecall, 0.9696969696969697);
  assert.equal(execution.correction.correctedVerification.checks.expectedSpeakerExcerptRecovered, true);
  assert.equal(execution.preservedControls.audioFilesRead, 0);
  assert.equal(execution.preservedControls.modelContexts, 0);
  assert.equal(execution.preservedControls.paidServiceCalls, 0);
  assert.equal(cohort.status, "batch-09-complete-four-work-item-audio-verification-cohort-passed");
  assert.equal(cohort.items.length, 4);
  assert.equal(cohort.verifiedItems, 4);
  assert.equal(cohort.unresolvedItems, 0);
  assert.equal(analysis.status, "batch-09-audio-verification-complete-after-bounded-evidence-boundary-correction");
  assert.equal(analysis.result.completeFourWorkItemCohortPassed, true);
}

console.log(process.argv.includes("--execution") ? "batch-09-audio-evidence-boundary-correction-1-execution-ok" : process.argv.includes("--activation") ? "batch-09-audio-evidence-boundary-correction-1-activation-ok" : "batch-09-audio-evidence-boundary-correction-1-plan-ok");
