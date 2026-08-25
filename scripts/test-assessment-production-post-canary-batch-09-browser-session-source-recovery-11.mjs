#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const root = new URL("../", import.meta.url);
const planPath = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-browser-session-recovery-11/recovery-plan.json";
const activationPath = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-browser-session-recovery-11/execution-activation.json";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const read = async (path) => readFile(new URL(path, root));
const readJson = async (path) => JSON.parse(await read(path));

const plan = await readJson(planPath);
assert.equal(plan.status, "frozen-one-shot-batch-09-browser-session-three-source-recovery-ready");
assert.equal(plan.batchNumber, 9);
assert.equal(plan.userAuthorization.directIncrementalCostUsdMaximum, 0);
assert.equal(plan.userAuthorization.cookiesOrStorageMayBeReadOrExported, false);
assert.equal(plan.userAuthorization.accountIdentifierMayBePersisted, false);
assert.equal(plan.browserRoute.safeBootstrapUrl, "https://www.youtube.com/robots.txt");
assert.deepEqual(plan.exactCohort.sourceOrder, ["170", "19", "183"]);
assert.deepEqual(plan.exactCohort.sourceVideoIds, ["qA7qBtNMayQ", "_pprQXq1eCA", "2WrywAaDvvw"]);
assert.equal(plan.exactCohort.sourceCount, 3);
assert.equal(plan.exactCohort.clipCount, 4);
assert.equal(plan.executionPolicy.attemptsPerSourceMaximum, 1);
assert.equal(plan.executionPolicy.retriesMaximum, 0);
assert.equal(plan.executionPolicy.audioPlaybackObservedSecondsMaximum, 0);
assert.equal(plan.executionPolicy.modelContextsMaximum, 0);
assert.equal(plan.executionPolicy.paidServiceCallsMaximum, 0);
assert.equal(plan.executionPolicy.stopOnAnyFailure, true);
assert.equal(JSON.stringify(plan).includes("Vivid Andy"), false);

for (const [path, expected] of Object.entries(plan.authenticatedInputs)) {
  assert.equal(sha256(await read(path)), expected, `${path} hash mismatch`);
}

if (process.argv.includes("--activation")) {
  const activation = await readJson(activationPath);
  assert.equal(activation.status, "active-for-exactly-one-batch-09-browser-session-three-source-recovery");
  assert.equal(activation.plan.path, planPath);
  assert.equal(activation.plan.sha256, sha256(await read(planPath)));
  assert.equal(activation.sourceHashes["scripts/test-assessment-production-post-canary-batch-09-browser-session-source-recovery-11.mjs"], sha256(await read("scripts/test-assessment-production-post-canary-batch-09-browser-session-source-recovery-11.mjs")));
  assert.deepEqual(activation.sourceOrder, ["170", "19", "183"]);
  assert.equal(activation.attemptsPerSourceMaximum, 1);
  assert.equal(activation.retriesMaximum, 0);
  assert.equal(activation.audioPlaybackObservedSecondsMaximum, 0);
  assert.equal(activation.directIncrementalCostUsdMaximum, 0);
  assert.equal(JSON.stringify(activation).includes("Vivid Andy"), false);
}

console.log(process.argv.includes("--activation") ? "browser-session-recovery-activation-ok" : "browser-session-recovery-plan-ok");
