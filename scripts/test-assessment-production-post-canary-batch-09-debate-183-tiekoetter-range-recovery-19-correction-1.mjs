#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const stage = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-debate-183-tiekoetter-range-recovery-19";
const planPath = `${stage}/correction-1-plan.json`;
const activationPath = `${stage}/correction-1-activation.json`;
const read = (path) => readFile(new URL(path, root));
const readJson = async (path) => JSON.parse(await read(path));
const hash = async (path) => createHash("sha256").update(await read(path)).digest("hex");

const plan = await readJson(planPath);
assert.equal(plan.status, "frozen-batch-09-debate-183-range-recovery-runner-correction-1-ready");
assert.equal(plan.correction.replacementCount, 1);
assert.equal(plan.correction.originalRunnerRemainsByteIdentical, true);
assert.equal(plan.correction.frozenPlanAndActivationRemainByteIdentical, true);
assert.equal(plan.executionPolicy.mediaRangeAttemptsPreviouslyUsed, 0);
assert.equal(plan.executionPolicy.correctedExecutionsMaximum, 1);
assert.equal(plan.executionPolicy.retriesMaximum, 0);
assert.equal(plan.executionPolicy.directIncrementalCostUsdMaximum, 0);
for (const [path, expected] of Object.entries(plan.authenticatedInputs)) assert.equal(await hash(path), expected, `${path} hash mismatch`);
for (const [path, expected] of Object.entries(plan.sourceHashes)) assert.equal(await hash(path), expected, `${path} source hash mismatch`);

const original = (await read(plan.originalRunner.path)).toString("utf8");
assert.equal(createHash("sha256").update(original).digest("hex"), plan.originalRunner.sha256);
assert.equal(original.split(plan.correction.from).length - 1, 1);
const corrected = original.replace(plan.correction.from, plan.correction.to);

if (process.argv.includes("--activation")) {
  const activation = await readJson(activationPath);
  assert.equal(activation.status, "active-for-exactly-one-batch-09-debate-183-range-recovery-runner-correction-1");
  assert.equal(activation.plan.sha256, await hash(planPath));
  assert.equal(createHash("sha256").update(corrected).digest("hex"), activation.reconstructedRunnerSha256);
  for (const [path, expected] of Object.entries(activation.sourceHashes)) assert.equal(await hash(path), expected, `${path} activation hash mismatch`);
}

console.log(process.argv.includes("--activation") ? "tiekoetter-range-runner-correction-1-activation-ok" : "tiekoetter-range-runner-correction-1-plan-ok");
