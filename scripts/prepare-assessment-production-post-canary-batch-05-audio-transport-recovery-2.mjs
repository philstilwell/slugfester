#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-05/disagreement-extraction";
const recovery1Root = `${root}/audio-source-transport-recovery-1`;
const recovery2Root = `${root}/audio-source-transport-recovery-2`;
const localRoot =
  "output/transcribe/assessment-production-post-canary-batch-05-audio-verification";
const standingAuthorizationPath =
  "docs/assessment-production/post-canary-continuation-v1/batch-05/standing-authorization.json";
const workPreparationPath = `${root}/audio-work-item-preparation.json`;
const workPath = `${root}/audio-work-items.json`;
const originalDiagnosisPath = `${root}/audio-source-preparation-failure-diagnosis.json`;
const recovery1PlanPath = `${recovery1Root}/correction-plan.json`;
const recovery1ActivationPath = `${recovery1Root}/execution-activation.json`;
const recovery1ExecutionPath = `${recovery1Root}/execution.json`;
const diagnosisPath = `${recovery2Root}/failure-diagnosis.json`;
const planPath = `${recovery2Root}/correction-plan.json`;
const activationPath = `${recovery2Root}/execution-activation.json`;
const executionPath = `${recovery2Root}/execution.json`;
const analysisPath = `${recovery2Root}/analysis.json`;
const finalPreparationPath = `${root}/audio-source-preparation.json`;
const prepareScript =
  "scripts/prepare-assessment-production-post-canary-batch-05-audio-transport-recovery-2.mjs";
const runnerScript =
  "scripts/run-assessment-production-post-canary-batch-05-audio-transport-recovery-2.mjs";
const preparationTest =
  "scripts/test-assessment-production-post-canary-batch-05-audio-transport-recovery-2-preparation.mjs";
const cohortTest =
  "scripts/test-assessment-production-post-canary-batch-05-audio-source-recovery-2-cohort.mjs";
const ytDlpBasePath =
  "/Users/philstilwell/Library/Python/3.13/lib/python/site-packages/yt_dlp/extractor/youtube/_base.py";
const ytDlpVideoPath =
  "/Users/philstilwell/Library/Python/3.13/lib/python/site-packages/yt_dlp/extractor/youtube/_video.py";
const ytDlpVersionPath =
  "/Users/philstilwell/Library/Python/3.13/lib/python/site-packages/yt_dlp/version.py";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const USER_AUTHORIZATION =
  "The user replied 'I authorize that' to the explicit request to preserve and diagnose the HTTP 403 failure, then prepare and execute one final hash-locked alternative Debate 189 public-source transport route with no retries and a direct incremental cost cap of $0; if successful, continue Debate 05 and the remaining frozen clips and cohort under the prior authorization, and stop on any further source or validation failure.";

const expectedMoves = [
  ["158", "a-wIaCRIdOA", "pro-case-specific-extraordinary-testimony-standard", "Dr Jonathan McLatchie", 5502940, 5563860],
  ["158", "a-wIaCRIdOA", "con-unverified-resurrection-prior", "Matt Dillahunty", 5557500, 5666020],
  ["158", "a-wIaCRIdOA", "con-no-presented-extrabiblical-support", "Matt Dillahunty", 8713660, 8738100],
  ["189", "3DHvNRK452c", "con-simple-laws-beneath-cell-complexity", "Lee Cronin", 3019940, 3233430],
  ["05", "OL8LREmbDi0", "con-logical-grounding-burden", "Matt Dillahunty", 4266420, 4323699],
  ["05", "OL8LREmbDi0", "pro-logic-reflects-gods-thinking", "Sye Ten Bruggencate", 4316420, 4338820]
].map(([debateNumber, sourceVideoId, moveId, expectedSpeaker, startMs, endMs]) => ({
  debateNumber,
  sourceVideoId,
  moveId,
  expectedSpeaker,
  startMs,
  endMs
}));

const protectedMedia = [
  ["debate-158/audio/source.mp3", 55686450, "15d94c9b74f31a2f774eb978d0eafeb0ed0834b81a733974d49da99628b8db7e"],
  ["debate-158/clips/pro-case-specific-extraordinary-testimony-standard.mp3", 488586, "f075d635613d3d81bf99d46c234ab6d5a0ffefcb162aba7005c51cafe42c1e18"],
  ["debate-158/clips/con-unverified-resurrection-prior.mp3", 869322, "15261f91246b43db0e1cabd74073b0726f700997aa7defff5f5b84a6065c7206"],
  ["debate-158/clips/con-no-presented-extrabiblical-support.mp3", 196554, "2e9046da3a5fbdca1e6d7bba7d8108b8fb8ffae5c9e25263c9ae7ff4a64abc3e"],
  ["debate-189/audio/source.mp3", 354, "87965bd54bc175f5645aa773bd5a0a98c396524a0dd0c4e94463828c11ed2754"],
  ["debate-189/audio/source.failed-attempt-1.mp3", 354, "87965bd54bc175f5645aa773bd5a0a98c396524a0dd0c4e94463828c11ed2754"]
].map(([relativePath, bytes, digest]) => ({
  path: `${localRoot}/${relativePath}`,
  bytes,
  sha256: digest
}));

