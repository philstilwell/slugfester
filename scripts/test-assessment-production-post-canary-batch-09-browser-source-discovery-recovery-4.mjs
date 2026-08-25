#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-transport-recovery-4";
const planPath = `${root}/discovery-plan.json`;
const activationPath = `${root}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const planBytes = await readFile(planPath);
const plan = JSON.parse(planBytes);

assert.equal(
  plan.status,
  "frozen-batch-09-debate-170-pre-navigation-playback-blocked-browser-asset-discovery-ready"
);
assert.equal(plan.batchNumber, 9);
assert.equal(plan.userAuthorization.pageAssetInventoryCallsMaximum, 1);
assert.equal(plan.userAuthorization.assetDownloadsMaximum, 0);
assert.equal(plan.userAuthorization.cookieInspectionMaximum, 0);
assert.equal(plan.userAuthorization.cookieExportMaximum, 0);
assert.equal(plan.userAuthorization.browserStorageInspectionMaximum, 0);
assert.equal(plan.userAuthorization.audioPlaybackMaximumSeconds, 0);
assert.equal(plan.browserRoute.safeBootstrapUrl, "https://www.youtube.com/robots.txt");
assert.equal(plan.browserRoute.targetUrl, "https://www.youtube.com/watch?v=HoTILnpd3q8");
assert.equal(
  sha256(await readFile(plan.browserRoute.overlay.path)),
  plan.browserRoute.overlay.sha256
);
assert.equal(plan.validation.requiredPlayControlPattern, "Play (k)");
assert.equal(plan.validation.forbiddenPauseControlPattern, "Pause (k)");
assert.equal(plan.validation.requiredPlayerPositionPattern, "0:00 / 1:46:04");
assert.equal(plan.validation.assetInventoryCallsRequired, 1);
assert.equal(plan.validation.assetBundleCallsRequired, 0);
for (const [file, digest] of Object.entries(plan.authenticatedInputs)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: input hash changed`);
}
for (const [file, digest] of Object.entries(plan.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash changed`);
}
assert.equal(await exists(plan.outputs.outputPath), false);
assert.equal(await exists(plan.outputs.analysisPath), false);

if (await exists(activationPath)) {
  const activation = JSON.parse(await readFile(activationPath, "utf8"));
  assert.equal(
    activation.status,
    "active-for-exactly-one-playback-blocked-batch-09-debate-170-browser-asset-discovery"
  );
  assert.equal(activation.plan.sha256, sha256(planBytes));
  assert.deepEqual(activation.authenticatedInputs, plan.authenticatedInputs);
  assert.deepEqual(activation.sourceHashes, plan.sourceHashes);
  assert.equal(activation.pageAssetInventoryCallsMaximum, 1);
  assert.equal(activation.downloadsMaximum, 0);
  assert.equal(activation.audioPlaybackMaximumSeconds, 0);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      inventoryCalls: 1,
      downloads: 0,
      audioPlaybackMaximumSeconds: 0,
      activationPresent: await exists(activationPath),
      authenticatedInputs: Object.keys(plan.authenticatedInputs).length,
      sourceHashes: Object.keys(plan.sourceHashes).length,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
