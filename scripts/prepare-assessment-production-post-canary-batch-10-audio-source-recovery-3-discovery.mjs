#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-10/disagreement-extraction";
const recoveryRoot = `${root}/audio-source-range-recovery-3`;
const discoveryPath = `${recoveryRoot}/equivalent-source-discovery.json`;
const workPath = `${root}/audio-work-items.json`;
const priorRecoveryRoot = `${root}/audio-source-direct-format18-recovery-2`;
const priorPlanPath = `${priorRecoveryRoot}/correction-plan.json`;
const priorActivationPath = `${priorRecoveryRoot}/execution-activation.json`;
const priorExecutionPath = `${priorRecoveryRoot}/execution.json`;
const preservedInvalidPath =
  "output/transcribe/assessment-production-post-canary-batch-10-audio-verification/debate-123/audio/source.failed-attempt-1.mp3";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const userInstruction =
  "I authorize one additional Batch 10 audio-source recovery limited to verified equivalent-source discovery and, if necessary, one range-verified public-source download per remaining video, at $0 direct incremental cost, with no playback, semantic audio evaluation, or automatic retries. The existing sequential transcription estimate of $0.1308768 and $1.00 maximum remain authorized.";

const sourcePaths = [
  "scripts/prepare-assessment-production-post-canary-batch-10-audio-source-recovery-3-discovery.mjs",
  "scripts/test-assessment-production-post-canary-batch-10-audio-source-recovery-3-discovery.mjs",
  "scripts/lib/v4-lean-production.mjs"
];
const canonicalManifestPaths = [
  ".assessment-cache/captions/8k9A7d2Wnjk/manifest.json",
  ".assessment-cache/captions/h-I_9e5qxnc/manifest.json",
  ".assessment-cache/captions/0IpKHdVLZb4/manifest.json"
];

assertV4(!(await exists(discoveryPath)), "Batch 10 recovery-3 discovery exists");
const [workBytes, priorPlanBytes, priorActivationBytes, priorExecutionBytes] =
  await Promise.all([
    readFile(workPath),
    readFile(priorPlanPath),
    readFile(priorActivationPath),
    readFile(priorExecutionPath)
  ]);
const work = JSON.parse(workBytes);
const priorExecution = JSON.parse(priorExecutionBytes);
assertV4(
  priorExecution.status ===
      "failed-one-shot-batch-10-audio-source-direct-format18-recovery-2-stop-required" &&
    priorExecution.state?.directUrlResolutionCliInvocations === 1 &&
    priorExecution.state?.ffmpegStreamingInvocations === 1 &&
    priorExecution.state?.acceptedExistingSourcesRevalidated === 2 &&
    priorExecution.state?.sourcesInstalled === 2 &&
    priorExecution.state?.retries === 0 &&
    priorExecution.state?.paidServiceCalls === 0 &&
    priorExecution.failure?.stopRequired === true,
  "Batch 10 recovery-2 failure changed"
);
assertV4(work.moves.length === 9, "Batch 10 audio work-item cohort changed");
const invalidBytes = await readFile(preservedInvalidPath);
assertV4(
  invalidBytes.length === 354 &&
    sha256(invalidBytes) ===
      "87965bd54bc175f5645aa773bd5a0a98c396524a0dd0c4e94463828c11ed2754",
  "preserved Debate 123 invalid evidence changed"
);

const canonicalSources = [];
for (const path of canonicalManifestPaths) {
  const bytes = await readFile(path);
  const manifest = JSON.parse(bytes);
  canonicalSources.push({
    path,
    sha256: sha256(bytes),
    videoId: manifest.videoId,
    title: manifest.title,
    channel: manifest.channel,
    sourceUrl: manifest.sourceUrl
  });
}
const sourceHashes = {};
for (const path of sourcePaths) sourceHashes[path] = sha256(await readFile(path));

