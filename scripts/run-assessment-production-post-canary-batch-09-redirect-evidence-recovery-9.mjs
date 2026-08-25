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
const recoveryRoot = `${root}/audio-source-transport-recovery-9`;
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
const basePlanBytes = await readFile(plan.inheritedFrozenCohort.path);
const basePlan = JSON.parse(basePlanBytes);
const work = JSON.parse(workBytes);
assertV4(
  activation.status ===
    "active-for-exactly-one-final-batch-09-debate-170-redirect-evidence-and-three-source-recovery-9-pass" &&
    activation.plan.sha256 === sha256(planBytes),
  "redirect-evidence recovery is not activated"
);
for (const [file, digest] of Object.entries(activation.authenticatedInputs)) {
  assertV4(sha256(await readFile(file)) === digest, `input hash changed: ${file}`);
}
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `source hash changed: ${file}`);
}
assertV4(
  sha256(basePlanBytes) === plan.inheritedFrozenCohort.sha256 &&
    sha256(JSON.stringify(basePlan.exactCohort)) ===
      plan.inheritedFrozenCohort.exactCohortSha256,
  "inherited frozen cohort changed"
);
assertV4(!(await exists(executionPath)), "redirect-evidence execution already exists");
assertV4(!(await exists(analysisPath)), "redirect-evidence analysis already exists");
assertV4(!(await exists(preparationPath)), "audio-source preparation already exists");
for (const source of basePlan.exactCohort.sources) {
  assertV4(!(await exists(source.finalSourcePath)), `${source.debateNumber}: source already exists`);
}

