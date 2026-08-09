#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const MANIFEST =
  "docs/assessment-production/score-stability-v2.1-validation-cohort/discovery/execution-preparation-manifest.json";
const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

assert.equal(
  manifest.status,
  "frozen-forty-v2.1-validation-discovery-contexts-prepared-not-authorized"
);
assert.equal(manifest.developmentValidationOnly, true);
assert.equal(manifest.productionCanary, false);
assert.equal(manifest.stagingOnly, true);
assert.equal(manifest.currentCanaryDisposition.reclassified, false);
assert.equal(manifest.priorV2ValidationDisposition.gatesPassed, 0);
assert.equal(manifest.proposedPolicy.version, "v2.1-proposal");
assert.equal(manifest.proposedPolicy.everyIntegerRoundedTieAccepted, true);
assert.equal(manifest.proposedPolicy.promoted, false);
assert.equal(manifest.model.label, "5.6 Sol");
assert.equal(manifest.model.slug, "gpt-5.6-sol");
assert.equal(manifest.model.reasoningEffort, "low");
assert.equal(manifest.model.authentication, "ChatGPT subscription");
assert.equal(manifest.contexts.length, 40);
assert.equal(
  new Set(manifest.contexts.map((context) => context.contextIndex)).size,
  40
);
assert.equal(manifest.executionPolicy.contexts, 40);
assert.equal(manifest.executionPolicy.attemptsPerContext, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutMsPerContext, 300000);
assert.equal(manifest.executionPolicy.maximumParallelContexts, 4);
assert.deepEqual(manifest.executionPolicy.schedulerRamp, [1, 2, 4]);
assert.equal(manifest.executionPolicy.separateActivationRequired, true);
assert.equal(manifest.executionPolicy.APIKeysRemoved, true);
assert.equal(manifest.costEstimate.contexts, 40);
assert.equal(manifest.costEstimate.meteredApiCostUsdMaximum, 0);
assert.equal(manifest.costEstimate.transcriptionCostUsdMaximum, 0);
assert.equal(manifest.compilationPolicy.allContextsMustValidate, true);
assert.equal(manifest.compilationPolicy.silentSemanticDeduplication, false);
assert.equal(manifest.compilationPolicy.scoresDerived, false);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source drift`);
}
for (const file of manifest.futureOutputPathsExcludedFromSourceHashes) {
  assert.equal(Object.hasOwn(manifest.sourceHashes, file), false);
  await access(file).then(
    () => assert.fail(`${file}: future output already exists`),
    () => true
  );
}
assert.equal(manifest.authorization.executionActivationPreparation, true);
for (const [key, value] of Object.entries(manifest.authorization)) {
  if (key !== "executionActivationPreparation") {
    assert.equal(value, false, `${key}: must be false`);
  }
}
for (const value of Object.values(manifest.stopRules)) {
  assert.equal(value, true);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      contexts: 40,
      maximumParallelContexts: 4,
      retriesMaximum: 0,
      timeoutExtensionsMaximum: 0,
      expectedParallelWallMinutes:
        manifest.costEstimate.expectedParallelWallMinutes,
      authentication: manifest.model.authentication,
      meteredApiCostUsdMaximum: 0,
      modelContextsAuthorized: false,
      scoresDerived: 0,
      nextAuthorized: "discovery-execution-activation-preparation-only",
    },
    null,
    2
  )
);
