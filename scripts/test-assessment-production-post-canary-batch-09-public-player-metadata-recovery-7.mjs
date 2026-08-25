#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const validateExecution = process.argv.includes("--execution");
const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-transport-recovery-7";
const planPath = `${root}/request-plan.json`;
const activationPath = `${root}/execution-activation.json`;
const outputPath = `${root}/format-inventory.json`;
const executionPath = `${root}/execution.json`;
const analysisPath = `${root}/analysis.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const planBytes = await readFile(planPath);
const plan = JSON.parse(planBytes);
assert.equal(
  plan.status,
  "frozen-batch-09-debate-170-public-credential-omitting-player-metadata-request-ready"
);
assert.equal(plan.userAuthorization.credentialsMode, "omit");
assert.equal(plan.userAuthorization.publicConfigBootstrapGetsMaximum, 1);
assert.equal(plan.userAuthorization.publicPlayerMetadataPostsMaximum, 1);
assert.equal(plan.userAuthorization.assetDownloadsMaximum, 0);
assert.equal(plan.userAuthorization.audioPlaybackMaximumSeconds, 0);
assert.equal(plan.userAuthorization.paidServices, false);
assert.equal(plan.userAuthorization.modelExecution, false);
assert.equal(plan.publicRequestRoute.configBootstrap.credentials, "omit");
assert.equal(plan.publicRequestRoute.playerMetadata.credentials, "omit");
assert.equal(
  plan.publicRequestRoute.playerMetadata.payloadSha256,
  sha256(JSON.stringify(plan.publicRequestRoute.playerMetadata.payload))
);
assert.equal(plan.sanitizationContract.rawSignedUrlsPersisted, false);
assert.equal(plan.sanitizationContract.rawPlayerResponsePersisted, false);
assert.equal(plan.sanitizationContract.publicApiKeyPersisted, false);
for (const [file, digest] of Object.entries(plan.authenticatedInputs)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: input hash changed`);
}
for (const [file, digest] of Object.entries(plan.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash changed`);
}

if (await exists(activationPath)) {
  const activation = JSON.parse(await readFile(activationPath, "utf8"));
  assert.equal(
    activation.status,
    "active-for-exactly-one-public-credential-omitting-batch-09-debate-170-player-metadata-request"
  );
  assert.equal(activation.plan.sha256, sha256(planBytes));
  assert.deepEqual(activation.authenticatedInputs, plan.authenticatedInputs);
  assert.deepEqual(activation.sourceHashes, plan.sourceHashes);
  assert.equal(activation.payloadSha256, plan.publicRequestRoute.playerMetadata.payloadSha256);
  assert.equal(activation.configBootstrapGetsMaximum, 1);
  assert.equal(activation.playerMetadataPostsMaximum, 1);
  assert.equal(activation.credentialsMode, "omit");
  assert.equal(activation.downloadsMaximum, 0);
  assert.equal(activation.audioPlaybackMaximumSeconds, 0);
}

if (!validateExecution) {
  assert.equal(await exists(outputPath), false);
  assert.equal(await exists(executionPath), false);
  assert.equal(await exists(analysisPath), false);
} else {
  assert.equal(await exists(activationPath), true);
  const inventoryBytes = await readFile(outputPath);
  const executionBytes = await readFile(executionPath);
  const analysisBytes = await readFile(analysisPath);
  const inventory = JSON.parse(inventoryBytes);
  const execution = JSON.parse(executionBytes);
  const analysis = JSON.parse(analysisBytes);
  assert.equal(execution.planSha256, sha256(planBytes));
  assert.equal(execution.activationSha256, sha256(await readFile(activationPath)));
  assert.equal(execution.network.configBootstrapGets, 1);
  assert.equal(execution.network.playerMetadataPosts, 1);
  assert.equal(execution.network.credentialsMode, "omit");
  assert.equal(execution.boundary.downloadsStarted, 0);
  assert.equal(execution.boundary.audioPlaybackObservedSeconds, 0);
  assert.equal(execution.boundary.cookiesInspected, 0);
  assert.equal(execution.boundary.browserStorageInspected, 0);
  assert.equal(execution.boundary.modelContexts, 0);
  assert.equal(execution.boundary.paidServiceCalls, 0);
  assert.equal(execution.boundary.directIncrementalCostUsd, 0);
  assert.equal(inventory.sourceVideoId, "HoTILnpd3q8");
  assert.equal(inventory.privacyBoundary.rawSignedUrlsPersisted, false);
  assert.equal(inventory.privacyBoundary.rawPlayerResponsePersisted, false);
  assert.equal(inventory.privacyBoundary.publicApiKeyPersisted, false);
  const serialized = `${inventoryBytes}${executionBytes}${analysisBytes}`;
  assert.equal(serialized.includes("googlevideo.com"), false);
  assert.equal(serialized.includes("AIza"), false);
  for (const format of inventory.formats) {
    assert.deepEqual(
      Object.keys(format).sort(),
      plan.sanitizationContract.persistedFormatFields.sort()
    );
  }
  assert.equal(analysis.preservedControls.audioPlaybackObservedSeconds, 0);
  assert.equal(analysis.preservedControls.downloadsStarted, 0);
  assert.equal(analysis.directIncrementalCostUsd, 0);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      executionValidated: validateExecution,
      credentialsMode: "omit",
      downloads: 0,
      audioPlaybackMaximumSeconds: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