const state = {
  attempts: 1,
  configBootstrapGets: 0,
  playerMetadataPosts: 0,
  mediaAttempts: 0,
  mediaHttpRequestsIncludingRedirectHops: 0,
  redirectHopsFollowed: 0,
  sourcesInstalled: 0,
  clipsCreated: 0,
  completeCohortValidated: false,
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
      basePlan.mediaEncoding.ffprobePath,
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
  basePlan.deterministicFormatSelection.qualityRankDescending.map(
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

const fetchMediaWithRedirectEvidence = async (initialUrl, source) => {
  state.mediaAttempts += 1;
  const redirectEvidence = [];
  let currentUrl = initialUrl;
  for (let hopIndex = 0; ; hopIndex += 1) {
    state.mediaHttpRequestsIncludingRedirectHops += 1;
    let response;
    try {
      response = await fetch(currentUrl, {
        method: basePlan.publicRequestRoute.mediaDownload.method,
        credentials: "omit",
        redirect: "manual",
        headers: basePlan.publicRequestRoute.mediaDownload.headers
      });
    } catch (error) {
      const wrapped = new Error(`${source.debateNumber}: media fetch transport exception`);
      wrapped.cause = error;
      throw wrapped;
    }
    if (response.status >= 300 && response.status <= 399) {
      const location = response.headers.get("location");
      assertV4(location, `${source.debateNumber}: redirect omitted Location header`);
      assertV4(
        hopIndex < plan.redirectEvidenceCorrection.redirectHopsMaximumPerSourceAttempt,
        `${source.debateNumber}: redirect-hop ceiling exceeded`
      );
      const resolved = new URL(location, currentUrl);
      redirectEvidence.push({
        status: response.status,
        sourceUrlSha256: sha256(currentUrl),
        locationUrlSha256: sha256(resolved.href),
        locationOriginSha256: sha256(resolved.origin),
        hopIndex
      });
      state.redirectHopsFollowed += 1;
      currentUrl = resolved.href;
      continue;
    }
    assertV4(
      response.ok && response.body,
      `${source.debateNumber}: media download returned HTTP ${response.status}`
    );
    return { response, redirectEvidence };
  }
};

try {
  const config = basePlan.publicRequestRoute.configBootstrap;
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

  for (const source of basePlan.exactCohort.sources) {
    const player = basePlan.publicRequestRoute.playerMetadata;
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
    const { response: mediaResponse, redirectEvidence } =
      await fetchMediaWithRedirectEvidence(selected.url, source);
    if (source.debateNumber === "170") {
      assertV4(
        redirectEvidence.length >= 1,
        "Debate 170 did not produce the required redirect-rejection evidence"
      );
    }

    const extension = String(selected.mimeType).startsWith("audio/webm") ? "webm" : "m4a";
    const audioDirectory = path.resolve(repositoryRoot, path.dirname(source.finalSourcePath));
    await mkdir(audioDirectory, { recursive: true });
    const rawPath = path.join(audioDirectory, `source.recovery-9.direct.${extension}`);
    const normalizedPath = path.join(audioDirectory, "source.recovery-9.normalized.mp3");
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
    execFileSync(basePlan.mediaEncoding.ffmpegPath, [
      "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
      "-i", rawPath, "-vn", "-ac", String(basePlan.mediaEncoding.normalizedChannels),
      "-ar", String(basePlan.mediaEncoding.normalizedSampleRateHz), "-b:a",
      `${basePlan.mediaEncoding.normalizedBitrateKbps}k`, normalizedPath
    ]);
    const probe = probeAudio(normalizedPath);
    assertV4(
      Number.isFinite(probe.durationSeconds) &&
        probe.durationSeconds * 1000 >= source.maximumRequiredEndMs &&
        Math.abs(probe.durationSeconds - source.expectedDurationSeconds) <=
          basePlan.mediaEncoding.fullSourceDurationToleranceSeconds &&
        probe.channels === basePlan.mediaEncoding.normalizedChannels &&
        probe.sampleRateHz === basePlan.mediaEncoding.normalizedSampleRateHz,
      `${source.debateNumber}: normalized source validation failed`
    );
    await unlink(rawPath);
    temporaryPaths.delete(rawPath);
    temporaryNormalized.push({ source, normalizedPath, probe });
    requestAudit.push({
      debateNumber: source.debateNumber,
      videoId: source.sourceVideoId,
      playerMetadataAttempt: 1,
      mediaAttempt: 1,
      playerHttpStatus: playerResponse.status,
      finalMediaHttpStatus: mediaResponse.status,
      responseSha256: sha256(playerText),
      redirectRejectionProven: redirectEvidence.length > 0,
      redirectEvidence,
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
      acquisitionMode: item.source.mode,
      publicSourceAcquisitionAttempts: 1,
      publicSourceAttemptOutcome: "success",
      sourceAudio: item.source.finalSourcePath,
      sourceAudioSha256: sha256(await readFile(item.source.finalSourcePath)),
      durationSeconds: item.probe.durationSeconds,
      channels: item.probe.channels,
      sampleRateHz: item.probe.sampleRateHz,
      measuredBitRateBps: item.probe.measuredBitRateBps,
      normalizedBitrateKbps: basePlan.mediaEncoding.normalizedBitrateKbps
    });
  }

  for (const move of work.moves) {
    const source = sourceRecords.find((item) => item.videoId === move.sourceVideoId);
    assertV4(source, `${move.moveId}: prepared source missing`);
    const clipDirectory = path.resolve(
      repositoryRoot,
      path.dirname(source.sourceAudio).replace(/\/audio$/, "/clips")
    );
    await mkdir(clipDirectory, { recursive: true });
    const safeMoveId = move.moveId.replace(/[^A-Za-z0-9_-]+/g, "-");
    const clipPath = path.join(clipDirectory, `${safeMoveId}.mp3`);
    assertV4(!(await exists(clipPath)), `${move.moveId}: clip already exists`);
    const plannedDurationSeconds =
      (move.clipWindow.endMs - move.clipWindow.startMs) / 1000;
    execFileSync(basePlan.mediaEncoding.ffmpegPath, [
      "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
      "-ss", (move.clipWindow.startMs / 1000).toFixed(3),
      "-i", path.resolve(repositoryRoot, source.sourceAudio),
      "-t", plannedDurationSeconds.toFixed(3), "-vn", "-ac",
      String(basePlan.mediaEncoding.clipChannels), "-ar",
      String(basePlan.mediaEncoding.clipSampleRateHz), "-b:a",
      `${basePlan.mediaEncoding.clipBitrateKbps}k`, clipPath
    ]);
    const probe = probeAudio(clipPath);
    assertV4(
      Math.abs(probe.durationSeconds - plannedDurationSeconds) <=
          basePlan.mediaEncoding.clipDurationToleranceSeconds &&
        probe.channels === basePlan.mediaEncoding.clipChannels &&
        probe.sampleRateHz === basePlan.mediaEncoding.clipSampleRateHz,
      `${move.moveId}: clip validation failed`
    );
    clipRecords.push({
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
      durationSeconds: probe.durationSeconds,
      channels: probe.channels,
      sampleRateHz: probe.sampleRateHz,
      measuredBitRateBps: probe.measuredBitRateBps,
      targetBitrateKbps: basePlan.mediaEncoding.clipBitrateKbps,
      audioVerificationCompleted: false
    });
    state.clipsCreated += 1;
  }
  state.completeCohortValidated =
    sourceRecords.length === 3 && clipRecords.length === 4;
} catch (error) {
  failure = serializeError(error);
  for (const file of temporaryPaths) await removeIfPresent(file);
}

const debate170Audit = requestAudit.find((item) => item.debateNumber === "170");
const redirectRejectionProven = debate170Audit?.redirectRejectionProven === true;
const execution = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-09-redirect-evidence-recovery-9-execution",
  status: state.completeCohortValidated
    ? "completed-one-final-batch-09-debate-170-redirect-evidence-and-three-source-recovery"
    : "preserved-one-final-batch-09-redirect-evidence-recovery-failure",
  batchNumber: 9,
  planSha256: sha256(planBytes),
  activationSha256: sha256(activationBytes),
  state,
  requestAudit,
  failure
};
const analysis = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-09-redirect-evidence-recovery-9-analysis",
  status: state.completeCohortValidated
    ? "batch-09-redirect-rejection-proven-three-source-four-clip-preparation-passed"
    : "batch-09-final-redirect-evidence-recovery-failed-preserved",
  batchNumber: 9,
  result: {
    redirectRejectionProven,
    priorFailureCause:
      redirectRejectionProven
        ? "HTTP redirect rejected by the prior runner's redirect-error policy"
        : null,
    completeCohortValidated: state.completeCohortValidated,
    sourcesInstalled: state.sourcesInstalled,
    clipsCreated: state.clipsCreated,
    audioPlaybackObservedSeconds: 0,
    semanticAudioEvaluationPerformed: false
  },
  preservedControls: {
    sourceIdentityChanged: false,
    speakerIdentityChanged: false,
    clipWindowsChanged: false,
    judgmentsChanged: false,
    scoresChanged: false,
    productionChanged: false,
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
    : "stop-on-final-batch-09-debate-170-redirect-evidence-recovery-failure"
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
      attempt: 1,
      maximumAttempts: 1,
      redirectHops: item.redirectEvidence.length,
      outcome: "success"
    })),
    executionBoundary: {
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
      redirectRejectionProven,
      sourcesInstalled: state.sourcesInstalled,
      clipsCreated: state.clipsCreated,
      mediaAttempts: state.mediaAttempts,
      redirectHopsFollowed: state.redirectHopsFollowed,
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
