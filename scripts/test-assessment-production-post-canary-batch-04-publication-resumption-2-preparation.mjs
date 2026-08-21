#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import {
  POST_CANARY_BATCH_04_PUBLICATION_RESUMPTION_2_DEBATES,
  POST_CANARY_BATCH_04_PUBLICATION_RESUMPTION_2_ROOT
} from "./lib/assessment-production-post-canary-batch-04-publication-resumption-2.mjs";

const MANIFEST = `${POST_CANARY_BATCH_04_PUBLICATION_RESUMPTION_2_ROOT}/execution-preparation-manifest.json`;
const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
assert.equal(manifest.status,
  "frozen-six-untouched-post-canary-batch-04-publication-resumption-2-contexts-prepared-under-standing-authorization");
assert.deepEqual(manifest.contexts.map((context) => context.debateNumber),
  POST_CANARY_BATCH_04_PUBLICATION_RESUMPTION_2_DEBATES);
assert.deepEqual(manifest.contexts.map((context) => context.contextIndex), [0,1,2,3,4,5]);
assert.deepEqual(manifest.contexts.map((context) => context.originalContextIndex), [4,5,6,7,8,9]);
assert.deepEqual(manifest.model, { label: "5.6 Sol", slug: "gpt-5.6-sol",
  reasoningEffort: "low", authentication: "ChatGPT subscription" });
assert.equal(manifest.executionPolicy.attemptsPerContext, 1);
assert.equal(manifest.executionPolicy.retriesMaximum, 0);
assert.equal(manifest.executionPolicy.timeoutExtensionsMaximum, 0);
assert.deepEqual(manifest.executionPolicy.schedulerRamp, [1,2]);
assert.deepEqual(manifest.executionPolicy.rampPhases.map((phase) => phase.contextIndexes),
  [[0],[1,2],[3,4,5]]);
assert.equal(Object.values(manifest.stopRules).every(Boolean), true);
assert.equal(manifest.authorization.executionActivationPreparation, true);
assert.equal(manifest.authorization.standingAuthorizationPermitsActivation, true);
for (const [key, value] of Object.entries(manifest.authorization)) {
  if (!["executionActivationPreparation", "standingAuthorizationPermitsActivation"].includes(key)) {
    assert.equal(value, false, `${key}: must remain unauthorized`);
  }
}
assert.equal(manifest.totals.acceptedDebates, 4);
assert.equal(manifest.totals.acceptedMoves, 85);
assert.equal(manifest.totals.resumptionContexts, 6);
assert.equal(manifest.totals.resumptionMoves, 118);
assert.equal(manifest.totals.resumptionSections, 31);
assert.equal(manifest.totals.resumptionAudioVerifiedMoves, 3);
assert.equal(manifest.totals.cohortMoves, 203);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source drift`);
}
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) {
  assert.equal(Object.hasOwn(manifest.sourceHashes, future), false);
  assert.equal(await exists(future), false, `${future}: future output exists`);
}
for (const context of manifest.contexts) {
  assert.equal(sha256(await readFile(context.packet)), context.packetSha256);
  assert.equal(sha256(await readFile(context.schema)), context.schemaSha256);
  assert.equal(await exists(context.resumption1UnattemptedOutput), false);
}
console.log(JSON.stringify({ status: "passed", acceptedDebates: 4,
  resumptionContexts: 6, resumptionMoves: 118, cohortDebates: 10,
  cohortMoves: 203, existingPacketsReused: 6, packetsGenerated: 0,
  modelContextsExecuted: 0, paidServiceCalls: 0, directIncrementalCostUsd: 0 }, null, 2));
