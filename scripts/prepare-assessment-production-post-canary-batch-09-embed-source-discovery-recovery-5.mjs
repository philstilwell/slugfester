#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const shouldActivate = process.argv.includes("--activate");
assertV4(!(shouldWrite && shouldActivate), "choose either --write or --activate");

const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction";
const recoveryRoot = `${root}/audio-source-transport-recovery-5`;
const priorDiagnosisPath =
  `${root}/audio-source-transport-recovery-4/failure-diagnosis.json`;
const standingPath =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/standing-authorization.json";
const manifestPath = ".assessment-cache/captions/HoTILnpd3q8/manifest.json";
const preparePath =
  "scripts/prepare-assessment-production-post-canary-batch-09-embed-source-discovery-recovery-5.mjs";
const testPath =
  "scripts/test-assessment-production-post-canary-batch-09-embed-source-discovery-recovery-5.mjs";
const planPath = `${recoveryRoot}/discovery-plan.json`;
const activationPath = `${recoveryRoot}/execution-activation.json`;
const outputPath = `${recoveryRoot}/format-inventory.json`;
const analysisPath = `${recoveryRoot}/analysis.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const [priorBytes, standingBytes, manifestBytes] = await Promise.all([
  readFile(priorDiagnosisPath),
  readFile(standingPath),
  readFile(manifestPath)
]);
const prior = JSON.parse(priorBytes);
const manifest = JSON.parse(manifestBytes);
assertV4(
  prior.status ===
    "preserved-batch-09-browser-document-start-capability-failure-diagnosed-stop-required" &&
    prior.executionBoundary.audioPlaybackObservedSeconds === 0,
  "prior browser capability diagnosis changed"
);
assertV4(
  manifest.videoId === "HoTILnpd3q8" &&
    manifest.durationSeconds === 6365 &&
    manifest.sourceUrl === "https://www.youtube.com/watch?v=HoTILnpd3q8",
  "canonical Debate 170 source identity changed"
);
assertV4(!(await exists(outputPath)), "embed format inventory already exists");
assertV4(!(await exists(analysisPath)), "embed discovery analysis already exists");

const sourceHashes = {};
for (const file of [preparePath, testPath]) {
  sourceHashes[file] = sha256(await readFile(file));
}
const authenticatedInputs = {
  [priorDiagnosisPath]: sha256(priorBytes),
  [standingPath]: sha256(standingBytes),
  [manifestPath]: sha256(manifestBytes)
};
const embedUrl =
  "https://www.youtube.com/embed/HoTILnpd3q8?autoplay=0&mute=1&playsinline=1";

const plan = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-09-embed-source-discovery-recovery-5-plan",
  status:
    "frozen-batch-09-debate-170-muted-nonautoplay-embed-format-discovery-ready",
  batchNumber: 9,
  checkpointCommit: "ec99a453",
  userAuthorization: {
    instruction: "Continue at your discretion.",
    resolvedAntecedent:
      "continue the Batch 9 Debate 170 no-playback source recovery after the safe browser document-start capability failure",
    directIncrementalCostUsdMaximum: 0,
    mutedNonautoplayEmbedNavigation: true,
    readOnlyPlayerFormatDiscovery: true,
    pageAssetInventoryCallsMaximum: 1,
    assetDownloadsMaximum: 0,
    cookieInspectionMaximum: 0,
    cookieExportMaximum: 0,
    browserStorageInspectionMaximum: 0,
    audioPlaybackMaximumSeconds: 0,
    semanticAudioEvaluation: false,
    paidServices: false,
    modelExecution: false
  },
  authenticatedInputs,
  sourceHashes,
  browserRoute: {
    browser: "Chrome through the approved browser-control surface",
    embedUrl,
    canonicalVideoId: "HoTILnpd3q8",
    queryControls: {
      autoplay: "0",
      mute: "1",
      playsinline: "1"
    },
    exactSequence: [
      "open-one-fresh-chrome-tab",
      "navigate-once-to-muted-nonautoplay-canonical-embed",
      "validate-play-control-and-zero-second-position",
      "read-player-response-format-metadata-once",
      "run-one-page-assets-list-call",
      "persist-only-sanitized-format-and-url-hash-metadata",
      "keep-live-tab-only-until-any-separately-frozen-download-decision"
    ]
  },
  discoveryContract: {
    playerResponseSourcesInPriorityOrder: [
      "globalThis.ytInitialPlayerResponse",
      "globalThis.ytplayer.config.args.player_response"
    ],
    persistedFormatFields: [
      "itag",
      "mimeType",
      "bitrate",
      "contentLength",
      "approxDurationMs",
      "audioQuality",
      "audioSampleRate",
      "audioChannels",
      "width",
      "height",
      "qualityLabel",
      "hasDirectUrl",
      "hasCipher",
      "urlSha256"
    ],
    rawSignedUrlsPersisted: false,
    rawSignedUrlsMayRemainOnlyInLiveEphemeralBrowserMemory: true,
    cookieOrStorageInspection: false
  },
  validation: {
    requiredPlayControlPattern: "Play (k)",
    forbiddenPauseControlPattern: "Pause (k)",
    requiredZeroPositionPattern: "0:00",
    failOnAnyObservedPositionAboveZero: true,
    failOnAnyPlayback: true,
    failOnAnyCookieOrStorageInspection: true,
    failOnAnyDownload: true,
    playerResponseReadsRequired: 1,
    pageAssetInventoryCallsRequired: 1,
    assetBundleCallsRequired: 0
  },
  outputs: { activationPath, outputPath, analysisPath },
  nextActionAfterPassingDiscovery:
    "freeze-and-report-the-sanitized-format-inventory-before-any-download"
};

if (shouldActivate) {
  assertV4(await exists(planPath), "frozen embed discovery plan is missing");
  const planBytes = await readFile(planPath);
  const frozenPlan = JSON.parse(planBytes);
  assertV4(
    frozenPlan.status === plan.status &&
      frozenPlan.browserRoute.embedUrl === embedUrl &&
      JSON.stringify(frozenPlan.sourceHashes) === JSON.stringify(sourceHashes),
    "frozen embed discovery plan changed"
  );
  assertV4(!(await exists(activationPath)), "embed discovery already activated");
  await mkdir(recoveryRoot, { recursive: true });
  const activation = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-09-embed-source-discovery-recovery-5-activation",
    status:
      "active-for-exactly-one-muted-nonautoplay-batch-09-debate-170-format-discovery",
    batchNumber: 9,
    plan: { path: planPath, sha256: sha256(planBytes) },
    authenticatedInputs,
    sourceHashes,
    embedUrl,
    playerResponseReadsMaximum: 1,
    pageAssetInventoryCallsMaximum: 1,
    downloadsMaximum: 0,
    audioPlaybackMaximumSeconds: 0,
    directIncrementalCostUsdMaximum: 0
  };
  await writeFile(activationPath, `${JSON.stringify(activation, null, 2)}\n`);
  console.log(JSON.stringify({ status: activation.status, plan: activation.plan }, null, 2));
  process.exit(0);
}

if (shouldWrite) {
  assertV4(!(await exists(planPath)), "embed discovery plan already exists");
  await mkdir(recoveryRoot, { recursive: true });
  await writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: plan.status,
      wroteArtifact: shouldWrite,
      playerResponseReads: 1,
      pageAssetInventoryCalls: 1,
      downloads: 0,
      audioPlaybackMaximumSeconds: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
