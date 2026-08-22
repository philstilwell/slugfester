#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  access,
  copyFile,
  mkdir,
  readFile,
  readdir,
  rename,
  stat,
  unlink,
  writeFile
} from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const repositoryRoot = process.cwd();
const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-05/disagreement-extraction";
const recoveryRoot = `${root}/audio-source-transport-recovery-1`;
const localRoot =
  "output/transcribe/assessment-production-post-canary-batch-05-audio-verification";
const workPreparationPath = `${root}/audio-work-item-preparation.json`;
const workPath = `${root}/audio-work-items.json`;
const planPath = `${recoveryRoot}/correction-plan.json`;
const activationPath = `${recoveryRoot}/execution-activation.json`;
const executionPath = `${recoveryRoot}/execution.json`;
const analysisPath = `${recoveryRoot}/analysis.json`;
const finalPreparationPath = `${root}/audio-source-preparation.json`;
const ffmpeg = "/opt/homebrew/bin/ffmpeg";
const ffprobe = "/opt/homebrew/bin/ffprobe";
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const firstLine = (value) => value.trim().split("\n")[0];

const [planBytes, activationBytes, workPreparationBytes, workBytes] =
  await Promise.all([
    readFile(planPath),
    readFile(activationPath),
    readFile(workPreparationPath),
    readFile(workPath)
  ]);
const plan = JSON.parse(planBytes);
const activation = JSON.parse(activationBytes);
const workPreparation = JSON.parse(workPreparationBytes);
const work = JSON.parse(workBytes);

assertV4(
  activation.status ===
      "active-for-exactly-one-batch-05-debate-189-public-source-transport-recovery" &&
    activation.plan.path === planPath &&
    activation.plan.sha256 === sha256(planBytes),
  "Batch 5 audio transport recovery activation authentication failed"
);
assertV4(
  plan.status ===
      "frozen-one-shot-batch-05-debate-189-public-source-transport-recovery-ready" &&
    plan.executionPolicy.attemptsMaximum === 1 &&
    plan.executionPolicy.debate189AdditionalDownloadAttemptsMaximum === 1 &&
    plan.executionPolicy.debate05DownloadAttemptsMaximum === 1 &&
    plan.executionPolicy.downloaderRetriesMaximum === 0 &&
    plan.executionPolicy.stopOnAnySourceOrValidationFailure,
  "Batch 5 audio transport recovery policy changed"
);
assertV4(
  !(await exists(executionPath)) &&
    !(await exists(analysisPath)) &&
    !(await exists(finalPreparationPath)),
  "Batch 5 audio transport recovery cannot be rerun"
);
for (const [file, digest] of Object.entries(plan.authenticatedInputs)) {
  assertV4(sha256(await readFile(file)) === digest, `authenticated input changed: ${file}`);
  assertV4(
    activation.authenticatedInputs[file] === digest,
    `activation input authentication changed: ${file}`
  );
}
for (const [file, digest] of Object.entries(plan.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `recovery source changed: ${file}`);
  assertV4(
    activation.sourceHashes[file] === digest,
    `activation source authentication changed: ${file}`
  );
}
assertV4(
  sha256(workPreparationBytes) === plan.authenticatedInputs[workPreparationPath] &&
    sha256(workBytes) === plan.authenticatedInputs[workPath] &&
    work.moves.length === 6,
  "Batch 5 frozen audio cohort changed"
);
assertV4(await exists(ffmpeg), "ffmpeg is unavailable");
assertV4(await exists(ffprobe), "ffprobe is unavailable");

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
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
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

const validateMediaHash = async (item) => {
  const [bytes, metadata] = await Promise.all([readFile(item.path), stat(item.path)]);
  assertV4(metadata.size === item.bytes, `${item.path}: protected byte size changed`);
  assertV4(sha256(bytes) === item.sha256, `${item.path}: protected hash changed`);
};

const removeIfPresent = async (file) => {
  if (await exists(file)) await unlink(file);
};

const removeDownloadResidue = async (directory, prefix) => {
  if (!(await exists(directory))) return;
  for (const entry of await readdir(directory)) {
    if (entry.startsWith(prefix)) await removeIfPresent(path.join(directory, entry));
  }
};

