#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const repositoryRoot = process.cwd();
const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-05/disagreement-extraction";
const recoveryRoot = `${root}/audio-source-transport-recovery-1`;
const localRoot =
  "output/transcribe/assessment-production-post-canary-batch-05-audio-verification";
const standingAuthorizationPath =
  "docs/assessment-production/post-canary-continuation-v1/batch-05/standing-authorization.json";
const workPreparationPath = `${root}/audio-work-item-preparation.json`;
const workPath = `${root}/audio-work-items.json`;
const diagnosisPath = `${root}/audio-source-preparation-failure-diagnosis.json`;
const planPath = `${recoveryRoot}/correction-plan.json`;
const activationPath = `${recoveryRoot}/execution-activation.json`;
const executionPath = `${recoveryRoot}/execution.json`;
const analysisPath = `${recoveryRoot}/analysis.json`;
const finalPreparationPath = `${root}/audio-source-preparation.json`;
const prepareScript =
  "scripts/prepare-assessment-production-post-canary-batch-05-audio-transport-recovery.mjs";
const runnerScript =
  "scripts/run-assessment-production-post-canary-batch-05-audio-transport-recovery.mjs";
const preparationTest =
  "scripts/test-assessment-production-post-canary-batch-05-audio-transport-recovery-preparation.mjs";
const cohortTest =
  "scripts/test-assessment-production-post-canary-batch-05-audio-source-recovery-cohort.mjs";
const originalHarness =
  "scripts/prepare-assessment-production-post-canary-batch-05-audio-sources.mjs";
const originalHarnessTest =
  "scripts/test-assessment-production-post-canary-batch-05-audio-sources.mjs";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const USER_AUTHORIZATION =
  "I authorize one bounded Batch 5 Debate 189 public-source transport recovery. Preserve the diagnosed invalid file and all valid Debate 158 source and clip hashes. Prepare and hash-lock a corrected harness, then make exactly one additional Debate 189 public-source download attempt with downloader retries disabled. If it succeeds, normalize and validate that source, process the still-unattempted Debate 05 source once under the original controls, create the remaining three frozen clips, replay the complete three-source/six-clip cohort, commit, push, and resume the Batch 5 standing authorization automatically. Direct incremental cost cap: $0. Do not play or semantically evaluate audio, execute models, use paid services or transcription, alter clip windows, sources, speakers, packets, judgments, scores, or protected evidence. Stop on any further source or validation failure.";

const protectedMedia = [
  {
    path: `${localRoot}/debate-158/audio/source.mp3`,
    bytes: 55686450,
    sha256: "15d94c9b74f31a2f774eb978d0eafeb0ed0834b81a733974d49da99628b8db7e"
  },
  {
    path: `${localRoot}/debate-158/clips/pro-case-specific-extraordinary-testimony-standard.mp3`,
    bytes: 488586,
    sha256: "f075d635613d3d81bf99d46c234ab6d5a0ffefcb162aba7005c51cafe42c1e18"
  },
  {
    path: `${localRoot}/debate-158/clips/con-unverified-resurrection-prior.mp3`,
    bytes: 869322,
    sha256: "15261f91246b43db0e1cabd74073b0726f700997aa7defff5f5b84a6065c7206"
  },
  {
    path: `${localRoot}/debate-158/clips/con-no-presented-extrabiblical-support.mp3`,
    bytes: 196554,
    sha256: "2e9046da3a5fbdca1e6d7bba7d8108b8fb8ffae5c9e25263c9ae7ff4a64abc3e"
  },
  {
    path: `${localRoot}/debate-189/audio/source.mp3`,
    bytes: 354,
    sha256: "87965bd54bc175f5645aa773bd5a0a98c396524a0dd0c4e94463828c11ed2754"
  }
];

const expectedMoves = [
  {
    debateNumber: "158",
    sourceVideoId: "a-wIaCRIdOA",
    moveId: "pro-case-specific-extraordinary-testimony-standard",
    expectedSpeaker: "Dr Jonathan McLatchie",
    startMs: 5502940,
    endMs: 5563860
  },
  {
    debateNumber: "158",
    sourceVideoId: "a-wIaCRIdOA",
    moveId: "con-unverified-resurrection-prior",
    expectedSpeaker: "Matt Dillahunty",
    startMs: 5557500,
    endMs: 5666020
  },
  {
    debateNumber: "158",
    sourceVideoId: "a-wIaCRIdOA",
    moveId: "con-no-presented-extrabiblical-support",
    expectedSpeaker: "Matt Dillahunty",
    startMs: 8713660,
    endMs: 8738100
  },
  {
    debateNumber: "189",
    sourceVideoId: "3DHvNRK452c",
    moveId: "con-simple-laws-beneath-cell-complexity",
    expectedSpeaker: "Lee Cronin",
    startMs: 3019940,
    endMs: 3233430
  },
  {
    debateNumber: "05",
    sourceVideoId: "OL8LREmbDi0",
    moveId: "con-logical-grounding-burden",
    expectedSpeaker: "Matt Dillahunty",
    startMs: 4266420,
    endMs: 4323699
  },
  {
    debateNumber: "05",
    sourceVideoId: "OL8LREmbDi0",
    moveId: "pro-logic-reflects-gods-thinking",
    expectedSpeaker: "Sye Ten Bruggencate",
    startMs: 4316420,
    endMs: 4338820
  }
];

