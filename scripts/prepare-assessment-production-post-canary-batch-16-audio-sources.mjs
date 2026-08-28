#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import {
  access,
  mkdir,
  readFile,
  stat,
  unlink,
  writeFile
} from "node:fs/promises";
import https from "node:https";
import path from "node:path";
import { pipeline } from "node:stream/promises";

import {
  POST_CANARY_BATCH_16_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch16StandingAuthorization
} from "./lib/assessment-production-post-canary-batch-16-standing-authorization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const repositoryRoot = process.cwd();
const planRoot =
  "docs/assessment-production/post-canary-continuation-v1/batch-16/disagreement-extraction";
const localRoot =
  "output/transcribe/assessment-production-post-canary-batch-16-audio-verification";
const workPreparationPath = `${planRoot}/audio-work-item-preparation.json`;
const workPath = `${planRoot}/audio-work-items.json`;
const preparationPath = `${planRoot}/audio-source-preparation.json`;
const ffmpeg = "/opt/homebrew/bin/ffmpeg";
const ffprobe = "/opt/homebrew/bin/ffprobe";
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
const firstLine = (value) => value.trim().split("\n")[0];
const PLANNED_RANGE = "bytes=0-";
const MAXIMUM_REDIRECTS = 3;
const isAuthorizedMediaUrl = (value) => {
  const parsed = new URL(value);
  return (
    parsed.protocol === "https:" &&
    (parsed.hostname === "googlevideo.com" ||
      parsed.hostname.endsWith(".googlevideo.com"))
  );
};
const redactedUrlRecord = (value) => {
  const parsed = new URL(value);
  return {
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    urlSha256: sha256(value)
  };
};
const EXPECTED_AUDIO = [
  "108:con-evolved-moral-obligation-without-god",
  "108:con-explanatory-gap-does-not-support-god",
  "108:con-naturalized-diverse-religious-experience",
  "108:pro-causal-link-not-mental-identity",
  "108:pro-divine-intelligent-ground",
  "144:pro-guidance-no-added-ontological-cost",
  "76:con-denial-of-brute-contingency",
  "76:con-failed-predictions-selection-effect",
  "92:con-hotel-finite-creation-constraint",
  "92:pro-metaphysical-not-logical-impossibility"
];
const SOURCE_FORMATS = Object.freeze({
  "nOy29aP7wDc": "bestaudio/best",
  "f06J2R4MwGA": "bestaudio/best",
  "8WE1y00bwCU": "bestaudio/best",
  "uWo9qU2dhpQ": "bestaudio/best"
});
const TOOL_SOURCES = [
  "scripts/prepare-assessment-production-post-canary-batch-16-audio-sources.mjs",
  "scripts/test-assessment-production-post-canary-batch-16-audio-sources.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-16-audio-work-items.mjs",
  "scripts/test-assessment-production-post-canary-batch-16-audio-work-items.mjs",
  "scripts/lib/assessment-production-post-canary-batch-16-audio-work-items.mjs",
  "scripts/lib/assessment-production-post-canary-batch-16-standing-authorization.mjs",
  "scripts/lib/v4-lean-production.mjs"
];
const standingAuthorization =
  await loadAndValidatePostCanaryBatch16StandingAuthorization();
const USER_AUTHORIZATION = Object.freeze({
  instruction: standingAuthorization.record.userAuthorization.instruction,
  standingAuthorizationPath: POST_CANARY_BATCH_16_STANDING_AUTHORIZATION,
  standingAuthorizationSha256: standingAuthorization.sha256,
  directIncrementalCostUsdMaximum: 0,
  conditionalPaidAudioMaximumUsd: 1,
  sourceAudioFilesAuthorized: 4,
  clipsAuthorized: 10,
  onePublicSourceDownloadAttemptPerMissingVideo: true,
  localFfmpegProcessingAuthorized: true,
  audioPlaybackAuthorized: false,
  semanticAudioEvaluationAuthorized: false,
  modelExecutionAuthorized: false,
  paidServicesAuthorizedThisStage: false,
  transcriptionAuthorizedThisStage: false,
  adjudicationAuthorizedThisStage: false,
  scoreDerivationAuthorizedThisStage: false,
  productionMutationAuthorizedThisStage: false,
  nextBatchSelectionAuthorized: false
});

