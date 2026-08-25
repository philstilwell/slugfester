#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const shouldActivate = process.argv.includes("--activate");
assertV4(!(shouldWrite && shouldActivate), "choose either --write or --activate");

const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction";
const recoveryRoot = `${root}/audio-source-transport-recovery-8`;
const priorInventoryPath = `${root}/audio-source-transport-recovery-7/format-inventory.json`;
const priorAnalysisPath = `${root}/audio-source-transport-recovery-7/analysis.json`;
const priorCohortPlanPath = `${root}/audio-source-transport-recovery-2/correction-plan.json`;
const workPreparationPath = `${root}/audio-work-item-preparation.json`;
const workPath = `${root}/audio-work-items.json`;
const standingPath =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/standing-authorization.json";
const manifestPaths = [
  ".assessment-cache/captions/HoTILnpd3q8/manifest.json",
  ".assessment-cache/captions/_pprQXq1eCA/manifest.json",
  ".assessment-cache/captions/2WrywAaDvvw/manifest.json"
];
const preparePath =
  "scripts/prepare-assessment-production-post-canary-batch-09-direct-audio-recovery-8.mjs";
const testPath =
  "scripts/test-assessment-production-post-canary-batch-09-direct-audio-recovery-8.mjs";
const runnerPath =
  "scripts/run-assessment-production-post-canary-batch-09-direct-audio-recovery-8.mjs";
const planPath = `${recoveryRoot}/correction-plan.json`;
const activationPath = `${recoveryRoot}/execution-activation.json`;
const executionPath = `${recoveryRoot}/execution.json`;
const analysisPath = `${recoveryRoot}/analysis.json`;
const preparationPath = `${root}/audio-source-preparation.json`;
const invalidEvidencePath =
  "output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-170/audio/source.failed-attempt-1.mp3";
const localRoot =
  "output/transcribe/assessment-production-post-canary-batch-09-audio-verification";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const inputPaths = [
  priorInventoryPath,
  priorAnalysisPath,
  priorCohortPlanPath,
  workPreparationPath,
  workPath,
  standingPath,
  ...manifestPaths
];
const inputBytes = Object.fromEntries(
  await Promise.all(inputPaths.map(async (file) => [file, await readFile(file)]))
);
const priorInventory = JSON.parse(inputBytes[priorInventoryPath]);
const priorAnalysis = JSON.parse(inputBytes[priorAnalysisPath]);
const priorCohortPlan = JSON.parse(inputBytes[priorCohortPlanPath]);
const work = JSON.parse(inputBytes[workPath]);
const manifests = manifestPaths.map((file) => JSON.parse(inputBytes[file]));

assertV4(
  priorAnalysis.status ===
    "batch-09-debate-170-public-player-metadata-discovery-passed" &&
    priorAnalysis.result.sourceIdentityPassed === true &&
    priorInventory.formatSummary.directUrlAudioFormats > 0,
  "public player metadata discovery changed"
);
assertV4(
  priorCohortPlan.exactCohort.sourceCount === 3 &&
    priorCohortPlan.exactCohort.clipCount === 4,
  "frozen audio cohort changed"
);
assertV4(work.moves.length === 4, "frozen audio work-item count changed");
assertV4(
  JSON.stringify(manifests.map((item) => item.videoId)) ===
    JSON.stringify(["HoTILnpd3q8", "_pprQXq1eCA", "2WrywAaDvvw"]),
  "canonical source order changed"
);
assertV4(
  sha256(await readFile(invalidEvidencePath)) ===
    priorCohortPlan.protectedInvalidEvidence.sha256,
  "protected invalid Debate 170 evidence changed"
);
assertV4(!(await exists(preparationPath)), "audio-source preparation already exists");

