#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, readdir, stat } from "node:fs/promises";

const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-05/disagreement-extraction";
const recoveryRoot = `${root}/audio-source-transport-recovery-2`;
const localRoot =
  "output/transcribe/assessment-production-post-canary-batch-05-audio-verification";
const diagnosisPath = `${recoveryRoot}/failure-diagnosis.json`;
const planPath = `${recoveryRoot}/correction-plan.json`;
const activationPath = `${recoveryRoot}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const [diagnosisBytes, planBytes, activationBytes] = await Promise.all([
  readFile(diagnosisPath),
  readFile(planPath),
  readFile(activationPath)
]);
const diagnosis = JSON.parse(diagnosisBytes);
const plan = JSON.parse(planBytes);
const activation = JSON.parse(activationBytes);

assert.equal(
  diagnosis.status,
  "preserved-batch-05-debate-189-recovery-1-http-403-transport-failure-diagnosed"
);
assert.equal(
  plan.status,
  "frozen-one-final-batch-05-debate-189-hls-transport-recovery-ready"
);
assert.equal(
  activation.status,
  "active-for-exactly-one-final-batch-05-debate-189-hls-transport-recovery"
);
assert.equal(plan.diagnosis.path, diagnosisPath);
assert.equal(plan.diagnosis.sha256, sha256(diagnosisBytes));
assert.equal(activation.plan.path, planPath);
assert.equal(activation.plan.sha256, sha256(planBytes));
for (const field of [
  "diagnosis",
  "authenticatedInputs",
  "protectedMedia",
  "toolRuntime",
  "exactCohort",
  "debate189Recovery",
  "debate05OriginalRoute",
  "mediaEncoding",
  "executionPolicy",
  "sourceHashes",
  "outputs"
]) assert.deepEqual(activation[field], plan[field]);

for (const [file, digest] of Object.entries(plan.authenticatedInputs)) {
  assert.equal(sha256(await readFile(file)), digest, `authenticated input changed: ${file}`);
}
for (const [file, digest] of Object.entries(plan.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `recovery-2 source changed: ${file}`);
}
for (const [file, digest] of Object.entries(plan.toolRuntime.files)) {
  assert.equal(sha256(await readFile(file)), digest, `yt-dlp runtime changed: ${file}`);
}
for (const item of plan.protectedMedia) {
  const [bytes, metadata] = await Promise.all([readFile(item.path), stat(item.path)]);
  assert.equal(metadata.size, item.bytes, `${item.path}: byte size changed`);
  assert.equal(sha256(bytes), item.sha256, `${item.path}: hash changed`);
}

assert.equal(diagnosis.preservedFailure.category, "public-source-direct-media-transport-http-403");
assert.equal(diagnosis.preservedFailure.exactError, "ERROR: unable to download video data: HTTP Error 403: Forbidden");
assert.equal(diagnosis.preservedFailure.downloadCliInvocations, 1);
assert.equal(diagnosis.preservedFailure.retries, 0);
assert.equal(diagnosis.preservedFailure.debate05Invocations, 0);
assert.equal(diagnosis.diagnosis.exactServerPolicyCauseEstablished, false);
assert.equal(diagnosis.diagnosis.sourceIdentityChanged, false);
assert.equal(diagnosis.diagnosis.protectedEvidenceChanged, false);
assert.equal(diagnosis.diagnosis.failedPartialOutputAcceptedOrReused, false);
assert.equal(diagnosis.boundedAlternative.playerClient, "web_safari");
assert.equal(diagnosis.boundedAlternative.formatSelector, "best[protocol^=m3u8]");
assert.equal(diagnosis.boundedAlternative.downloader, "m3u8:native");
assert.equal(diagnosis.boundedAlternative.attemptsMaximum, 1);
assert.equal(diagnosis.boundedAlternative.retriesMaximum, 0);

assert.equal(plan.userAuthorization.oneTimeRecursiveRecoveryException, true);
assert.equal(plan.userAuthorization.directIncrementalCostUsdMaximum, 0);
assert.equal(plan.userAuthorization.debate189FinalPublicSourceAttemptsAuthorized, 1);
assert.equal(plan.userAuthorization.debate05OriginalPublicSourceAttemptsAuthorized, 1);
assert.equal(plan.exactCohort.sourceCount, 3);
assert.equal(plan.exactCohort.clipCount, 6);
assert.deepEqual(
  plan.exactCohort.sources.map((item) => `${item.debateNumber}:${item.sourceVideoId}:${item.mode}`),
  [
    "158:a-wIaCRIdOA:preserve",
    "189:3DHvNRK452c:final-hls-recovery-once",
    "05:OL8LREmbDi0:original-once"
  ]
);
assert.equal(plan.debate189Recovery.videoUrl, "https://www.youtube.com/watch?v=3DHvNRK452c");
assert.equal(plan.debate189Recovery.transport, "web-safari-hls-manifest-native-segment-transport");
assert(plan.debate189Recovery.ytDlpArguments.includes("youtube:player_client=web_safari"));
assert(plan.debate189Recovery.ytDlpArguments.includes("best[protocol^=m3u8]"));
const downloaderIndex = plan.debate189Recovery.ytDlpArguments.indexOf("--downloader");
assert.equal(plan.debate189Recovery.ytDlpArguments[downloaderIndex + 1], "m3u8:native");
for (const route of [plan.debate189Recovery, plan.debate05OriginalRoute]) {
  for (const flag of ["--retries", "--fragment-retries", "--extractor-retries", "--file-access-retries"]) {
    const index = route.ytDlpArguments.indexOf(flag);
    assert(index >= 0, `${flag} missing`);
    assert.equal(route.ytDlpArguments[index + 1], "0", `${flag} changed`);
  }
}
assert.equal(plan.executionPolicy.attemptsMaximum, 1);
assert.equal(plan.executionPolicy.debate189FinalDownloadAttemptsMaximum, 1);
assert.equal(plan.executionPolicy.debate05DownloadAttemptsMaximum, 1);
assert.equal(plan.executionPolicy.downloaderRetriesMaximum, 0);
assert.equal(plan.executionPolicy.rerunsMaximum, 0);
assert.equal(plan.executionPolicy.automaticRepairsMaximum, 0);
assert.equal(plan.executionPolicy.failedRecovery1PartialOutputReuseMaximum, 0);
assert.equal(plan.executionPolicy.stopOnAnySourceOrValidationFailure, true);
assert.equal(plan.executionPolicy.directIncrementalCostUsdMaximum, 0);

assert.deepEqual((await readdir(`${localRoot}/debate-189/audio`)).sort(), [
  "source.failed-attempt-1.mp3",
  "source.mp3"
]);
assert.equal(await exists(`${localRoot}/debate-05/audio/source.mp3`), false);
assert.equal(await exists(plan.outputs.execution), false);
assert.equal(await exists(plan.outputs.analysis), false);
assert.equal(await exists(plan.outputs.audioSourcePreparation), false);

console.log(JSON.stringify({
  status: "passed",
  diagnosisSha256: sha256(diagnosisBytes),
  planSha256: sha256(planBytes),
  activationSha256: sha256(activationBytes),
  protectedMediaHashes: plan.protectedMedia.length,
  sourcesFrozen: 3,
  clipsFrozen: 6,
  debate189FinalDownloadCliInvocationsMaximum: 1,
  debate05DownloadCliInvocationsMaximum: 1,
  downloaderRetries: 0,
  mediaFilesAccessed: 0,
  modelContexts: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0
}, null, 2));