const discovery = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-10-audio-source-recovery-3-equivalent-source-discovery",
  status:
    "completed-batch-10-equivalent-source-discovery-range-verified-original-source-fallback-required",
  batchNumber: 10,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  userAuthorization: {
    instruction: userInstruction,
    equivalentSourceDiscoveryAuthorized: true,
    rangeVerifiedDownloadsAuthorized: 3,
    directIncrementalCostUsdMaximum: 0,
    audioPlaybackAuthorized: false,
    semanticAudioEvaluationAuthorized: false,
    automaticRetriesAuthorized: false,
    sequentialTranscriptionEstimateUsd: 0.1308768,
    sequentialTranscriptionMaximumUsd: 1
  },
  authenticatedInputs: {
    [workPath]: sha256(workBytes),
    [priorPlanPath]: sha256(priorPlanBytes),
    [priorActivationPath]: sha256(priorActivationBytes),
    [priorExecutionPath]: sha256(priorExecutionBytes),
    [preservedInvalidPath]: sha256(invalidBytes),
    ...Object.fromEntries(canonicalSources.map((source) => [source.path, source.sha256]))
  },
  sourceHashes,
  canonicalSources,
  equivalentSourceCandidates: [
    {
      debateNumber: "123",
      sourceVideoId: "8k9A7d2Wnjk",
      url: "https://pickscribe.com/v/8k9A7d2Wnjk",
      identityEvidence: ["matching-video-id", "matching-participants", "matching-transcript"],
      disposition: "rejected-transcript-only-no-independent-media"
    },
    {
      debateNumber: "147",
      sourceVideoId: "h-I_9e5qxnc",
      url: "https://www.philipclayton.net/videos",
      identityEvidence: ["participant-official-site", "matching-title"],
      disposition: "rejected-embeds-original-youtube-source-no-independent-media"
    },
    {
      debateNumber: "130",
      sourceVideoId: "0IpKHdVLZb4",
      url: "https://apologetics315.com/2010/06/michael-licona-vs-richard-carrier-debate-did-jesus-rise-from-the-dead-mp3-audio/",
      linkedMediaUrl: "https://www.brianauten.com/Apologetics/debate2-licona-carrier.mp3",
      identityEvidence: [
        "matching-participants",
        "matching-2010-Washburn-event",
        "matching-topic",
        "approximately-matching-duration"
      ],
      observedLinkedMediaResponse: {
        status: 200,
        contentType: "text/html; charset=UTF-8",
        bytes: 1005
      },
      disposition: "rejected-linked-media-is-html-not-audio"
    }
  ],
  originalSourceFallbacks: [
    {
      debateNumber: "123",
      sourceVideoId: "8k9A7d2Wnjk",
      formatId: "139",
      extension: "m4a",
      protocol: "https",
      audioCodec: "mp4a.40.5",
      declaredBytes: 37050541,
      declaredDurationSeconds: 6076,
      maximumRequiredEndMs: 6063219
    },
    {
      debateNumber: "147",
      sourceVideoId: "h-I_9e5qxnc",
      formatId: "139",
      extension: "m4a",
      protocol: "https",
      audioCodec: "mp4a.40.5",
      declaredBytes: 24192081,
      declaredDurationSeconds: 3967,
      maximumRequiredEndMs: 3924700
    },
    {
      debateNumber: "130",
      sourceVideoId: "0IpKHdVLZb4",
      formatId: "139",
      extension: "m4a",
      protocol: "https",
      audioCodec: "mp4a.40.5",
      declaredBytes: 54678961,
      declaredDurationSeconds: 8967,
      maximumRequiredEndMs: 4048590
    }
  ],
  diagnosis: {
    failedFormatId: "18",
    debate123FailedFormat18UrlDeclaredBytes: 2731072,
    debate123Format18EstimatedBytes: 139726597,
    mismatchProvesMalformedCombinedTransport: true,
    selectedFallbackFormatId: "139",
    selectedFallbackReasons: [
      "audio-only-file-preserves-original-youtube-timebase",
      "declared-byte-length-is-internally-consistent",
      "duration-covers-every-required-clip",
      "avoids-malformed-combined-format-18"
    ]
  },
  discoveryAudit: {
    webSearchQueries: 12,
    webPagesOpened: 4,
    candidateLinkHeadProbes: 1,
    candidateLinkGetProbes: 1,
    youtubeMetadataQueries: 6,
    publicMediaDownloads: 0,
    audioPlaybackCalls: 0,
    semanticAudioEvaluations: 0,
    modelContexts: 0,
    transcriptionCalls: 0,
    paidServiceCalls: 0,
    retries: 0,
    directIncrementalCostUsd: 0
  },
  authorization: {
    freezeRangeVerifiedRecoveryPlan: true,
    activateOrExecuteRecovery: false,
    paidTranscription: false,
    adjudication: false,
    scoring: false,
    publication: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction:
    "prepare-validate-freeze-commit-and-push-one-shot-batch-10-three-source-format-139-range-verified-recovery-plan"
};

if (shouldWrite) {
  await mkdir(recoveryRoot, { recursive: true });
  await writeFile(discoveryPath, `${JSON.stringify(discovery, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: discovery.status,
  wroteArtifact: shouldWrite,
  equivalentCandidates: discovery.equivalentSourceCandidates.length,
  usableEquivalentSources: 0,
  rangeVerifiedFallbacks: discovery.originalSourceFallbacks.length,
  publicMediaDownloads: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0
}, null, 2));