const normalizeDownloadedSource = async ({ downloadedPath, temporaryPath, minimumDurationMs }) => {
  execFileSync(
    ffmpeg,
    [
      "-nostdin",
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      downloadedPath,
      "-vn",
      "-ac",
      String(plan.mediaEncoding.normalizedChannels),
      "-ar",
      String(plan.mediaEncoding.normalizedSampleRateHz),
      "-b:a",
      `${plan.mediaEncoding.normalizedBitrateKbps}k`,
      temporaryPath
    ],
    { stdio: ["ignore", "pipe", "pipe"] }
  );
  const probe = probeAudio(temporaryPath);
  assertV4(
    Number.isFinite(probe.durationSeconds) &&
      probe.durationSeconds * 1000 >= minimumDurationMs &&
      probe.channels === plan.mediaEncoding.normalizedChannels &&
      probe.sampleRateHz === plan.mediaEncoding.normalizedSampleRateHz &&
      probe.measuredBitRateBps > 0,
    `${temporaryPath}: normalized source validation failed`
  );
  return probe;
};

const downloadOnce = async ({ route, debateNumber, downloadPrefix, stateField }) => {
  const finalSource = route.finalSourcePath;
  const audioDirectory = path.dirname(finalSource);
  await mkdir(audioDirectory, { recursive: true });
  await removeDownloadResidue(audioDirectory, downloadPrefix);
  await removeIfPresent(route.normalizedTemporaryPath);
  runState[stateField] += 1;
  execFileSync(
    "python3",
    [
      ...route.ytDlpArguments,
      "-o",
      route.downloadTemplate,
      route.videoUrl
    ],
    { stdio: "inherit" }
  );
  const downloaded = (await readdir(audioDirectory)).filter(
    (entry) => entry.startsWith(downloadPrefix) && !entry.endsWith(".part")
  );
  assertV4(
    downloaded.length === 1,
    `Debate ${debateNumber}: expected exactly one downloaded source file`
  );
  const downloadedPath = path.join(audioDirectory, downloaded[0]);
  const probe = await normalizeDownloadedSource({
    downloadedPath,
    temporaryPath: route.normalizedTemporaryPath,
    minimumDurationMs: route.minimumDurationMs
  });
  await removeIfPresent(downloadedPath);
  await rename(route.normalizedTemporaryPath, finalSource);
  const installedProbe = probeAudio(finalSource);
  assertV4(
    JSON.stringify(installedProbe) === JSON.stringify(probe),
    `Debate ${debateNumber}: installed source probe changed`
  );
  return installedProbe;
};

const createClip = async (move) => {
  const sourcePath = `${localRoot}/debate-${move.debateNumber}/audio/source.mp3`;
  const clipDirectory = `${localRoot}/debate-${move.debateNumber}/clips`;
  const safeMoveId = move.moveId.replace(/[^A-Za-z0-9_-]+/g, "-");
  const clipPath = `${clipDirectory}/${safeMoveId}.mp3`;
  assertV4(!(await exists(clipPath)), `${clipPath}: clip already exists`);
  await mkdir(clipDirectory, { recursive: true });
  const plannedDurationSeconds =
    (move.clipWindow.endMs - move.clipWindow.startMs) / 1000;
  execFileSync(
    ffmpeg,
    [
      "-nostdin",
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-ss",
      (move.clipWindow.startMs / 1000).toFixed(3),
      "-i",
      sourcePath,
      "-t",
      plannedDurationSeconds.toFixed(3),
      "-vn",
      "-ac",
      String(plan.mediaEncoding.clipChannels),
      "-ar",
      String(plan.mediaEncoding.clipSampleRateHz),
      "-b:a",
      `${plan.mediaEncoding.clipBitrateKbps}k`,
      clipPath
    ],
    { stdio: ["ignore", "pipe", "pipe"] }
  );
  const clipProbe = probeAudio(clipPath);
  assertV4(
    Math.abs(clipProbe.durationSeconds - plannedDurationSeconds) <=
      plan.mediaEncoding.clipDurationToleranceSeconds &&
      clipProbe.channels === plan.mediaEncoding.clipChannels &&
      clipProbe.sampleRateHz === plan.mediaEncoding.clipSampleRateHz &&
      clipProbe.measuredBitRateBps > 0,
    `${move.moveId}: clip validation failed`
  );
  return { clipPath, plannedDurationSeconds, clipProbe };
};