for (const file of [diagnosisPath, planPath, activationPath, executionPath, analysisPath]) {
  if (shouldWrite) assertV4(!(await exists(file)), `${file} already exists`);
}
assertV4(!(await exists(finalPreparationPath)), "final audio preparation already exists");

const inputPaths = [
  standingAuthorizationPath,
  workPreparationPath,
  workPath,
  originalDiagnosisPath,
  recovery1PlanPath,
  recovery1ActivationPath,
  recovery1ExecutionPath
];
const inputEntries = await Promise.all(
  inputPaths.map(async (file) => [file, await readFile(file)])
);
const inputBytes = Object.fromEntries(inputEntries);
const standingAuthorization = JSON.parse(inputBytes[standingAuthorizationPath]);
const workPreparation = JSON.parse(inputBytes[workPreparationPath]);
const work = JSON.parse(inputBytes[workPath]);
const recovery1Plan = JSON.parse(inputBytes[recovery1PlanPath]);
const recovery1Activation = JSON.parse(inputBytes[recovery1ActivationPath]);
const recovery1Execution = JSON.parse(inputBytes[recovery1ExecutionPath]);

assertV4(
  standingAuthorization.status ===
    "frozen-active-batch-05-complete-remaining-workflow-standing-authorization",
  "Batch 5 standing authorization changed"
);
assertV4(
  workPreparation.status ===
      "prepared-and-frozen-six-post-canary-batch-05-local-audio-source-work-items-standing-authorization-active-for-audio-preparation" &&
    work.moves.length === 6,
  "Batch 5 audio work items changed"
);
assertV4(
  recovery1Plan.status ===
      "frozen-one-shot-batch-05-debate-189-public-source-transport-recovery-ready" &&
    recovery1Activation.plan.sha256 === sha256(inputBytes[recovery1PlanPath]),
  "recovery-1 authentication changed"
);
assertV4(
  recovery1Execution.status ===
      "failed-one-shot-batch-05-audio-source-transport-recovery-stop-required" &&
    recovery1Execution.planSha256 === sha256(inputBytes[recovery1PlanPath]) &&
    recovery1Execution.activationSha256 === sha256(inputBytes[recovery1ActivationPath]) &&
    recovery1Execution.state.debate189AdditionalDownloadCliInvocations === 1 &&
    recovery1Execution.state.debate05DownloadCliInvocations === 0 &&
    recovery1Execution.failure.message.includes("source.recovery-1.download.%(ext)s") &&
    recovery1Execution.failure.message.includes("3DHvNRK452c"),
  "preserved recovery-1 HTTP 403 record changed"
);
assertV4(
  JSON.stringify(
    work.moves.map((move) => ({
      debateNumber: move.debateNumber,
      sourceVideoId: move.sourceVideoId,
      moveId: move.moveId,
      expectedSpeaker: move.expectedSpeaker,
      startMs: move.clipWindow.startMs,
      endMs: move.clipWindow.endMs
    }))
  ) === JSON.stringify(expectedMoves),
  "frozen sources, speakers, or clip windows changed"
);
for (const item of protectedMedia) {
  const [bytes, metadata] = await Promise.all([readFile(item.path), stat(item.path)]);
  assertV4(metadata.size === item.bytes, `${item.path}: protected byte size changed`);
  assertV4(sha256(bytes) === item.sha256, `${item.path}: protected hash changed`);
}
assertV4(
  JSON.stringify((await readdir(`${localRoot}/debate-189/audio`)).sort()) ===
    JSON.stringify(["source.failed-attempt-1.mp3", "source.mp3"]),
  "Debate 189 preserved recovery frontier changed"
);
assertV4(!(await exists(`${localRoot}/debate-05/audio/source.mp3`)), "Debate 05 is no longer unattempted");

