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
const recoveryRoot = `${root}/audio-source-header-parity-recovery-6`;
const priorRecoveryRoot = `${root}/audio-source-manual-redirect-recovery-5`;
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
const userInstruction = "Understood. Continue at your discretion.";
const ytDlpStandardRequestHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-us,en;q=0.5",
  "Sec-Fetch-Mode": "navigate"
};

const sourcePaths = [
  "scripts/prepare-assessment-production-post-canary-batch-10-audio-source-header-parity-recovery-6.mjs",
  "scripts/run-assessment-production-post-canary-batch-10-audio-source-header-parity-recovery-6.mjs",
  "scripts/test-assessment-production-post-canary-batch-10-audio-source-header-parity-recovery-6-preparation.mjs",
  "scripts/test-assessment-production-post-canary-batch-10-audio-source-header-parity-recovery-6-cohort.mjs",
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
  },
  {
    path: `${localRoot}/debate-123/audio/source.redirect-range4-format139.part-000.headers.txt`,
    bytes: 3019,
    sha256: "3eb3e91af07676fb84cb63c8784d177f9b09d1f0a719af91fab18fa1c9f0a7b3"
  },
  {
    path: `${localRoot}/debate-123/audio/source.redirect-range4-format139.m4a`,
    bytes: 0,
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  {
    path: `${localRoot}/debate-123/audio/source.manual-redirect5-format139.m4a`,
    bytes: 0,
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  {
    path:
      `${localRoot}/debate-123/audio/source.manual-redirect5-format139.range-000.hop-0.headers.txt`,
    bytes: 281,
    sha256: "87e8592926631a96a5de3fc7e2f2c4c95d55d66f1cf8d77657573983ac6e3c2f"
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
      "failed-one-shot-batch-10-audio-source-manual-redirect-recovery-5-stop-required" &&
    priorExecution.state?.directUrlResolutionCliInvocations === 1 &&
    priorExecution.state?.rangeHttpGetInvocations === 1 &&
    priorExecution.state?.manualHttpRequests === 1 &&
    priorExecution.state?.finalHttp206Responses === 0 &&
    priorExecution.state?.redirectsFollowed === 0 &&
    priorExecution.state?.publicSourceDownloads === 1 &&
    priorExecution.state?.acceptedExistingSourcesRevalidated === 2 &&
    priorExecution.state?.sourcesInstalled === 2 &&
    priorExecution.state?.retries === 0 &&
    priorExecution.failure?.category ===
      "source-or-validation-failure-during-authorized-manual-redirect-recovery-5" &&
    priorExecution.failure?.stopRequired === true,
  "Batch 10 manual redirect recovery-5 failure changed"
);
assertV4(
  priorDiagnosis.status ===
      "preserved-batch-10-manual-redirect-recovery-5-http-403-stop-diagnosed" &&
    priorDiagnosis.diagnosis?.category ===
      "fresh-format139-googlevideo-range-request-rejected-http-403-before-redirect" &&
    priorDiagnosis.diagnosis?.mediaBytesReceived === 0 &&
    priorDiagnosis.executionAudit?.httpStatus === 403 &&
    priorDiagnosis.authorization?.furtherMediaRequestsAuthorized === false,
  "Batch 10 manual redirect recovery-5 diagnosis changed"
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
const headerParitySources = priorPlan.manualRedirectSources.map((source) => ({
  ...source,
  freshUrlResolutionAuthorized: true,
  redirectFollowingAuthorized: true,
  redirectsPerRangeMaximum: 3,
  finalHttp206Required: true,
  redirectDestinationProtocolRequired: "https:",
  redirectDestinationHostnameSuffixRequired: ".googlevideo.com",
  redirectsMaximum: source.rangeHttpGetInvocationsMaximum * 3,
  requestHeaders: structuredClone(ytDlpStandardRequestHeaders),
  requestHeaderSource: {
    package: "yt-dlp",
    installedVersion: "2026.03.17",
    symbol: "yt_dlp.utils.std_headers"
  },
  byteRangeRepeatAuthorized: false
}));
assertV4(
  JSON.stringify(ytDlpStandardRequestHeaders) === JSON.stringify({
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-us,en;q=0.5",
    "Sec-Fetch-Mode": "navigate"
  }),
  "local yt-dlp standard request-header lock changed"
);
assertV4(
  JSON.stringify(headerParitySources.map((item) => item.sourceVideoId)) ===
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
    "1.0-assessment-production-post-canary-batch-10-audio-source-header-parity-recovery-6-plan",
  status:
    "frozen-one-shot-batch-10-three-source-format139-header-parity-manual-googlevideo-redirect-recovery-ready",
  batchNumber: 10,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  userAuthorization: {
    instruction: userInstruction,
    interpretation:
      "continue-with-one-bounded-zero-cost-header-parity-correction-under-existing-batch-10-source-and-transcription-limits",
    freshUrlResolutionsAuthorized: 3,
    logicalPublicSourceDownloadsAuthorized: 3,
    standardRequestHeaderFieldsAuthorized: 4,
    redirectsPerRangeMaximum: 3,
    finalHttp206Required: true,
    redirectDestinationsLimitedToHttpsGooglevideo: true,
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
  headerParitySources,
  acceptedPrefixSources: structuredClone(priorPlan.acceptedPrefixSources),
  transportDiagnosis: {
    priorDiagnosisPath,
    priorDiagnosisSha256: sha256(priorDiagnosisBytes),
    priorMediaBytesReceived: 0,
    requiredCorrection:
      "match-exact-local-ytdlp-standard-http-headers-while-preserving-manual-googlevideo-redirect-range-controls",
    failedPartialOutputReusable: false
  },
  mediaEncoding: structuredClone(priorPlan.mediaEncoding),
  executionPolicy: {
    attemptsMaximum: 1,
    directUrlResolutionInvocationsMaximum: 3,
    publicSourceDownloadsMaximum: 3,
    rangeHttpGetInvocationsMaximum: 15,
    manualHttpRequestsMaximum: 60,
    finalHttp206ResponsesRequired: 15,
    redirectsMaximum: 45,
    redirectsPerRangeMaximum: 3,
    httpResponseHopsMaximum: 60,
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
      "1.0-assessment-production-post-canary-batch-10-audio-source-header-parity-recovery-6-activation",
    status:
      "active-for-exactly-one-batch-10-three-source-format139-header-parity-manual-googlevideo-redirect-recovery",
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
  headerParitySources: plan.headerParitySources.length,
  rangeHttpGetInvocationsMaximum: 15,
  manualHttpRequestsMaximum: 60,
  finalHttp206ResponsesRequired: 15,
  redirectsMaximum: 45,
  standardRequestHeaderFields: 4,
  retries: 0,
  audioPlaybackCalls: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0,
  nextAction: "validate-and-commit-the-frozen-header-parity-recovery-plan"
}, null, 2));
