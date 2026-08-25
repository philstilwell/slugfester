#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";

import {
  POST_CANARY_BATCH_10_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch10StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-10-standing-authorization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const shouldActivate = process.argv.includes("--activate");
assertV4(!(shouldWrite && shouldActivate), "choose either --write or --activate");

const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-10/disagreement-extraction";
const recoveryRoot = `${root}/audio-source-transport-recovery-1`;
const diagnosisPath = `${root}/audio-source-preparation-failure-diagnosis.json`;
const workPreparationPath = `${root}/audio-work-item-preparation.json`;
const workPath = `${root}/audio-work-items.json`;
const planPath = `${recoveryRoot}/correction-plan.json`;
const activationPath = `${recoveryRoot}/execution-activation.json`;
const executionPath = `${recoveryRoot}/execution.json`;
const preparationPath = `${root}/audio-source-preparation.json`;
const localRoot =
  "output/transcribe/assessment-production-post-canary-batch-10-audio-verification";
const invalidSourcePath = `${localRoot}/debate-123/audio/source.mp3`;
const preservedInvalidPath =
  `${localRoot}/debate-123/audio/source.failed-attempt-1.mp3`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const sourcePaths = [
  "scripts/prepare-assessment-production-post-canary-batch-10-audio-transport-recovery.mjs",
  "scripts/run-assessment-production-post-canary-batch-10-audio-transport-recovery.mjs",
  "scripts/test-assessment-production-post-canary-batch-10-audio-transport-recovery-preparation.mjs",
  "scripts/test-assessment-production-post-canary-batch-10-audio-source-recovery-cohort.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-10-audio-sources.mjs",
  "scripts/test-assessment-production-post-canary-batch-10-audio-sources.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-10-audio-work-items.mjs",
  "scripts/test-assessment-production-post-canary-batch-10-audio-work-items.mjs",
  "scripts/lib/assessment-production-post-canary-batch-10-audio-work-items.mjs",
  "scripts/lib/assessment-production-post-canary-batch-10-standing-authorization.mjs",
  "scripts/lib/v4-lean-production.mjs"
];

const standing = await loadAndValidatePostCanaryBatch10StandingAuthorization();
const [diagnosisBytes, workPreparationBytes, workBytes] = await Promise.all([
  readFile(diagnosisPath),
  readFile(workPreparationPath),
  readFile(workPath)
]);
const diagnosis = JSON.parse(diagnosisBytes);
const workPreparation = JSON.parse(workPreparationBytes);
const work = JSON.parse(workBytes);

assertV4(
  diagnosis.status ===
    "preserved-batch-10-debate-123-public-source-partial-file-normalization-probe-failure-diagnosed" &&
    diagnosis.failure.failedFileSha256 ===
      "87965bd54bc175f5645aa773bd5a0a98c396524a0dd0c4e94463828c11ed2754" &&
    diagnosis.authorization.correctionPreparation,
  "Batch 10 audio transport diagnosis changed"
);
assertV4(
  work.moves.length === 9 &&
    workPreparation.workArtifact.sha256 === sha256(workBytes),
  "Batch 10 frozen audio work-item cohort changed"
);
const invalidBytes = await readFile(invalidSourcePath);
const invalidStat = await stat(invalidSourcePath);
assertV4(
  invalidStat.size === 354 &&
    sha256(invalidBytes) === diagnosis.failure.failedFileSha256,
  "Debate 123 invalid source evidence changed"
);
assertV4(!(await exists(preparationPath)), "audio-source preparation already exists");
assertV4(!(await exists(executionPath)), "audio recovery already executed");

const sourceHashes = {};
for (const file of sourcePaths) sourceHashes[file] = sha256(await readFile(file));
const grouped = Map.groupBy(work.moves, (move) => move.sourceVideoId);
const sources = [...grouped].map(([videoId, moves]) => ({
  debateNumber: moves[0].debateNumber,
  sourceVideoId: videoId,
  mode:
    videoId === "8k9A7d2Wnjk"
      ? "recover-once"
      : ["2kZRAOXEFPI", "MfCQBynjgnw"].includes(videoId)
        ? "accepted-prefix-source"
        : "original-once",
  maximumRequiredEndMs: Math.max(...moves.map((move) => move.clipWindow.endMs)),
  moveIds: moves.map((move) => move.moveId)
}));
assertV4(
  JSON.stringify(sources.map((item) => item.sourceVideoId).sort()) ===
    JSON.stringify([
      "2kZRAOXEFPI",
      "MfCQBynjgnw",
      "8k9A7d2Wnjk",
      "h-I_9e5qxnc",
      "0IpKHdVLZb4"
    ].sort()),
  "Batch 10 exact audio source cohort changed"
);

const authenticatedInputs = {
  [POST_CANARY_BATCH_10_STANDING_AUTHORIZATION]: standing.sha256,
  [diagnosisPath]: sha256(diagnosisBytes),
  [workPreparationPath]: sha256(workPreparationBytes),
  [workPath]: sha256(workBytes)
};

const plan = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-10-audio-source-transport-recovery-plan",
  status:
    "frozen-one-shot-batch-10-debate-123-public-source-transport-recovery-ready",
  batchNumber: 10,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  userAuthorization: {
    standingAuthorization: POST_CANARY_BATCH_10_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standing.sha256,
    directIncrementalCostUsdMaximum: 0,
    firstBoundedTransportRecoveryAuthorized: true,
    debate123AdditionalPublicSourceAttemptsAuthorized: 1,
    debate147OriginalPublicSourceAttemptsAuthorized: 1,
    debate130OriginalPublicSourceAttemptsAuthorized: 1,
    debate21AcceptedPrefixSourceReuseAuthorized: true,
    debate74AcceptedPrefixSourceReuseAuthorized: true,
    audioPlaybackAuthorized: false,
    semanticAudioEvaluationAuthorized: false,
    modelExecutionAuthorized: false,
    paidServicesAuthorized: false,
    transcriptionAuthorized: false
  },
  authenticatedInputs,
  protectedInvalidEvidence: {
    path: invalidSourcePath,
    preservedPath: preservedInvalidPath,
    bytes: invalidStat.size,
    sha256: sha256(invalidBytes)
  },
  exactCohort: {
    sources,
    moves: work.moves.map((move) => ({
      debateNumber: move.debateNumber,
      sourceVideoId: move.sourceVideoId,
      moveId: move.moveId,
      expectedSpeaker: move.expectedSpeaker,
      startMs: move.clipWindow.startMs,
      endMs: move.clipWindow.endMs
    })),
    sourceCount: 5,
    clipCount: 9
  },
  debate123Recovery: {
    invalidSourcePath,
    preservedInvalidEvidencePath: preservedInvalidPath,
    downloadTemplate:
      `${localRoot}/debate-123/audio/source.recovery-1.hls.%(ext)s`,
    normalizedTemporaryPath:
      `${localRoot}/debate-123/audio/source.recovery-1.normalized.mp3`,
    finalSourcePath: invalidSourcePath,
    videoUrl: "https://www.youtube.com/watch?v=8k9A7d2Wnjk",
    transport: "web-safari-hls-manifest-native-segment-transport",
    ytDlpArguments: [
      "-m", "yt_dlp", "--no-playlist", "--quiet", "--no-warnings",
      "--no-continue", "--retries", "0", "--fragment-retries", "0",
      "--extractor-retries", "0", "--file-access-retries", "0",
      "--concurrent-fragments", "1", "--downloader", "m3u8:native",
      "--extractor-args", "youtube:player_client=web_safari",
      "-f", "best[protocol^=m3u8]"
    ],
    maximumAdditionalCliInvocations: 1,
    retriesMaximum: 0,
    minimumDurationMs: 6063219
  },
  acceptedPrefixSources: sources
    .filter((item) => item.mode === "accepted-prefix-source")
    .map((item) => {
      const path = `${localRoot}/debate-${item.debateNumber}/audio/source.mp3`;
      const preserved = diagnosis.preservedFiles.find(
        (file) => file.path === path
      );
      assertV4(preserved, `${item.debateNumber}: accepted source hash is absent`);
      return { ...item, path, bytes: preserved.bytes, sha256: preserved.sha256 };
    }),
  unattemptedOriginalSources: sources
    .filter((item) => item.mode === "original-once")
    .map((item) => ({
      ...item,
      videoUrl: `https://www.youtube.com/watch?v=${item.sourceVideoId}`,
      maximumCliInvocations: 1,
      retriesMaximum: 0
    })),
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
  sourceHashes,
  outputs: { activationPath, executionPath, preparationPath }
};