for (const file of [planPath, activationPath, executionPath, analysisPath, finalPreparationPath]) {
  if (shouldWrite) assertV4(!(await exists(file)), `${file} already exists`);
}

const [standingBytes, workPreparationBytes, workBytes, diagnosisBytes] =
  await Promise.all([
    readFile(standingAuthorizationPath),
    readFile(workPreparationPath),
    readFile(workPath),
    readFile(diagnosisPath)
  ]);
const standingAuthorization = JSON.parse(standingBytes);
const workPreparation = JSON.parse(workPreparationBytes);
const work = JSON.parse(workBytes);
const diagnosis = JSON.parse(diagnosisBytes);

assertV4(
  standingAuthorization.batchNumber === 5 &&
    standingAuthorization.status ===
      "frozen-active-batch-05-complete-remaining-workflow-standing-authorization",
  "Batch 5 standing authorization changed"
);
assertV4(
  workPreparation.status ===
      "prepared-and-frozen-six-post-canary-batch-05-local-audio-source-work-items-standing-authorization-active-for-audio-preparation" &&
    work.moves.length === 6,
  "Batch 5 audio work-item boundary changed"
);
assertV4(
  diagnosis.status ===
      "preserved-batch-05-debate-189-public-source-partial-file-normalization-probe-failure-diagnosed" &&
    diagnosis.failure.failedFileSha256 === protectedMedia.at(-1).sha256 &&
    diagnosis.executionFrontier.debate05PublicSourceAttemptConsumed === false,
  "preserved Debate 189 failure diagnosis changed"
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
    JSON.stringify(["source.mp3"]),
  "Debate 189 recovery frontier changed"
);
assertV4(
  !(await exists(`${localRoot}/debate-189/clips`)) ||
    (await readdir(`${localRoot}/debate-189/clips`)).length === 0,
  "Debate 189 clip was attempted before recovery activation"
);
assertV4(
  !(await exists(`${localRoot}/debate-05/audio/source.mp3`)),
  "Debate 05 source was attempted before recovery activation"
);

const sourceFiles = [
  prepareScript,
  runnerScript,
  preparationTest,
  cohortTest,
  originalHarness,
  originalHarnessTest,
  "scripts/prepare-assessment-production-post-canary-batch-05-audio-work-items.mjs",
  "scripts/test-assessment-production-post-canary-batch-05-audio-work-items.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-audio-work-items.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-standing-authorization.mjs",
  "scripts/lib/v4-lean-production.mjs"
];
const sourceHashes = {};
for (const file of sourceFiles) sourceHashes[file] = sha256(await readFile(file));

