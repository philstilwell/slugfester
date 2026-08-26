#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, stat } from "node:fs/promises";

const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-10/disagreement-extraction";
const planPath = `${root}/audio-source-header-parity-recovery-6/correction-plan.json`;
const activationPath = `${root}/audio-source-header-parity-recovery-6/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const plan = JSON.parse(await readFile(planPath, "utf8"));

assert.equal(
  plan.status,
  "frozen-one-shot-batch-10-three-source-format139-header-parity-manual-googlevideo-redirect-recovery-ready"
);
assert.equal(plan.batchNumber, 10);
assert.equal(plan.userAuthorization.instruction, "Understood. Continue at your discretion.");
assert.equal(
  plan.userAuthorization.interpretation,
  "continue-with-one-bounded-zero-cost-header-parity-correction-under-existing-batch-10-source-and-transcription-limits"
);
assert.equal(plan.userAuthorization.freshUrlResolutionsAuthorized, 3);
assert.equal(plan.userAuthorization.logicalPublicSourceDownloadsAuthorized, 3);
assert.equal(plan.userAuthorization.standardRequestHeaderFieldsAuthorized, 4);
assert.equal(plan.userAuthorization.redirectsPerRangeMaximum, 3);
assert.equal(plan.userAuthorization.finalHttp206Required, true);
assert.equal(
  plan.userAuthorization.redirectDestinationsLimitedToHttpsGooglevideo,
  true
);
assert.equal(
  plan.userAuthorization.freshDebate123TransferAfterZeroByteStopAuthorized,
  true
);
assert.equal(plan.userAuthorization.repeatedByteRangesAuthorized, false);
assert.equal(plan.userAuthorization.directIncrementalCostUsdMaximum, 0);
assert.equal(plan.userAuthorization.audioPlaybackAuthorized, false);
assert.equal(plan.userAuthorization.semanticAudioEvaluationAuthorized, false);
assert.equal(plan.userAuthorization.automaticRetriesAuthorized, false);
assert.equal(plan.userAuthorization.sequentialTranscriptionEstimateUsd, 0.1308768);
assert.equal(plan.userAuthorization.sequentialTranscriptionMaximumUsd, 1);
assert.equal(plan.protectedInvalidEvidence.length, 9);
for (const evidence of plan.protectedInvalidEvidence) {
  const bytes = await readFile(evidence.path);
  assert.equal(bytes.length, evidence.bytes);
  assert.equal((await stat(evidence.path)).size, evidence.bytes);
  assert.equal(sha256(bytes), evidence.sha256);
}
assert.equal(plan.exactCohort.sourceCount, 5);
assert.equal(plan.exactCohort.clipCount, 9);
assert.equal(plan.exactCohort.sources.length, 5);
assert.equal(plan.exactCohort.moves.length, 9);
assert.equal(plan.acceptedPrefixSources.length, 2);
assert.equal(plan.headerParitySources.length, 3);
assert.deepEqual(
  plan.headerParitySources.map((item) => item.sourceVideoId),
  ["8k9A7d2Wnjk", "h-I_9e5qxnc", "0IpKHdVLZb4"]
);
assert.deepEqual(
  plan.headerParitySources.map((item) => item.declaredBytes),
  [37050541, 24192081, 54678961]
);
assert(plan.headerParitySources.every((item) => item.formatId === "139"));
assert(plan.headerParitySources.every((item) => item.protocol === "https"));
assert(plan.headerParitySources.every((item) => item.audioCodec === "mp4a.40.5"));
assert.deepEqual(
  plan.headerParitySources.map((item) => item.rangeHttpGetInvocationsMaximum),
  [5, 3, 7]
);
assert(plan.headerParitySources.every((item) => item.rangeChunkBytes === 8388608));
assert(plan.headerParitySources.every((item) => item.curlRetriesMaximum === 0));
assert(plan.headerParitySources.every((item) => item.redirectsPerRangeMaximum === 3));
assert(plan.headerParitySources.every((item) => item.finalHttp206Required === true));
assert(plan.headerParitySources.every(
  (item) => item.redirectDestinationProtocolRequired === "https:"
));
assert(plan.headerParitySources.every(
  (item) => item.redirectDestinationHostnameSuffixRequired === ".googlevideo.com"
));
assert.deepEqual(
  plan.headerParitySources.map((item) => item.redirectsMaximum),
  [15, 9, 21]
);
assert(plan.headerParitySources.every((item) => item.byteRangeRepeatAuthorized === false));
const expectedHeaderNames = [
  "User-Agent", "Accept", "Accept-Language", "Sec-Fetch-Mode"
];
assert(plan.headerParitySources.every((item) =>
  JSON.stringify(Object.keys(item.requestHeaders)) ===
    JSON.stringify(expectedHeaderNames)
));
assert.deepEqual(plan.headerParitySources[0].requestHeaders, {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-us,en;q=0.5",
  "Sec-Fetch-Mode": "navigate"
});
assert(plan.headerParitySources.every(
  (item) => item.requestHeaderSource.package === "yt-dlp" &&
    item.requestHeaderSource.installedVersion === "2026.03.17" &&
    item.requestHeaderSource.symbol === "yt_dlp.utils.std_headers"
));
assert.equal(plan.transportDiagnosis.priorMediaBytesReceived, 0);
assert.equal(
  plan.transportDiagnosis.requiredCorrection,
  "match-exact-local-ytdlp-standard-http-headers-while-preserving-manual-googlevideo-redirect-range-controls"
);
assert.equal(plan.executionPolicy.attemptsMaximum, 1);
assert.equal(plan.executionPolicy.directUrlResolutionInvocationsMaximum, 3);
assert.equal(plan.executionPolicy.publicSourceDownloadsMaximum, 3);
assert.equal(plan.executionPolicy.rangeHttpGetInvocationsMaximum, 15);
assert.equal(plan.executionPolicy.manualHttpRequestsMaximum, 60);
assert.equal(plan.executionPolicy.finalHttp206ResponsesRequired, 15);
assert.equal(plan.executionPolicy.redirectsMaximum, 45);
assert.equal(plan.executionPolicy.redirectsPerRangeMaximum, 3);
assert.equal(plan.executionPolicy.httpResponseHopsMaximum, 60);
assert.equal(plan.executionPolicy.repeatedByteRangesMaximum, 0);
assert.equal(plan.executionPolicy.curlRetriesMaximum, 0);
assert.equal(plan.executionPolicy.downloaderRetriesMaximum, 0);
assert.equal(plan.executionPolicy.rerunsMaximum, 0);
assert.equal(plan.executionPolicy.timeoutExtensionsMaximum, 0);
assert.equal(plan.executionPolicy.audioPlaybackCallsMaximum, 0);
assert.equal(plan.executionPolicy.semanticAudioEvaluationsMaximum, 0);
assert.equal(plan.executionPolicy.modelContextsMaximum, 0);
assert.equal(plan.executionPolicy.paidServiceCallsMaximum, 0);
assert.equal(plan.executionPolicy.directIncrementalCostUsdMaximum, 0);
for (const [file, digest] of Object.entries(plan.authenticatedInputs)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: input changed`);
}
for (const [file, digest] of Object.entries(plan.sourceHashes)) {
  assert.equal(sha256(await readFile(file)), digest, `${file}: source changed`);
}
assert.equal(await exists(plan.outputs.executionPath), false);
assert.equal(await exists(plan.outputs.preparationPath), false);

if (await exists(activationPath)) {
  const activation = JSON.parse(await readFile(activationPath, "utf8"));
  assert.equal(
    activation.status,
    "active-for-exactly-one-batch-10-three-source-format139-header-parity-manual-googlevideo-redirect-recovery"
  );
  assert.equal(activation.plan.sha256, sha256(await readFile(planPath)));
  assert.deepEqual(activation.authenticatedInputs, plan.authenticatedInputs);
  assert.deepEqual(activation.sourceHashes, plan.sourceHashes);
  assert.equal(activation.activatedExecutionMaximum, 1);
}

console.log(JSON.stringify({
  status: "passed",
  sources: 5,
  clips: 9,
  manualRedirectDownloads: 3,
  protectedInvalidFiles: 9,
  standardRequestHeaderFields: 4,
  activationPresent: await exists(activationPath),
  retries: 0,
  audioPlaybackCalls: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0
}, null, 2));
