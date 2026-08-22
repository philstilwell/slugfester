#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const root = "docs/assessment-production/post-canary-continuation-v1/batch-05/disagreement-extraction";
const recoveryRoot = `${root}/audio-source-transport-recovery-3`;
const localRoot = "output/transcribe/assessment-production-post-canary-batch-05-audio-verification";
const workPreparationPath = `${root}/audio-work-item-preparation.json`;
const workPath = `${root}/audio-work-items.json`;
const discoveryPath = `${recoveryRoot}/route-discovery.json`;
const diagnosisPath = `${recoveryRoot}/failure-diagnosis.json`;
const planPath = `${recoveryRoot}/correction-plan.json`;
const activationPath = `${recoveryRoot}/execution-activation.json`;
const executionPath = `${recoveryRoot}/execution.json`;
const analysisPath = `${recoveryRoot}/analysis.json`;
const preparationPath = `${root}/audio-source-preparation.json`;
const ffmpeg = "/opt/homebrew/bin/ffmpeg";
const ffprobe = "/opt/homebrew/bin/ffprobe";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const firstLine = (value) => value.trim().split("\n")[0];

const [discoveryBytes, diagnosisBytes, planBytes, activationBytes, workPreparationBytes, workBytes] =
  await Promise.all([
    readFile(discoveryPath), readFile(diagnosisPath), readFile(planPath), readFile(activationPath),
    readFile(workPreparationPath), readFile(workPath)
  ]);
const plan = JSON.parse(planBytes);
const activation = JSON.parse(activationBytes);
const workPreparation = JSON.parse(workPreparationBytes);
const work = JSON.parse(workBytes);

assertV4(
  plan.status === "frozen-one-shot-official-broadcaster-batch-05-debate-189-audio-recovery-ready" &&
    activation.status === "active-for-exactly-one-official-broadcaster-debate-189-download-and-cohort-completion" &&
    activation.plan.sha256 === sha256(planBytes) &&
    plan.routeDiscovery.sha256 === sha256(discoveryBytes) &&
    plan.diagnosis.sha256 === sha256(diagnosisBytes),
  "recovery-3 authentication failed"
);
assertV4(
  plan.executionPolicy.attemptsMaximum === 1 &&
    plan.executionPolicy.debate189DownloadAttemptsMaximum === 1 &&
    plan.executionPolicy.debate05DownloadAttemptsMaximum === 1 &&
    plan.executionPolicy.downloaderRetriesMaximum === 0 &&
    plan.executionPolicy.privateCookieReadsMaximum === 0 &&
    plan.executionPolicy.failedPartialOutputReuseMaximum === 0 &&
    plan.executionPolicy.stopOnAnySourceOrValidationFailure,
  "recovery-3 execution policy changed"
);
assertV4(
  !(await exists(executionPath)) && !(await exists(analysisPath)) && !(await exists(preparationPath)),
  "recovery-3 cannot be rerun"
);
for (const [file, digest] of Object.entries(plan.authenticatedInputs)) {
  assertV4(sha256(await readFile(file)) === digest, `authenticated input changed: ${file}`);
}
for (const [file, digest] of Object.entries(plan.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `recovery source changed: ${file}`);
}
assertV4(sha256(workPreparationBytes) === plan.authenticatedInputs[workPreparationPath]);
assertV4(sha256(workBytes) === plan.authenticatedInputs[workPath] && work.moves.length === 6);
assertV4(await exists(ffmpeg) && await exists(ffprobe), "FFmpeg tools unavailable");