const checkpointCommit = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8"
}).trim();
const plan = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-05-audio-source-transport-recovery-plan",
  status: "frozen-one-shot-batch-05-debate-189-public-source-transport-recovery-ready",
  batchNumber: 5,
  checkpointCommit,
  userAuthorization: {
    instruction: USER_AUTHORIZATION,
    directIncrementalCostUsdMaximum: 0,
    debate189AdditionalPublicSourceAttemptsAuthorized: 1,
    debate05OriginalPublicSourceAttemptsAuthorized: 1,
    audioPlaybackAuthorized: false,
    semanticAudioEvaluationAuthorized: false,
    modelExecutionAuthorized: false,
    paidServicesAuthorized: false,
    transcriptionAuthorized: false
  },
  authenticatedInputs: {
    [standingAuthorizationPath]: sha256(standingBytes),
    [workPreparationPath]: sha256(workPreparationBytes),
    [workPath]: sha256(workBytes),
    [diagnosisPath]: sha256(diagnosisBytes)
  },
  protectedMedia,
  exactCohort: {
    sources: [
      { debateNumber: "158", sourceVideoId: "a-wIaCRIdOA", mode: "preserve" },
      { debateNumber: "189", sourceVideoId: "3DHvNRK452c", mode: "recover-once" },
      { debateNumber: "05", sourceVideoId: "OL8LREmbDi0", mode: "original-once" }
    ],
    moves: expectedMoves,
    sourceCount: 3,
    clipCount: 6
  },
  debate189Recovery: {
    invalidSourcePath: `${localRoot}/debate-189/audio/source.mp3`,
    preservedInvalidEvidencePath:
      `${localRoot}/debate-189/audio/source.failed-attempt-1.mp3`,
    downloadTemplate:
      `${localRoot}/debate-189/audio/source.recovery-1.download.%(ext)s`,
    normalizedTemporaryPath:
      `${localRoot}/debate-189/audio/source.recovery-1.normalized.mp3`,
    finalSourcePath: `${localRoot}/debate-189/audio/source.mp3`,
    videoUrl: "https://www.youtube.com/watch?v=3DHvNRK452c",
    ytDlpArguments: [
      "-m",
      "yt_dlp",
      "--no-playlist",
      "--quiet",
      "--no-warnings",
      "--no-continue",
      "--retries",
      "0",
      "--fragment-retries",
      "0",
      "--extractor-retries",
      "0",
      "--file-access-retries",
      "0",
      "--concurrent-fragments",
      "1",
      "--extractor-args",
      "youtube:player_client=android_vr,web_safari",
      "-f",
      "bestaudio[ext=webm]/bestaudio"
    ],
    maximumAdditionalCliInvocations: 1,
    retriesMaximum: 0,
    minimumDurationMs: 3233430
  },
  debate05OriginalRoute: {
    downloadTemplate: `${localRoot}/debate-05/audio/source.download.%(ext)s`,
    normalizedTemporaryPath:
      `${localRoot}/debate-05/audio/source.original-attempt.normalized.mp3`,
    finalSourcePath: `${localRoot}/debate-05/audio/source.mp3`,
    videoUrl: "https://www.youtube.com/watch?v=OL8LREmbDi0",
    ytDlpArguments: [
      "-m",
      "yt_dlp",
      "--no-playlist",
      "--quiet",
      "--no-warnings",
      "--retries",
      "0",
      "--fragment-retries",
      "0",
      "--extractor-retries",
      "0",
      "--file-access-retries",
      "0",
      "--extractor-args",
      "youtube:player_client=android,web",
      "-f",
      "bestaudio/best"
    ],
    maximumCliInvocations: 1,
    retriesMaximum: 0,
    minimumDurationMs: 4338820
  },
  mediaEncoding: {
    normalizedChannels: 1,
    normalizedSampleRateHz: 16000,
    normalizedBitrateKbps: 48,
    clipChannels: 1,
    clipSampleRateHz: 16000,
    clipBitrateKbps: 64,
    clipDurationToleranceSeconds: 0.25
  },
  executionPolicy: {
    attemptsMaximum: 1,
    debate189AdditionalDownloadAttemptsMaximum: 1,
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
    stopOnAnySourceOrValidationFailure: true
  },
  outputs: {
    activation: activationPath,
    execution: executionPath,
    analysis: analysisPath,
    audioSourcePreparation: finalPreparationPath
  },
  sourceHashes
};
const planBytes = Buffer.from(`${JSON.stringify(plan, null, 2)}\n`);
const activation = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-05-audio-source-transport-recovery-activation",
  status: "active-for-exactly-one-batch-05-debate-189-public-source-transport-recovery",
  batchNumber: 5,
  plan: { path: planPath, sha256: sha256(planBytes) },
  authenticatedInputs: structuredClone(plan.authenticatedInputs),
  protectedMedia: structuredClone(protectedMedia),
  exactCohort: structuredClone(plan.exactCohort),
  debate189Recovery: structuredClone(plan.debate189Recovery),
  debate05OriginalRoute: structuredClone(plan.debate05OriginalRoute),
  mediaEncoding: structuredClone(plan.mediaEncoding),
  executionPolicy: structuredClone(plan.executionPolicy),
  sourceHashes: structuredClone(sourceHashes),
  outputs: structuredClone(plan.outputs)
};
const activationBytes = Buffer.from(`${JSON.stringify(activation, null, 2)}\n`);

if (shouldWrite) {
  await mkdir(recoveryRoot, { recursive: true });
  await writeFile(planPath, planBytes);
  await writeFile(activationPath, activationBytes);
}

console.log(
  JSON.stringify(
    {
      status: activation.status,
      wroteArtifacts: shouldWrite,
      planSha256: sha256(planBytes),
      activationSha256: sha256(activationBytes),
      protectedMediaHashes: protectedMedia.length,
      debate189AdditionalDownloadAttemptsAuthorized: 1,
      debate05OriginalDownloadAttemptsAuthorized: 1,
      downloaderRetries: 0,
      mediaFilesAccessed: 0,
      modelContexts: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0,
      nextAction: shouldWrite
        ? "validate-commit-and-push-frozen-recovery-before-network-execution"
        : "write-and-validate-frozen-recovery-before-network-execution"
    },
    null,
    2
  )
);