const toolRuntime = {
  ytDlpVersion: execFileSync("python3", ["-m", "yt_dlp", "--version"], {
    encoding: "utf8"
  }).trim(),
  files: Object.fromEntries(
    await Promise.all(
      [ytDlpBasePath, ytDlpVideoPath, ytDlpVersionPath].map(async (file) => [
        file,
        sha256(await readFile(file))
      ])
    )
  )
};
assertV4(toolRuntime.ytDlpVersion === "2026.03.17", "yt-dlp runtime changed");

const diagnosis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-05-audio-source-transport-recovery-2-diagnosis",
  status: "preserved-batch-05-debate-189-recovery-1-http-403-transport-failure-diagnosed",
  batchNumber: 5,
  userAuthorization: USER_AUTHORIZATION,
  preservedFailure: {
    path: recovery1ExecutionPath,
    sha256: sha256(inputBytes[recovery1ExecutionPath]),
    category: "public-source-direct-media-transport-http-403",
    exactError: "ERROR: unable to download video data: HTTP Error 403: Forbidden",
    exactErrorEvidenceLocation: "preserved-current-task-execution-transcript",
    repositoryExecutionRecordContainsFailedCommandOnly: true,
    debateNumber: "189",
    sourceVideoId: "3DHvNRK452c",
    downloadCliInvocations: 1,
    retries: 0,
    debate05Invocations: 0
  },
  diagnosis: {
    failureBoundary: "direct-media-file-transport-after-youtube-extraction",
    exactServerPolicyCauseEstablished: false,
    sourceIdentityChanged: false,
    protectedEvidenceChanged: false,
    audioPlayedOrSemanticallyEvaluated: false,
    modelOrPaidServiceUsed: false,
    failedPartialOutputAcceptedOrReused: false
  },
  boundedAlternative: {
    route: "web-safari-hls-manifest-native-segment-transport",
    reason:
      "The authenticated local yt-dlp runtime defines web_safari HLS delivery separately from direct HTTPS formats; the HLS token policy is not required, so an HLS-only native-segment route is a distinct bounded transport without changing the public video identity.",
    publicSourceUrl: "https://www.youtube.com/watch?v=3DHvNRK452c",
    playerClient: "web_safari",
    formatSelector: "best[protocol^=m3u8]",
    downloader: "m3u8:native",
    attemptsMaximum: 1,
    retriesMaximum: 0
  },
  authenticatedInputs: Object.fromEntries(
    inputEntries.map(([file, bytes]) => [file, sha256(bytes)])
  ),
  toolRuntime,
  directIncrementalCostUsd: 0,
  nextAction: "freeze-validate-commit-and-push-one-final-hls-transport-recovery"
};
const diagnosisBytes = Buffer.from(`${JSON.stringify(diagnosis, null, 2)}\n`);

const sourceFiles = [
  prepareScript,
  runnerScript,
  preparationTest,
  cohortTest,
  "scripts/prepare-assessment-production-post-canary-batch-05-audio-sources.mjs",
  "scripts/test-assessment-production-post-canary-batch-05-audio-sources.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-05-audio-work-items.mjs",
  "scripts/test-assessment-production-post-canary-batch-05-audio-work-items.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-audio-work-items.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-standing-authorization.mjs",
  "scripts/lib/v4-lean-production.mjs"
];
const sourceHashes = {};
for (const file of sourceFiles) sourceHashes[file] = sha256(await readFile(file));

