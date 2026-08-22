#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, readdir, stat } from "node:fs/promises";

const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-05/disagreement-extraction";
const recoveryRoot = `${root}/audio-source-transport-recovery-1`;
const localRoot =
  "output/transcribe/assessment-production-post-canary-batch-05-audio-verification";
const planPath = `${recoveryRoot}/correction-plan.json`;
const activationPath = `${recoveryRoot}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const [planBytes, activationBytes] = await Promise.all([
  readFile(planPath),
  readFile(activationPath)
]);
const plan = JSON.parse(planBytes);
const activation = JSON.parse(activationBytes);

assert.equal(
  plan.status,
  "frozen-one-shot-batch-05-debate-189-public-source-transport-recovery-ready"
);
assert.equal(
  activation.status,
  "active-for-exactly-one-batch-05-debate-189-public-source-transport-recovery"
);
assert.equal(activation.plan.path, planPath);
assert.equal(activation.plan.sha256, sha256(planBytes));
assert.deepEqual(activation.authenticatedInputs, plan.authenticatedInputs);
assert.deepEqual(activation.protectedMedia, plan.protectedMedia);
assert.deepEqual(activation.exactCohort, plan.exactCohort);
assert.deepEqual(activation.debate189Recovery, plan.debate189Recovery);
assert.deepEqual(activation.debate05OriginalRoute, plan.debate05OriginalRoute);
assert.deepEqual(activation.mediaEncoding, plan.mediaEncoding);
assert.deepEqual(activation.executionPolicy, plan.executionPolicy);
assert.deepEqual(activation.sourceHashes, plan.sourceHashes);
assert.deepEqual(activation.outputs, plan.outputs);

for (const [file, digest] of Object.entries(plan.authenticatedInputs)) {
  assert.equal(sha256(await readFile(file)), digest, `authenticated input changed: ${file}`);
}
for (const [file, digest] of Object.entries(plan.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `recovery source changed: ${file}`);
}
for (const item of plan.protectedMedia) {
  const [bytes, metadata] = await Promise.all([readFile(item.path), stat(item.path)]);
  assert.equal(metadata.size, item.bytes, `${item.path}: byte size changed`);
  assert.equal(sha256(bytes), item.sha256, `${item.path}: hash changed`);
}

assert.equal(plan.batchNumber, 5);
assert.equal(plan.userAuthorization.directIncrementalCostUsdMaximum, 0);
assert.equal(plan.userAuthorization.debate189AdditionalPublicSourceAttemptsAuthorized, 1);
assert.equal(plan.userAuthorization.debate05OriginalPublicSourceAttemptsAuthorized, 1);
assert.equal(plan.userAuthorization.audioPlaybackAuthorized, false);
assert.equal(plan.userAuthorization.semanticAudioEvaluationAuthorized, false);
assert.equal(plan.userAuthorization.modelExecutionAuthorized, false);
assert.equal(plan.userAuthorization.paidServicesAuthorized, false);
assert.equal(plan.userAuthorization.transcriptionAuthorized, false);
assert.equal(plan.exactCohort.sourceCount, 3);
assert.equal(plan.exactCohort.clipCount, 6);
assert.deepEqual(
  plan.exactCohort.sources.map((source) => `${source.debateNumber}:${source.sourceVideoId}:${source.mode}`),
  [
    "158:a-wIaCRIdOA:preserve",
    "189:3DHvNRK452c:recover-once",
    "05:OL8LREmbDi0:original-once"
  ]
);
assert.deepEqual(
  plan.exactCohort.moves.map((move) =>
    `${move.debateNumber}:${move.sourceVideoId}:${move.moveId}:${move.expectedSpeaker}:${move.startMs}-${move.endMs}`
  ),
  [
    "158:a-wIaCRIdOA:pro-case-specific-extraordinary-testimony-standard:Dr Jonathan McLatchie:5502940-5563860",
    "158:a-wIaCRIdOA:con-unverified-resurrection-prior:Matt Dillahunty:5557500-5666020",
    "158:a-wIaCRIdOA:con-no-presented-extrabiblical-support:Matt Dillahunty:8713660-8738100",
    "189:3DHvNRK452c:con-simple-laws-beneath-cell-complexity:Lee Cronin:3019940-3233430",
    "05:OL8LREmbDi0:con-logical-grounding-burden:Matt Dillahunty:4266420-4323699",
    "05:OL8LREmbDi0:pro-logic-reflects-gods-thinking:Sye Ten Bruggencate:4316420-4338820"
  ]
);

const expectedRetryControls = [
  ["--retries", "0"],
  ["--fragment-retries", "0"],
  ["--extractor-retries", "0"],
  ["--file-access-retries", "0"]
];
for (const route of [plan.debate189Recovery, plan.debate05OriginalRoute]) {
  for (const [flag, value] of expectedRetryControls) {
    const index = route.ytDlpArguments.indexOf(flag);
    assert(index >= 0, `${flag} is missing`);
    assert.equal(route.ytDlpArguments[index + 1], value, `${flag} changed`);
  }
}
assert.equal(plan.debate189Recovery.maximumAdditionalCliInvocations, 1);
assert.equal(plan.debate189Recovery.retriesMaximum, 0);
assert.equal(plan.debate189Recovery.minimumDurationMs, 3233430);
assert(plan.debate189Recovery.ytDlpArguments.includes("bestaudio[ext=webm]/bestaudio"));
assert(plan.debate189Recovery.ytDlpArguments.includes("youtube:player_client=android_vr,web_safari"));
assert.equal(plan.debate05OriginalRoute.maximumCliInvocations, 1);
assert.equal(plan.debate05OriginalRoute.retriesMaximum, 0);
assert.equal(plan.debate05OriginalRoute.minimumDurationMs, 4338820);
assert(plan.debate05OriginalRoute.ytDlpArguments.includes("bestaudio/best"));
assert(plan.debate05OriginalRoute.ytDlpArguments.includes("youtube:player_client=android,web"));
assert.equal(plan.executionPolicy.attemptsMaximum, 1);
assert.equal(plan.executionPolicy.downloaderRetriesMaximum, 0);
assert.equal(plan.executionPolicy.rerunsMaximum, 0);
assert.equal(plan.executionPolicy.automaticRepairsMaximum, 0);
assert.equal(plan.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(plan.executionPolicy.audioPlaybackCallsMaximum, 0);
assert.equal(plan.executionPolicy.semanticAudioEvaluationsMaximum, 0);
assert.equal(plan.executionPolicy.modelContextsMaximum, 0);
assert.equal(plan.executionPolicy.transcriptionCallsMaximum, 0);
assert.equal(plan.executionPolicy.paidServiceCallsMaximum, 0);
assert.equal(plan.executionPolicy.scoresDerivedMaximum, 0);
assert.equal(plan.executionPolicy.directIncrementalCostUsdMaximum, 0);
assert.equal(plan.executionPolicy.stopOnAnySourceOrValidationFailure, true);

assert.deepEqual((await readdir(`${localRoot}/debate-189/audio`)).sort(), ["source.mp3"]);
assert(
  !(await exists(`${localRoot}/debate-189/clips`)) ||
    (await readdir(`${localRoot}/debate-189/clips`)).length === 0
);
assert.equal(await exists(`${localRoot}/debate-05/audio/source.mp3`), false);
assert.equal(await exists(plan.debate189Recovery.preservedInvalidEvidencePath), false);
assert.equal(await exists(plan.outputs.execution), false);
assert.equal(await exists(plan.outputs.analysis), false);
assert.equal(await exists(plan.outputs.audioSourcePreparation), false);

console.log(
  JSON.stringify(
    {
      status: "passed",
      planSha256: sha256(planBytes),
      activationSha256: sha256(activationBytes),
      protectedMediaHashes: plan.protectedMedia.length,
      sourcesFrozen: 3,
      clipsFrozen: 6,
      debate189AdditionalDownloadCliInvocationsMaximum: 1,
      debate05DownloadCliInvocationsMaximum: 1,
      downloaderRetries: 0,
      mediaFilesAccessed: 0,
      modelContexts: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