const [workPreparationBytes, workBytes] = await Promise.all([
  readFile(workPreparationPath),
  readFile(workPath)
]);
const workPreparation = JSON.parse(workPreparationBytes);
const work = JSON.parse(workBytes);

assertV4(
  workPreparation.status ===
    "prepared-and-frozen-ten-post-canary-batch-16-local-audio-source-work-items-standing-authorization-active-for-audio-preparation" &&
    workPreparation.authorization.localAudioSourcePreparation &&
    workPreparation.nextAuthorizedAction ===
      "prepare-local-batch-16-source-audio-and-ten-frozen-clips-under-standing-authorization",
  "Batch 16 local audio-source preparation is not authorized"
);
assertV4(
  work.status ===
      "prepared-ten-post-canary-batch-16-local-audio-source-work-items-standing-authorization-active-for-audio-preparation" &&
    work.moves.length === 10 &&
    work.authorization.localAudioSourcePreparation,
  "Batch 16 audio work-item population changed"
);
assertV4(
  sha256(workBytes) === workPreparation.workArtifact.sha256,
  "Batch 16 audio work-item hash changed"
);
assertV4(
  JSON.stringify(
    work.moves.map((move) => `${move.debateNumber}:${move.moveId}`).sort()
  ) === JSON.stringify([...EXPECTED_AUDIO].sort()),
  "Batch 16 exact ten-clip population changed"
);
for (const [file, digest] of Object.entries(workPreparation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
}
assertV4(await exists(ffmpeg), "ffmpeg is unavailable");
assertV4(await exists(ffprobe), "ffprobe is unavailable");

const inputHashes = {
  [workPreparationPath]: sha256(workPreparationBytes),
  [workPath]: sha256(workBytes),
  [POST_CANARY_BATCH_16_STANDING_AUTHORIZATION]: standingAuthorization.sha256
};
for (const file of TOOL_SOURCES) inputHashes[file] = sha256(await readFile(file));

const toolVersions = {
  ffmpeg: firstLine(
    execFileSync(ffmpeg, ["-version"], { encoding: "utf8" })
  ),
  ffprobe: firstLine(
    execFileSync(ffprobe, ["-version"], { encoding: "utf8" })
  ),
  ytDlp: execFileSync("python3", ["-m", "yt_dlp", "--version"], {
    encoding: "utf8"
  }).trim()
};
const probeAudio = (file) => {
  const probed = JSON.parse(
    execFileSync(
      ffprobe,
      [
        "-v",
        "error",
        "-select_streams",
        "a:0",
        "-show_entries",
        "format=duration,bit_rate:stream=channels,sample_rate,bit_rate",
        "-of",
        "json",
        file
      ],
      { encoding: "utf8" }
    )
  );
  const stream = probed.streams?.[0] ?? {};
  return {
    durationSeconds: Number(probed.format?.duration),
    channels: Number(stream.channels),
    sampleRateHz: Number(stream.sample_rate),
    measuredBitRateBps: Number(stream.bit_rate ?? probed.format?.bit_rate)
  };
};
const resolveFreshMediaUrl = (videoId, formatSelector) => {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const output = execFileSync(
    "python3",
    [
      "-m",
      "yt_dlp",
      "--no-playlist",
      "--quiet",
      "--no-warnings",
      "--retries",
      "0",
      "--fragment-retries",
      "0",
      "--extractor-retries",
      "0",
      "--file-access-retries",
      "0",
      "--extractor-args",
      "youtube:player_client=android,web",
      "-f",
      formatSelector,
      "--get-url",
      videoUrl
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }
  );
  const urls = output
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);
  assertV4(urls.length === 1, `${videoId}: expected exactly one resolved media URL`);
  assertV4(
    isAuthorizedMediaUrl(urls[0]),
    `${videoId}: resolved media URL is outside the authorized HTTPS googlevideo.com boundary`
  );
  return urls[0];
};
const acquireSingleRange = async (videoId, resolvedUrl, destination) => {
  const redirectChain = [];

  const request = async (currentUrl, redirectsFollowed) => {
    assertV4(
      isAuthorizedMediaUrl(currentUrl),
      `${videoId}: media request URL is outside the authorized HTTPS googlevideo.com boundary`
    );
    redirectChain.push(redactedUrlRecord(currentUrl));

    return new Promise((resolve, reject) => {
      const mediaRequest = https.request(
        currentUrl,
        {
          method: "GET",
          headers: { Range: PLANNED_RANGE },
          agent: false
        },
        (response) => {
          const statusCode = response.statusCode ?? 0;
          if (statusCode >= 300 && statusCode < 400) {
            const location = response.headers.location;
            response.resume();
            response.once("end", () => {
              try {
                assertV4(
                  redirectsFollowed < MAXIMUM_REDIRECTS,
                  `${videoId}: media response exceeded ${MAXIMUM_REDIRECTS} redirects`
                );
                assertV4(location, `${videoId}: redirect omitted Location`);
                const redirectedUrl = new URL(location, currentUrl).toString();
                assertV4(
                  isAuthorizedMediaUrl(redirectedUrl),
                  `${videoId}: redirect left the authorized HTTPS googlevideo.com boundary`
                );
                resolve(request(redirectedUrl, redirectsFollowed + 1));
              } catch (error) {
                reject(error);
              }
            });
            response.once("error", reject);
            return;
          }

          if (statusCode !== 206) {
            response.resume();
            response.once("end", () =>
              reject(
                new Error(`${videoId}: final media response was HTTP ${statusCode}, not 206`)
              )
            );
            response.once("error", reject);
            return;
          }

          const contentRange = response.headers["content-range"] ?? "";
          const match = /^bytes 0-(\d+)\/(\d+|\*)$/.exec(contentRange);
          if (!match) {
            response.destroy();
            reject(new Error(`${videoId}: final 206 response had an invalid Content-Range`));
            return;
          }
          const expectedBytes = Number(match[1]) + 1;
          let receivedBytes = 0;
          response.on("data", (chunk) => {
            receivedBytes += chunk.length;
          });
          const output = createWriteStream(destination, { flags: "wx" });
          pipeline(response, output)
            .then(async () => {
              const downloadedBytes = (await stat(destination)).size;
              assertV4(
                receivedBytes === expectedBytes && downloadedBytes === expectedBytes,
                `${videoId}: downloaded byte count did not match Content-Range`
              );
              resolve({
                plannedRange: PLANNED_RANGE,
                rangeRepeated: false,
                redirectCount: redirectsFollowed,
                redirectChain,
                finalStatusCode: statusCode,
                finalResponse: redactedUrlRecord(currentUrl),
                contentRange,
                contentType: response.headers["content-type"] ?? null,
                bytesDownloaded: downloadedBytes
              });
            })
            .catch(reject);
        }
      );
      mediaRequest.once("error", reject);
      mediaRequest.end();
    });
  };

  return request(resolvedUrl, 0);
};

