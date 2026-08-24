#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_09_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch09StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-09-standing-authorization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction";
const localRoot =
  "output/transcribe/assessment-production-post-canary-batch-09-audio-verification";
const diagnosisPath = `${root}/audio-source-preparation-failure-diagnosis.json`;
const preparationOutput = `${root}/audio-source-preparation.json`;
const workPreparationPath = `${root}/audio-work-item-preparation.json`;
const workPath = `${root}/audio-work-items.json`;
const harnessPath =
  "scripts/prepare-assessment-production-post-canary-batch-09-audio-sources.mjs";
const harnessTestPath =
  "scripts/test-assessment-production-post-canary-batch-09-audio-sources.mjs";
const scriptPath =
  "scripts/diagnose-assessment-production-post-canary-batch-09-audio-source-preparation-failure.mjs";
const testPath =
  "scripts/test-assessment-production-post-canary-batch-09-audio-source-preparation-failure-diagnosis.mjs";
const ffprobe = "/opt/homebrew/bin/ffprobe";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const expectedFiles = {
  
  [`${localRoot}/debate-170/audio/source.mp3`]: {
    bytes: 354,
    sha256: "87965bd54bc175f5645aa773bd5a0a98c396524a0dd0c4e94463828c11ed2754"
  }
};

assertV4(!(await exists(preparationOutput)), "audio-source preparation unexpectedly completed");
assertV4(!(await exists(diagnosisPath)), "failure diagnosis already exists");
assertV4(await exists(ffprobe), "ffprobe is unavailable");

const standingAuthorization =
  await loadAndValidatePostCanaryBatch09StandingAuthorization();
const [workPreparationBytes, workBytes] = await Promise.all([
  readFile(workPreparationPath),
  readFile(workPath)
]);
const workPreparation = JSON.parse(workPreparationBytes);
const work = JSON.parse(workBytes);
assertV4(
  workPreparation.status ===
      "prepared-and-frozen-four-post-canary-batch-09-local-audio-source-work-items-standing-authorization-active-for-audio-preparation" &&
    workPreparation.nextAuthorizedAction ===
      "prepare-local-batch-09-source-audio-and-four-frozen-clips-under-standing-authorization" &&
    work.moves.length === 4,
  "frozen Batch 9 audio work-item boundary changed"
);

const preservedFiles = [];
for (const [file, expected] of Object.entries(expectedFiles)) {
  const [bytes, metadata] = await Promise.all([readFile(file), stat(file)]);
  assertV4(metadata.size === expected.bytes, `${file}: byte size changed`);
  assertV4(sha256(bytes) === expected.sha256, `${file}: hash changed`);
  preservedFiles.push({ path: file, bytes: metadata.size, sha256: sha256(bytes) });
}

const debate170AudioDirectory = `${localRoot}/debate-170/audio`;
const debate170DirectoryEntries = (await readdir(debate170AudioDirectory)).sort();
assertV4(
  JSON.stringify(debate170DirectoryEntries) === JSON.stringify(["source.mp3"]),
  "Debate 170 partial download residue changed"
);
assertV4(
  !(await exists(`${localRoot}/debate-170/clips`)) ||
    (await readdir(`${localRoot}/debate-170/clips`)).length === 0,
  "Debate 170 clips unexpectedly exist"
);
assertV4(
  !(await exists(`${localRoot}/debate-19/audio/source.mp3`)) &&
    !(await exists(`${localRoot}/debate-183/audio/source.mp3`)),
  "an unattempted Batch 9 source unexpectedly exists"
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
      `${localRoot}/debate-170/audio/source.mp3`
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
} catch (error) {
  ffprobeExitStatus = error.status;
  ffprobeStderr = error.stderr;
}
assertV4(ffprobeExitStatus === 1, "Debate 170 invalid source no longer reproduces");
assertV4(
  ffprobeStderr.includes("Failed to find two consecutive MPEG audio frames") &&
    ffprobeStderr.includes("Invalid data found when processing input"),
  "Debate 170 ffprobe failure category changed"
);

const sourceFiles = [
  POST_CANARY_BATCH_09_STANDING_AUTHORIZATION,
  workPreparationPath,
  workPath,
  harnessPath,
  harnessTestPath,
  scriptPath,
  testPath,
  "scripts/lib/assessment-production-post-canary-batch-09-standing-authorization.mjs",
  "scripts/lib/v4-lean-production.mjs"
];
const sourceHashes = {};
for (const file of sourceFiles) sourceHashes[file] = sha256(await readFile(file));

const diagnosis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-09-audio-source-preparation-failure-diagnosis",
  status:
    "preserved-batch-09-debate-170-public-source-partial-file-normalization-probe-failure-diagnosed",
  batchNumber: 5,
  developmentValidationOnly: false,
  productionCanary: false,
  stagingOnly: true,
  userAuthorization: {
    standingAuthorization: POST_CANARY_BATCH_09_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standingAuthorization.sha256,
    directIncrementalCostUsdMaximum: 0,
    diagnosisAuthorized: true,
    secondPublicSourceDownloadAttemptAuthorized: true
  },
  failedInvocation: {
    command:
      "node scripts/prepare-assessment-production-post-canary-batch-09-audio-sources.mjs --write",
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
    debateNumber: "170",
    sourceVideoId: "HoTILnpd3q8",
    category: "partial-public-source-normalization-output-rejected-by-ffprobe",
    failedFile: `${localRoot}/debate-170/audio/source.mp3`,
    failedFileBytes: expectedFiles[`${localRoot}/debate-170/audio/source.mp3`].bytes,
    failedFileSha256:
      expectedFiles[`${localRoot}/debate-170/audio/source.mp3`].sha256,
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
    debate170PublicSourceAttemptConsumed: true,
    debate170ClipsCreated: 0,
    debate19PublicSourceAttemptConsumed: false,
    debate19ClipsCreated: 0,
    debate183PublicSourceAttemptConsumed: false,
    debate183ClipsCreated: 0,
    completeSourcesRequired: 3,
    completeClipsRequired: 4,
    completeSourcesAvailable: 0,
    completeClipsAvailable: 0
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
    correctionPreparation: true,
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
    "prepare-and-hash-lock-one-bounded-batch-09-debate-170-public-source-transport-correction"
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
