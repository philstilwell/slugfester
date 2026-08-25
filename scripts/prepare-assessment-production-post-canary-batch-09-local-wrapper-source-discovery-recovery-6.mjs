#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const shouldActivate = process.argv.includes("--activate");
assertV4(!(shouldWrite && shouldActivate), "choose either --write or --activate");

const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction";
const recoveryRoot = `${root}/audio-source-transport-recovery-6`;
const priorDiagnosisPath =
  `${root}/audio-source-transport-recovery-5/failure-diagnosis.json`;
const standingPath =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/standing-authorization.json";
const manifestPath = ".assessment-cache/captions/HoTILnpd3q8/manifest.json";
const preparePath =
  "scripts/prepare-assessment-production-post-canary-batch-09-local-wrapper-source-discovery-recovery-6.mjs";
const testPath =
  "scripts/test-assessment-production-post-canary-batch-09-local-wrapper-source-discovery-recovery-6.mjs";
const wrapperPath = "scripts/fixtures/batch-09-debate-170-muted-embed.html";
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
    "preserved-batch-09-muted-embed-missing-referrer-failure-diagnosed-bounded-wrapper-correction-authorized" &&
    prior.executionBoundary.audioPlaybackObservedSeconds === 0,
  "prior muted embed diagnosis changed"
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
for (const file of [preparePath, testPath, wrapperPath]) {
  sourceHashes[file] = sha256(await readFile(file));
}
const authenticatedInputs = {
  [priorDiagnosisPath]: sha256(priorBytes),
  [standingPath]: sha256(standingBytes),
  [manifestPath]: sha256(manifestBytes)
};
const embedUrl =
  "https://www.youtube.com/embed/HoTILnpd3q8?autoplay=0&mute=1&playsinline=1&origin=http%3A%2F%2F127.0.0.1%3A43170";
const wrapperUrl =
  "http://127.0.0.1:43170/scripts/fixtures/batch-09-debate-170-muted-embed.html";

const plan = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-09-local-wrapper-source-discovery-recovery-6-plan",
  status:
    "frozen-batch-09-debate-170-local-wrapper-muted-embed-format-discovery-ready",
  batchNumber: 9,
  checkpointCommit: "89ab4ec1",
  userAuthorization: {
    instruction: "Continue at your discretion.",
    resolvedAntecedent:
      "continue the Batch 9 Debate 170 no-playback source recovery after the muted top-level embed missing-referrer failure",
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
    localServer: {
      host: "127.0.0.1",
      port: 43170,
      workingDirectory: ".",
      command: ["python3", "-m", "http.server", "43170", "--bind", "127.0.0.1"]
    },
    wrapper: {
      path: wrapperPath,
      sha256: sourceHashes[wrapperPath],
      url: wrapperUrl,
      iframeTitle: "Debate 170 muted source",
      iframeAutoplayPermissionGranted: false
    },
    embedUrl,
    canonicalVideoId: "HoTILnpd3q8",
    queryControls: {
      autoplay: "0",
      mute: "1",
      playsinline: "1"
    },
    exactSequence: [
      "start-one-fixed-local-static-server",
      "open-one-fresh-chrome-tab",
      "navigate-once-to-inert-local-wrapper",
      "validate-iframe-play-control-and-zero-second-position",
      "read-iframe-player-response-format-metadata-once",
      "run-one-page-assets-list-call",
      "persist-only-sanitized-format-and-url-hash-metadata",
      "keep-live-tab-only-until-any-separately-frozen-download-decision",
      "terminate-local-static-server"
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
      "1.0-assessment-production-post-canary-batch-09-local-wrapper-source-discovery-recovery-6-activation",
  status:
      "active-for-exactly-one-local-wrapper-muted-batch-09-debate-170-format-discovery",
    batchNumber: 9,
    plan: { path: planPath, sha256: sha256(planBytes) },
    authenticatedInputs,
    sourceHashes,
    embedUrl,
    wrapper: structuredClone(plan.browserRoute.wrapper),
    localServer: structuredClone(plan.browserRoute.localServer),
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
