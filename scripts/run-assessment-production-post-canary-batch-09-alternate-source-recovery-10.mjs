#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import { access, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const repositoryRoot = process.cwd();
const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction";
const recoveryRoot = `${root}/audio-source-alternate-recovery-10`;
const planPath = `${recoveryRoot}/correction-plan.json`;
const activationPath = `${recoveryRoot}/execution-activation.json`;
const executionPath = `${recoveryRoot}/execution.json`;
const analysisPath = `${recoveryRoot}/analysis.json`;
const preparationPath = `${root}/audio-source-preparation.json`;
const workPath = `${root}/audio-work-items.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const removeIfPresent = async (file) => {
  if (await exists(file)) await unlink(file);
};

const [planBytes, activationBytes, workBytes] = await Promise.all([
  readFile(planPath),
  readFile(activationPath),
  readFile(workPath)
]);
const plan = JSON.parse(planBytes);
const activation = JSON.parse(activationBytes);
const work = JSON.parse(workBytes);
assertV4(
  activation.status ===
    "active-for-exactly-one-batch-09-user-supplied-alternate-debate-170-source-and-three-source-recovery-pass" &&
    activation.plan.sha256 === sha256(planBytes),
  "alternate-source recovery is not activated"
);
for (const [file, digest] of Object.entries(activation.authenticatedInputs)) {
  assertV4(sha256(await readFile(file)) === digest, `input hash changed: ${file}`);
}
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `source hash changed: ${file}`);
}
assertV4(!(await exists(executionPath)), "alternate-source execution already exists");
assertV4(!(await exists(analysisPath)), "alternate-source analysis already exists");
assertV4(!(await exists(preparationPath)), "audio-source preparation already exists");
for (const source of plan.exactCohort.sources) {
  assertV4(!(await exists(source.finalSourcePath)), `${source.debateNumber}: source already exists`);
}

const state = {
  attempts: 1,
  configBootstrapGets: 0,
  playerMetadataPosts: 0,
  mediaDownloadAttempts: 0,
  sourcesInstalled: 0,
  clipsCreated: 0,
  completeCohortValidated: false,
  browserSessionUsed: false,
  retries: 0,
  reruns: 0,
  timeoutExtensions: 0,
  audioPlaybackCalls: 0,
  semanticAudioEvaluations: 0,
  modelContexts: 0,
  transcriptionCalls: 0,
  paidServiceCalls: 0,
  scoresDerived: 0,
  directIncrementalCostUsd: 0
};
const sourceRecords = [];
const clipRecords = [];
const requestAudit = [];
const temporaryPaths = new Set();
const temporaryNormalized = [];
let failure = null;

const serializeError = (error, depth = 0) => {
  if (!error || depth > 3) return null;
  return {
    name: error.name || null,
    message: error.message || String(error),
    code: error.code || null,
    cause: error.cause ? serializeError(error.cause, depth + 1) : null
  };
};
const probeAudio = (file) => {
  const probed = JSON.parse(
    execFileSync(
      plan.mediaEncoding.ffprobePath,
      [
        "-v", "error", "-select_streams", "a:0", "-show_entries",
        "format=duration,bit_rate:stream=channels,sample_rate,bit_rate",
        "-of", "json", file
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
const qualityRank = new Map(
  plan.deterministicFormatSelection.qualityRankDescending.map(
    (value, index, items) => [value, items.length - index]
  )
);
const selectFormat = (formats) => {
  const audio = formats.filter(
    (format) =>
      String(format.mimeType || "").startsWith("audio/") &&
      typeof format.url === "string" &&
      Number.isFinite(Number(format.contentLength))
  );
  const defaults = audio.filter((format) => format.audioTrack?.audioIsDefault === true);
  const eligible = defaults.length
    ? defaults
    : audio.filter((format) => format.audioTrack?.audioIsDefault !== false);
  assertV4(eligible.length > 0, "no eligible original/default direct audio format");
  eligible.sort((a, b) => {
    const quality =
      (qualityRank.get(b.audioQuality ?? null) || 0) -
      (qualityRank.get(a.audioQuality ?? null) || 0);
    if (quality) return quality;
    if (Number(b.bitrate) !== Number(a.bitrate)) return Number(b.bitrate) - Number(a.bitrate);
    if (Number(b.contentLength) !== Number(a.contentLength)) {
      return Number(b.contentLength) - Number(a.contentLength);
    }
    if (Number(a.itag) !== Number(b.itag)) return Number(a.itag) - Number(b.itag);
    return sha256(a.url).localeCompare(sha256(b.url));
  });
  return eligible[0];
};

try {
  const config = plan.publicRequestRoute.configBootstrap;
  state.configBootstrapGets += 1;
  const configResponse = await fetch(config.url, {
    method: config.method,
    credentials: config.credentials,
    redirect: config.redirect,
    headers: config.headers
  });
  const configText = await configResponse.text();
  assertV4(configResponse.ok, `public config bootstrap returned HTTP ${configResponse.status}`);
  const apiKey = configText.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
  assertV4(apiKey, "public config bootstrap contained no Innertube API key");

  for (const source of plan.exactCohort.sources) {
    const player = plan.publicRequestRoute.playerMetadata;
    state.playerMetadataPosts += 1;
    const playerResponse = await fetch(
      player.endpointTemplate.replace("<public-api-key>", encodeURIComponent(apiKey)),
      {
        method: player.method,
        credentials: player.credentials,
        redirect: player.redirect,
        headers: player.headers,
        body: JSON.stringify(source.payload)
      }
    );
    const playerText = await playerResponse.text();
    assertV4(
      playerResponse.ok,
      `${source.debateNumber}: public player metadata returned HTTP ${playerResponse.status}`
    );
    const metadata = JSON.parse(playerText);
    assertV4(
      metadata.videoDetails?.videoId === source.sourceVideoId &&
        Number(metadata.videoDetails?.lengthSeconds) === source.expectedDurationSeconds,
      `${source.debateNumber}: public player source identity changed`
    );
    const selected = selectFormat([
      ...(metadata.streamingData?.formats || []),
      ...(metadata.streamingData?.adaptiveFormats || [])
    ]);
    state.mediaDownloadAttempts += 1;
    let mediaResponse;
    try {
      mediaResponse = await fetch(selected.url, {
        method: plan.publicRequestRoute.mediaDownload.method,
        credentials: plan.publicRequestRoute.mediaDownload.credentials,
        redirect: plan.publicRequestRoute.mediaDownload.redirect,
        headers: plan.publicRequestRoute.mediaDownload.headers
      });
    } catch (error) {
      const wrapped = new Error(`${source.debateNumber}: media fetch transport exception`);
      wrapped.cause = error;
      throw wrapped;
    }
    assertV4(
      (mediaResponse.status === 200 || mediaResponse.status === 206) && mediaResponse.body,
      `${source.debateNumber}: media download returned HTTP ${mediaResponse.status}`
    );

    const extension = String(selected.mimeType).startsWith("audio/webm") ? "webm" : "m4a";
    const audioDirectory = path.resolve(repositoryRoot, path.dirname(source.finalSourcePath));
    await mkdir(audioDirectory, { recursive: true });
    const rawPath = path.join(audioDirectory, `source.alternate-recovery-10.${extension}`);
    const normalizedPath = path.join(audioDirectory, "source.alternate-recovery-10.normalized.mp3");
    assertV4(!(await exists(rawPath)), `${source.debateNumber}: raw download preexists`);
    assertV4(!(await exists(normalizedPath)), `${source.debateNumber}: normalized temp preexists`);
    temporaryPaths.add(rawPath);
    temporaryPaths.add(normalizedPath);
    await pipeline(Readable.fromWeb(mediaResponse.body), createWriteStream(rawPath, { flags: "wx" }));
    const rawBytes = await readFile(rawPath);
    assertV4(
      rawBytes.length === Number(selected.contentLength),
      `${source.debateNumber}: downloaded byte count changed`
    );
    execFileSync(plan.mediaEncoding.ffmpegPath, [
      "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
      "-i", rawPath, "-vn", "-ac", String(plan.mediaEncoding.normalizedChannels),
      "-ar", String(plan.mediaEncoding.normalizedSampleRateHz), "-b:a",
      `${plan.mediaEncoding.normalizedBitrateKbps}k`, normalizedPath
    ]);
    const probe = probeAudio(normalizedPath);
    assertV4(
      Number.isFinite(probe.durationSeconds) &&
        probe.durationSeconds * 1000 >= source.maximumRequiredEndMs &&
        Math.abs(probe.durationSeconds - source.expectedDurationSeconds) <=
          plan.mediaEncoding.fullSourceDurationToleranceSeconds &&
        probe.channels === plan.mediaEncoding.normalizedChannels &&
        probe.sampleRateHz === plan.mediaEncoding.normalizedSampleRateHz,
      `${source.debateNumber}: normalized source validation failed`
    );
    await unlink(rawPath);
    temporaryPaths.delete(rawPath);
    temporaryNormalized.push({ source, normalizedPath, probe });
    requestAudit.push({
      debateNumber: source.debateNumber,
      videoId: source.sourceVideoId,
      canonicalVideoId: source.canonicalSourceVideoId ?? source.sourceVideoId,
      playerMetadataAttempt: 1,
      mediaDownloadAttempt: 1,
      playerHttpStatus: playerResponse.status,
      finalMediaHttpStatus: mediaResponse.status,
      responseRedirected: mediaResponse.redirected,
      finalMediaUrlSha256: sha256(mediaResponse.url),
      playerResponseSha256: sha256(playerText),
      selectedFormat: {
        itag: selected.itag,
        mimeType: selected.mimeType,
        bitrate: selected.bitrate,
        contentLength: selected.contentLength,
        audioQuality: selected.audioQuality ?? null,
        audioSampleRate: selected.audioSampleRate ?? null,
        audioChannels: selected.audioChannels ?? null,
        audioTrackIdSha256: selected.audioTrack?.id
          ? sha256(selected.audioTrack.id)
          : null,
        audioTrackDisplayName: selected.audioTrack?.displayName ?? null,
        audioTrackLanguageCode: selected.audioTrack?.languageCode ?? null,
        audioTrackIsDefault: selected.audioTrack?.audioIsDefault ?? null,
        urlSha256: sha256(selected.url)
      },
      rawDownloadBytes: rawBytes.length,
      rawDownloadSha256: sha256(rawBytes),
      rawDownloadRetained: false
    });
  }

  for (const item of temporaryNormalized) {
    await rename(item.normalizedPath, item.source.finalSourcePath);
    temporaryPaths.delete(item.normalizedPath);
    state.sourcesInstalled += 1;
    sourceRecords.push({
      debateNumber: item.source.debateNumber,
      videoId: item.source.sourceVideoId,
      canonicalVideoId: item.source.canonicalSourceVideoId ?? item.source.sourceVideoId,
      alternateAudioVerificationOnly: item.source.alternateAudioVerificationOnly === true,
      acquisitionMode: item.source.mode,
      publicSourceAcquisitionAttempts: 1,
      publicSourceAttemptOutcome: "success",
      sourceAudio: item.source.finalSourcePath,
      sourceAudioSha256: sha256(await readFile(item.source.finalSourcePath)),
      durationSeconds: item.probe.durationSeconds,
      channels: item.probe.channels,
      sampleRateHz: item.probe.sampleRateHz,
      measuredBitRateBps: item.probe.measuredBitRateBps,
      normalizedBitrateKbps: plan.mediaEncoding.normalizedBitrateKbps
    });
  }

  for (const move of work.moves) {
    const source = sourceRecords.find((item) => item.debateNumber === move.debateNumber);
    assertV4(source, `${move.moveId}: prepared source missing`);
    const clipWindow =
      move.debateNumber === "170"
        ? {
            startMs: plan.debate170AudioOnlyOverlay.alternateClipWindow.startMs,
            endMs: plan.debate170AudioOnlyOverlay.alternateClipWindow.endMs,
            paddingMs: move.clipWindow.paddingMs
          }
        : structuredClone(move.clipWindow);
    const clipDirectory = path.resolve(
      repositoryRoot,
      path.dirname(source.sourceAudio).replace(/\/audio$/, "/clips")
    );
    await mkdir(clipDirectory, { recursive: true });
    const safeMoveId = move.moveId.replace(/[^A-Za-z0-9_-]+/g, "-");
    const clipPath = path.join(clipDirectory, `${safeMoveId}.mp3`);
    assertV4(!(await exists(clipPath)), `${move.moveId}: clip already exists`);
    const plannedDurationSeconds = (clipWindow.endMs - clipWindow.startMs) / 1000;
    execFileSync(plan.mediaEncoding.ffmpegPath, [
      "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
      "-ss", (clipWindow.startMs / 1000).toFixed(3),
      "-i", path.resolve(repositoryRoot, source.sourceAudio),
      "-t", plannedDurationSeconds.toFixed(3), "-vn", "-ac",
      String(plan.mediaEncoding.clipChannels), "-ar",
      String(plan.mediaEncoding.clipSampleRateHz), "-b:a",
      `${plan.mediaEncoding.clipBitrateKbps}k`, clipPath
    ]);
    const probe = probeAudio(clipPath);
    assertV4(
      Math.abs(probe.durationSeconds - plannedDurationSeconds) <=
          plan.mediaEncoding.clipDurationToleranceSeconds &&
        probe.channels === plan.mediaEncoding.clipChannels &&
        probe.sampleRateHz === plan.mediaEncoding.clipSampleRateHz,
      `${move.moveId}: clip validation failed`
    );
    clipRecords.push({
      debateNumber: move.debateNumber,
      debateId: move.debateId,
      sourceVideoId: source.videoId,
      canonicalSourceVideoId: move.sourceVideoId,
      alternateAudioVerificationOnly: source.alternateAudioVerificationOnly,
      moveId: move.moveId,
      expectedSpeaker: move.expectedSpeaker,
      proposition: move.proposition,
      verificationExcerpt: move.verificationExcerpt,
      sourceSpan: move.sourceSpan,
      clipWindow,
      canonicalClipWindow: move.clipWindow,
      trigger: move.trigger,
      clipPath: path.relative(repositoryRoot, clipPath),
      clipSha256: sha256(await readFile(clipPath)),
      plannedDurationSeconds,
      durationSeconds: probe.durationSeconds,
      channels: probe.channels,
      sampleRateHz: probe.sampleRateHz,
      measuredBitRateBps: probe.measuredBitRateBps,
      targetBitrateKbps: plan.mediaEncoding.clipBitrateKbps,
      audioVerificationCompleted: false
    });
    state.clipsCreated += 1;
  }
  state.completeCohortValidated = sourceRecords.length === 3 && clipRecords.length === 4;
} catch (error) {
  failure = serializeError(error);
  for (const file of temporaryPaths) await removeIfPresent(file);
}

const execution = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-09-alternate-source-recovery-10-execution",
  status: state.completeCohortValidated
    ? "completed-one-shot-batch-09-alternate-debate-170-three-source-four-clip-preparation"
    : "preserved-one-shot-batch-09-alternate-source-recovery-failure",
  batchNumber: 9,
  planSha256: sha256(planBytes),
  activationSha256: sha256(activationBytes),
  state,
  requestAudit,
  failure
};
const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-09-alternate-source-recovery-10-analysis",
  status: state.completeCohortValidated
    ? "batch-09-user-supplied-alternate-debate-170-three-source-four-clip-preparation-passed"
    : "batch-09-user-supplied-alternate-source-recovery-failed-preserved",
  batchNumber: 9,
  result: {
    alternateDebate170AudioSourceAccepted: state.completeCohortValidated,
    canonicalJudgmentSourcePreserved: true,
    completeCohortValidated: state.completeCohortValidated,
    sourcesInstalled: state.sourcesInstalled,
    clipsCreated: state.clipsCreated,
    browserSessionUsed: false,
    audioPlaybackObservedSeconds: 0,
    semanticAudioEvaluationPerformed: false
  },
  preservedControls: {
    canonicalTranscriptPacketsChanged: false,
    judgmentsChanged: false,
    scoresChanged: false,
    productionChanged: false,
    browserSessionIdentifierPersisted: false,
    rawSignedUrlsPersisted: false,
    publicApiKeyPersisted: false,
    retries: 0,
    modelContexts: 0,
    paidServiceCalls: 0
  },
  failure,
  directIncrementalCostUsd: 0,
  nextAuthorizedAction: state.completeCohortValidated
    ? "prepare-validate-freeze-and-report-batch-09-four-clip-audio-verification-manifest-and-cost-estimate"
    : "stop-on-user-supplied-alternate-source-recovery-failure"
};

if (state.completeCohortValidated) {
  const preparation = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-09-audio-source-preparation",
    protocolId: work.protocolId,
    status:
      "prepared-four-post-canary-batch-09-local-audio-clips-standing-authorization-active-for-audio-verification-preparation",
    productionCanary: false,
    batchNumber: 9,
    stagingOnly: true,
    checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    inputHashes: {
      [planPath]: sha256(planBytes),
      [activationPath]: sha256(activationBytes),
      [workPath]: sha256(workBytes),
      ...plan.authenticatedInputs,
      ...plan.sourceHashes
    },
    sourceCount: sourceRecords.length,
    clipCount: clipRecords.length,
    plannedAudioMinutes:
      clipRecords.reduce((sum, clip) => sum + clip.plannedDurationSeconds, 0) / 60,
    sources: sourceRecords,
    clips: clipRecords,
    publicSourceAttemptAudit: requestAudit.map((item) => ({
      debateNumber: item.debateNumber,
      videoId: item.videoId,
      canonicalVideoId: item.canonicalVideoId,
      attempt: 1,
      maximumAttempts: 1,
      outcome: "success"
    })),
    executionBoundary: {
      browserSessionUsed: false,
      audioPlaybackCalls: 0,
      semanticAudioEvaluations: 0,
      modelContexts: 0,
      transcriptionCalls: 0,
      paidServiceCalls: 0,
      scoresDerived: 0,
      directIncrementalCostUsd: 0
    },
    nextAuthorizedAction:
      "prepare-validate-freeze-and-report-batch-09-four-clip-audio-verification-manifest-and-cost-estimate"
  };
  await writeFile(preparationPath, `${JSON.stringify(preparation, null, 2)}\n`);
}
await mkdir(recoveryRoot, { recursive: true });
await Promise.all([
  writeFile(executionPath, `${JSON.stringify(execution, null, 2)}\n`),
  writeFile(analysisPath, `${JSON.stringify(analysis, null, 2)}\n`)
]);

console.log(
  JSON.stringify(
    {
      status: analysis.status,
      alternateDebate170AudioSourceAccepted: state.completeCohortValidated,
      sourcesInstalled: state.sourcesInstalled,
      clipsCreated: state.clipsCreated,
      browserSessionUsed: false,
      retries: 0,
      audioPlaybackObservedSeconds: 0,
      directIncrementalCostUsd: 0,
      failure
    },
    null,
    2
  )
);

if (!state.completeCohortValidated) process.exitCode = 1;