const plan = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-05-audio-source-transport-recovery-2-plan",
  status: "frozen-one-final-batch-05-debate-189-hls-transport-recovery-ready",
  batchNumber: 5,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  userAuthorization: {
    instruction: USER_AUTHORIZATION,
    oneTimeRecursiveRecoveryException: true,
    directIncrementalCostUsdMaximum: 0,
    debate189FinalPublicSourceAttemptsAuthorized: 1,
    debate05OriginalPublicSourceAttemptsAuthorized: 1,
    audioPlaybackAuthorized: false,
    semanticAudioEvaluationAuthorized: false,
    modelExecutionAuthorized: false,
    paidServicesAuthorized: false,
    transcriptionAuthorized: false
  },
  diagnosis: { path: diagnosisPath, sha256: sha256(diagnosisBytes) },
  authenticatedInputs: Object.fromEntries(
    inputEntries.map(([file, bytes]) => [file, sha256(bytes)])
  ),
  protectedMedia,
  toolRuntime,
  exactCohort: {
    sources: [
      { debateNumber: "158", sourceVideoId: "a-wIaCRIdOA", mode: "preserve" },
      { debateNumber: "189", sourceVideoId: "3DHvNRK452c", mode: "final-hls-recovery-once" },
      { debateNumber: "05", sourceVideoId: "OL8LREmbDi0", mode: "original-once" }
    ],
    moves: expectedMoves,
    sourceCount: 3,
    clipCount: 6
  },
  debate189Recovery: {
    invalidSourcePath: `${localRoot}/debate-189/audio/source.mp3`,
    preservedInvalidEvidencePath: `${localRoot}/debate-189/audio/source.failed-attempt-1.mp3`,
    downloadTemplate: `${localRoot}/debate-189/audio/source.recovery-2.hls.%(ext)s`,
    normalizedTemporaryPath: `${localRoot}/debate-189/audio/source.recovery-2.normalized.mp3`,
    finalSourcePath: `${localRoot}/debate-189/audio/source.mp3`,
    videoUrl: "https://www.youtube.com/watch?v=3DHvNRK452c",
    transport: "web-safari-hls-manifest-native-segment-transport",
    ytDlpArguments: [
      "-m", "yt_dlp", "--no-playlist", "--quiet", "--no-warnings", "--no-continue",
      "--retries", "0", "--fragment-retries", "0", "--extractor-retries", "0",
      "--file-access-retries", "0", "--concurrent-fragments", "1",
      "--downloader", "m3u8:native", "--extractor-args", "youtube:player_client=web_safari",
      "-f", "best[protocol^=m3u8]"
    ],
    maximumAdditionalCliInvocations: 1,
    retriesMaximum: 0,
    minimumDurationMs: 3233430
  },
  debate05OriginalRoute: structuredClone(recovery1Plan.debate05OriginalRoute),
  mediaEncoding: structuredClone(recovery1Plan.mediaEncoding),
  executionPolicy: {
    attemptsMaximum: 1,
    debate189FinalDownloadAttemptsMaximum: 1,
    debate05DownloadAttemptsMaximum: 1,
    downloaderRetriesMaximum: 0,
    rerunsMaximum: 0,
    automaticRepairsMaximum: 0,
    timeoutExtensionsMaximum: 0,
    audioPlaybackCallsMaximum: 0,
    semanticAudioEvaluationsMaximum: 0,
    modelContextsMaximum: 0,
    transcriptionCallsMaximum: 0,
    paidServiceCallsMaximum: 0,
    scoresDerivedMaximum: 0,
    directIncrementalCostUsdMaximum: 0,
    stopOnAnySourceOrValidationFailure: true,
    failedRecovery1PartialOutputReuseMaximum: 0
  },
  outputs: {
    execution: executionPath,
    analysis: analysisPath,
    audioSourcePreparation: finalPreparationPath
  },
  sourceHashes
};
const planBytes = Buffer.from(`${JSON.stringify(plan, null, 2)}\n`);
const activation = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-05-audio-source-transport-recovery-2-activation",
  status: "active-for-exactly-one-final-batch-05-debate-189-hls-transport-recovery",
  batchNumber: 5,
  plan: { path: planPath, sha256: sha256(planBytes) },
  diagnosis: structuredClone(plan.diagnosis),
  authenticatedInputs: structuredClone(plan.authenticatedInputs),
  protectedMedia: structuredClone(plan.protectedMedia),
  toolRuntime: structuredClone(plan.toolRuntime),
  exactCohort: structuredClone(plan.exactCohort),
  debate189Recovery: structuredClone(plan.debate189Recovery),
  debate05OriginalRoute: structuredClone(plan.debate05OriginalRoute),
  mediaEncoding: structuredClone(plan.mediaEncoding),
  executionPolicy: structuredClone(plan.executionPolicy),
  sourceHashes: structuredClone(plan.sourceHashes),
  outputs: structuredClone(plan.outputs)
};
const activationBytes = Buffer.from(`${JSON.stringify(activation, null, 2)}\n`);

if (shouldWrite) {
  await mkdir(recovery2Root, { recursive: true });
  await writeFile(diagnosisPath, diagnosisBytes);
  await writeFile(planPath, planBytes);
  await writeFile(activationPath, activationBytes);
}

console.log(JSON.stringify({
  status: activation.status,
  wroteArtifacts: shouldWrite,
  diagnosisSha256: sha256(diagnosisBytes),
  planSha256: sha256(planBytes),
  activationSha256: sha256(activationBytes),
  transport: plan.debate189Recovery.transport,
  formatSelector: "best[protocol^=m3u8]",
  downloaderRetries: 0,
  mediaFilesAccessed: 0,
  modelContexts: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0,
  nextAction: shouldWrite
    ? "validate-commit-and-push-frozen-recovery-2-before-network-execution"
    : "write-and-validate-frozen-recovery-2-before-network-execution"
}, null, 2));
