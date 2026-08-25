#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const validateExecution = process.argv.includes("--execution");
const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction";
const recoveryRoot = `${root}/audio-source-transport-recovery-8`;
const planPath = `${recoveryRoot}/correction-plan.json`;
const activationPath = `${recoveryRoot}/execution-activation.json`;
const executionPath = `${recoveryRoot}/execution.json`;
const analysisPath = `${recoveryRoot}/analysis.json`;
const preparationPath = `${root}/audio-source-preparation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const planBytes = await readFile(planPath);
const plan = JSON.parse(planBytes);
assert.equal(
  plan.status,
  "frozen-one-shot-batch-09-three-source-direct-audio-preparation-recovery-8-ready"
);
assert.deepEqual(plan.exactCohort.sourceOrder, ["170", "19", "183"]);
assert.equal(plan.exactCohort.sourceCount, 3);
assert.equal(plan.exactCohort.clipCount, 4);
assert.equal(plan.publicRequestRoute.configBootstrap.credentials, "omit");
assert.equal(plan.publicRequestRoute.playerMetadata.credentials, "omit");
assert.equal(plan.publicRequestRoute.mediaDownload.credentials, "omit");
assert.equal(plan.executionPolicy.configBootstrapGetsMaximum, 1);
assert.equal(plan.executionPolicy.playerMetadataPostsMaximum, 3);
assert.equal(plan.executionPolicy.mediaDownloadGetsMaximum, 3);
assert.equal(plan.executionPolicy.downloaderRetriesMaximum, 0);
assert.equal(plan.executionPolicy.audioPlaybackCallsMaximum, 0);
assert.equal(plan.executionPolicy.paidServiceCallsMaximum, 0);
for (const source of plan.exactCohort.sources) {
  assert.equal(source.payloadSha256, sha256(JSON.stringify(source.payload)));
}
for (const [file, digest] of Object.entries(plan.authenticatedInputs)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: input hash changed`);
}
for (const [file, digest] of Object.entries(plan.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash changed`);
}
assert.equal(
  sha256(await readFile(plan.protectedInvalidEvidence.path)),
  plan.protectedInvalidEvidence.sha256
);

if (await exists(activationPath)) {
  const activation = JSON.parse(await readFile(activationPath, "utf8"));
  assert.equal(
    activation.status,
    "active-for-exactly-one-batch-09-three-source-direct-audio-preparation-recovery-8-pass"
  );
  assert.equal(activation.plan.sha256, sha256(planBytes));
  assert.deepEqual(activation.authenticatedInputs, plan.authenticatedInputs);
  assert.deepEqual(activation.sourceHashes, plan.sourceHashes);
  assert.deepEqual(activation.sourceOrder, plan.exactCohort.sourceOrder);
  assert.deepEqual(activation.clipOrder, plan.exactCohort.clipOrder);
}

if (!validateExecution) {
  assert.equal(await exists(executionPath), false);
  assert.equal(await exists(analysisPath), false);
  assert.equal(await exists(preparationPath), false);
} else {
  const execution = JSON.parse(await readFile(executionPath, "utf8"));
  const analysis = JSON.parse(await readFile(analysisPath, "utf8"));
  const preparation = JSON.parse(await readFile(preparationPath, "utf8"));
  assert.equal(execution.planSha256, sha256(planBytes));
  assert.equal(execution.activationSha256, sha256(await readFile(activationPath)));
  assert.equal(execution.state.configBootstrapGets, 1);
  assert.equal(execution.state.playerMetadataPosts, 3);
  assert.equal(execution.state.mediaDownloadGets, 3);
  assert.equal(execution.state.sourcesInstalled, 3);
  assert.equal(execution.state.clipsCreated, 4);
  assert.equal(execution.state.retries, 0);
  assert.equal(execution.state.audioPlaybackCalls, 0);
  assert.equal(execution.state.paidServiceCalls, 0);
  assert.equal(execution.state.directIncrementalCostUsd, 0);
  assert.equal(preparation.sources.length, 3);
  assert.equal(preparation.clips.length, 4);
  assert.deepEqual(preparation.sources.map((item) => item.debateNumber), ["170", "19", "183"]);
  for (const source of preparation.sources) {
    assert.equal(sha256(await readFile(source.sourceAudio)), source.sourceAudioSha256);
    assert.equal(source.channels, 1);
    assert.equal(source.sampleRateHz, 16000);
  }
  for (const clip of preparation.clips) {
    assert.equal(sha256(await readFile(clip.clipPath)), clip.clipSha256);
    assert.equal(clip.channels, 1);
    assert.equal(clip.sampleRateHz, 16000);
  }
  assert.equal(analysis.result.completeCohortValidated, true);
  assert.equal(analysis.result.audioPlaybackObservedSeconds, 0);
  assert.equal(analysis.directIncrementalCostUsd, 0);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      executionValidated: validateExecution,
      sources: 3,
      clips: 4,
      retries: 0,
      audioPlaybackMaximumSeconds: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