if (shouldActivate) {
  assertV4(await exists(planPath), "frozen correction plan is missing");
  const planBytes = await readFile(planPath);
  const frozenPlan = JSON.parse(planBytes);
  assertV4(
    frozenPlan.status === plan.status &&
      JSON.stringify(frozenPlan.sourceHashes) === JSON.stringify(sourceHashes),
    "frozen correction plan changed"
  );
  assertV4(!(await exists(activationPath)), "recovery activation already exists");
  await mkdir(recoveryRoot, { recursive: true });
  const activation = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-10-audio-source-transport-recovery-activation",
    status:
      "active-for-exactly-one-batch-10-debate-123-public-source-transport-recovery",
    batchNumber: 10,
    plan: { path: planPath, sha256: sha256(planBytes) },
    authenticatedInputs,
    sourceHashes,
    executionPolicy: structuredClone(plan.executionPolicy),
    activatedExecutionMaximum: 1,
    directIncrementalCostUsdMaximum: 0
  };
  await writeFile(activationPath, `${JSON.stringify(activation, null, 2)}\n`);
  console.log(JSON.stringify({ status: activation.status, plan: activation.plan }, null, 2));
  process.exit(0);
}

if (shouldWrite) {
  assertV4(!(await exists(planPath)), "correction plan already exists");
  await mkdir(recoveryRoot, { recursive: true });
  await writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: plan.status,
      wroteArtifact: shouldWrite,
      sources: plan.exactCohort.sourceCount,
      clips: plan.exactCohort.clipCount,
      debate123AdditionalAttempts: 1,
      unattemptedOriginalSources: plan.unattemptedOriginalSources.length,
      retries: 0,
      audioPlaybackCalls: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0,
      nextAction: "validate-and-commit-the-frozen-correction-plan"
    },
    null,
    2
  )
);
