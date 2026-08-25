#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-transport-recovery-6";
const planPath = `${root}/discovery-plan.json`;
const activationPath = `${root}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const planBytes = await readFile(planPath);
const plan = JSON.parse(planBytes);

assert.equal(
  plan.status,
  "frozen-batch-09-debate-170-local-wrapper-muted-embed-format-discovery-ready"
);
assert.equal(plan.userAuthorization.audioPlaybackMaximumSeconds, 0);
assert.equal(plan.userAuthorization.assetDownloadsMaximum, 0);
assert.equal(plan.userAuthorization.cookieInspectionMaximum, 0);
assert.equal(plan.userAuthorization.cookieExportMaximum, 0);
assert.equal(plan.userAuthorization.browserStorageInspectionMaximum, 0);
assert.equal(
  plan.browserRoute.embedUrl,
  "https://www.youtube.com/embed/HoTILnpd3q8?autoplay=0&mute=1&playsinline=1&origin=http%3A%2F%2F127.0.0.1%3A43170"
);
assert.equal(
  plan.browserRoute.wrapper.url,
  "http://127.0.0.1:43170/scripts/fixtures/batch-09-debate-170-muted-embed.html"
);
assert.equal(plan.browserRoute.wrapper.iframeAutoplayPermissionGranted, false);
assert.equal(
  sha256(await readFile(plan.browserRoute.wrapper.path)),
  plan.browserRoute.wrapper.sha256
);
assert.deepEqual(plan.browserRoute.localServer.command, [
  "python3", "-m", "http.server", "43170", "--bind", "127.0.0.1"
]);
assert.deepEqual(plan.browserRoute.queryControls, {
  autoplay: "0",
  mute: "1",
  playsinline: "1"
});
assert.equal(plan.discoveryContract.rawSignedUrlsPersisted, false);
assert.equal(plan.discoveryContract.cookieOrStorageInspection, false);
assert.equal(plan.validation.playerResponseReadsRequired, 1);
assert.equal(plan.validation.pageAssetInventoryCallsRequired, 1);
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
    "active-for-exactly-one-local-wrapper-muted-batch-09-debate-170-format-discovery"
  );
  assert.equal(activation.plan.sha256, sha256(planBytes));
  assert.deepEqual(activation.authenticatedInputs, plan.authenticatedInputs);
  assert.deepEqual(activation.sourceHashes, plan.sourceHashes);
  assert.equal(activation.playerResponseReadsMaximum, 1);
  assert.equal(activation.pageAssetInventoryCallsMaximum, 1);
  assert.equal(activation.downloadsMaximum, 0);
  assert.equal(activation.audioPlaybackMaximumSeconds, 0);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      playerResponseReads: 1,
      pageAssetInventoryCalls: 1,
      downloads: 0,
      audioPlaybackMaximumSeconds: 0,
      activationPresent: await exists(activationPath),
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