const runState = {
  attempts: 1,
  debate189AdditionalDownloadCliInvocations: 0,
  debate189DownloadSucceeded: false,
  debate189NormalizedSourceInstalled: false,
  debate05DownloadCliInvocations: 0,
  debate05DownloadSucceeded: false,
  debate05NormalizedSourceInstalled: false,
  remainingClipsCreated: 0,
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

const writeFailure = async (error) => {
  const failure = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-05-audio-source-transport-recovery-execution",
    status: "failed-one-shot-batch-05-audio-source-transport-recovery-stop-required",
    batchNumber: 5,
    planSha256: sha256(planBytes),
    activationSha256: sha256(activationBytes),
    state: structuredClone(runState),
    failure: {
      category: "source-or-validation-failure-during-authorized-transport-recovery",
      message: error instanceof Error ? error.message : String(error),
      stopRequired: true,
      furtherSourceAttemptsAuthorized: false
    },
    protectedEvidencePreserved: true,
    directIncrementalCostUsd: 0
  };
  await writeFile(executionPath, `${JSON.stringify(failure, null, 2)}\n`);
};

try {
  for (const item of plan.protectedMedia) await validateMediaHash(item);

  const invalidSource = plan.debate189Recovery.invalidSourcePath;
  const preservedInvalid = plan.debate189Recovery.preservedInvalidEvidencePath;
  assertV4(!(await exists(preservedInvalid)), "Debate 189 invalid evidence copy already exists");
  await copyFile(invalidSource, preservedInvalid);
  await validateMediaHash({
    path: preservedInvalid,
    bytes: plan.protectedMedia.at(-1).bytes,
    sha256: plan.protectedMedia.at(-1).sha256
  });

  const debate189Probe = await downloadOnce({
    route: plan.debate189Recovery,
    debateNumber: "189",
    downloadPrefix: "source.recovery-1.download.",
    stateField: "debate189AdditionalDownloadCliInvocations"
  });
  runState.debate189DownloadSucceeded = true;
  runState.debate189NormalizedSourceInstalled = true;

  assertV4(
    !(await exists(plan.debate05OriginalRoute.finalSourcePath)),
    "Debate 05 source is no longer unattempted"
  );
  const debate05Probe = await downloadOnce({
    route: plan.debate05OriginalRoute,
    debateNumber: "05",
    downloadPrefix: "source.download.",
    stateField: "debate05DownloadCliInvocations"
  });
  runState.debate05DownloadSucceeded = true;
  runState.debate05NormalizedSourceInstalled = true;

  for (const move of work.moves.filter((move) => ["189", "05"].includes(move.debateNumber))) {
    await createClip(move);
    runState.remainingClipsCreated += 1;
  }
  assertV4(runState.remainingClipsCreated === 3, "remaining clip count changed");

  for (const item of plan.protectedMedia.slice(0, 4)) await validateMediaHash(item);
  await validateMediaHash({
    path: preservedInvalid,
    bytes: plan.protectedMedia.at(-1).bytes,
    sha256: plan.protectedMedia.at(-1).sha256
  });

  const toolVersions = {
    ffmpeg: firstLine(execFileSync(ffmpeg, ["-version"], { encoding: "utf8" })),
    ffprobe: firstLine(execFileSync(ffprobe, ["-version"], { encoding: "utf8" })),
    ytDlp: execFileSync("python3", ["-m", "yt_dlp", "--version"], {
      encoding: "utf8"
    }).trim()
  };
  const sourcePolicies = {
    "158": {
      acquisitionMode: "downloaded-public-source-before-preserved-failure",
      attempts: 1,
      outcome: "success-before-preserved-failure"
    },
    "189": {
      acquisitionMode: "downloaded-public-source-bounded-transport-recovery",
      attempts: 2,
      outcome: "success-after-one-authorized-transport-recovery"
    },
    "05": {
      acquisitionMode: "downloaded-public-source-original-controls",
      attempts: 1,
      outcome: "success"
    }
  };
  const sources = [];
  for (const { debateNumber, sourceVideoId } of plan.exactCohort.sources) {
    const sourceAudio = `${localRoot}/debate-${debateNumber}/audio/source.mp3`;
    const sourceProbe = probeAudio(sourceAudio);
    const minimumEndMs = Math.max(
      ...work.moves
        .filter((move) => move.debateNumber === debateNumber)
        .map((move) => move.clipWindow.endMs)
    );
    assertV4(
      sourceProbe.durationSeconds * 1000 >= minimumEndMs &&
        sourceProbe.channels === plan.mediaEncoding.normalizedChannels &&
        sourceProbe.sampleRateHz === plan.mediaEncoding.normalizedSampleRateHz,
      `Debate ${debateNumber}: final source cohort validation failed`
    );
    sources.push({
      debateNumber,
      videoId: sourceVideoId,
      acquisitionMode: sourcePolicies[debateNumber].acquisitionMode,
      publicSourceAcquisitionAttempts: sourcePolicies[debateNumber].attempts,
      publicSourceAttemptOutcome: sourcePolicies[debateNumber].outcome,
      sourceAudio,
      sourceAudioSha256: sha256(await readFile(sourceAudio)),
      durationSeconds: sourceProbe.durationSeconds,
      channels: sourceProbe.channels,
      sampleRateHz: sourceProbe.sampleRateHz,
      measuredBitRateBps: sourceProbe.measuredBitRateBps,
      normalizedBitrateKbps: plan.mediaEncoding.normalizedBitrateKbps
    });
  }

  const clips = [];
  for (const move of work.moves) {
    const clipPath = `${localRoot}/debate-${move.debateNumber}/clips/${move.moveId}.mp3`;
    const clipProbe = probeAudio(clipPath);
    const plannedDurationSeconds =
      (move.clipWindow.endMs - move.clipWindow.startMs) / 1000;
    assertV4(
      Math.abs(clipProbe.durationSeconds - plannedDurationSeconds) <=
        plan.mediaEncoding.clipDurationToleranceSeconds &&
        clipProbe.channels === plan.mediaEncoding.clipChannels &&
        clipProbe.sampleRateHz === plan.mediaEncoding.clipSampleRateHz,
      `${move.moveId}: final clip cohort validation failed`
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
      clipPath,
      clipSha256: sha256(await readFile(clipPath)),
      plannedDurationSeconds,
      durationSeconds: clipProbe.durationSeconds,
      channels: clipProbe.channels,
      sampleRateHz: clipProbe.sampleRateHz,
      measuredBitRateBps: clipProbe.measuredBitRateBps,
      targetBitrateKbps: plan.mediaEncoding.clipBitrateKbps,
      audioVerificationCompleted: false
    });
  }
  assertV4(sources.length === 3 && clips.length === 6, "complete audio cohort changed");

  const inputHashes = {
    ...plan.authenticatedInputs,
    [planPath]: sha256(planBytes),
    [activationPath]: sha256(activationBytes),
    ...plan.sourceHashes
  };
  const currentCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim();
  const publicSourceAttemptAudit = plan.exactCohort.sources.map(
    ({ debateNumber, sourceVideoId }) => ({
      debateNumber,
      videoId: sourceVideoId,
      attempts: sourcePolicies[debateNumber].attempts,
      ordinaryAttemptsMaximum: 1,
      authorizedTransportRecoveryAttempts:
        debateNumber === "189" ? 1 : 0,
      totalAttemptsMaximum: debateNumber === "189" ? 2 : 1,
      outcome: sourcePolicies[debateNumber].outcome
    })
  );
  const preparation = {
    schemaVersion:
      "1.1-assessment-production-post-canary-batch-05-audio-source-preparation-transport-recovery",
    protocolId: work.protocolId,
    status:
      "prepared-six-post-canary-batch-05-local-audio-clips-standing-authorization-active-for-audio-verification-preparation",
    productionCanary: false,
    batchNumber: 5,
    stagingOnly: true,
    developmentValidationOnly: false,
    checkpointCommit: currentCommit,
    userAuthorization: {
      instruction: plan.userAuthorization.instruction,
      standingAuthorization:
        "docs/assessment-production/post-canary-continuation-v1/batch-05/standing-authorization.json",
      standingAuthorizationSha256:
        plan.authenticatedInputs[
          "docs/assessment-production/post-canary-continuation-v1/batch-05/standing-authorization.json"
        ],
      directIncrementalCostUsdMaximum: 0,
      sourceAudioFilesAuthorized: 3,
      clipsAuthorized: 6,
      debate189AdditionalPublicSourceAttemptsAuthorized: 1,
      debate05OriginalPublicSourceAttemptsAuthorized: 1,
      audioPlaybackAuthorized: false,
      semanticAudioEvaluationAuthorized: false,
      modelExecutionAuthorized: false,
      paidServicesAuthorizedThisStage: false,
      transcriptionAuthorizedThisStage: false
    },
    inputHashes,
    workItemSourceHashesReplayed: Object.keys(workPreparation.sourceHashes).length,
    recovery: {
      plan: { path: planPath, sha256: sha256(planBytes) },
      activation: { path: activationPath, sha256: sha256(activationBytes) },
      diagnosedInvalidSource: {
        originalPath: plan.debate189Recovery.invalidSourcePath,
        preservedEvidencePath: preservedInvalid,
        bytes: plan.protectedMedia.at(-1).bytes,
        sha256: plan.protectedMedia.at(-1).sha256
      },
      debate158ProtectedHashesPreserved: 4,
      debate189AdditionalAttempts: 1,
      debate05OriginalAttempts: 1,
      ordinaryRetries: 0,
      reruns: 0
    },
    acquisitionPolicy: {
      reuseValidatedLocalSourceBeforeDownload: true,
      ordinaryPublicSourceAttemptsPerMissingVideoMaximum: 1,
      debate189AuthorizedTransportRecoveryAttemptsMaximum: 1,
      completeCohortPublicSourceAttemptsMaximum: 4,
      ytDlpRetryControls: {
        retries: 0,
        fragmentRetries: 0,
        extractorRetries: 0,
        fileAccessRetries: 0
      },
      debate189RecoveryFormat: "bestaudio[ext=webm]/bestaudio",
      debate189RecoveryClients: "android_vr,web_safari",
      debate05OriginalFormat: "bestaudio/best",
      debate05OriginalClients: "android,web",
      normalizedChannels: plan.mediaEncoding.normalizedChannels,
      normalizedSampleRateHz: plan.mediaEncoding.normalizedSampleRateHz,
      normalizedBitrateKbps: plan.mediaEncoding.normalizedBitrateKbps,
      clipBitrateKbps: plan.mediaEncoding.clipBitrateKbps,
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
      sources: 3,
      sourceDownloads: 3,
      existingNormalizedSources: 0,
      sourceAcquisitionAttempts: 4,
      clips: 6,
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
      "prepare-freeze-validate-and-push-batch-05-audio-verification-manifest-and-cost-estimate-under-standing-authorization"
  };
  const preparationBytes = Buffer.from(`${JSON.stringify(preparation, null, 2)}\n`);
  await writeFile(finalPreparationPath, preparationBytes);

  runState.completeCohortValidated = true;
  const execution = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-05-audio-source-transport-recovery-execution",
    status: "completed-one-shot-batch-05-audio-source-transport-recovery",
    batchNumber: 5,
    planSha256: sha256(planBytes),
    activationSha256: sha256(activationBytes),
    checkpointCommit: currentCommit,
    state: structuredClone(runState),
    preservedEvidence: {
      invalidDebate189Source: {
        path: preservedInvalid,
        bytes: plan.protectedMedia.at(-1).bytes,
        sha256: plan.protectedMedia.at(-1).sha256
      },
      debate158Files: plan.protectedMedia.slice(0, 4)
    },
    outputs: {
      audioSourcePreparation: {
        path: finalPreparationPath,
        sha256: sha256(preparationBytes)
      },
      sources: sources.map(({ debateNumber, sourceAudio, sourceAudioSha256 }) => ({
        debateNumber,
        path: sourceAudio,
        sha256: sourceAudioSha256
      })),
      clips: clips.map(({ debateNumber, moveId, clipPath, clipSha256 }) => ({
        debateNumber,
        moveId,
        path: clipPath,
        sha256: clipSha256
      }))
    },
    directIncrementalCostUsd: 0,
    nextAuthorizedAction: preparation.nextAuthorizedAction
  };
  const executionBytes = Buffer.from(`${JSON.stringify(execution, null, 2)}\n`);
  await writeFile(executionPath, executionBytes);
  const analysis = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-05-audio-source-transport-recovery-analysis",
    status: "accepted-complete-three-source-six-clip-batch-05-audio-cohort",
    batchNumber: 5,
    execution: { path: executionPath, sha256: sha256(executionBytes) },
    result: {
      debate158ProtectedFilesPreserved: 4,
      debate189InvalidFilePreserved: true,
      debate189AdditionalPublicSourceAttempts: 1,
      debate189SourceValidated: debate189Probe.durationSeconds * 1000 >= 3233430,
      debate05OriginalPublicSourceAttempts: 1,
      debate05SourceValidated: debate05Probe.durationSeconds * 1000 >= 4338820,
      sourcesValidated: 3,
      clipsValidated: 6,
      remainingClipsCreated: 3,
      retries: 0,
      reruns: 0,
      audioPlaybackCalls: 0,
      semanticAudioEvaluations: 0,
      modelContexts: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0
    },
    standingAuthorizationResumed: true,
    nextAuthorizedAction: preparation.nextAuthorizedAction
  };
  await writeFile(analysisPath, `${JSON.stringify(analysis, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        status: execution.status,
        sources: 3,
        clips: 6,
        debate189AdditionalDownloadCliInvocations: 1,
        debate05DownloadCliInvocations: 1,
        retries: 0,
        modelContexts: 0,
        paidServiceCalls: 0,
        directIncrementalCostUsd: 0,
        nextAuthorizedAction: execution.nextAuthorizedAction
      },
      null,
      2
    )
  );
} catch (error) {
  await writeFailure(error);
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
}
