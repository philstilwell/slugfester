#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_05_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch05StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-05-standing-authorization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-05/disagreement-extraction";
const localRoot =
  "output/transcribe/assessment-production-post-canary-batch-05-audio-verification";
const diagnosisPath = `${root}/audio-source-preparation-failure-diagnosis.json`;
const preparationOutput = `${root}/audio-source-preparation.json`;
const workPreparationPath = `${root}/audio-work-item-preparation.json`;
const workPath = `${root}/audio-work-items.json`;
const harnessPath =
  "scripts/prepare-assessment-production-post-canary-batch-05-audio-sources.mjs";
const harnessTestPath =
  "scripts/test-assessment-production-post-canary-batch-05-audio-sources.mjs";
const scriptPath =
  "scripts/diagnose-assessment-production-post-canary-batch-05-audio-source-preparation-failure.mjs";
const testPath =
  "scripts/test-assessment-production-post-canary-batch-05-audio-source-preparation-failure-diagnosis.mjs";
const ffprobe = "/opt/homebrew/bin/ffprobe";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const expectedFiles = {
  [`${localRoot}/debate-158/audio/source.mp3`]: {
    bytes: 55686450,
    sha256: "15d94c9b74f31a2f774eb978d0eafeb0ed0834b81a733974d49da99628b8db7e"
  },
  [`${localRoot}/debate-158/clips/pro-case-specific-extraordinary-testimony-standard.mp3`]: {
    bytes: 488586,
    sha256: "f075d635613d3d81bf99d46c234ab6d5a0ffefcb162aba7005c51cafe42c1e18"
  },
  [`${localRoot}/debate-158/clips/con-unverified-resurrection-prior.mp3`]: {
    bytes: 869322,
    sha256: "15261f91246b43db0e1cabd74073b0726f700997aa7defff5f5b84a6065c7206"
  },
  [`${localRoot}/debate-158/clips/con-no-presented-extrabiblical-support.mp3`]: {
    bytes: 196554,
    sha256: "2e9046da3a5fbdca1e6d7bba7d8108b8fb8ffae5c9e25263c9ae7ff4a64abc3e"
  },
  [`${localRoot}/debate-189/audio/source.mp3`]: {
    bytes: 354,
    sha256: "87965bd54bc175f5645aa773bd5a0a98c396524a0dd0c4e94463828c11ed2754"
  }
};

assertV4(!(await exists(preparationOutput)), "audio-source preparation unexpectedly completed");
assertV4(!(await exists(diagnosisPath)), "failure diagnosis already exists");
assertV4(await exists(ffprobe), "ffprobe is unavailable");

const standingAuthorization =
  await loadAndValidatePostCanaryBatch05StandingAuthorization();
const [workPreparationBytes, workBytes] = await Promise.all([
  readFile(workPreparationPath),
  readFile(workPath)
]);
const workPreparation = JSON.parse(workPreparationBytes);
const work = JSON.parse(workBytes);
assertV4(
  workPreparation.status ===
      "prepared-and-frozen-six-post-canary-batch-05-local-audio-source-work-items-standing-authorization-active-for-audio-preparation" &&
    workPreparation.nextAuthorizedAction ===
      "prepare-local-batch-05-source-audio-and-six-frozen-clips-under-standing-authorization" &&
    work.moves.length === 6,
  "frozen Batch 5 audio work-item boundary changed"
);

const preservedFiles = [];
for (const [file, expected] of Object.entries(expectedFiles)) {
  const [bytes, metadata] = await Promise.all([readFile(file), stat(file)]);
  assertV4(metadata.size === expected.bytes, `${file}: byte size changed`);
  assertV4(sha256(bytes) === expected.sha256, `${file}: hash changed`);
  preservedFiles.push({ path: file, bytes: metadata.size, sha256: sha256(bytes) });
}

const debate189AudioDirectory = `${localRoot}/debate-189/audio`;
const debate189DirectoryEntries = (await readdir(debate189AudioDirectory)).sort();
assertV4(
  JSON.stringify(debate189DirectoryEntries) === JSON.stringify(["source.mp3"]),
  "Debate 189 partial download residue changed"
);
assertV4(
  !(await exists(`${localRoot}/debate-189/clips`)) ||
    (await readdir(`${localRoot}/debate-189/clips`)).length === 0,
  "Debate 189 clips unexpectedly exist"
);
assertV4(
  !(await exists(`${localRoot}/debate-05/audio/source.mp3`)),
  "Debate 05 source was unexpectedly attempted"
);