if (shouldWrite) {
  assertV4(
    !(await exists(preparationPath)),
    `${preparationPath} already exists; the frozen preparation cannot be overwritten`
  );
}

const grouped = Map.groupBy(work.moves, (move) => move.sourceVideoId);
assertV4(
  grouped.size === 4,
  "expected exactly four Batch 16 audio sources"
);
const plannedSources = [...grouped].map(([videoId, moves]) => {
  const debateNumber = moves[0].debateNumber;
  assertV4(
    moves.every(
      (move) =>
        move.debateNumber === debateNumber && move.sourceVideoId === videoId
    ),
    `${videoId}: mixed debate audio population`
  );
  return {
    debateNumber,
    videoId,
    queuedMoves: moves.length,
    maximumRequiredEndMs: Math.max(
      ...moves.map((move) => move.clipWindow.endMs)
    ),
    sourceAudio:
      `${localRoot}/debate-${debateNumber}/audio/source.mp3`,
    formatSelector: SOURCE_FORMATS[videoId],
    existingNormalizedSource: false
  };
});
for (const source of plannedSources) {
  source.existingNormalizedSource = await exists(source.sourceAudio);
}

if (!shouldWrite) {
  console.log(
    JSON.stringify(
      {
        status: "preview-four-post-canary-batch-16-local-audio-sources-ten-clips",
        wroteArtifacts: false,
        sources: plannedSources,
        clips: work.moves.map((move) => ({
          debateNumber: move.debateNumber,
          sourceVideoId: move.sourceVideoId,
          moveId: move.moveId,
          clipWindow: move.clipWindow
        })),
        acquisitionPolicy: {
          oneFreshMediaUrlResolutionPerMissingVideo: true,
          onePublicSourceAttemptPerMissingVideo: true,
          plannedRange: PLANNED_RANGE,
          nonOverlappingRangesPerVideo: 1,
          repeatedRanges: 0,
          manualHttpsGoogleVideoRedirectsOnly: true,
          maximumRedirectsPerRange: MAXIMUM_REDIRECTS,
          requiredFinalStatusCode: 206,
          retries: 0,
          fragmentRetries: 0,
          extractorRetries: 0,
          fileAccessRetries: 0,
          acquisitionFormatByVideo: SOURCE_FORMATS,
          diagnosedFailedResolution: null,
          normalizeMonoHz: 16000,
          normalizeBitrateKbps: 48,
          clipBitrateKbps: 64,
          paidServices: false,
          transcription: false
        },
        toolVersions,
        estimatedExternalCostUsd: 0,
        mediaFilesAccessed: 0,
        nextAction: "commit-and-push-frozen-audio-source-harness-before-media-access"
      },
      null,
      2
    )
  );
  process.exit(0);
}