const sourceHashes = {};
for (const file of [preparePath, testPath, runnerPath]) {
  sourceHashes[file] = sha256(await readFile(file));
}
const authenticatedInputs = Object.fromEntries(
  inputPaths.map((file) => [file, sha256(inputBytes[file])])
);
const requestHeaders = {
  "accept-language": "en-US,en;q=0.9",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131 Safari/537.36"
};
const client = {
  clientName: "ANDROID",
  clientVersion: "20.10.38",
  androidSdkVersion: 30,
  hl: "en",
  gl: "US"
};
const sources = priorCohortPlan.exactCohort.sources.map((source) => {
  const manifest = manifests.find((item) => item.videoId === source.sourceVideoId);
  const payload = {
    context: { client },
    videoId: source.sourceVideoId,
    contentCheckOk: true,
    racyCheckOk: true
  };
  return {
    debateNumber: source.debateNumber,
    sourceVideoId: source.sourceVideoId,
    mode:
      source.debateNumber === "170"
        ? "bounded-direct-url-recovery"
        : "unattempted-original-direct-url-route",
    maximumRequiredEndMs: source.maximumRequiredEndMs,
    expectedDurationSeconds: manifest.durationSeconds,
    manifestPath: manifestPaths.find((file) => file.includes(source.sourceVideoId)),
    manifestSha256: authenticatedInputs[
      manifestPaths.find((file) => file.includes(source.sourceVideoId))
    ],
    payload,
    payloadSha256: sha256(JSON.stringify(payload)),
    finalSourcePath: `${localRoot}/debate-${source.debateNumber}/audio/source.mp3`,
    moveIds: source.moveIds
  };
});
for (const source of sources) {
  assertV4(!(await exists(source.finalSourcePath)), `${source.debateNumber}: source already exists`);
}

const ffmpegPath = "/opt/homebrew/bin/ffmpeg";
const ffprobePath = "/opt/homebrew/bin/ffprobe";
const firstLine = (value) => value.trim().split("\n")[0];
const plan = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-09-direct-audio-recovery-8-plan",
  status:
    "frozen-one-shot-batch-09-three-source-direct-audio-preparation-recovery-8-ready",
  batchNumber: 9,
  checkpointCommit: "02ffa111",
  userAuthorization: {
    standingAuthorization: standingPath,
    instruction: "Continue at your discretion.",
    directIncrementalCostUsdMaximum: 0,
    debate170AdditionalDirectSourceAttemptAuthorized: 1,
    debate19OriginalSourceAttemptAuthorized: 1,
    debate183OriginalSourceAttemptAuthorized: 1,
    localFfmpegProcessingAuthorized: true,
    audioPlaybackAuthorized: false,
    semanticAudioEvaluationAuthorized: false,
    modelExecutionAuthorized: false,
    paidServicesAuthorized: false,
    transcriptionAuthorized: false
  },
  authenticatedInputs,
  protectedInvalidEvidence: {
    path: invalidEvidencePath,
    bytes: (await readFile(invalidEvidencePath)).length,
    sha256: sha256(await readFile(invalidEvidencePath))
  },
  sourceHashes,
  exactCohort: {
    sources,
    moves: priorCohortPlan.exactCohort.moves,
    sourceCount: 3,
    clipCount: 4,
    sourceOrder: ["170", "19", "183"],
    clipOrder: work.moves.map((move) => `${move.debateNumber}:${move.moveId}`)
  },
  publicRequestRoute: {
    configBootstrap: {
      method: "GET",
      url: "https://www.youtube.com/watch?v=HoTILnpd3q8",
      credentials: "omit",
      redirect: "error",
      headers: requestHeaders,
      maximumRequests: 1
    },
    playerMetadata: {
      method: "POST",
      endpointTemplate: "https://www.youtube.com/youtubei/v1/player?key=<public-api-key>",
      credentials: "omit",
      redirect: "error",
      headers: { ...requestHeaders, "content-type": "application/json" },
      maximumRequests: 3
    },
    mediaDownload: {
      method: "GET",
      credentials: "omit",
      redirect: "error",
      headers: requestHeaders,
      maximumRequests: 3,
      retriesMaximum: 0
    }
  },
  deterministicFormatSelection: {
    eligibleMimePrefix: "audio/",
    directUrlRequired: true,
    contentLengthRequired: true,
    originalTrackRule:
      "prefer formats with audioTrack.audioIsDefault true; otherwise permit only formats without an explicit false audioIsDefault marker",
    qualityRankDescending: [
      "AUDIO_QUALITY_HIGH",
      "AUDIO_QUALITY_MEDIUM",
      "AUDIO_QUALITY_LOW",
      null
    ],
    tieBreakers: ["bitrate-descending", "contentLength-descending", "itag-ascending", "urlSha256-ascending"],
    selectedFormatsPerSource: 1
  },
  mediaEncoding: {
    ffmpegPath,
    ffmpegVersion: firstLine(execFileSync(ffmpegPath, ["-version"], { encoding: "utf8" })),
    ffprobePath,
    ffprobeVersion: firstLine(execFileSync(ffprobePath, ["-version"], { encoding: "utf8" })),
    normalizedChannels: 1,
    normalizedSampleRateHz: 16000,
    normalizedBitrateKbps: 48,
    clipChannels: 1,
    clipSampleRateHz: 16000,
    clipBitrateKbps: 64,
    clipDurationToleranceSeconds: 0.25,
    fullSourceDurationToleranceSeconds: 12
  },
  executionPolicy: {
    attemptsMaximum: 1,
    configBootstrapGetsMaximum: 1,
    playerMetadataPostsMaximum: 3,
    mediaDownloadGetsMaximum: 3,
    downloaderRetriesMaximum: 0,
    rerunsMaximum: 0,
    automaticRepairsMaximum: 0,
    timeoutExtensionsMaximum: 0,
    audioPlaybackCallsMaximum: 0,
    semanticAudioEvaluationsMaximum: 0,
    modelContextsMaximum: 0,
    transcriptionCallsMaximum: 0,
    paidServiceCallsMaximum: 0,
    directIncrementalCostUsdMaximum: 0,
    stopOnAnySourceOrValidationFailure: true
  },
  outputs: { activationPath, executionPath, analysisPath, preparationPath },
  nextActionAfterPassingCohort:
    "prepare-validate-freeze-and-report-batch-09-four-clip-audio-verification-manifest-and-cost-estimate"
};

