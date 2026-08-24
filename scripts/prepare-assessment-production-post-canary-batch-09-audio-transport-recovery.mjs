#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";

import {
  POST_CANARY_BATCH_09_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch09StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-09-standing-authorization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const shouldActivate = process.argv.includes("--activate");
assertV4(!(shouldWrite && shouldActivate), "choose either --write or --activate");

const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction";
const recoveryRoot = `${root}/audio-source-transport-recovery-1`;
const diagnosisPath = `${root}/audio-source-preparation-failure-diagnosis.json`;
const workPreparationPath = `${root}/audio-work-item-preparation.json`;
const workPath = `${root}/audio-work-items.json`;
const planPath = `${recoveryRoot}/correction-plan.json`;
const activationPath = `${recoveryRoot}/execution-activation.json`;
const executionPath = `${recoveryRoot}/execution.json`;
const preparationPath = `${root}/audio-source-preparation.json`;
const localRoot =
  "output/transcribe/assessment-production-post-canary-batch-09-audio-verification";
const invalidSourcePath = `${localRoot}/debate-170/audio/source.mp3`;
const preservedInvalidPath =
  `${localRoot}/debate-170/audio/source.failed-attempt-1.mp3`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const sourcePaths = [
  "scripts/prepare-assessment-production-post-canary-batch-09-audio-transport-recovery.mjs",
  "scripts/run-assessment-production-post-canary-batch-09-audio-transport-recovery.mjs",
  "scripts/test-assessment-production-post-canary-batch-09-audio-transport-recovery-preparation.mjs",
  "scripts/test-assessment-production-post-canary-batch-09-audio-source-recovery-cohort.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-09-audio-sources.mjs",
  "scripts/test-assessment-production-post-canary-batch-09-audio-sources.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-09-audio-work-items.mjs",
  "scripts/test-assessment-production-post-canary-batch-09-audio-work-items.mjs",
  "scripts/lib/assessment-production-post-canary-batch-09-audio-work-items.mjs",
  "scripts/lib/assessment-production-post-canary-batch-09-standing-authorization.mjs",
  "scripts/lib/v4-lean-production.mjs"
];

const standing = await loadAndValidatePostCanaryBatch09StandingAuthorization();
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
    "preserved-batch-09-debate-170-public-source-partial-file-normalization-probe-failure-diagnosed" &&
    diagnosis.failure.failedFileSha256 ===
      "87965bd54bc175f5645aa773bd5a0a98c396524a0dd0c4e94463828c11ed2754" &&
    diagnosis.authorization.correctionPreparation,
  "Batch 9 audio transport diagnosis changed"
);
assertV4(
  work.moves.length === 4 &&
    workPreparation.workArtifact.sha256 === sha256(workBytes),
  "Batch 9 frozen audio work-item cohort changed"
);
const invalidBytes = await readFile(invalidSourcePath);
const invalidStat = await stat(invalidSourcePath);
assertV4(
  invalidStat.size === 354 &&
    sha256(invalidBytes) === diagnosis.failure.failedFileSha256,
  "Debate 170 invalid source evidence changed"
);
assertV4(!(await exists(preparationPath)), "audio-source preparation already exists");
assertV4(!(await exists(executionPath)), "audio recovery already executed");

const sourceHashes = {};
for (const file of sourcePaths) sourceHashes[file] = sha256(await readFile(file));
const grouped = Map.groupBy(work.moves, (move) => move.sourceVideoId);
const sources = [...grouped].map(([videoId, moves]) => ({
  debateNumber: moves[0].debateNumber,
  sourceVideoId: videoId,
  mode: videoId === "HoTILnpd3q8" ? "recover-once" : "original-once",
  maximumRequiredEndMs: Math.max(...moves.map((move) => move.clipWindow.endMs)),
  moveIds: moves.map((move) => move.moveId)
}));
assertV4(
  JSON.stringify(sources.map((item) => item.sourceVideoId).sort()) ===
    JSON.stringify(["HoTILnpd3q8", "_pprQXq1eCA", "2WrywAaDvvw"].sort()),
  "Batch 9 exact audio source cohort changed"
);

const authenticatedInputs = {
  [POST_CANARY_BATCH_09_STANDING_AUTHORIZATION]: standing.sha256,
  [diagnosisPath]: sha256(diagnosisBytes),
  [workPreparationPath]: sha256(workPreparationBytes),
  [workPath]: sha256(workBytes)
};

const plan = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-09-audio-source-transport-recovery-plan",
  status:
    "frozen-one-shot-batch-09-debate-170-public-source-transport-recovery-ready",
  batchNumber: 9,
  checkpointCommit: "7ee78c0d",
  userAuthorization: {
    standingAuthorization: POST_CANARY_BATCH_09_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standing.sha256,
    directIncrementalCostUsdMaximum: 0,
    firstBoundedTransportRecoveryAuthorized: true,
    debate170AdditionalPublicSourceAttemptsAuthorized: 1,
    debate19OriginalPublicSourceAttemptsAuthorized: 1,
    debate183OriginalPublicSourceAttemptsAuthorized: 1,
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
    sourceCount: 3,
    clipCount: 4
  },
  debate170Recovery: {
    invalidSourcePath,
    preservedInvalidEvidencePath: preservedInvalidPath,
    downloadTemplate:
      `${localRoot}/debate-170/audio/source.recovery-1.hls.%(ext)s`,
    normalizedTemporaryPath:
      `${localRoot}/debate-170/audio/source.recovery-1.normalized.mp3`,
    finalSourcePath: invalidSourcePath,
    videoUrl: "https://www.youtube.com/watch?v=HoTILnpd3q8",
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
    minimumDurationMs: 4722770
  },
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
      "1.0-assessment-production-post-canary-batch-09-audio-source-transport-recovery-activation",
    status:
      "active-for-exactly-one-batch-09-debate-170-public-source-transport-recovery",
    batchNumber: 9,
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
      debate170AdditionalAttempts: 1,
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
