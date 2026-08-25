#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const shouldActivate = process.argv.includes("--activate");
assertV4(!(shouldWrite && shouldActivate), "choose either --write or --activate");

const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction";
const priorRoot = `${root}/audio-source-transport-recovery-6`;
const recoveryRoot = `${root}/audio-source-transport-recovery-7`;
const priorAnalysisPath = `${priorRoot}/analysis.json`;
const standingPath =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/standing-authorization.json";
const manifestPath = ".assessment-cache/captions/HoTILnpd3q8/manifest.json";
const captionAcquisitionPath = "scripts/acquire-youtube-captions.mjs";
const preparePath =
  "scripts/prepare-assessment-production-post-canary-batch-09-public-player-metadata-recovery-7.mjs";
const testPath =
  "scripts/test-assessment-production-post-canary-batch-09-public-player-metadata-recovery-7.mjs";
const runnerPath =
  "scripts/run-assessment-production-post-canary-batch-09-public-player-metadata-recovery-7.mjs";
const planPath = `${recoveryRoot}/request-plan.json`;
const activationPath = `${recoveryRoot}/execution-activation.json`;
const outputPath = `${recoveryRoot}/format-inventory.json`;
const executionPath = `${recoveryRoot}/execution.json`;
const analysisPath = `${recoveryRoot}/analysis.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const [priorBytes, standingBytes, manifestBytes] = await Promise.all([
  readFile(priorAnalysisPath),
  readFile(standingPath),
  readFile(manifestPath)
]);
const prior = JSON.parse(priorBytes);
const manifest = JSON.parse(manifestBytes);
assertV4(
  prior.status ===
    "batch-09-debate-170-zero-playback-local-wrapper-discovery-passed-no-passive-download-route" &&
    prior.result.audioPlaybackObservedSeconds === 0 &&
    prior.result.sourceRecovered === false,
  "prior zero-playback wrapper discovery changed"
);
assertV4(
  manifest.videoId === "HoTILnpd3q8" &&
    manifest.durationSeconds === 6365 &&
    manifest.sourceUrl === "https://www.youtube.com/watch?v=HoTILnpd3q8",
  "canonical Debate 170 source identity changed"
);

const sourceHashes = {};
for (const file of [preparePath, testPath, runnerPath, captionAcquisitionPath]) {
  sourceHashes[file] = sha256(await readFile(file));
}
const authenticatedInputs = {
  [priorAnalysisPath]: sha256(priorBytes),
  [standingPath]: sha256(standingBytes),
  [manifestPath]: sha256(manifestBytes)
};
const playerPayload = {
  context: {
    client: {
      clientName: "ANDROID",
      clientVersion: "20.10.38",
      androidSdkVersion: 30,
      hl: "en",
      gl: "US"
    }
  },
  videoId: "HoTILnpd3q8",
  contentCheckOk: true,
  racyCheckOk: true
};
const playerPayloadJson = JSON.stringify(playerPayload);
const requestHeaders = {
  "accept-language": "en-US,en;q=0.9",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131 Safari/537.36"
};

const plan = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-09-public-player-metadata-recovery-7-plan",
  status:
    "frozen-batch-09-debate-170-public-credential-omitting-player-metadata-request-ready",
  batchNumber: 9,
  checkpointCommit: "ebc75039",
  userAuthorization: {
    instruction: "Continue at your discretion.",
    resolvedAntecedent:
      "continue the Batch 9 Debate 170 no-playback public-source recovery after passive wrapper discovery found no streaming asset",
    directIncrementalCostUsdMaximum: 0,
    publicConfigBootstrapGetsMaximum: 1,
    publicPlayerMetadataPostsMaximum: 1,
    credentialsMode: "omit",
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
  publicRequestRoute: {
    canonicalVideoId: "HoTILnpd3q8",
    configBootstrap: {
      method: "GET",
      url: "https://www.youtube.com/watch?v=HoTILnpd3q8",
      credentials: "omit",
      redirect: "error",
      headers: requestHeaders,
      publicApiKeyExtractionPattern:
        "double-quoted-INNERTUBE_API_KEY-property-value"
    },
    playerMetadata: {
      method: "POST",
      endpointTemplate: "https://www.youtube.com/youtubei/v1/player?key=<public-api-key>",
      credentials: "omit",
      redirect: "error",
      headers: {
        ...requestHeaders,
        "content-type": "application/json"
      },
      payload: playerPayload,
      payloadSha256: sha256(playerPayloadJson)
    },
    exactSequence: [
      "authenticate-frozen-plan-inputs-and-runner",
      "send-one-public-credential-omitting-watch-config-get",
      "extract-public-innertube-api-key-in-process",
      "send-one-public-credential-omitting-player-metadata-post",
      "persist-only-response-hash-playability-video-identity-and-sanitized-format-metadata",
      "discard-public-api-key-and-raw-response-with-process-exit"
    ]
  },
  sanitizationContract: {
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
    rawPlayerResponsePersisted: false,
    publicApiKeyPersisted: false,
    cookieOrStorageInspection: false
  },
  validation: {
    configBootstrapGetsRequired: 1,
    playerMetadataPostsRequired: 1,
    failOnAnyCredentialTransmission: true,
    failOnAnyCookieOrStorageInspection: true,
    failOnAnyDownload: true,
    failOnAnyPlayback: true,
    responseVideoIdMustEqual: "HoTILnpd3q8",
    responseLengthSecondsMustEqual: 6365
  },
  outputs: { activationPath, outputPath, executionPath, analysisPath },
  nextActionAfterPassingDiscovery:
    "freeze-and-report-sanitized-player-format-inventory-before-any-source-download"
};

if (shouldActivate) {
  assertV4(await exists(planPath), "frozen player metadata request plan is missing");
  const planBytes = await readFile(planPath);
  const frozenPlan = JSON.parse(planBytes);
  assertV4(
    frozenPlan.status === plan.status &&
      frozenPlan.publicRequestRoute.playerMetadata.payloadSha256 ===
        sha256(playerPayloadJson) &&
      JSON.stringify(frozenPlan.sourceHashes) === JSON.stringify(sourceHashes),
    "frozen player metadata request plan changed"
  );
  assertV4(!(await exists(activationPath)), "player metadata request already activated");
  assertV4(!(await exists(outputPath)), "player metadata output already exists");
  await mkdir(recoveryRoot, { recursive: true });
  const activation = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-09-public-player-metadata-recovery-7-activation",
    status:
      "active-for-exactly-one-public-credential-omitting-batch-09-debate-170-player-metadata-request",
    batchNumber: 9,
    plan: { path: planPath, sha256: sha256(planBytes) },
    authenticatedInputs,
    sourceHashes,
    canonicalVideoId: "HoTILnpd3q8",
    payloadSha256: sha256(playerPayloadJson),
    configBootstrapGetsMaximum: 1,
    playerMetadataPostsMaximum: 1,
    credentialsMode: "omit",
    downloadsMaximum: 0,
    audioPlaybackMaximumSeconds: 0,
    directIncrementalCostUsdMaximum: 0
  };
  await writeFile(activationPath, `${JSON.stringify(activation, null, 2)}\n`);
  console.log(JSON.stringify({ status: activation.status, plan: activation.plan }, null, 2));
  process.exit(0);
}

if (shouldWrite) {
  assertV4(!(await exists(planPath)), "player metadata request plan already exists");
  assertV4(!(await exists(outputPath)), "player metadata output already exists");
  await mkdir(recoveryRoot, { recursive: true });
  await writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`);
}

console.log(
  JSON.stringify(
    {
      status: plan.status,
      wroteArtifact: shouldWrite,
      configBootstrapGets: 1,
      playerMetadataPosts: 1,
      credentialsMode: "omit",
      downloads: 0,
      audioPlaybackMaximumSeconds: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
