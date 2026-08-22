#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, readdir, stat } from "node:fs/promises";

const root = "docs/assessment-production/post-canary-continuation-v1/batch-05/disagreement-extraction";
const recoveryRoot = `${root}/audio-source-transport-recovery-3`;
const localRoot = "output/transcribe/assessment-production-post-canary-batch-05-audio-verification";
const discoveryPath = `${recoveryRoot}/route-discovery.json`;
const diagnosisPath = `${recoveryRoot}/failure-diagnosis.json`;
const planPath = `${recoveryRoot}/correction-plan.json`;
const activationPath = `${recoveryRoot}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const [discoveryBytes, diagnosisBytes, planBytes, activationBytes] = await Promise.all([
  readFile(discoveryPath), readFile(diagnosisPath), readFile(planPath), readFile(activationPath)
]);
const discovery = JSON.parse(discoveryBytes);
const diagnosis = JSON.parse(diagnosisBytes);
const plan = JSON.parse(planBytes);
const activation = JSON.parse(activationBytes);

assert.equal(discovery.status, "accepted-read-only-public-route-discovery-official-broadcaster-mp3-available");
assert.equal(diagnosis.status, "preserved-recovery-2-no-hls-format-failure-diagnosed-official-route-selected");
assert.equal(plan.status, "frozen-one-shot-official-broadcaster-batch-05-debate-189-audio-recovery-ready");
assert.equal(activation.status, "active-for-exactly-one-official-broadcaster-debate-189-download-and-cohort-completion");
assert.equal(plan.routeDiscovery.sha256, sha256(discoveryBytes));
assert.equal(plan.diagnosis.sha256, sha256(diagnosisBytes));
assert.equal(activation.plan.sha256, sha256(planBytes));
for (const key of [
  "routeDiscovery", "diagnosis", "authenticatedInputs", "protectedMedia", "exactCohort",
  "debate189Recovery", "debate05OriginalRoute", "mediaEncoding", "executionPolicy", "sourceHashes", "outputs"
]) assert.deepEqual(activation[key], plan[key]);
for (const [file, digest] of Object.entries(plan.authenticatedInputs)) {
  assert.equal(sha256(await readFile(file)), digest, `authenticated input changed: ${file}`);
}
for (const [file, digest] of Object.entries(plan.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `recovery-3 source changed: ${file}`);
}
for (const item of plan.protectedMedia) {
  const [bytes, metadata] = await Promise.all([readFile(item.path), stat(item.path)]);
  assert.equal(metadata.size, item.bytes);
  assert.equal(sha256(bytes), item.sha256);
}

assert.deepEqual(discovery.networkBoundary, {
  metadataRequestsOnly: true,
  mediaDownloadAttempts: 0,
  mediaBytesSaved: 0,
  privateCookiesUsed: false,
  authenticationUsed: false,
  paidServicesUsed: false,
  directIncrementalCostUsd: 0
});
assert.equal(discovery.youtubeMetadata.durationSeconds, 4816);
assert.deepEqual(discovery.youtubeMetadata.availableUntriedAndroidVrAacFormats, ["139", "140"]);
assert.equal(discovery.officialBroadcasterRoute.publisher, "Premier Unbelievable?");
assert.equal(discovery.officialBroadcasterRoute.contentType, "audio/mpeg");
assert.equal(discovery.officialBroadcasterRoute.contentLengthBytes, 51845141);
assert.equal(discovery.officialBroadcasterRoute.statedDuration, "01:48:00");
assert.equal(discovery.sourceEquivalence.canonicalEvidenceSourceChanged, false);
assert.equal(discovery.sourceEquivalence.canonicalTranscriptChanged, false);
assert.equal(discovery.sourceEquivalence.packetOrJudgmentChanged, false);
assert.equal(discovery.sourceEquivalence.audioDeliveryProviderChanged, true);
assert.equal(discovery.sourceEquivalence.semanticAudioEvaluationPerformed, false);
assert.equal(diagnosis.preservedFailure.category, "requested-web-safari-hls-format-unavailable");
assert.equal(diagnosis.preservedFailure.downloadCliInvocations, 1);
assert.equal(diagnosis.preservedFailure.debate05Invocations, 0);
assert.equal(diagnosis.diagnosis.mediaBytesDownloadedByRecovery2, 0);
assert.equal(diagnosis.selectedCorrection.attemptsMaximum, 1);
assert.equal(diagnosis.selectedCorrection.retriesMaximum, 0);

assert.equal(plan.userAuthorization.directIncrementalCostUsdMaximum, 0);
assert.equal(plan.userAuthorization.debate189PublicSourceAttemptsAuthorized, 1);
assert.equal(plan.userAuthorization.debate05OriginalPublicSourceAttemptsAuthorized, 1);
assert.equal(plan.userAuthorization.privateCookiesAuthorized, false);
assert.equal(plan.exactCohort.sourceCount, 3);
assert.equal(plan.exactCohort.clipCount, 6);
assert.equal(plan.debate189Recovery.canonicalSourceVideoId, "3DHvNRK452c");
assert.equal(plan.debate189Recovery.deliverySource, "official-broadcaster-same-episode-mp3");
assert.equal(plan.debate189Recovery.expectedDownloadedBytes, 51845141);
assert.equal(plan.debate189Recovery.maximumDownloadCliInvocations, 1);
assert.equal(plan.debate189Recovery.retriesMaximum, 0);
assert(plan.debate189Recovery.downloadUrl.startsWith("https://pcr-od.streamguys1.com/"));
assert(plan.debate189Recovery.curlArguments.includes("--retry"));
assert.equal(
  plan.debate189Recovery.curlArguments[plan.debate189Recovery.curlArguments.indexOf("--retry") + 1],
  "0"
);
for (const flag of ["--retries", "--fragment-retries", "--extractor-retries", "--file-access-retries"]) {
  const index = plan.debate05OriginalRoute.ytDlpArguments.indexOf(flag);
  assert(index >= 0);
  assert.equal(plan.debate05OriginalRoute.ytDlpArguments[index + 1], "0");
}
assert.equal(plan.executionPolicy.attemptsMaximum, 1);
assert.equal(plan.executionPolicy.debate189DownloadAttemptsMaximum, 1);
assert.equal(plan.executionPolicy.debate05DownloadAttemptsMaximum, 1);
assert.equal(plan.executionPolicy.downloaderRetriesMaximum, 0);
assert.equal(plan.executionPolicy.rerunsMaximum, 0);
assert.equal(plan.executionPolicy.privateCookieReadsMaximum, 0);
assert.equal(plan.executionPolicy.failedPartialOutputReuseMaximum, 0);
assert.equal(plan.executionPolicy.stopOnAnySourceOrValidationFailure, true);

assert.deepEqual((await readdir(`${localRoot}/debate-189/audio`)).sort(), [
  "source.failed-attempt-1.mp3", "source.mp3"
]);
assert.equal(await exists(`${localRoot}/debate-05/audio/source.mp3`), false);
assert.equal(await exists(plan.debate189Recovery.downloadPath), false);
assert.equal(await exists(plan.outputs.execution), false);
assert.equal(await exists(plan.outputs.analysis), false);
assert.equal(await exists(plan.outputs.audioSourcePreparation), false);

console.log(JSON.stringify({
  status: "passed",
  routeDiscoverySha256: sha256(discoveryBytes),
  diagnosisSha256: sha256(diagnosisBytes),
  planSha256: sha256(planBytes),
  activationSha256: sha256(activationBytes),
  protectedMediaHashes: plan.protectedMedia.length,
  sourcesFrozen: 3,
  clipsFrozen: 6,
  officialDownloadAttemptsMaximum: 1,
  debate05DownloadAttemptsMaximum: 1,
  retries: 0,
  mediaBytesDownloaded: 0,
  privateCookieReads: 0,
  modelContexts: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0
}, null, 2));
