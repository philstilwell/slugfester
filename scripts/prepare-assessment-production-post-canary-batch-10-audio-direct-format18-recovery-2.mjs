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
const recoveryRoot = `${root}/audio-source-direct-format18-recovery-2`;
const diagnosisPath = `${root}/audio-source-preparation-failure-diagnosis.json`;
const priorRecoveryRoot = `${root}/audio-source-transport-recovery-1`;
const priorPlanPath = `${priorRecoveryRoot}/correction-plan.json`;
const priorActivationPath = `${priorRecoveryRoot}/execution-activation.json`;
const priorExecutionPath = `${priorRecoveryRoot}/execution.json`;
const workPreparationPath = `${root}/audio-work-item-preparation.json`;
const workPath = `${root}/audio-work-items.json`;
const planPath = `${recoveryRoot}/correction-plan.json`;
const activationPath = `${recoveryRoot}/execution-activation.json`;
const executionPath = `${recoveryRoot}/execution.json`;
const preparationPath = `${root}/audio-source-preparation.json`;
const localRoot =
  "output/transcribe/assessment-production-post-canary-batch-10-audio-verification";
const finalSourcePath = `${localRoot}/debate-123/audio/source.mp3`;
const preservedInvalidPath =
  `${localRoot}/debate-123/audio/source.failed-attempt-1.mp3`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const sourcePaths = [
  "scripts/prepare-assessment-production-post-canary-batch-10-audio-direct-format18-recovery-2.mjs",
  "scripts/run-assessment-production-post-canary-batch-10-audio-direct-format18-recovery-2.mjs",
  "scripts/test-assessment-production-post-canary-batch-10-audio-direct-format18-recovery-2-preparation.mjs",
  "scripts/test-assessment-production-post-canary-batch-10-audio-direct-format18-recovery-2-cohort.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-10-audio-sources.mjs",
  "scripts/test-assessment-production-post-canary-batch-10-audio-sources.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-10-audio-work-items.mjs",
  "scripts/test-assessment-production-post-canary-batch-10-audio-work-items.mjs",
  "scripts/lib/assessment-production-post-canary-batch-10-audio-work-items.mjs",
  "scripts/lib/assessment-production-post-canary-batch-10-standing-authorization.mjs",
  "scripts/lib/v4-lean-production.mjs"
];

const standing = await loadAndValidatePostCanaryBatch10StandingAuthorization();
const [
  diagnosisBytes,
  priorPlanBytes,
  priorActivationBytes,
  priorExecutionBytes,
  workPreparationBytes,
  workBytes
] = await Promise.all([
  readFile(diagnosisPath),
  readFile(priorPlanPath),
  readFile(priorActivationPath),
  readFile(priorExecutionPath),
  readFile(workPreparationPath),
  readFile(workPath)
]);
const diagnosis = JSON.parse(diagnosisBytes);
const priorExecution = JSON.parse(priorExecutionBytes);
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
  priorExecution.status ===
      "failed-one-shot-batch-10-audio-source-transport-recovery-stop-required" &&
    priorExecution.failure?.category ===
      "source-or-validation-failure-during-authorized-transport-recovery" &&
    priorExecution.failure?.stopRequired === true &&
    priorExecution.failure?.furtherOrdinaryAttemptsAuthorized === false &&
    priorExecution.state?.debate123AdditionalDownloadCliInvocations === 1 &&
    priorExecution.state?.acceptedExistingSourcesRevalidated === 2 &&
    priorExecution.state?.sourcesInstalled === 2 &&
    priorExecution.protectedEvidencePreserved === true,
  "Batch 10 first bounded recovery failure changed"
);
assertV4(
  work.moves.length === 9 &&
    workPreparation.workArtifact.sha256 === sha256(workBytes),
  "Batch 10 frozen audio work-item cohort changed"
);
const invalidBytes = await readFile(preservedInvalidPath);
const invalidStat = await stat(preservedInvalidPath);
assertV4(
  invalidStat.size === 354 &&
    sha256(invalidBytes) === diagnosis.failure.failedFileSha256,
  "Debate 123 invalid source evidence changed"
);
assertV4(!(await exists(preparationPath)), "audio-source preparation already exists");
assertV4(!(await exists(executionPath)), "audio recovery already executed");
assertV4(!(await exists(finalSourcePath)), "Debate 123 final source unexpectedly exists");

const sourceHashes = {};
for (const file of sourcePaths) sourceHashes[file] = sha256(await readFile(file));
const grouped = Map.groupBy(work.moves, (move) => move.sourceVideoId);
const sources = [...grouped].map(([videoId, moves]) => ({
  debateNumber: moves[0].debateNumber,
  sourceVideoId: videoId,
  mode:
    ["2kZRAOXEFPI", "MfCQBynjgnw"].includes(videoId)
        ? "accepted-prefix-source"
        : "direct-format18-once",
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
  [priorPlanPath]: sha256(priorPlanBytes),
  [priorActivationPath]: sha256(priorActivationBytes),
  [priorExecutionPath]: sha256(priorExecutionBytes),
  [workPreparationPath]: sha256(workPreparationBytes),
  [workPath]: sha256(workBytes)
};

const plan = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-10-audio-source-direct-format18-recovery-2-plan",
  status:
    "frozen-one-shot-batch-10-three-source-direct-format18-recursive-recovery-ready",
  batchNumber: 10,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  userAuthorization: {
    standingAuthorization: POST_CANARY_BATCH_10_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standing.sha256,
    directIncrementalCostUsdMaximum: 0,
    recursiveCorrectionAuthorized: true,
    recursiveCorrectionsMaximum: 1,
    debate123DirectFormat18AttemptsAuthorized: 1,
    debate147DirectFormat18AttemptsAuthorized: 1,
    debate130DirectFormat18AttemptsAuthorized: 1,
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
    path: preservedInvalidPath,
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
  directFormat18Sources: sources
    .filter((item) => item.mode === "direct-format18-once")
    .map((item) => ({
      ...item,
      videoUrl: `https://www.youtube.com/watch?v=${item.sourceVideoId}`,
      formatId: "18",
      protocol: "https",
      audioCodec: "aac",
      audioSampleRateHz: 44100,
      directUrlResolutionCliInvocationsMaximum: 1,
      ffmpegStreamingInvocationsMaximum: 1,
      ffmpegStreamingTimeoutMs: 600000,
      retriesMaximum: 0
    })),
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
  transportDiagnosis: {
    formatInventoryQueries: 3,
    format18OnlyMediaFormatForDirectSources: true,
    hlsFormatsAvailable: 0,
    debate123RangeProbe: {
      requestedBytes: 1024,
      responseStatus: 206,
      acceptRanges: "bytes",
      contentType: "video/mp4"
    },
    debate123Probe: {
      durationSeconds: 6075.895873,
      audioCodec: "aac",
      audioSampleRateHz: 44100,
      audioChannels: 2,
      audioBitRateBps: 127999
    },
    audioPlaybackCalls: 0,
    semanticAudioEvaluations: 0
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
    directUrlResolutionInvocationsMaximum: 3,
    ffmpegStreamingInvocationsMaximum: 3,
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
      "1.0-assessment-production-post-canary-batch-10-audio-source-direct-format18-recovery-2-activation",
    status:
      "active-for-exactly-one-batch-10-three-source-direct-format18-recursive-recovery",
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
      directFormat18Sources: plan.directFormat18Sources.length,
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