let ffprobeExitStatus = 0;
let ffprobeStderr = "";
try {
  execFileSync(
    ffprobe,
    [
      "-v",
      "error",
      "-select_streams",
      "a:0",
      "-show_entries",
      "format=duration,bit_rate:stream=channels,sample_rate,bit_rate",
      "-of",
      "json",
      `${localRoot}/debate-189/audio/source.mp3`
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
} catch (error) {
  ffprobeExitStatus = error.status;
  ffprobeStderr = error.stderr;
}
assertV4(ffprobeExitStatus === 1, "Debate 189 invalid source no longer reproduces");
assertV4(
  ffprobeStderr.includes("Failed to find two consecutive MPEG audio frames") &&
    ffprobeStderr.includes("Invalid data found when processing input"),
  "Debate 189 ffprobe failure category changed"
);

const sourceFiles = [
  POST_CANARY_BATCH_05_STANDING_AUTHORIZATION,
  workPreparationPath,
  workPath,
  harnessPath,
  harnessTestPath,
  scriptPath,
  testPath,
  "scripts/lib/assessment-production-post-canary-batch-05-standing-authorization.mjs",
  "scripts/lib/v4-lean-production.mjs"
];
const sourceHashes = {};
for (const file of sourceFiles) sourceHashes[file] = sha256(await readFile(file));

const diagnosis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-05-audio-source-preparation-failure-diagnosis",
  status:
    "preserved-batch-05-debate-189-public-source-partial-file-normalization-probe-failure-diagnosed",
  batchNumber: 5,
  developmentValidationOnly: false,
  productionCanary: false,
  stagingOnly: true,
  userAuthorization: {
    standingAuthorization: POST_CANARY_BATCH_05_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standingAuthorization.sha256,
    directIncrementalCostUsdMaximum: 0,
    diagnosisAuthorized: true,
    secondPublicSourceDownloadAttemptAuthorized: false
  },
  failedInvocation: {
    command:
      "node scripts/prepare-assessment-production-post-canary-batch-05-audio-sources.mjs --write",
    exitCode: 1,
    attemptsAtStage: 1,
    retries: 0,
    timeoutExtensions: 0,
    audioPlaybackCalls: 0,
    semanticAudioEvaluations: 0,
    transcriptionCalls: 0,
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0
  },
  failure: {
    debateNumber: "189",
    sourceVideoId: "3DHvNRK452c",
    category: "partial-public-source-normalization-output-rejected-by-ffprobe",
    failedFile: `${localRoot}/debate-189/audio/source.mp3`,
    failedFileBytes: expectedFiles[`${localRoot}/debate-189/audio/source.mp3`].bytes,
    failedFileSha256:
      expectedFiles[`${localRoot}/debate-189/audio/source.mp3`].sha256,
    ffprobeExitStatus,
    ffprobeErrorMarkers: [
      "Failed to find two consecutive MPEG audio frames",
      "Invalid data found when processing input"
    ],
    downloadedIntermediatePreserved: false,
    normalizedSourceValid: false,
    sourcePreparationRecordWritten: false
  },
  executionFrontier: {
    debate158SourceAndThreeClipsCreatedBeforeFailure: true,
    debate189PublicSourceAttemptConsumed: true,
    debate189ClipsCreated: 0,
    debate05PublicSourceAttemptConsumed: false,
    debate05ClipsCreated: 0,
    completeSourcesRequired: 3,
    completeClipsRequired: 6,
    completeSourcesAvailable: 1,
    completeClipsAvailable: 3
  },
  preservedFiles,
  inputHashes: {
    [workPreparationPath]: sha256(workPreparationBytes),
    [workPath]: sha256(workBytes)
  },
  sourceHashes,
  diagnosis: {
    deterministicHarnessOrTransportFailure: true,
    sourceIdentityChanged: false,
    speakerIdentityChanged: false,
    frozenClipWindowsChanged: false,
    paidServiceUsed: false,
    audioPlayedOrSemanticallyEvaluated: false,
    additionalPublicSourceAttemptRequiredForRecovery: true,
    additionalAttemptOutsideCurrentOneAttemptSourceBoundary: true
  },
  authorization: {
    diagnosisValidation: true,
    correctionPreparation: false,
    correctionExecution: false,
    publicSourceDownload: false,
    audioVerificationPreparation: false,
    paidTranscription: false,
    adjudication: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextRequiredAction:
    "obtain-explicit-approval-for-one-bounded-debate-189-public-source-transport-correction-attempt"
};

if (shouldWrite) {
  await writeFile(diagnosisPath, `${JSON.stringify(diagnosis, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: diagnosis.status,
      wroteArtifact: shouldWrite,
      failure: diagnosis.failure,
      executionFrontier: diagnosis.executionFrontier,
      directIncrementalCostUsd: 0,
      nextRequiredAction: diagnosis.nextRequiredAction
    },
    null,
    2
  )
);
