#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_10_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch10StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-10-standing-authorization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-10/disagreement-extraction";
const localRoot =
  "output/transcribe/assessment-production-post-canary-batch-10-audio-verification";
const diagnosisPath = `${root}/audio-source-preparation-failure-diagnosis.json`;
const preparationOutput = `${root}/audio-source-preparation.json`;
const workPreparationPath = `${root}/audio-work-item-preparation.json`;
const workPath = `${root}/audio-work-items.json`;
const harnessPath =
  "scripts/prepare-assessment-production-post-canary-batch-10-audio-sources.mjs";
const harnessTestPath =
  "scripts/test-assessment-production-post-canary-batch-10-audio-sources.mjs";
const scriptPath =
  "scripts/diagnose-assessment-production-post-canary-batch-10-audio-source-preparation-failure.mjs";
const testPath =
  "scripts/test-assessment-production-post-canary-batch-10-audio-source-preparation-failure-diagnosis.mjs";
const ffprobe = "/opt/homebrew/bin/ffprobe";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const expectedFiles = {
  [`${localRoot}/debate-21/audio/source.mp3`]: {
    bytes: 32945106,
    sha256: "cfa98cdbc2ddb0a19410b37a382075a2fea51d35c939d33c6ae1504a23445bc7"
  },
  [`${localRoot}/debate-21/clips/con-religious-motivation-and-sanctity.mp3`]: {
    bytes: 787530,
    sha256: "075d78b837cfd7862110907b5c14cd417944abd0e769dd68c27c9b2d8f8f5c14"
  },
  [`${localRoot}/debate-21/clips/pro-natural-transcendence-without-supernaturalism.mp3`]: {
    bytes: 646698,
    sha256: "c47c549d3948c9c59025c574f7a9d19d220476d52ca3a89581b48276f099fb18"
  },
  [`${localRoot}/debate-74/audio/source.mp3`]: {
    bytes: 42973122,
    sha256: "9712859ab078ba2c689c81e18040f972e7a6450480220a0c991f4c7c066eaf72"
  },
  [`${localRoot}/debate-74/clips/pro-voluntary-risk-arena.mp3`]: {
    bytes: 1699914,
    sha256: "5b7c9957b212cfa64f07e767ff594055daa53660874f513a9b2397bf4ef42f2a"
  },
  [`${localRoot}/debate-123/audio/source.mp3`]: {
    bytes: 354,
    sha256: "87965bd54bc175f5645aa773bd5a0a98c396524a0dd0c4e94463828c11ed2754"
  }
};

assertV4(!(await exists(preparationOutput)), "audio-source preparation unexpectedly completed");
assertV4(!(await exists(diagnosisPath)), "failure diagnosis already exists");
assertV4(await exists(ffprobe), "ffprobe is unavailable");

const standingAuthorization =
  await loadAndValidatePostCanaryBatch10StandingAuthorization();
const [workPreparationBytes, workBytes] = await Promise.all([
  readFile(workPreparationPath),
  readFile(workPath)
]);
const workPreparation = JSON.parse(workPreparationBytes);
const work = JSON.parse(workBytes);
assertV4(
  workPreparation.status ===
      "prepared-and-frozen-nine-post-canary-batch-10-local-audio-source-work-items-standing-authorization-active-for-audio-preparation" &&
    workPreparation.nextAuthorizedAction ===
      "prepare-local-batch-10-source-audio-and-nine-frozen-clips-under-standing-authorization" &&
    work.moves.length === 9,
  "frozen Batch 10 audio work-item boundary changed"
);

const preservedFiles = [];
for (const [file, expected] of Object.entries(expectedFiles)) {
  const [bytes, metadata] = await Promise.all([readFile(file), stat(file)]);
  assertV4(metadata.size === expected.bytes, `${file}: byte size changed`);
  assertV4(sha256(bytes) === expected.sha256, `${file}: hash changed`);
  preservedFiles.push({ path: file, bytes: metadata.size, sha256: sha256(bytes) });
}

const debate123AudioDirectory = `${localRoot}/debate-123/audio`;
const debate123DirectoryEntries = (await readdir(debate123AudioDirectory)).sort();
assertV4(
  JSON.stringify(debate123DirectoryEntries) === JSON.stringify(["source.mp3"]),
  "Debate 123 partial download residue changed"
);
assertV4(
  !(await exists(`${localRoot}/debate-123/clips`)) ||
    (await readdir(`${localRoot}/debate-123/clips`)).length === 0,
  "Debate 123 clips unexpectedly exist"
);
assertV4(
  !(await exists(`${localRoot}/debate-147/audio/source.mp3`)) &&
    !(await exists(`${localRoot}/debate-130/audio/source.mp3`)),
  "an unattempted Batch 10 source unexpectedly exists"
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
      `${localRoot}/debate-123/audio/source.mp3`
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
} catch (error) {
  ffprobeExitStatus = error.status;
  ffprobeStderr = error.stderr;
}
assertV4(ffprobeExitStatus === 1, "Debate 123 invalid source no longer reproduces");
assertV4(
  ffprobeStderr.includes("Failed to find two consecutive MPEG audio frames") &&
    ffprobeStderr.includes("Invalid data found when processing input"),
  "Debate 123 ffprobe failure category changed"
);

const sourceFiles = [
  POST_CANARY_BATCH_10_STANDING_AUTHORIZATION,
  workPreparationPath,
  workPath,
  harnessPath,
  harnessTestPath,
  scriptPath,
  testPath,
  "scripts/lib/assessment-production-post-canary-batch-10-standing-authorization.mjs",
  "scripts/lib/v4-lean-production.mjs"
];
const sourceHashes = {};
for (const file of sourceFiles) sourceHashes[file] = sha256(await readFile(file));

const diagnosis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-10-audio-source-preparation-failure-diagnosis",
  status:
    "preserved-batch-10-debate-123-public-source-partial-file-normalization-probe-failure-diagnosed",
  batchNumber: 10,
  developmentValidationOnly: false,
  productionCanary: false,
  stagingOnly: true,
  userAuthorization: {
    standingAuthorization: POST_CANARY_BATCH_10_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standingAuthorization.sha256,
    directIncrementalCostUsdMaximum: 0,
    diagnosisAuthorized: true,
    secondPublicSourceDownloadAttemptAuthorized: true
  },
  failedInvocation: {
    command:
      "node scripts/prepare-assessment-production-post-canary-batch-10-audio-sources.mjs --write",
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
    debateNumber: "123",
    sourceVideoId: "8k9A7d2Wnjk",
    category: "partial-public-source-normalization-output-rejected-by-ffprobe",
    failedFile: `${localRoot}/debate-123/audio/source.mp3`,
    failedFileBytes: expectedFiles[`${localRoot}/debate-123/audio/source.mp3`].bytes,
    failedFileSha256:
      expectedFiles[`${localRoot}/debate-123/audio/source.mp3`].sha256,
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
    debate21PublicSourceAttemptConsumed: true,
    debate21ClipsCreated: 2,
    debate74PublicSourceAttemptConsumed: true,
    debate74ClipsCreated: 1,
    debate123PublicSourceAttemptConsumed: true,
    debate123ClipsCreated: 0,
    debate147PublicSourceAttemptConsumed: false,
    debate147ClipsCreated: 0,
    debate130PublicSourceAttemptConsumed: false,
    debate130ClipsCreated: 0,
    completeSourcesRequired: 5,
    completeClipsRequired: 9,
    completeSourcesAvailable: 2,
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
    "prepare-and-hash-lock-one-bounded-batch-10-debate-123-public-source-transport-correction"
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
