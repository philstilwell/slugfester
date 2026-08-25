#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

const validateExecution = process.argv.includes("--execution");
const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction";
const recoveryRoot = `${root}/audio-source-alternate-recovery-10`;
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
  "frozen-one-shot-batch-09-user-supplied-alternate-debate-170-source-and-three-source-recovery-ready"
);
assert.equal(plan.userAuthorization.alternateDebate170UrlAuthorizedForVerificationAndOneSourceAttempt, true);
assert.equal(plan.userAuthorization.browserSessionIdentifierPersisted, false);
assert.equal(plan.userAuthorization.browserSessionUsedByThisPass, false);
assert.equal(plan.userAuthorization.credentialsMode, "omit");
assert.equal(plan.alternateSourceVerification.proposedVideoId, "qA7qBtNMayQ");
assert.equal(plan.alternateSourceVerification.canonicalComparison.fullClipLcsOverCanonical, 0.954459);
assert.equal(plan.alternateSourceVerification.canonicalComparison.keyPassageLcsOverCanonical, 0.969697);
assert.deepEqual(plan.debate170AudioOnlyOverlay.alternateClipWindow, {
  startMs: 4469720,
  endMs: 4682720,
  durationMs: 213000
});
assert.equal(plan.debate170AudioOnlyOverlay.canonicalTranscriptPacketsChanged, false);
assert.deepEqual(plan.exactCohort.sourceOrder, ["170", "19", "183"]);
assert.equal(plan.publicRequestRoute.mediaDownload.credentials, "omit");
assert.equal(plan.publicRequestRoute.mediaDownload.redirect, "follow");
assert.equal(plan.executionPolicy.retriesMaximum, 0);
assert.equal(plan.executionPolicy.audioPlaybackCallsMaximum, 0);
for (const [file, digest] of Object.entries(plan.authenticatedInputs)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: input hash changed`);
}
for (const [file, digest] of Object.entries(plan.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source hash changed`);
}
for (const source of plan.exactCohort.sources) {
  assert.equal(source.payloadSha256, sha256(JSON.stringify(source.payload)));
}
if (await exists(activationPath)) {
  const activation = JSON.parse(await readFile(activationPath, "utf8"));
  assert.equal(
    activation.status,
    "active-for-exactly-one-batch-09-user-supplied-alternate-debate-170-source-and-three-source-recovery-pass"
  );
  assert.equal(activation.plan.sha256, sha256(planBytes));
  assert.equal(activation.credentialsMode, "omit");
  assert.equal(activation.browserSessionUsed, false);
  assert.equal(activation.retriesMaximum, 0);
}
if (!validateExecution) {
  assert.equal(await exists(executionPath), false);
  assert.equal(await exists(analysisPath), false);
  assert.equal(await exists(preparationPath), false);
} else {
  const executionBytes = await readFile(executionPath);
  const analysisBytes = await readFile(analysisPath);
  const preparationBytes = await readFile(preparationPath);
  const execution = JSON.parse(executionBytes);
  const analysis = JSON.parse(analysisBytes);
  const preparation = JSON.parse(preparationBytes);
  assert.equal(execution.planSha256, sha256(planBytes));
  assert.equal(execution.activationSha256, sha256(await readFile(activationPath)));
  assert.equal(execution.state.sourcesInstalled, 3);
  assert.equal(execution.state.clipsCreated, 4);
  assert.equal(execution.state.retries, 0);
  assert.equal(execution.state.audioPlaybackCalls, 0);
  assert.equal(execution.state.paidServiceCalls, 0);
  assert.equal(preparation.sources.length, 3);
  assert.equal(preparation.clips.length, 4);
  assert.equal(preparation.sources[0].videoId, "qA7qBtNMayQ");
  assert.equal(preparation.sources[0].canonicalVideoId, "HoTILnpd3q8");
  assert.deepEqual(preparation.clips[0].clipWindow, {
    startMs: 4469720,
    endMs: 4682720,
    paddingMs: 2500
  });
  for (const source of preparation.sources) {
    assert.equal(sha256(await readFile(source.sourceAudio)), source.sourceAudioSha256);
  }
  for (const clip of preparation.clips) {
    assert.equal(sha256(await readFile(clip.clipPath)), clip.clipSha256);
  }
  const serialized = `${executionBytes}${analysisBytes}${preparationBytes}`;
  assert.equal(serialized.includes("AIza"), false);
  assert.equal(serialized.includes("googlevideo.com"), false);
  assert.equal(analysis.result.completeCohortValidated, true);
  assert.equal(analysis.result.browserSessionUsed, false);
  assert.equal(analysis.directIncrementalCostUsd, 0);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      executionValidated: validateExecution,
      alternateVideoId: "qA7qBtNMayQ",
      retries: 0,
      browserSessionUsed: false,
      audioPlaybackMaximumSeconds: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