const sources = [];
const clips = [];
const publicSourceAttemptAudit = [];
let sourceDownloads = 0;
let existingNormalizedSources = 0;

for (const [videoId, moves] of grouped) {
  const debateNumber = moves[0].debateNumber;
  const mediaDirectory = path.resolve(
    repositoryRoot,
    localRoot,
    `debate-${debateNumber}`
  );
  const audioDirectory = path.join(mediaDirectory, "audio");
  const clipDirectory = path.join(mediaDirectory, "clips");
  const sourceAudio = path.join(audioDirectory, "source.mp3");
  await mkdir(audioDirectory, { recursive: true });
  await mkdir(clipDirectory, { recursive: true });

  let acquisitionMode = "existing-normalized-source";
  let acquisitionAttempts = 0;
  let publicSourceAttemptOutcome = "not-required-local-source-reused";
  let transportAudit = null;
  if (!(await exists(sourceAudio))) {
    const downloadedPath = path.join(audioDirectory, "source.download.m4a");
    assertV4(
      !(await exists(downloadedPath)),
      `${videoId}: an unverified prior download exists; refusing a new range request`
    );
    acquisitionAttempts = 1;
    try {
      const formatSelector = SOURCE_FORMATS[videoId];
      assertV4(formatSelector, `${videoId}: no frozen source format selector`);
      const resolvedUrl = resolveFreshMediaUrl(videoId, formatSelector);
      transportAudit = {
        freshUrlResolutionAttempts: 1,
        freshMediaUrlsResolved: 1,
        formatSelector,
        resolvedUrl: redactedUrlRecord(resolvedUrl),
        ...(await acquireSingleRange(videoId, resolvedUrl, downloadedPath))
      };
    } catch (error) {
      await unlink(downloadedPath).catch(() => {});
      throw new Error(
        `${videoId}: the single authorized public-source acquisition attempt failed`,
        { cause: error }
      );
    }
    execFileSync(ffmpeg, [
      "-nostdin",
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      downloadedPath,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-b:a",
      "48k",
      sourceAudio
    ]);
    await unlink(downloadedPath);
    acquisitionMode = "downloaded-public-source";
    publicSourceAttemptOutcome = "success";
    sourceDownloads += 1;
  } else {
    existingNormalizedSources += 1;
  }

  publicSourceAttemptAudit.push({
    debateNumber,
    videoId,
    attempt: acquisitionAttempts,
    maximumAttempts: 1,
    outcome: publicSourceAttemptOutcome,
    transportAudit
  });
  const sourceProbe = probeAudio(sourceAudio);
  const sourceDurationSeconds = sourceProbe.durationSeconds;
  assertV4(
    Number.isFinite(sourceDurationSeconds) &&
      sourceDurationSeconds * 1000 >=
        Math.max(...moves.map((move) => move.clipWindow.endMs)) &&
      sourceProbe.channels === 1 &&
      sourceProbe.sampleRateHz === 16000,
    `${videoId}: normalized source audio is too short`
  );
  sources.push({
    debateNumber,
    videoId,
    acquisitionMode,
    publicSourceAcquisitionAttempts: acquisitionAttempts,
    publicSourceAttemptOutcome,
    transportAudit,
    formatSelector: SOURCE_FORMATS[videoId],
    sourceAudio: path.relative(repositoryRoot, sourceAudio),
    sourceAudioSha256: sha256(await readFile(sourceAudio)),
    durationSeconds: sourceDurationSeconds,
    channels: sourceProbe.channels,
    sampleRateHz: sourceProbe.sampleRateHz,
    measuredBitRateBps: sourceProbe.measuredBitRateBps,
    normalizedBitrateKbps: 48
  });

  for (const move of moves) {
    const safeMoveId = move.moveId.replace(/[^A-Za-z0-9_-]+/g, "-");
    const clipPath = path.join(clipDirectory, `${safeMoveId}.mp3`);
    const plannedDurationSeconds =
      (move.clipWindow.endMs - move.clipWindow.startMs) / 1000;
    execFileSync(ffmpeg, [
      "-nostdin",
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-ss",
      (move.clipWindow.startMs / 1000).toFixed(3),
      "-i",
      sourceAudio,
      "-t",
      plannedDurationSeconds.toFixed(3),
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-b:a",
      "64k",
      clipPath
    ]);
    const clipProbe = probeAudio(clipPath);
    const actualDurationSeconds = clipProbe.durationSeconds;
    assertV4(
      Math.abs(actualDurationSeconds - plannedDurationSeconds) <= 0.25 &&
        clipProbe.channels === 1 &&
        clipProbe.sampleRateHz === 16000,
      `${move.moveId}: clip duration mismatch`
    );
    clips.push({
      debateNumber: move.debateNumber,
      debateId: move.debateId,
      sourceVideoId: move.sourceVideoId,
      moveId: move.moveId,
      expectedSpeaker: move.expectedSpeaker,
      proposition: move.proposition,
      verificationExcerpt: move.verificationExcerpt,
      sourceSpan: move.sourceSpan,
      clipWindow: move.clipWindow,
      trigger: move.trigger,
      clipPath: path.relative(repositoryRoot, clipPath),
      clipSha256: sha256(await readFile(clipPath)),
      plannedDurationSeconds,
      durationSeconds: actualDurationSeconds,
      channels: clipProbe.channels,
      sampleRateHz: clipProbe.sampleRateHz,
      measuredBitRateBps: clipProbe.measuredBitRateBps,
      targetBitrateKbps: 64,
      audioVerificationCompleted: false
    });
  }
}