const probe = (file) => {
  const data = JSON.parse(execFileSync(ffprobe, [
    "-v", "error", "-select_streams", "a:0",
    "-show_entries", "format=duration,bit_rate:stream=channels,sample_rate,bit_rate",
    "-of", "json", file
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  const stream = data.streams?.[0] ?? {};
  return {
    durationSeconds: Number(data.format?.duration),
    channels: Number(stream.channels),
    sampleRateHz: Number(stream.sample_rate),
    measuredBitRateBps: Number(stream.bit_rate ?? data.format?.bit_rate)
  };
};
const validateHash = async (item) => {
  const [bytes, metadata] = await Promise.all([readFile(item.path), stat(item.path)]);
  assertV4(metadata.size === item.bytes && sha256(bytes) === item.sha256, `${item.path}: protected evidence changed`);
};
const normalize = async ({ input, temporary, minimumMs, durationRange }) => {
  assertV4(!(await exists(temporary)), `${temporary}: already exists`);
  const inputProbe = probe(input);
  assertV4(
    Number.isFinite(inputProbe.durationSeconds) && inputProbe.durationSeconds * 1000 >= minimumMs,
    `${input}: source is too short`
  );
  if (durationRange) {
    assertV4(
      inputProbe.durationSeconds >= durationRange.minimum && inputProbe.durationSeconds <= durationRange.maximum,
      `${input}: official episode duration changed`
    );
  }
  execFileSync(ffmpeg, [
    "-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-i", input, "-vn",
    "-ac", String(plan.mediaEncoding.normalizedChannels),
    "-ar", String(plan.mediaEncoding.normalizedSampleRateHz),
    "-b:a", `${plan.mediaEncoding.normalizedBitrateKbps}k`, temporary
  ], { stdio: ["ignore", "pipe", "pipe"] });
  const normalized = probe(temporary);
  assertV4(
    normalized.durationSeconds * 1000 >= minimumMs &&
      normalized.channels === plan.mediaEncoding.normalizedChannels &&
      normalized.sampleRateHz === plan.mediaEncoding.normalizedSampleRateHz &&
      normalized.measuredBitRateBps > 0,
    `${temporary}: normalization failed`
  );
  return { inputProbe, normalized };
};
const createClip = async (move) => {
  const source = `${localRoot}/debate-${move.debateNumber}/audio/source.mp3`;
  const directory = `${localRoot}/debate-${move.debateNumber}/clips`;
  const output = `${directory}/${move.moveId}.mp3`;
  assertV4(!(await exists(output)), `${output}: already exists`);
  await mkdir(directory, { recursive: true });
  const seconds = (move.clipWindow.endMs - move.clipWindow.startMs) / 1000;
  execFileSync(ffmpeg, [
    "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
    "-ss", (move.clipWindow.startMs / 1000).toFixed(3), "-i", source,
    "-t", seconds.toFixed(3), "-vn", "-ac", String(plan.mediaEncoding.clipChannels),
    "-ar", String(plan.mediaEncoding.clipSampleRateHz),
    "-b:a", `${plan.mediaEncoding.clipBitrateKbps}k`, output
  ], { stdio: ["ignore", "pipe", "pipe"] });
  const measured = probe(output);
  assertV4(
    Math.abs(measured.durationSeconds - seconds) <= plan.mediaEncoding.clipDurationToleranceSeconds &&
      measured.channels === plan.mediaEncoding.clipChannels &&
      measured.sampleRateHz === plan.mediaEncoding.clipSampleRateHz &&
      measured.measuredBitRateBps > 0,
    `${move.moveId}: clip validation failed`
  );
};

const state = {
  attempts: 1,
  debate189OfficialDownloadCliInvocations: 0,
  debate189DownloadSucceeded: false,
  debate189NormalizedSourceInstalled: false,
  debate05DownloadCliInvocations: 0,
  debate05DownloadSucceeded: false,
  debate05NormalizedSourceInstalled: false,
  remainingClipsCreated: 0,
  completeCohortValidated: false,
  failedPartialOutputsReused: 0,
  retries: 0,
  reruns: 0,
  automaticRepairs: 0,
  timeoutExtensions: 0,
  privateCookieReads: 0,
  audioPlaybackCalls: 0,
  semanticAudioEvaluations: 0,
  modelContexts: 0,
  transcriptionCalls: 0,
  paidServiceCalls: 0,
  scoresDerived: 0,
  directIncrementalCostUsd: 0
};
const writeFailure = async (error) => {
  await writeFile(executionPath, `${JSON.stringify({
    schemaVersion: "1.0-assessment-production-post-canary-batch-05-audio-source-transport-recovery-3-execution",
    status: "failed-one-shot-official-broadcaster-recovery-3-stop-required",
    batchNumber: 5,
    routeDiscoverySha256: sha256(discoveryBytes),
    diagnosisSha256: sha256(diagnosisBytes),
    planSha256: sha256(planBytes),
    activationSha256: sha256(activationBytes),
    state: structuredClone(state),
    failure: {
      category: "source-or-validation-failure-during-authorized-recovery-3",
      message: error instanceof Error ? error.message : String(error),
      stopRequired: true,
      furtherSourceAttemptsAuthorized: false
    },
    directIncrementalCostUsd: 0
  }, null, 2)}\n`);
};

try {
  for (const item of plan.protectedMedia) await validateHash(item);

  const official = plan.debate189Recovery;
  assertV4(!(await exists(official.downloadPath)), "official download output already exists");
  state.debate189OfficialDownloadCliInvocations += 1;
  execFileSync("curl", official.curlArguments, { stdio: ["ignore", "pipe", "pipe"] });
  const downloadedStat = await stat(official.downloadPath);
  assertV4(downloadedStat.size === official.expectedDownloadedBytes, "official MP3 byte length changed");
  const officialResult = await normalize({
    input: official.downloadPath,
    temporary: official.normalizedTemporaryPath,
    minimumMs: official.minimumRequiredEndMs,
    durationRange: official.acceptableDurationSeconds
  });
  await unlink(official.downloadPath);
  await rename(official.normalizedTemporaryPath, official.finalSourcePath);
  state.debate189DownloadSucceeded = true;
  state.debate189NormalizedSourceInstalled = true;

  const route05 = plan.debate05OriginalRoute;
  assertV4(!(await exists(route05.finalSourcePath)), "Debate 05 source is no longer unattempted");
  const directory05 = path.dirname(route05.finalSourcePath);
  await mkdir(directory05, { recursive: true });
  assertV4((await readdir(directory05)).every((name) => !name.startsWith("source.download.")), "Debate 05 residue exists");
  state.debate05DownloadCliInvocations += 1;
  execFileSync("python3", [...route05.ytDlpArguments, "-o", route05.downloadTemplate, route05.videoUrl], {
    stdio: "inherit"
  });
  const downloaded05 = (await readdir(directory05)).filter(
    (name) => name.startsWith("source.download.") && !name.endsWith(".part") && !name.includes(".part-Frag")
  );
  assertV4(downloaded05.length === 1, "Debate 05 expected one downloaded source");
  const path05 = path.join(directory05, downloaded05[0]);
  const result05 = await normalize({ input: path05, temporary: route05.normalizedTemporaryPath, minimumMs: route05.minimumDurationMs });
  await unlink(path05);
  await rename(route05.normalizedTemporaryPath, route05.finalSourcePath);
  state.debate05DownloadSucceeded = true;
  state.debate05NormalizedSourceInstalled = true;

  for (const move of work.moves.filter((move) => ["189", "05"].includes(move.debateNumber))) {
    await createClip(move);
    state.remainingClipsCreated += 1;
  }
  assertV4(state.remainingClipsCreated === 3, "remaining clip count changed");
  for (const item of plan.protectedMedia.slice(0, 4)) await validateHash(item);
  await validateHash(plan.protectedMedia.at(-1));

  const sourcePolicy = {
    "158": ["downloaded-public-source-before-preserved-failures", 1, "success-before-preserved-failures"],
    "189": ["official-broadcaster-same-episode-mp3-after-three-recoveries", 4, "success-via-official-broadcaster-route"],
    "05": ["downloaded-public-source-original-controls", 1, "success"]
  };
  const sources = [];
  for (const { debateNumber, sourceVideoId } of plan.exactCohort.sources) {
    const sourceAudio = `${localRoot}/debate-${debateNumber}/audio/source.mp3`;
    const measured = probe(sourceAudio);
    const requiredEndMs = Math.max(...work.moves.filter((move) => move.debateNumber === debateNumber).map((move) => move.clipWindow.endMs));
    assertV4(
      measured.durationSeconds * 1000 >= requiredEndMs && measured.channels === 1 && measured.sampleRateHz === 16000,
      `Debate ${debateNumber}: source cohort validation failed`
    );
    const [acquisitionMode, attempts, outcome] = sourcePolicy[debateNumber];
    sources.push({
      debateNumber, videoId: sourceVideoId, acquisitionMode,
      publicSourceAcquisitionAttempts: attempts, publicSourceAttemptOutcome: outcome,
      alternateAudioDeliverySource: debateNumber === "189" ? plan.debate189Recovery.officialEpisodePage : null,
      sourceAudio, sourceAudioSha256: sha256(await readFile(sourceAudio)),
      ...measured, normalizedBitrateKbps: plan.mediaEncoding.normalizedBitrateKbps
    });
  }
  const clips = [];
  for (const move of work.moves) {
    const clipPath = `${localRoot}/debate-${move.debateNumber}/clips/${move.moveId}.mp3`;
    const measured = probe(clipPath);
    const plannedDurationSeconds = (move.clipWindow.endMs - move.clipWindow.startMs) / 1000;
    assertV4(
      Math.abs(measured.durationSeconds - plannedDurationSeconds) <= plan.mediaEncoding.clipDurationToleranceSeconds &&
        measured.channels === 1 && measured.sampleRateHz === 16000,
      `${move.moveId}: clip cohort validation failed`
    );
    clips.push({
      debateNumber: move.debateNumber, debateId: move.debateId, sourceVideoId: move.sourceVideoId,
      moveId: move.moveId, expectedSpeaker: move.expectedSpeaker, proposition: move.proposition,
      verificationExcerpt: move.verificationExcerpt, sourceSpan: move.sourceSpan,
      clipWindow: move.clipWindow, trigger: move.trigger, clipPath,
      clipSha256: sha256(await readFile(clipPath)), plannedDurationSeconds,
      ...measured, targetBitrateKbps: plan.mediaEncoding.clipBitrateKbps,
      audioVerificationCompleted: false
    });
  }
  assertV4(sources.length === 3 && clips.length === 6, "complete cohort changed");

  const inputHashes = {
    ...plan.authenticatedInputs,
    [discoveryPath]: sha256(discoveryBytes), [diagnosisPath]: sha256(diagnosisBytes),
    [planPath]: sha256(planBytes), [activationPath]: sha256(activationBytes), ...plan.sourceHashes
  };
  const audit = plan.exactCohort.sources.map(({ debateNumber, sourceVideoId }) => ({
    debateNumber, videoId: sourceVideoId, attempts: sourcePolicy[debateNumber][1],
    ordinaryAttemptsMaximum: 1, authorizedTransportRecoveryAttempts: debateNumber === "189" ? 3 : 0,
    totalAttemptsMaximum: debateNumber === "189" ? 4 : 1, outcome: sourcePolicy[debateNumber][2]
  }));
  const checkpointCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const preparation = {
    schemaVersion: "1.3-assessment-production-post-canary-batch-05-audio-source-preparation-transport-recovery-3",
    protocolId: work.protocolId,
    status: "prepared-six-post-canary-batch-05-local-audio-clips-standing-authorization-active-for-audio-verification-preparation",
    productionCanary: false, batchNumber: 5, stagingOnly: true, developmentValidationOnly: false,
    checkpointCommit,
    userAuthorization: {
      instruction: plan.userAuthorization.instruction,
      standingAuthorization: "docs/assessment-production/post-canary-continuation-v1/batch-05/standing-authorization.json",
      directIncrementalCostUsdMaximum: 0, sourceAudioFilesAuthorized: 3, clipsAuthorized: 6,
      debate189PublicSourceAttemptsAuthorized: 1, debate05OriginalPublicSourceAttemptsAuthorized: 1,
      privateCookiesAuthorized: false, audioPlaybackAuthorized: false,
      semanticAudioEvaluationAuthorized: false, modelExecutionAuthorized: false,
      paidServicesAuthorizedThisStage: false, transcriptionAuthorizedThisStage: false
    },
    inputHashes,
    workItemSourceHashesReplayed: Object.keys(workPreparation.sourceHashes).length,
    recovery: {
      routeDiscovery: { path: discoveryPath, sha256: sha256(discoveryBytes) },
      diagnosis: { path: diagnosisPath, sha256: sha256(diagnosisBytes) },
      plan: { path: planPath, sha256: sha256(planBytes) },
      activation: { path: activationPath, sha256: sha256(activationBytes) },
      canonicalSourceVideoIdPreserved: "3DHvNRK452c",
      alternateAudioDeliverySource: plan.debate189Recovery.officialEpisodePage,
      debate158ProtectedHashesPreserved: 4,
      debate189TransportRecoveryAttempts: 3,
      debate189OfficialBroadcasterAttempts: 1,
      debate05OriginalAttempts: 1,
      failedPartialOutputsReused: 0,
      privateCookieReads: 0, ordinaryRetries: 0, reruns: 0
    },
    acquisitionPolicy: {
      reuseValidatedLocalSourceBeforeDownload: true,
      ordinaryPublicSourceAttemptsPerMissingVideoMaximum: 1,
      debate189AuthorizedTransportRecoveryAttemptsMaximum: 3,
      completeCohortPublicSourceAttemptsMaximum: 6,
      officialBroadcasterSameEpisodeDeliveryPermittedForDebate189: true,
      canonicalEvidenceSourceVideoIdChanged: false,
      officialDownloadExpectedBytes: plan.debate189Recovery.expectedDownloadedBytes,
      ytDlpRetryControls: { retries: 0, fragmentRetries: 0, extractorRetries: 0, fileAccessRetries: 0 },
      debate05OriginalFormat: "bestaudio/best", debate05OriginalClients: "android,web",
      normalizedChannels: 1, normalizedSampleRateHz: 16000,
      normalizedBitrateKbps: 48, clipBitrateKbps: 64,
      privateCookies: false, paidServices: false, transcription: false
    },
    publicSourceAttemptAudit: audit,
    executionBoundary: {
      audioAccessLimitedToProgrammaticEncodingProbeAndHashing: true,
      audioPlaybackCalls: 0, semanticAudioEvaluations: 0, transcriptionCalls: 0,
      modelOrApiCalls: 0, paidServiceCalls: 0, privateCookieReads: 0
    },
    toolVersions: {
      ffmpeg: firstLine(execFileSync(ffmpeg, ["-version"], { encoding: "utf8" })),
      ffprobe: firstLine(execFileSync(ffprobe, ["-version"], { encoding: "utf8" })),
      curl: firstLine(execFileSync("curl", ["--version"], { encoding: "utf8" })),
      ytDlp: execFileSync("python3", ["-m", "yt_dlp", "--version"], { encoding: "utf8" }).trim()
    },
    sources, clips,
    totals: {
      sources: 3, sourceDownloads: 3, existingNormalizedSources: 0,
      sourceAcquisitionAttempts: 6, clips: 6,
      clipMinutes: Number((clips.reduce((sum, clip) => sum + clip.durationSeconds, 0) / 60).toFixed(4)),
      paidTranscriptionCalls: 0, transcriptionCostUsd: 0,
      audioVerificationCalls: 0, audioVerificationCompleted: 0,
      modelContexts: 0, meteredModelApiCostUsd: 0, directIncrementalCostUsd: 0,
      audioFilesPlayed: 0, semanticAudioEvaluations: 0, retries: 0,
      timeoutExtensions: 0, scoresDerived: 0, productionMutations: 0, nextBatchSelections: 0
    },
    activePolicy: structuredClone(workPreparation.activePolicy),
    validatedInventoryContract: structuredClone(workPreparation.validatedInventoryContract),
    authorization: {
      audioVerificationManifestPreparation: true, audioVerificationCostEstimation: true,
      paidTranscriptionExecution: false, audioVerificationExecution: false,
      adjudicationPacketPreparation: false, adjudicationModelExecution: false,
      finalLedgerAssembly: false, scoreDerivation: false, policyPromotion: false,
      publicationFinalization: false, productionMutation: false, nextBatchSelection: false
    },
    nextAuthorizedAction: "prepare-freeze-validate-and-push-batch-05-audio-verification-manifest-and-cost-estimate-under-standing-authorization"
  };
  const preparationBytes = Buffer.from(`${JSON.stringify(preparation, null, 2)}\n`);
  await writeFile(preparationPath, preparationBytes);
  state.completeCohortValidated = true;
  const execution = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-05-audio-source-transport-recovery-3-execution",
    status: "completed-one-shot-official-broadcaster-recovery-3-and-audio-cohort",
    batchNumber: 5,
    routeDiscoverySha256: sha256(discoveryBytes), diagnosisSha256: sha256(diagnosisBytes),
    planSha256: sha256(planBytes), activationSha256: sha256(activationBytes), checkpointCommit,
    state: structuredClone(state),
    sourceValidation: {
      officialDownloadedBytes: plan.debate189Recovery.expectedDownloadedBytes,
      officialInputDurationSeconds: officialResult.inputProbe.durationSeconds,
      debate189NormalizedDurationSeconds: officialResult.normalized.durationSeconds,
      debate05DownloadedDurationSeconds: result05.inputProbe.durationSeconds,
      debate05NormalizedDurationSeconds: result05.normalized.durationSeconds
    },
    outputs: {
      audioSourcePreparation: { path: preparationPath, sha256: sha256(preparationBytes) },
      sources: sources.map(({ debateNumber, sourceAudio, sourceAudioSha256 }) => ({ debateNumber, path: sourceAudio, sha256: sourceAudioSha256 })),
      clips: clips.map(({ debateNumber, moveId, clipPath, clipSha256 }) => ({ debateNumber, moveId, path: clipPath, sha256: clipSha256 }))
    },
    directIncrementalCostUsd: 0,
    nextAuthorizedAction: preparation.nextAuthorizedAction
  };
  const executionBytes = Buffer.from(`${JSON.stringify(execution, null, 2)}\n`);
  await writeFile(executionPath, executionBytes);
  const analysis = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-05-audio-source-transport-recovery-3-analysis",
    status: "accepted-complete-three-source-six-clip-cohort-after-official-broadcaster-recovery",
    batchNumber: 5,
    execution: { path: executionPath, sha256: sha256(executionBytes) },
    result: {
      officialBroadcasterRouteValidated: true, canonicalSourceVideoIdPreserved: true,
      debate158ProtectedFilesPreserved: 4, debate189InvalidFilePreserved: true,
      debate189PublicSourceAttempts: 1, debate05PublicSourceAttempts: 1,
      sourcesValidated: 3, clipsValidated: 6, remainingClipsCreated: 3,
      failedPartialOutputsReused: 0, privateCookieReads: 0, retries: 0, reruns: 0,
      audioPlaybackCalls: 0, semanticAudioEvaluations: 0,
      modelContexts: 0, paidServiceCalls: 0, directIncrementalCostUsd: 0
    },
    standingAuthorizationResumed: true,
    nextAuthorizedAction: preparation.nextAuthorizedAction
  };
  await writeFile(analysisPath, `${JSON.stringify(analysis, null, 2)}\n`);
  console.log(JSON.stringify({
    status: execution.status, sources: 3, clips: 6,
    debate189OfficialDownloadCliInvocations: 1, debate05DownloadCliInvocations: 1,
    privateCookieReads: 0, retries: 0, modelContexts: 0,
    paidServiceCalls: 0, directIncrementalCostUsd: 0,
    nextAuthorizedAction: execution.nextAuthorizedAction
  }, null, 2));
} catch (error) {
  await writeFailure(error);
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
}
