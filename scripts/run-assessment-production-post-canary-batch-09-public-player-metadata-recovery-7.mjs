#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-transport-recovery-7";
const planPath = `${root}/request-plan.json`;
const activationPath = `${root}/execution-activation.json`;
const outputPath = `${root}/format-inventory.json`;
const executionPath = `${root}/execution.json`;
const analysisPath = `${root}/analysis.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

assertV4(await exists(planPath), "frozen player metadata request plan is missing");
assertV4(await exists(activationPath), "player metadata request activation is missing");
assertV4(!(await exists(outputPath)), "player metadata request output already exists");
assertV4(!(await exists(executionPath)), "player metadata execution record already exists");
assertV4(!(await exists(analysisPath)), "player metadata analysis already exists");

const planBytes = await readFile(planPath);
const activationBytes = await readFile(activationPath);
const plan = JSON.parse(planBytes);
const activation = JSON.parse(activationBytes);
assertV4(activation.plan.sha256 === sha256(planBytes), "activation plan hash changed");
assertV4(
  activation.status ===
    "active-for-exactly-one-public-credential-omitting-batch-09-debate-170-player-metadata-request",
  "player metadata request is not active"
);
for (const [file, digest] of Object.entries(activation.authenticatedInputs)) {
  assertV4(sha256(await readFile(file)) === digest, `${file}: input hash changed`);
}
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `${file}: source hash changed`);
}
assertV4(
  activation.payloadSha256 ===
    sha256(JSON.stringify(plan.publicRequestRoute.playerMetadata.payload)),
  "player request payload changed"
);

const config = plan.publicRequestRoute.configBootstrap;
const player = plan.publicRequestRoute.playerMetadata;
let configBootstrapGets = 0;
let playerMetadataPosts = 0;
let configStatus = null;
let playerStatus = null;
let publicApiKeySha256 = null;
let responseSha256 = null;
let response = null;
let failure = null;

try {
  configBootstrapGets += 1;
  const configResponse = await fetch(config.url, {
    method: config.method,
    credentials: config.credentials,
    redirect: config.redirect,
    headers: config.headers
  });
  configStatus = configResponse.status;
  const configText = await configResponse.text();
  assertV4(configResponse.ok, `public config bootstrap returned HTTP ${configStatus}`);
  const apiKey = configText.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
  assertV4(apiKey, "public config bootstrap contained no Innertube API key");
  publicApiKeySha256 = sha256(apiKey);

  const endpoint = player.endpointTemplate.replace(
    "<public-api-key>",
    encodeURIComponent(apiKey)
  );
  const payloadJson = JSON.stringify(player.payload);
  playerMetadataPosts += 1;
  const playerResponse = await fetch(endpoint, {
    method: player.method,
    credentials: player.credentials,
    redirect: player.redirect,
    headers: player.headers,
    body: payloadJson
  });
  playerStatus = playerResponse.status;
  const responseText = await playerResponse.text();
  responseSha256 = sha256(responseText);
  assertV4(playerResponse.ok, `public player metadata returned HTTP ${playerStatus}`);
  response = JSON.parse(responseText);
} catch (error) {
  failure = {
    name: error?.name || "Error",
    message: String(error?.message || error)
  };
}

const rawFormats = response
  ? [
      ...(response.streamingData?.formats || []),
      ...(response.streamingData?.adaptiveFormats || [])
    ]
  : [];
const formats = rawFormats.map((format) => ({
  itag: format.itag ?? null,
  mimeType: format.mimeType ?? null,
  bitrate: format.bitrate ?? null,
  contentLength: format.contentLength ?? null,
  approxDurationMs: format.approxDurationMs ?? null,
  audioQuality: format.audioQuality ?? null,
  audioSampleRate: format.audioSampleRate ?? null,
  audioChannels: format.audioChannels ?? null,
  width: format.width ?? null,
  height: format.height ?? null,
  qualityLabel: format.qualityLabel ?? null,
  hasDirectUrl: typeof format.url === "string",
  hasCipher:
    typeof format.signatureCipher === "string" || typeof format.cipher === "string",
  urlSha256: typeof format.url === "string" ? sha256(format.url) : null
}));
const audioFormats = formats.filter((format) =>
  String(format.mimeType || "").startsWith("audio/")
);
const responseVideoId = response?.videoDetails?.videoId ?? null;
const responseLengthSeconds = response?.videoDetails?.lengthSeconds
  ? Number(response.videoDetails.lengthSeconds)
  : null;
const identityPassed =
  responseVideoId === plan.validation.responseVideoIdMustEqual &&
  responseLengthSeconds === plan.validation.responseLengthSecondsMustEqual;
const requestPassed = failure === null && response !== null;
const discoveryPassed = requestPassed && identityPassed;

const inventory = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-09-public-player-metadata-recovery-7-format-inventory",
  status: discoveryPassed
    ? "completed-batch-09-debate-170-public-player-metadata-inventory"
    : "preserved-batch-09-debate-170-public-player-metadata-request-failure",
  batchNumber: 9,
  sourceVideoId: "HoTILnpd3q8",
  request: {
    publicApiKeySha256,
    payloadSha256: activation.payloadSha256,
    responseSha256,
    configHttpStatus: configStatus,
    playerHttpStatus: playerStatus
  },
  playability: {
    status: response?.playabilityStatus?.status ?? null,
    reason: response?.playabilityStatus?.reason ?? null
  },
  videoIdentity: {
    videoId: responseVideoId,
    lengthSeconds: responseLengthSeconds,
    matchedFrozenSource: identityPassed
  },
  formatSummary: {
    totalFormats: formats.length,
    audioFormats: audioFormats.length,
    directUrlFormats: formats.filter((format) => format.hasDirectUrl).length,
    directUrlAudioFormats: audioFormats.filter((format) => format.hasDirectUrl).length,
    cipherFormats: formats.filter((format) => format.hasCipher).length,
    expiresInSeconds: response?.streamingData?.expiresInSeconds
      ? Number(response.streamingData.expiresInSeconds)
      : null
  },
  formats,
  privacyBoundary: {
    rawSignedUrlsPersisted: false,
    rawPlayerResponsePersisted: false,
    publicApiKeyPersisted: false,
    cookiesInspected: 0,
    cookiesExported: 0,
    browserStorageInspected: 0
  },
  failure
};

const execution = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-09-public-player-metadata-recovery-7-execution",
  status: discoveryPassed
    ? "completed-one-shot-batch-09-public-credential-omitting-player-metadata-request"
    : "preserved-one-shot-batch-09-public-player-metadata-request-failure",
  batchNumber: 9,
  planSha256: sha256(planBytes),
  activationSha256: sha256(activationBytes),
  network: {
    configBootstrapGets,
    playerMetadataPosts,
    credentialsMode: "omit",
    configHttpStatus: configStatus,
    playerHttpStatus: playerStatus
  },
  boundary: {
    downloadsStarted: 0,
    downloadsCompleted: 0,
    cookiesInspected: 0,
    cookiesExported: 0,
    browserStorageInspected: 0,
    audioPlaybackObservedSeconds: 0,
    semanticAudioEvaluations: 0,
    modelContexts: 0,
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0
  },
  result: {
    requestPassed,
    sourceIdentityPassed: identityPassed,
    sanitizedFormatCount: formats.length,
    directUrlAudioFormatCount: audioFormats.filter((format) => format.hasDirectUrl).length
  }
};

const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-09-public-player-metadata-recovery-7-analysis",
  status: discoveryPassed
    ? "batch-09-debate-170-public-player-metadata-discovery-passed"
    : "batch-09-debate-170-public-player-metadata-discovery-failed-preserved",
  batchNumber: 9,
  result: {
    requestPassed,
    sourceIdentityPassed: identityPassed,
    playabilityStatus: inventory.playability.status,
    sanitizedFormatCount: formats.length,
    directUrlAudioFormatCount: audioFormats.filter((format) => format.hasDirectUrl).length,
    sourceRecovered: false
  },
  preservedControls: {
    credentialsTransmitted: false,
    cookiesInspected: 0,
    browserStorageInspected: 0,
    downloadsStarted: 0,
    audioPlaybackObservedSeconds: 0,
    semanticAudioEvaluationPerformed: false,
    sourceIdentityChanged: false,
    speakerIdentityChanged: false,
    clipWindowsChanged: false,
    judgmentsChanged: false,
    scoresChanged: false,
    productionChanged: false,
    rawSignedUrlsPersisted: false,
    rawPlayerResponsePersisted: false,
    publicApiKeyPersisted: false
  },
  directIncrementalCostUsd: 0,
  nextAuthorizedAction:
    discoveryPassed && analysisDirectUrlAudioCount(audioFormats) > 0
      ? "prepare-freeze-and-run-one-credential-omitting-source-download-with-fresh-ephemeral-player-metadata"
      : "stop-and-preserve-public-player-metadata-failure"
};

function analysisDirectUrlAudioCount(items) {
  return items.filter((format) => format.hasDirectUrl).length;
}

await mkdir(root, { recursive: true });
await Promise.all([
  writeFile(outputPath, `${JSON.stringify(inventory, null, 2)}\n`),
  writeFile(executionPath, `${JSON.stringify(execution, null, 2)}\n`),
  writeFile(analysisPath, `${JSON.stringify(analysis, null, 2)}\n`)
]);

console.log(
  JSON.stringify(
    {
      status: analysis.status,
      requestPassed,
      sourceIdentityPassed: identityPassed,
      formats: formats.length,
      directUrlAudioFormats: analysisDirectUrlAudioCount(audioFormats),
      downloads: 0,
      audioPlaybackObservedSeconds: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);

if (!discoveryPassed) process.exitCode = 1;
