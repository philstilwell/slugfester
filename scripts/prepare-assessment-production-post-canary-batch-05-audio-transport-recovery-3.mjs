#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const write = process.argv.includes("--write");
const root = "docs/assessment-production/post-canary-continuation-v1/batch-05/disagreement-extraction";
const recoveryRoot = `${root}/audio-source-transport-recovery-3`;
const localRoot = "output/transcribe/assessment-production-post-canary-batch-05-audio-verification";
const standingPath = "docs/assessment-production/post-canary-continuation-v1/batch-05/standing-authorization.json";
const workPreparationPath = `${root}/audio-work-item-preparation.json`;
const workPath = `${root}/audio-work-items.json`;
const originalDiagnosisPath = `${root}/audio-source-preparation-failure-diagnosis.json`;
const discoveryPath = `${recoveryRoot}/route-discovery.json`;
const diagnosisPath = `${recoveryRoot}/failure-diagnosis.json`;
const planPath = `${recoveryRoot}/correction-plan.json`;
const activationPath = `${recoveryRoot}/execution-activation.json`;
const executionPath = `${recoveryRoot}/execution.json`;
const analysisPath = `${recoveryRoot}/analysis.json`;
const finalPreparationPath = `${root}/audio-source-preparation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const recoveryInputs = [
  `${root}/audio-source-transport-recovery-1/correction-plan.json`,
  `${root}/audio-source-transport-recovery-1/execution-activation.json`,
  `${root}/audio-source-transport-recovery-1/execution.json`,
  `${root}/audio-source-transport-recovery-2/failure-diagnosis.json`,
  `${root}/audio-source-transport-recovery-2/correction-plan.json`,
  `${root}/audio-source-transport-recovery-2/execution-activation.json`,
  `${root}/audio-source-transport-recovery-2/execution.json`
];
const inputPaths = [standingPath, workPreparationPath, workPath, originalDiagnosisPath, ...recoveryInputs];
const inputEntries = await Promise.all(inputPaths.map(async (file) => [file, await readFile(file)]));
const inputBytes = Object.fromEntries(inputEntries);
const standing = JSON.parse(inputBytes[standingPath]);
const workPreparation = JSON.parse(inputBytes[workPreparationPath]);
const work = JSON.parse(inputBytes[workPath]);
const recovery2Plan = JSON.parse(inputBytes[`${root}/audio-source-transport-recovery-2/correction-plan.json`]);
const recovery2Execution = JSON.parse(inputBytes[`${root}/audio-source-transport-recovery-2/execution.json`]);

const USER_AUTHORIZATION =
  "The user replied 'I authorize that' to authorization for deterministic diagnosis of the preserved Debate 189 recovery-2 failure, read-only public metadata and route discovery, one newly frozen public-source download attempt without private cookies or retries, and automatic continuation through Debate 05 and complete cohort validation if successful, with direct incremental cost capped at $0.";

assertV4(
  standing.status === "frozen-active-batch-05-complete-remaining-workflow-standing-authorization",
  "Batch 5 standing authorization changed"
);
assertV4(
  workPreparation.status ===
      "prepared-and-frozen-six-post-canary-batch-05-local-audio-source-work-items-standing-authorization-active-for-audio-preparation" &&
    work.moves.length === 6,
  "Batch 5 audio work items changed"
);
assertV4(
  recovery2Execution.status === "failed-one-final-batch-05-audio-source-transport-recovery-2-stop-required" &&
    recovery2Execution.planSha256 === sha256(inputBytes[`${root}/audio-source-transport-recovery-2/correction-plan.json`]) &&
    recovery2Execution.state.debate189FinalDownloadCliInvocations === 1 &&
    recovery2Execution.state.debate05DownloadCliInvocations === 0 &&
    recovery2Execution.failure.message.includes("best[protocol^=m3u8]"),
  "preserved recovery-2 failure changed"
);

const protectedMedia = [
  ["debate-158/audio/source.mp3", 55686450, "15d94c9b74f31a2f774eb978d0eafeb0ed0834b81a733974d49da99628b8db7e"],
  ["debate-158/clips/pro-case-specific-extraordinary-testimony-standard.mp3", 488586, "f075d635613d3d81bf99d46c234ab6d5a0ffefcb162aba7005c51cafe42c1e18"],
  ["debate-158/clips/con-unverified-resurrection-prior.mp3", 869322, "15261f91246b43db0e1cabd74073b0726f700997aa7defff5f5b84a6065c7206"],
  ["debate-158/clips/con-no-presented-extrabiblical-support.mp3", 196554, "2e9046da3a5fbdca1e6d7bba7d8108b8fb8ffae5c9e25263c9ae7ff4a64abc3e"],
  ["debate-189/audio/source.mp3", 354, "87965bd54bc175f5645aa773bd5a0a98c396524a0dd0c4e94463828c11ed2754"],
  ["debate-189/audio/source.failed-attempt-1.mp3", 354, "87965bd54bc175f5645aa773bd5a0a98c396524a0dd0c4e94463828c11ed2754"]
].map(([relativePath, bytes, digest]) => ({ path: `${localRoot}/${relativePath}`, bytes, sha256: digest }));
for (const item of protectedMedia) {
  const [bytes, metadata] = await Promise.all([readFile(item.path), stat(item.path)]);
  assertV4(metadata.size === item.bytes && sha256(bytes) === item.sha256, `${item.path}: protected evidence changed`);
}
assertV4(
  JSON.stringify((await readdir(`${localRoot}/debate-189/audio`)).sort()) ===
    JSON.stringify(["source.failed-attempt-1.mp3", "source.mp3"]),
  "Debate 189 source frontier changed"
);
assertV4(!(await exists(`${localRoot}/debate-05/audio/source.mp3`)), "Debate 05 is no longer unattempted");
for (const file of [discoveryPath, diagnosisPath, planPath, activationPath, executionPath, analysisPath, finalPreparationPath]) {
  if (write) assertV4(!(await exists(file)), `${file} already exists`);
}

const expectedMoves = work.moves.map((move) => ({
  debateNumber: move.debateNumber,
  sourceVideoId: move.sourceVideoId,
  moveId: move.moveId,
  expectedSpeaker: move.expectedSpeaker,
  startMs: move.clipWindow.startMs,
  endMs: move.clipWindow.endMs
}));
assertV4(
  JSON.stringify(expectedMoves.map((move) => `${move.debateNumber}:${move.moveId}`)) ===
    JSON.stringify([
      "158:pro-case-specific-extraordinary-testimony-standard",
      "158:con-unverified-resurrection-prior",
      "158:con-no-presented-extrabiblical-support",
      "189:con-simple-laws-beneath-cell-complexity",
      "05:con-logical-grounding-burden",
      "05:pro-logic-reflects-gods-thinking"
    ]),
  "exact six-move cohort changed"
);

const officialPage =
  "https://www.premier.plus/unbelievable/podcasts/episodes/origins-of-life-debate-round-2-james-tour-vs-lee-cronin?form=pcrweb";
const officialAudio =
  "https://pcr-od.streamguys1.com/the-unbelievable/20230302092128-unbelievable_28_feb_2020_-_origins_of_life_round_2.mp3?awCollectionId=Unbelievable&awGenre=Religion+and+Spirituality&awEpisodeId=20230302092128-unbelievable_28_feb_2020_-_origins_of_life_round_2";
const routeDiscovery = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-debate-189-public-route-discovery",
  status: "accepted-read-only-public-route-discovery-official-broadcaster-mp3-available",
  batchNumber: 5,
  debateNumber: "189",
  canonicalSourceVideoId: "3DHvNRK452c",
  userAuthorization: USER_AUTHORIZATION,
  networkBoundary: {
    metadataRequestsOnly: true,
    mediaDownloadAttempts: 0,
    mediaBytesSaved: 0,
    privateCookiesUsed: false,
    authenticationUsed: false,
    paidServicesUsed: false,
    directIncrementalCostUsd: 0
  },
  youtubeMetadata: {
    url: "https://www.youtube.com/watch?v=3DHvNRK452c",
    title: "Are we close to discovering the Origin Of Life? James Tour vs Lee Cronin",
    durationSeconds: 4816,
    availableUntriedAndroidVrAacFormats: ["139", "140"],
    exhaustedRoutes: [
      "android-or-web-progressive-original-route-produced-empty-normalized-output",
      "android-vr-web-safari-webm-format-251-returned-http-403",
      "web-safari-hls-route-exposed-no-hls-format"
    ]
  },
  officialBroadcasterRoute: {
    publisher: "Premier Unbelievable?",
    episodePage: officialPage,
    episodePageObservedSha256: "65f78300b1fde6904392652e90c944b5d5d54e19599eb595dfc7de380f725cee",
    episodePageObservedBytes: 131643,
    title: "Origins of Life Debate Round 2 - James Tour vs Lee Cronin",
    released: "2020-02-28",
    statedDuration: "01:48:00",
    statedParticipants: ["James Tour", "Lee Cronin"],
    audioUrl: officialAudio,
    headStatus: 200,
    contentType: "audio/mpeg",
    acceptRanges: "bytes",
    contentLengthBytes: 51845141,
    deliveryHost: "pcr-od.streamguys1.com"
  },
  sourceEquivalence: {
    canonicalEvidenceSourceChanged: false,
    canonicalTranscriptChanged: false,
    canonicalEventsChanged: false,
    packetOrJudgmentChanged: false,
    audioDeliveryProviderChanged: true,
    sameEpisodeEstablishedByPublisherTitleDateParticipantsAndDescription: true,
    localCanonicalOpening: "well today on the show it's round two debating the origins of life James Tour and Lee Cronin join me on the show today",
    publicEpisodeTranscriptOpening: "Today on the show it's Round 2, debating the origins of life. James Tour and Lee Cronin join me on the show today.",
    clipWindowsRemainCanonicalYoutubeMilliseconds: true,
    semanticAudioEvaluationPerformed: false
  },
  selectedRoute: "official-broadcaster-same-episode-mp3-delivery",
  nextAction: "freeze-one-official-broadcaster-download-attempt"
};
const discoveryBytes = Buffer.from(`${JSON.stringify(routeDiscovery, null, 2)}\n`);
const diagnosis = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-audio-source-transport-recovery-3-diagnosis",
  status: "preserved-recovery-2-no-hls-format-failure-diagnosed-official-route-selected",
  batchNumber: 5,
  userAuthorization: USER_AUTHORIZATION,
  preservedFailure: {
    path: `${root}/audio-source-transport-recovery-2/execution.json`,
    sha256: sha256(inputBytes[`${root}/audio-source-transport-recovery-2/execution.json`]),
    category: "requested-web-safari-hls-format-unavailable",
    exactStderrEvidence: "ERROR: [youtube] 3DHvNRK452c: Requested format is not available.",
    exactStderrEvidenceLocation: "preserved-current-task-execution-transcript",
    downloadCliInvocations: 1,
    debate05Invocations: 0,
    retries: 0
  },
  diagnosis: {
    failureBoundary: "format-selection-before-media-download",
    mediaBytesDownloadedByRecovery2: 0,
    canonicalSourceIdentityChanged: false,
    protectedEvidenceChanged: false,
    modelOrPaidServiceUsed: false,
    failedPartialOutputAcceptedOrReused: false
  },
  selectedCorrection: {
    routeDiscovery: { path: discoveryPath, sha256: sha256(discoveryBytes) },
    route: routeDiscovery.selectedRoute,
    canonicalEvidenceRemainsYoutubeVideoId: "3DHvNRK452c",
    officialEpisodeAudioUsedOnlyForLocalAudioVerification: true,
    attemptsMaximum: 1,
    retriesMaximum: 0,
    directIncrementalCostUsdMaximum: 0
  },
  authenticatedInputs: Object.fromEntries(inputEntries.map(([file, bytes]) => [file, sha256(bytes)])),
  nextAction: "freeze-validate-commit-and-push-recovery-3-before-media-download"
};
const diagnosisBytes = Buffer.from(`${JSON.stringify(diagnosis, null, 2)}\n`);

const scripts = [
  "scripts/prepare-assessment-production-post-canary-batch-05-audio-transport-recovery-3.mjs",
  "scripts/run-assessment-production-post-canary-batch-05-audio-transport-recovery-3.mjs",
  "scripts/test-assessment-production-post-canary-batch-05-audio-transport-recovery-3-preparation.mjs",
  "scripts/test-assessment-production-post-canary-batch-05-audio-source-recovery-3-cohort.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-05-audio-sources.mjs",
  "scripts/test-assessment-production-post-canary-batch-05-audio-sources.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-standing-authorization.mjs",
  "scripts/lib/v4-lean-production.mjs"
];
const sourceHashes = {};
for (const file of scripts) sourceHashes[file] = sha256(await readFile(file));

const debate189Recovery = {
  canonicalSourceVideoId: "3DHvNRK452c",
  deliverySource: "official-broadcaster-same-episode-mp3",
  officialEpisodePage: officialPage,
  downloadUrl: officialAudio,
  downloadPath: `${localRoot}/debate-189/audio/source.recovery-3.official.mp3`,
  normalizedTemporaryPath: `${localRoot}/debate-189/audio/source.recovery-3.normalized.mp3`,
  finalSourcePath: `${localRoot}/debate-189/audio/source.mp3`,
  preservedInvalidEvidencePath: `${localRoot}/debate-189/audio/source.failed-attempt-1.mp3`,
  expectedDownloadedBytes: 51845141,
  expectedContentType: "audio/mpeg",
  statedDurationSeconds: 6480,
  acceptableDurationSeconds: { minimum: 6400, maximum: 6560 },
  minimumRequiredEndMs: 3233430,
  curlArguments: [
    "--fail", "--location", "--silent", "--show-error", "--retry", "0",
    "--connect-timeout", "20", "--max-time", "300", "--proto", "=https",
    "--tlsv1.2", "--output", `${localRoot}/debate-189/audio/source.recovery-3.official.mp3`,
    officialAudio
  ],
  maximumDownloadCliInvocations: 1,
  retriesMaximum: 0
};
const plan = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-audio-source-transport-recovery-3-plan",
  status: "frozen-one-shot-official-broadcaster-batch-05-debate-189-audio-recovery-ready",
  batchNumber: 5,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  userAuthorization: {
    instruction: USER_AUTHORIZATION,
    recursiveRecoveryException: true,
    directIncrementalCostUsdMaximum: 0,
    debate189PublicSourceAttemptsAuthorized: 1,
    debate05OriginalPublicSourceAttemptsAuthorized: 1,
    privateCookiesAuthorized: false,
    audioPlaybackAuthorized: false,
    semanticAudioEvaluationAuthorized: false,
    modelsAuthorizedThisStage: false,
    paidServicesAuthorizedThisStage: false
  },
  routeDiscovery: { path: discoveryPath, sha256: sha256(discoveryBytes) },
  diagnosis: { path: diagnosisPath, sha256: sha256(diagnosisBytes) },
  authenticatedInputs: Object.fromEntries(inputEntries.map(([file, bytes]) => [file, sha256(bytes)])),
  protectedMedia,
  exactCohort: {
    sources: [
      { debateNumber: "158", sourceVideoId: "a-wIaCRIdOA", mode: "preserve" },
      { debateNumber: "189", sourceVideoId: "3DHvNRK452c", mode: "official-broadcaster-route-once" },
      { debateNumber: "05", sourceVideoId: "OL8LREmbDi0", mode: "original-once" }
    ],
    moves: expectedMoves,
    sourceCount: 3,
    clipCount: 6
  },
  debate189Recovery,
  debate05OriginalRoute: structuredClone(recovery2Plan.debate05OriginalRoute),
  mediaEncoding: structuredClone(recovery2Plan.mediaEncoding),
  executionPolicy: {
    attemptsMaximum: 1,
    debate189DownloadAttemptsMaximum: 1,
    debate05DownloadAttemptsMaximum: 1,
    downloaderRetriesMaximum: 0,
    rerunsMaximum: 0,
    automaticRepairsMaximum: 0,
    timeoutExtensionsMaximum: 0,
    privateCookieReadsMaximum: 0,
    audioPlaybackCallsMaximum: 0,
    semanticAudioEvaluationsMaximum: 0,
    modelContextsMaximum: 0,
    paidServiceCallsMaximum: 0,
    scoresDerivedMaximum: 0,
    failedPartialOutputReuseMaximum: 0,
    directIncrementalCostUsdMaximum: 0,
    stopOnAnySourceOrValidationFailure: true
  },
  outputs: { execution: executionPath, analysis: analysisPath, audioSourcePreparation: finalPreparationPath },
  sourceHashes
};
const planBytes = Buffer.from(`${JSON.stringify(plan, null, 2)}\n`);
const activation = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-05-audio-source-transport-recovery-3-activation",
  status: "active-for-exactly-one-official-broadcaster-debate-189-download-and-cohort-completion",
  batchNumber: 5,
  plan: { path: planPath, sha256: sha256(planBytes) },
  routeDiscovery: structuredClone(plan.routeDiscovery),
  diagnosis: structuredClone(plan.diagnosis),
  authenticatedInputs: structuredClone(plan.authenticatedInputs),
  protectedMedia: structuredClone(plan.protectedMedia),
  exactCohort: structuredClone(plan.exactCohort),
  debate189Recovery: structuredClone(plan.debate189Recovery),
  debate05OriginalRoute: structuredClone(plan.debate05OriginalRoute),
  mediaEncoding: structuredClone(plan.mediaEncoding),
  executionPolicy: structuredClone(plan.executionPolicy),
  sourceHashes: structuredClone(plan.sourceHashes),
  outputs: structuredClone(plan.outputs)
};
const activationBytes = Buffer.from(`${JSON.stringify(activation, null, 2)}\n`);

if (write) {
  await mkdir(recoveryRoot, { recursive: true });
  await writeFile(discoveryPath, discoveryBytes);
  await writeFile(diagnosisPath, diagnosisBytes);
  await writeFile(planPath, planBytes);
  await writeFile(activationPath, activationBytes);
}
console.log(JSON.stringify({
  status: activation.status,
  wroteArtifacts: write,
  routeDiscoverySha256: sha256(discoveryBytes),
  diagnosisSha256: sha256(diagnosisBytes),
  planSha256: sha256(planBytes),
  activationSha256: sha256(activationBytes),
  selectedRoute: routeDiscovery.selectedRoute,
  expectedDownloadedBytes: debate189Recovery.expectedDownloadedBytes,
  downloadAttemptsMaximum: 1,
  retries: 0,
  mediaBytesDownloaded: 0,
  modelContexts: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0,
  nextAction: write ? "validate-commit-and-push-recovery-3-before-download" : "write-and-validate-recovery-3-before-download"
}, null, 2));