if (shouldActivate) {
  assertV4(await exists(planPath), "frozen direct-audio recovery plan is missing");
  const planBytes = await readFile(planPath);
  const frozenPlan = JSON.parse(planBytes);
  assertV4(
    frozenPlan.status === plan.status &&
      JSON.stringify(frozenPlan.sourceHashes) === JSON.stringify(sourceHashes) &&
      JSON.stringify(frozenPlan.exactCohort.sources.map((item) => item.payloadSha256)) ===
        JSON.stringify(sources.map((item) => item.payloadSha256)),
    "frozen direct-audio recovery plan changed"
  );
  assertV4(!(await exists(activationPath)), "direct-audio recovery already activated");
  await mkdir(recoveryRoot, { recursive: true });
  const activation = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-09-direct-audio-recovery-8-activation",
    status:
      "active-for-exactly-one-batch-09-three-source-direct-audio-preparation-recovery-8-pass",
    batchNumber: 9,
    plan: { path: planPath, sha256: sha256(planBytes) },
    authenticatedInputs,
    protectedInvalidEvidence: plan.protectedInvalidEvidence,
    sourceHashes,
    sourceOrder: plan.exactCohort.sourceOrder,
    clipOrder: plan.exactCohort.clipOrder,
    configBootstrapGetsMaximum: 1,
    playerMetadataPostsMaximum: 3,
    mediaDownloadGetsMaximum: 3,
    retriesMaximum: 0,
    audioPlaybackMaximumSeconds: 0,
    directIncrementalCostUsdMaximum: 0
  };
  await writeFile(activationPath, `${JSON.stringify(activation, null, 2)}\n`);
  console.log(JSON.stringify({ status: activation.status, plan: activation.plan }, null, 2));
  process.exit(0);
}

if (shouldWrite) {
  assertV4(!(await exists(planPath)), "direct-audio recovery plan already exists");
  await mkdir(recoveryRoot, { recursive: true });
  await writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`);
}

console.log(
  JSON.stringify(
    {
      status: plan.status,
      wroteArtifact: shouldWrite,
      sources: 3,
      clips: 4,
      configBootstrapGets: 1,
      playerMetadataPosts: 3,
      mediaDownloadGets: 3,
      retries: 0,
      audioPlaybackMaximumSeconds: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
