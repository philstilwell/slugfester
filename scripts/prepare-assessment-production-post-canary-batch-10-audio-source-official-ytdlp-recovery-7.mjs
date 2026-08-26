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
const recoveryRoot = `${root}/audio-source-official-ytdlp-recovery-7`;
const priorRecoveryRoot = `${root}/audio-source-header-parity-recovery-6`;
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
const officialToolRoot = "output/tools/yt-dlp-2026.08.19";
const officialToolPath = `${officialToolRoot}/yt-dlp_macos`;
const checksumPath = `${officialToolRoot}/SHA2-256SUMS`;
const checksumSignaturePath = `${officialToolRoot}/SHA2-256SUMS.sig`;
const signingKeyPath = `${officialToolRoot}/public.key`;
const signingKeyFingerprint = "AC0CBBE6848D6A873464AF4E57CF65933B5A7581";

const sourcePaths = [
  "scripts/prepare-assessment-production-post-canary-batch-10-audio-source-official-ytdlp-recovery-7.mjs",
  "scripts/run-assessment-production-post-canary-batch-10-audio-source-official-ytdlp-recovery-7.mjs",
  "scripts/test-assessment-production-post-canary-batch-10-audio-source-official-ytdlp-recovery-7-preparation.mjs",
  "scripts/test-assessment-production-post-canary-batch-10-audio-source-official-ytdlp-recovery-7-cohort.mjs",
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
  },
  {
    path: `${localRoot}/debate-123/audio/source.header-parity6-format139.m4a`,
    bytes: 0,
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  {
    path:
      `${localRoot}/debate-123/audio/source.header-parity6-format139.range-000.hop-0.headers.txt`,
    bytes: 385,
    sha256: "11eed29f2c03e7f1e002e32bb6d4f223a8c1a96b1806d8b9d3cb6c2989484102"
  },
  {
    path:
      `${localRoot}/debate-123/audio/source.header-parity6-format139.range-000.hop-1.headers.txt`,
    bytes: 281,
    sha256: "c701d343d822c9ca55f3f7d6316957d7d6017e03afc492b0e8b5544902a45045"
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
      "failed-one-shot-batch-10-audio-source-header-parity-recovery-6-stop-required" &&
    priorExecution.state?.directUrlResolutionCliInvocations === 1 &&
    priorExecution.state?.rangeHttpGetInvocations === 1 &&
    priorExecution.state?.manualHttpRequests === 2 &&
    priorExecution.state?.finalHttp206Responses === 0 &&
    priorExecution.state?.redirectsFollowed === 1 &&
    priorExecution.state?.headerParityHttpRequests === 2 &&
    priorExecution.state?.publicSourceDownloads === 1 &&
    priorExecution.state?.acceptedExistingSourcesRevalidated === 2 &&
    priorExecution.state?.sourcesInstalled === 2 &&
    priorExecution.state?.retries === 0 &&
    priorExecution.failure?.category ===
      "source-or-validation-failure-during-authorized-header-parity-recovery-6" &&
    priorExecution.failure?.stopRequired === true,
  "Batch 10 header parity recovery-6 failure changed"
);
assertV4(
  priorDiagnosis.status ===
      "preserved-batch-10-header-parity-recovery-6-redirect-then-http-403-stop-diagnosed" &&
    priorDiagnosis.diagnosis?.category ===
      "header-parity-reached-one-googlevideo-redirect-before-http-403" &&
    priorDiagnosis.diagnosis?.mediaBytesReceived === 0 &&
    JSON.stringify(priorDiagnosis.executionAudit?.httpStatuses) ===
      JSON.stringify([302, 403]) &&
    priorDiagnosis.externalRepositorySecurityGate?.recommendation ===
      "DO_NOT_INSTALL" &&
    priorDiagnosis.externalRepositorySecurityGate?.installed === false,
  "Batch 10 header parity recovery-6 diagnosis changed"
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
const [officialToolBytes, checksumBytes, checksumSignatureBytes, signingKeyBytes] =
  await Promise.all([
    readFile(officialToolPath),
    readFile(checksumPath),
    readFile(checksumSignaturePath),
    readFile(signingKeyPath)
  ]);
const officialToolSha256 = sha256(officialToolBytes);
assertV4(
  officialToolSha256 ===
      "0f192b7ec147ab6288885d6351d9ab67367640029b4377576ef46dd79cf7b202" &&
    checksumBytes.toString("utf8").split("\n").some((line) =>
      line === `${officialToolSha256}  yt-dlp_macos`
    ) &&
    execFileSync(officialToolPath, ["--version"], { encoding: "utf8" }).trim() ===
      "2026.08.19",
  "official yt-dlp 2026.08.19 release verification changed"
);
execFileSync(
  "/opt/homebrew/bin/gpg",
  [
    "--homedir", `${officialToolRoot}/gnupg`, "--batch", "--verify",
    checksumSignaturePath, checksumPath
  ],
  { stdio: "pipe" }
);
const importedSigningKeyFingerprint = execFileSync(
  "/opt/homebrew/bin/gpg",
  ["--homedir", `${officialToolRoot}/gnupg`, "--batch", "--with-colons", "--fingerprint"],
  { encoding: "utf8" }
).split("\n").find((line) => line.startsWith("fpr:"))?.split(":")[9];
assertV4(
  importedSigningKeyFingerprint === signingKeyFingerprint,
  "official yt-dlp signing-key fingerprint changed"
);
const officialYtDlpSources = priorPlan.headerParitySources.map((source) => ({
  ...source,
  officialToolPath,
  officialToolVersion: "2026.08.19",
  impersonateTarget: "Chrome-142:Macos-26",
  nodeJsRuntime: "/opt/homebrew/bin/node",
  pluginsEnabled: false,
  remoteComponentsEnabled: false,
  nativeDownloadTimeoutMs: 1800000,
  automaticRetriesAuthorized: false,
  continuationAuthorized: false,
  exactDeclaredByteCountRequired: true
}));
assertV4(
  JSON.stringify(officialYtDlpSources.map((item) => item.sourceVideoId)) ===
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
    "1.0-assessment-production-post-canary-batch-10-audio-source-official-ytdlp-recovery-7-plan",
  status:
    "frozen-one-shot-batch-10-three-source-format139-official-ytdlp-2026-08-19-native-recovery-ready",
  batchNumber: 10,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  userAuthorization: {
    instruction: userInstruction,
    interpretation:
      "continue-with-one-bounded-zero-cost-checksum-and-gpg-verified-official-ytdlp-native-correction-under-existing-batch-10-source-and-transcription-limits",
    officialYtDlpNativeInvocationsAuthorized: 3,
    logicalPublicSourceDownloadsAuthorized: 3,
    browserImpersonationAuthorized: true,
    credentialUseAuthorized: false,
    pluginUseAuthorized: false,
    remoteComponentUseAuthorized: false,
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
  officialYtDlpSources,
  acceptedPrefixSources: structuredClone(priorPlan.acceptedPrefixSources),
  officialToolVerification: {
    releaseRepository: "https://github.com/yt-dlp/yt-dlp",
    releaseTag: "2026.08.19",
    toolPath: officialToolPath,
    toolBytes: officialToolBytes.length,
    toolSha256: officialToolSha256,
    checksumPath,
    checksumSha256: sha256(checksumBytes),
    checksumSignaturePath,
    checksumSignatureSha256: sha256(checksumSignatureBytes),
    signingKeyPath,
    signingKeySha256: sha256(signingKeyBytes),
    signingKeyFingerprint,
    checksumMatched: true,
    gpgSignatureVerified: true,
    githubAttestationAvailableForAsset: false
  },
  transportDiagnosis: {
    priorDiagnosisPath,
    priorDiagnosisSha256: sha256(priorDiagnosisBytes),
    priorMediaBytesReceived: 0,
    requiredCorrection:
      "use-checksum-and-gpg-verified-current-official-ytdlp-native-downloader-with-built-in-browser-impersonation",
    failedPartialOutputReusable: false
  },
  mediaEncoding: structuredClone(priorPlan.mediaEncoding),
  executionPolicy: {
    attemptsMaximum: 1,
    officialYtDlpNativeInvocationsMaximum: 3,
    publicSourceDownloadsMaximum: 3,
    downloaderRetriesMaximum: 0,
    fragmentRetriesMaximum: 0,
    extractorRetriesMaximum: 0,
    fileAccessRetriesMaximum: 0,
    continuationMaximum: 0,
    pluginsMaximum: 0,
    remoteComponentsMaximum: 0,
    credentialsMaximum: 0,
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
      "1.0-assessment-production-post-canary-batch-10-audio-source-official-ytdlp-recovery-7-activation",
    status:
      "active-for-exactly-one-batch-10-three-source-format139-official-ytdlp-2026-08-19-native-recovery",
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
  officialYtDlpSources: plan.officialYtDlpSources.length,
  officialYtDlpNativeInvocationsMaximum: 3,
  officialYtDlpVersion: "2026.08.19",
  impersonateTarget: "Chrome-142:Macos-26",
  plugins: 0,
  remoteComponents: 0,
  retries: 0,
  audioPlaybackCalls: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0,
  nextAction: "validate-and-commit-the-frozen-official-ytdlp-native-recovery-plan"
}, null, 2));
