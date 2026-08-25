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
const recoveryRoot = `${root}/audio-source-redirect-range-recovery-4`;
const priorRecoveryRoot = `${root}/audio-source-range-recovery-3`;
const priorPlanPath = `${priorRecoveryRoot}/correction-plan.json`;
const priorActivationPath = `${priorRecoveryRoot}/execution-activation.json`;
const priorExecutionPath = `${priorRecoveryRoot}/execution.json`;
const priorDiagnosisPath = `${priorRecoveryRoot}/failure-diagnosis.json`;
const workPreparationPath = `${root}/audio-work-item-preparation.json`;
const workPath = `${root}/audio-work-items.json`;
const planPath = `${recoveryRoot}/correction-plan.json`;
const activationPath = `${recoveryRoot}/execution-activation.json`;
const executionPath = `${recoveryRoot}/execution.json`;
const preparationPath = `${root}/audio-source-preparation.json`;
const localRoot =
  "output/transcribe/assessment-production-post-canary-batch-10-audio-verification";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const userInstruction =
  "I authorize a new one-shot Batch 10 transport correction for Debates 123, 147, and 130. It may perform one fresh URL resolution per video and follow exactly one Google Video redirect for each non-overlapping planned byte range, including a fresh Debate 123 transfer after the zero-byte redirect stop. No byte range may be repeated, no automatic retries are authorized, source recovery remains capped at $0, and the existing sequential transcription estimate of $0.1308768 and $1.00 maximum remain authorized.";