const preparation = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-16-audio-source-preparation",
  protocolId: work.protocolId,
  status:
    "prepared-ten-post-canary-batch-16-local-audio-clips-standing-authorization-active-for-audio-verification-preparation",
  productionCanary: false,
  batchNumber: 16,
  stagingOnly: true,
  developmentValidationOnly: false,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  userAuthorization: USER_AUTHORIZATION,
  inputHashes,
  workItemSourceHashesReplayed: Object.keys(workPreparation.sourceHashes).length,
  acquisitionPolicy: {
    reuseValidatedLocalSourceBeforeDownload: true,
    oneFreshMediaUrlResolutionPerMissingVideo: true,
    onePublicSourceAttemptPerMissingVideo: true,
    maximumPublicSourceAttempts: 1,
    plannedRangesPerVideo: [PLANNED_RANGE],
    nonOverlappingRangesPerVideo: 1,
    repeatedRanges: 0,
    redirectPolicy: {
      manual: true,
      httpsOnly: true,
      googleVideoDomainOnly: true,
      maximumRedirectsPerRange: MAXIMUM_REDIRECTS,
      requiredFinalStatusCode: 206
    },
    ytDlpRetryControls: {
      retries: 0,
      fragmentRetries: 0,
      extractorRetries: 0,
      fileAccessRetries: 0
    },
    acquisitionFormatByVideo: SOURCE_FORMATS,
    diagnosedFailedResolution: null,
    normalizedChannels: 1,
    normalizedSampleRateHz: 16000,
    normalizedBitrateKbps: 48,
    clipBitrateKbps: 64,
    paidServices: false,
    transcription: false
  },
  publicSourceAttemptAudit,
  executionBoundary: {
    audioAccessLimitedToProgrammaticEncodingProbeAndHashing: true,
    audioPlaybackCalls: 0,
    semanticAudioEvaluations: 0,
    transcriptionCalls: 0,
    modelOrApiCalls: 0,
    paidServiceCalls: 0
  },
  toolVersions,
  sources,
  clips,
  totals: {
    sources: sources.length,
    sourceDownloads,
    existingNormalizedSources,
    sourceAcquisitionAttempts: sources.reduce(
      (sum, source) => sum + source.publicSourceAcquisitionAttempts,
      0
    ),
    clips: clips.length,
    clipMinutes: Number(
      (clips.reduce((sum, clip) => sum + clip.durationSeconds, 0) / 60).toFixed(4)
    ),
    paidTranscriptionCalls: 0,
    transcriptionCostUsd: 0,
    audioVerificationCalls: 0,
    audioVerificationCompleted: 0,
    modelContexts: 0,
    meteredModelApiCostUsd: 0,
    directIncrementalCostUsd: 0,
    audioFilesPlayed: 0,
    semanticAudioEvaluations: 0,
    retries: 0,
    timeoutExtensions: 0,
    scoresDerived: 0,
    productionMutations: 0,
    nextBatchSelections: 0
  },
  activePolicy: structuredClone(workPreparation.activePolicy),
  validatedInventoryContract: structuredClone(
    workPreparation.validatedInventoryContract
  ),
  authorization: {
    audioVerificationManifestPreparation: true,
    audioVerificationCostEstimation: true,
    paidTranscriptionExecution: false,
    audioVerificationExecution: false,
    adjudicationPacketPreparation: false,
    adjudicationModelExecution: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    policyPromotion: false,
    publicationFinalization: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction:
    "prepare-freeze-validate-and-push-batch-16-audio-verification-manifest-and-cost-estimate-under-standing-authorization"
};

await writeFile(preparationPath, `${JSON.stringify(preparation, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      status: preparation.status,
      sources: sources.map(
        ({ debateNumber, videoId, acquisitionMode, durationSeconds }) => ({
          debateNumber,
          videoId,
          acquisitionMode,
          durationSeconds
        })
      ),
      clips: clips.length,
      clipMinutes: preparation.totals.clipMinutes,
      sourceDownloads,
      sourceAcquisitionAttempts: preparation.totals.sourceAcquisitionAttempts,
      paidTranscriptionCalls: 0,
      audioVerificationCalls: 0,
      modelContexts: 0,
      transcriptionCostUsd: 0,
      meteredApiCostUsd: 0,
      scoresDerived: 0,
      nextAuthorized: preparation.nextAuthorizedAction
    },
    null,
    2
  )
);
