#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const shouldActivate = process.argv.includes("--activate");
assertV4(!(shouldWrite && shouldActivate), "choose either --write or --activate");

const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-10/disagreement-extraction";
const recoveryRoot = `${root}/audio-source-range-recovery-3`;
const discoveryPath = `${recoveryRoot}/equivalent-source-discovery.json`;
const priorRecoveryRoot = `${root}/audio-source-direct-format18-recovery-2`;
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
const protectedEvidencePaths = [
  `${localRoot}/debate-123/audio/source.failed-attempt-1.mp3`,
  `${localRoot}/debate-123/audio/source.direct-format18.normalized.mp3`
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const sourcePaths = [
  "scripts/prepare-assessment-production-post-canary-batch-10-audio-source-range-recovery-3.mjs",
  "scripts/run-assessment-production-post-canary-batch-10-audio-source-range-recovery-3.mjs",
  "scripts/test-assessment-production-post-canary-batch-10-audio-source-range-recovery-3-preparation.mjs",
  "scripts/test-assessment-production-post-canary-batch-10-audio-source-range-recovery-3-cohort.mjs",
  "scripts/test-assessment-production-post-canary-batch-10-audio-sources.mjs",
  "scripts/lib/assessment-production-post-canary-batch-10-audio-work-items.mjs",
  "scripts/lib/v4-lean-production.mjs"
];

const [
  discoveryBytes,
  priorPlanBytes,
  priorActivationBytes,
  priorExecutionBytes,
  workPreparationBytes,
  workBytes
] = await Promise.all([
  readFile(discoveryPath),
  readFile(priorPlanPath),
  readFile(priorActivationPath),
  readFile(priorExecutionPath),
  readFile(workPreparationPath),
  readFile(workPath)
]);
const discovery = JSON.parse(discoveryBytes);
const priorPlan = JSON.parse(priorPlanBytes);
const priorExecution = JSON.parse(priorExecutionBytes);
const workPreparation = JSON.parse(workPreparationBytes);
const work = JSON.parse(workBytes);

assertV4(
  discovery.status ===
      "completed-batch-10-equivalent-source-discovery-range-verified-original-source-fallback-required" &&
    discovery.userAuthorization.rangeVerifiedDownloadsAuthorized === 3 &&
    discovery.userAuthorization.directIncrementalCostUsdMaximum === 0 &&
    discovery.originalSourceFallbacks.length === 3,
  "Batch 10 recovery-3 discovery changed"
);
assertV4(
  priorExecution.status ===
      "failed-one-shot-batch-10-audio-source-direct-format18-recovery-2-stop-required" &&
    priorExecution.state?.directUrlResolutionCliInvocations === 1 &&
    priorExecution.state?.ffmpegStreamingInvocations === 1 &&
    priorExecution.state?.acceptedExistingSourcesRevalidated === 2 &&
    priorExecution.state?.sourcesInstalled === 2 &&
    priorExecution.state?.retries === 0 &&
    priorExecution.failure?.stopRequired === true,
  "Batch 10 recovery-2 failure changed"
);
assertV4(
  work.moves.length === 9 &&
    workPreparation.workArtifact.sha256 === sha256(workBytes),
  "Batch 10 frozen audio work-item cohort changed"
);
const protectedInvalidEvidence = [];
for (const path of protectedEvidencePaths) {
  const bytes = await readFile(path);
  const fileStat = await stat(path);
  assertV4(
    fileStat.size === 354 &&
      sha256(bytes) ===
        "87965bd54bc175f5645aa773bd5a0a98c396524a0dd0c4e94463828c11ed2754",
    `${path}: protected evidence changed`
  );
  protectedInvalidEvidence.push({ path, bytes: fileStat.size, sha256: sha256(bytes) });
}
assertV4(!(await exists(preparationPath)), "audio-source preparation already exists");
assertV4(!(await exists(executionPath)), "audio recovery already executed");
for (const debateNumber of ["123", "147", "130"]) {
  assertV4(
    !(await exists(`${localRoot}/debate-${debateNumber}/audio/source.mp3`)),
    `Debate ${debateNumber} final source unexpectedly exists`
  );
}

const sourceHashes = {};
for (const file of sourcePaths) sourceHashes[file] = sha256(await readFile(file));
const grouped = Map.groupBy(work.moves, (move) => move.sourceVideoId);
const sources = [...grouped].map(([videoId, moves]) => ({
  debateNumber: moves[0].debateNumber,
  sourceVideoId: videoId,
  mode: ["2kZRAOXEFPI", "MfCQBynjgnw"].includes(videoId)
    ? "accepted-prefix-source"
    : "range-verified-format139-once",
  maximumRequiredEndMs: Math.max(...moves.map((move) => move.clipWindow.endMs)),
  moveIds: moves.map((move) => move.moveId)
}));
assertV4(
  JSON.stringify(sources.map((item) => item.sourceVideoId).sort()) ===
    JSON.stringify([
      "2kZRAOXEFPI", "MfCQBynjgnw", "8k9A7d2Wnjk", "h-I_9e5qxnc", "0IpKHdVLZb4"
    ].sort()),
  "Batch 10 exact audio source cohort changed"
);

const authenticatedInputs = {
  [discoveryPath]: sha256(discoveryBytes),
  [priorPlanPath]: sha256(priorPlanBytes),
  [priorActivationPath]: sha256(priorActivationBytes),
  [priorExecutionPath]: sha256(priorExecutionBytes),
  [workPreparationPath]: sha256(workPreparationBytes),
  [workPath]: sha256(workBytes),
  ...Object.fromEntries(protectedInvalidEvidence.map((item) => [item.path, item.sha256]))
};

const rangeVerifiedSources = sources
  .filter((item) => item.mode === "range-verified-format139-once")
  .map((item) => {
    const discovered = discovery.originalSourceFallbacks.find(
      (source) => source.sourceVideoId === item.sourceVideoId
    );
    assertV4(discovered, `${item.sourceVideoId}: discovered fallback missing`);
    assertV4(
      discovered.maximumRequiredEndMs === item.maximumRequiredEndMs,
      `${item.sourceVideoId}: required duration changed`
    );
    return {
      ...item,
      videoUrl: `https://www.youtube.com/watch?v=${item.sourceVideoId}`,
      formatId: "139",
      extension: "m4a",
      protocol: "https",
      audioCodec: "mp4a.40.5",
      declaredBytes: discovered.declaredBytes,
      declaredDurationSeconds: discovered.declaredDurationSeconds,
      directUrlResolutionCliInvocationsMaximum: 1,
      logicalPublicSourceDownloadsMaximum: 1,
      rangeChunkBytes: 8388608,
      rangeHttpGetInvocationsMaximum: Math.ceil(discovered.declaredBytes / 8388608),
      rangeHttpGetTimeoutMs: 180000,
      curlRetriesMaximum: 0,
      redirectsMaximum: 0
    };
  });
const acceptedPrefixSources = sources
  .filter((item) => item.mode === "accepted-prefix-source")
  .map((item) => {
    const accepted = priorPlan.acceptedPrefixSources.find(
      (source) => source.sourceVideoId === item.sourceVideoId
    );
    assertV4(accepted, `${item.sourceVideoId}: accepted prefix source missing`);
    return {
      ...item,
      path: accepted.path,
      bytes: accepted.bytes,
      sha256: accepted.sha256
    };
  });

const plan = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-10-audio-source-range-recovery-3-plan",
  status:
    "frozen-one-shot-batch-10-three-source-format139-full-range-recovery-ready",
  batchNumber: 10,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  userAuthorization: structuredClone(discovery.userAuthorization),
  authenticatedInputs,
  protectedInvalidEvidence,
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
  rangeVerifiedSources,
  acceptedPrefixSources,
  transportDiagnosis: structuredClone(discovery.diagnosis),
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
    publicSourceDownloadsMaximum: 3,
    rangeHttpGetInvocationsMaximum: rangeVerifiedSources.reduce(
      (sum, source) => sum + source.rangeHttpGetInvocationsMaximum,
      0
    ),
    curlRetriesMaximum: 0,
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
  const activation = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-10-audio-source-range-recovery-3-activation",
    status:
      "active-for-exactly-one-batch-10-three-source-format139-full-range-recovery",
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
console.log(JSON.stringify({
  status: plan.status,
  wroteArtifact: shouldWrite,
  sources: plan.exactCohort.sourceCount,
  clips: plan.exactCohort.clipCount,
  rangeVerifiedSources: plan.rangeVerifiedSources.length,
  publicSourceDownloadsMaximum: 3,
  rangeHttpGetInvocationsMaximum: plan.executionPolicy.rangeHttpGetInvocationsMaximum,
  retries: 0,
  audioPlaybackCalls: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0,
  nextAction: "validate-and-commit-the-frozen-range-recovery-plan"
}, null, 2));