const sourcePaths = [
  "scripts/prepare-assessment-production-post-canary-batch-10-audio-source-redirect-range-recovery-4.mjs",
  "scripts/run-assessment-production-post-canary-batch-10-audio-source-redirect-range-recovery-4.mjs",
  "scripts/test-assessment-production-post-canary-batch-10-audio-source-redirect-range-recovery-4-preparation.mjs",
  "scripts/test-assessment-production-post-canary-batch-10-audio-source-redirect-range-recovery-4-cohort.mjs",
  "scripts/test-assessment-production-post-canary-batch-10-audio-sources.mjs",
  "scripts/lib/assessment-production-post-canary-batch-10-audio-work-items.mjs",
  "scripts/lib/v4-lean-production.mjs"
];
const protectedEvidenceSpecifications = [
  {
    path: `${localRoot}/debate-123/audio/source.failed-attempt-1.mp3`,
    bytes: 354,
    sha256: "87965bd54bc175f5645aa773bd5a0a98c396524a0dd0c4e94463828c11ed2754"
  },
  {
    path: `${localRoot}/debate-123/audio/source.direct-format18.normalized.mp3`,
    bytes: 354,
    sha256: "87965bd54bc175f5645aa773bd5a0a98c396524a0dd0c4e94463828c11ed2754"
  },
  {
    path: `${localRoot}/debate-123/audio/source.range-format139.part-000.headers.txt`,
    bytes: 1558,
    sha256: "7bccae2a6283b0500bfb9abb343bb1acf7d4209849c59fe0e0083b98bd97f2a9"
  },
  {
    path: `${localRoot}/debate-123/audio/source.range-format139.part-000.m4a`,
    bytes: 0,
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  {
    path: `${localRoot}/debate-123/audio/source.range-format139.m4a`,
    bytes: 0,
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  }
];

const [
  priorPlanBytes,
  priorActivationBytes,
  priorExecutionBytes,
  priorDiagnosisBytes,
  workPreparationBytes,
  workBytes
] = await Promise.all([
  readFile(priorPlanPath),
  readFile(priorActivationPath),
  readFile(priorExecutionPath),
  readFile(priorDiagnosisPath),
  readFile(workPreparationPath),
  readFile(workPath)
]);
const priorPlan = JSON.parse(priorPlanBytes);
const priorExecution = JSON.parse(priorExecutionBytes);
const priorDiagnosis = JSON.parse(priorDiagnosisBytes);
const workPreparation = JSON.parse(workPreparationBytes);
const work = JSON.parse(workBytes);

assertV4(
  priorExecution.status ===
      "failed-one-shot-batch-10-audio-source-range-recovery-3-stop-required" &&
    priorExecution.state?.directUrlResolutionCliInvocations === 1 &&
    priorExecution.state?.rangeHttpGetInvocations === 1 &&
    priorExecution.state?.publicSourceDownloads === 1 &&
    priorExecution.state?.acceptedExistingSourcesRevalidated === 2 &&
    priorExecution.state?.sourcesInstalled === 2 &&
    priorExecution.state?.retries === 0 &&
    priorExecution.failure?.message ===
      "123: range 0 byte or response-header validation failed",
  "Batch 10 range recovery-3 failure changed"
);
assertV4(
  priorDiagnosis.status ===
      "preserved-batch-10-range-recovery-3-zero-byte-redirect-stop-diagnosed" &&
    priorDiagnosis.diagnosis?.category ===
      "frozen-redirect-policy-prevented-media-host-transfer" &&
    priorDiagnosis.executionAudit?.mediaBytesReceived === 0 &&
    priorDiagnosis.authorization?.furtherMediaRequests === false,
  "Batch 10 range recovery-3 diagnosis changed"
);
assertV4(
  work.moves.length === 9 &&
    workPreparation.workArtifact.sha256 === sha256(workBytes),
  "Batch 10 frozen audio work-item cohort changed"
);
for (const evidence of protectedEvidenceSpecifications) {
  const bytes = await readFile(evidence.path);
  assertV4(
    (await stat(evidence.path)).size === evidence.bytes &&
      sha256(bytes) === evidence.sha256,
    `${evidence.path}: protected evidence changed`
  );
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
const redirectRangeSources = priorPlan.rangeVerifiedSources.map((source) => ({
  ...source,
  freshUrlResolutionAuthorized: true,
  redirectFollowingAuthorized: true,
  redirectsPerRangeMaximum: 1,
  redirectsPerRangeRequired: 1,
  redirectsMaximum: source.rangeHttpGetInvocationsMaximum,
  byteRangeRepeatAuthorized: false
}));
assertV4(
  JSON.stringify(redirectRangeSources.map((item) => item.sourceVideoId)) ===
    JSON.stringify(["8k9A7d2Wnjk", "h-I_9e5qxnc", "0IpKHdVLZb4"]),
  "Batch 10 exact redirect-range source cohort changed"
);
const authenticatedInputs = {
  [priorPlanPath]: sha256(priorPlanBytes),
  [priorActivationPath]: sha256(priorActivationBytes),
  [priorExecutionPath]: sha256(priorExecutionBytes),
  [priorDiagnosisPath]: sha256(priorDiagnosisBytes),
  [workPreparationPath]: sha256(workPreparationBytes),
  [workPath]: sha256(workBytes),
  ...Object.fromEntries(
    protectedEvidenceSpecifications.map((item) => [item.path, item.sha256])
  )
};

const plan = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-10-audio-source-redirect-range-recovery-4-plan",
  status:
    "frozen-one-shot-batch-10-three-source-format139-one-redirect-per-range-recovery-ready",
  batchNumber: 10,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  userAuthorization: {
    instruction: userInstruction,
    freshUrlResolutionsAuthorized: 3,
    logicalPublicSourceDownloadsAuthorized: 3,
    redirectsPerRangeMaximum: 1,
    redirectsPerRangeRequired: 1,
    freshDebate123TransferAfterZeroByteStopAuthorized: true,
    repeatedByteRangesAuthorized: false,
    automaticRetriesAuthorized: false,
    directIncrementalCostUsdMaximum: 0,
    audioPlaybackAuthorized: false,
    semanticAudioEvaluationAuthorized: false,
    paidServicesAuthorizedThisStage: false,
    sequentialTranscriptionEstimateUsd: 0.1308768,
    sequentialTranscriptionMaximumUsd: 1
  },
  authenticatedInputs,
  protectedInvalidEvidence: protectedEvidenceSpecifications,
  exactCohort: structuredClone(priorPlan.exactCohort),
  redirectRangeSources,
  acceptedPrefixSources: structuredClone(priorPlan.acceptedPrefixSources),
  transportDiagnosis: {
    priorDiagnosisPath,
    priorDiagnosisSha256: sha256(priorDiagnosisBytes),
    priorMediaBytesReceived: 0,
    requiredCorrection: "follow-exactly-one-https-googlevideo-redirect-per-range",
    failedPartialOutputReusable: false
  },
  mediaEncoding: structuredClone(priorPlan.mediaEncoding),
  executionPolicy: {
    attemptsMaximum: 1,
    directUrlResolutionInvocationsMaximum: 3,
    publicSourceDownloadsMaximum: 3,
    rangeHttpGetInvocationsMaximum: 15,
    redirectsMaximum: 15,
    redirectsPerRangeMaximum: 1,
    redirectsPerRangeRequired: 1,
    httpResponseHopsMaximum: 30,
    repeatedByteRangesMaximum: 0,
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
    "frozen redirect-range correction plan changed"
  );
  assertV4(!(await exists(activationPath)), "recovery activation already exists");
  const activation = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-10-audio-source-redirect-range-recovery-4-activation",
    status:
      "active-for-exactly-one-batch-10-three-source-format139-one-redirect-per-range-recovery",
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
  redirectRangeSources: plan.redirectRangeSources.length,
  rangeHttpGetInvocationsMaximum: 15,
  redirectsMaximum: 15,
  retries: 0,
  audioPlaybackCalls: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0,
  nextAction: "validate-and-commit-the-frozen-redirect-range-recovery-plan"
}, null, 2));
