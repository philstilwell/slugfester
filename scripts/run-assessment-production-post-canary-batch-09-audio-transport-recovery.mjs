#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  access,
  mkdir,
  readFile,
  readdir,
  rename,
  unlink,
  writeFile
} from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldExecute = process.argv.includes("--execute");
const repositoryRoot = process.cwd();
const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction";
const recoveryRoot = `${root}/audio-source-transport-recovery-1`;
const planPath = `${recoveryRoot}/correction-plan.json`;
const activationPath = `${recoveryRoot}/execution-activation.json`;
const executionPath = `${recoveryRoot}/execution.json`;
const preparationPath = `${root}/audio-source-preparation.json`;
const workPreparationPath = `${root}/audio-work-item-preparation.json`;
const workPath = `${root}/audio-work-items.json`;
const standingPath =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/standing-authorization.json";
const localRoot =
  "output/transcribe/assessment-production-post-canary-batch-09-audio-verification";
const ffmpeg = "/opt/homebrew/bin/ffmpeg";
const ffprobe = "/opt/homebrew/bin/ffprobe";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

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
  plan.status ===
    "frozen-one-shot-batch-09-debate-170-public-source-transport-recovery-ready",
  "frozen Batch 9 audio recovery plan changed"
);
assertV4(
  activation.status ===
      "active-for-exactly-one-batch-09-debate-170-public-source-transport-recovery" &&
    activation.plan.sha256 === sha256(planBytes),
  "Batch 9 audio recovery is not activated"
);
for (const [file, digest] of Object.entries(plan.authenticatedInputs)) {
  assertV4(sha256(await readFile(file)) === digest, `input hash changed: ${file}`);
}
for (const [file, digest] of Object.entries(plan.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `source hash changed: ${file}`);
}
assertV4(
  sha256(await readFile(plan.protectedInvalidEvidence.path)) ===
    plan.protectedInvalidEvidence.sha256,
  "Debate 170 invalid source evidence changed"
);
assertV4(!(await exists(executionPath)), "audio recovery execution already exists");
assertV4(!(await exists(preparationPath)), "audio-source preparation already exists");

if (!shouldExecute) {
  console.log(
    JSON.stringify(
      {
        status: "passed-activated-batch-09-audio-transport-recovery-preflight",
        sources: plan.exactCohort.sourceCount,
        clips: plan.exactCohort.clipCount,
        additionalDebate170DownloadAttempts: 1,
        unattemptedOriginalDownloadAttempts: 2,
        retries: 0,
        audioPlaybackCalls: 0,
        paidServiceCalls: 0,
        directIncrementalCostUsd: 0
      },
      null,
      2
    )
  );
  process.exit(0);
}

const state = {
  attempts: 1,
  debate170AdditionalDownloadCliInvocations: 0,
  debate19DownloadCliInvocations: 0,
  debate183DownloadCliInvocations: 0,
  sourcesInstalled: 0,
  clipsCreated: 0,
  completeCohortValidated: false,
  failedPartialOutputsReused: 0,
  retries: 0,
  reruns: 0,
  automaticRepairs: 0,
  timeoutExtensions: 0,
  audioPlaybackCalls: 0,
  semanticAudioEvaluations: 0,
  modelContexts: 0,
  transcriptionCalls: 0,
  paidServiceCalls: 0,
  scoresDerived: 0,
  directIncrementalCostUsd: 0
};

const probeAudio = (file) => {
  const probed = JSON.parse(
    execFileSync(
      ffprobe,
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

const normalize = (input, output) => {
  execFileSync(ffmpeg, [
    "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
    "-i", input, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "48k", output
  ]);
};

const sourceRecords = [];
const clipRecords = [];
const publicSourceAttemptAudit = [];

const installSource = async (source) => {
  const debateNumber = source.debateNumber;
  const audioDirectory = path.resolve(
    repositoryRoot,
    localRoot,
    `debate-${debateNumber}`,
    "audio"
  );
  const clipDirectory = path.resolve(
    repositoryRoot,
    localRoot,
    `debate-${debateNumber}`,
    "clips"
  );
  await mkdir(audioDirectory, { recursive: true });
  await mkdir(clipDirectory, { recursive: true });
  const finalSourcePath = path.join(audioDirectory, "source.mp3");
  let downloadTemplate;
  let normalizedTemporaryPath;
  let downloadArgs;
  let acquisitionMode;

  if (source.mode === "recover-once") {
    assertV4(
      source.sourceVideoId === "HoTILnpd3q8" &&
        !(await exists(plan.protectedInvalidEvidence.preservedPath)),
      "Debate 170 recovery preimage changed"
    );
    await rename(
      plan.protectedInvalidEvidence.path,
      plan.protectedInvalidEvidence.preservedPath
    );
    downloadTemplate = path.resolve(repositoryRoot, plan.debate170Recovery.downloadTemplate);
    normalizedTemporaryPath = path.resolve(
      repositoryRoot,
      plan.debate170Recovery.normalizedTemporaryPath
    );
    downloadArgs = [
      ...plan.debate170Recovery.ytDlpArguments,
      "-o", downloadTemplate,
      plan.debate170Recovery.videoUrl
    ];
    state.debate170AdditionalDownloadCliInvocations += 1;
    acquisitionMode = "recovered-public-source-hls-transport";
  } else {
    assertV4(!(await exists(finalSourcePath)), `${debateNumber}: source already exists`);
    downloadTemplate = path.join(audioDirectory, "source.download.%(ext)s");
    normalizedTemporaryPath = path.join(
      audioDirectory,
      "source.original-attempt.normalized.mp3"
    );
    downloadArgs = [
      "-m", "yt_dlp", "--no-playlist", "--quiet", "--no-warnings",
      "--retries", "0", "--fragment-retries", "0", "--extractor-retries", "0",
      "--file-access-retries", "0", "--extractor-args",
      "youtube:player_client=android,web", "-f", "bestaudio/best",
      "-o", downloadTemplate,
      `https://www.youtube.com/watch?v=${source.sourceVideoId}`
    ];
    if (debateNumber === "19") state.debate19DownloadCliInvocations += 1;
    if (debateNumber === "183") state.debate183DownloadCliInvocations += 1;
    acquisitionMode = "downloaded-public-source-original-route";
  }

  execFileSync("python3", downloadArgs, { stdio: "inherit" });
  const prefix = path.basename(downloadTemplate).split("%(")[0];
  const downloaded = (await readdir(audioDirectory)).filter(
    (name) => name.startsWith(prefix) && !name.endsWith(".part")
  );
  assertV4(downloaded.length === 1, `${debateNumber}: expected one download`);
  const downloadedPath = path.join(audioDirectory, downloaded[0]);
  normalize(downloadedPath, normalizedTemporaryPath);
  const sourceProbe = probeAudio(normalizedTemporaryPath);
  assertV4(
    Number.isFinite(sourceProbe.durationSeconds) &&
      sourceProbe.durationSeconds * 1000 >= source.maximumRequiredEndMs &&
      sourceProbe.channels === 1 &&
      sourceProbe.sampleRateHz === 16000,
    `${debateNumber}: normalized source validation failed`
  );
  await rename(normalizedTemporaryPath, finalSourcePath);
  await unlink(downloadedPath);
  state.sourcesInstalled += 1;
  publicSourceAttemptAudit.push({
    debateNumber,
    videoId: source.sourceVideoId,
    attempt: 1,
    maximumAttempts: 1,
    outcome: "success"
  });
  sourceRecords.push({
    debateNumber,
    videoId: source.sourceVideoId,
    acquisitionMode,
    publicSourceAcquisitionAttempts: 1,
    publicSourceAttemptOutcome: "success",
    sourceAudio: path.relative(repositoryRoot, finalSourcePath),
    sourceAudioSha256: sha256(await readFile(finalSourcePath)),
    durationSeconds: sourceProbe.durationSeconds,
    channels: sourceProbe.channels,
    sampleRateHz: sourceProbe.sampleRateHz,
    measuredBitRateBps: sourceProbe.measuredBitRateBps,
    normalizedBitrateKbps: 48
  });
};

let executionFailure = null;
try {
  for (const source of plan.exactCohort.sources) await installSource(source);

  for (const move of work.moves) {
    const source = sourceRecords.find(
      (item) => item.videoId === move.sourceVideoId
    );
    assertV4(source, `${move.moveId}: prepared source missing`);
    const clipDirectory = path.resolve(
      repositoryRoot,
      localRoot,
      `debate-${move.debateNumber}`,
      "clips"
    );
    const safeMoveId = move.moveId.replace(/[^A-Za-z0-9_-]+/g, "-");
    const clipPath = path.join(clipDirectory, `${safeMoveId}.mp3`);
    const plannedDurationSeconds =
      (move.clipWindow.endMs - move.clipWindow.startMs) / 1000;
    execFileSync(ffmpeg, [
      "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
      "-ss", (move.clipWindow.startMs / 1000).toFixed(3),
      "-i", path.resolve(repositoryRoot, source.sourceAudio),
      "-t", plannedDurationSeconds.toFixed(3), "-vn", "-ac", "1",
      "-ar", "16000", "-b:a", "64k", clipPath
    ]);
    const clipProbe = probeAudio(clipPath);
    assertV4(
      Math.abs(clipProbe.durationSeconds - plannedDurationSeconds) <= 0.25 &&
        clipProbe.channels === 1 && clipProbe.sampleRateHz === 16000,
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
      durationSeconds: clipProbe.durationSeconds,
      channels: clipProbe.channels,
      sampleRateHz: clipProbe.sampleRateHz,
      measuredBitRateBps: clipProbe.measuredBitRateBps,
      targetBitrateKbps: 64,
      audioVerificationCompleted: false
    });
    state.clipsCreated += 1;
  }

  const inputHashes = {
    [standingPath]: sha256(await readFile(standingPath)),
    [workPreparationPath]: sha256(workPreparationBytes),
    [workPath]: sha256(workBytes),
    [planPath]: sha256(planBytes),
    [activationPath]: sha256(activationBytes),
    ...plan.sourceHashes
  };
  const firstLine = (value) => value.trim().split("\n")[0];
  const preparation = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-09-audio-source-preparation",
    protocolId: work.protocolId,
    status:
      "prepared-four-post-canary-batch-09-local-audio-clips-standing-authorization-active-for-audio-verification-preparation",
    productionCanary: false,
    batchNumber: 5,
    stagingOnly: true,
    developmentValidationOnly: false,
    checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8"
    }).trim(),
    userAuthorization: {
      instruction: work.userAuthorization.instruction,
      standingAuthorizationPath: standingPath,
      standingAuthorizationSha256: sha256(await readFile(standingPath)),
      directIncrementalCostUsdMaximum: 0,
      conditionalPaidAudioMaximumUsd: 1,
      sourceAudioFilesAuthorized: 3,
      clipsAuthorized: 4,
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
    },
    inputHashes,
    workItemSourceHashesReplayed: Object.keys(workPreparation.sourceHashes).length,
    recovery: {
      planPath,
      planSha256: sha256(planBytes),
      activationPath,
      activationSha256: sha256(activationBytes),
      preservedInvalidEvidence: plan.protectedInvalidEvidence,
      failedPartialOutputsReused: 0
    },
    acquisitionPolicy: {
      reuseValidatedLocalSourceBeforeDownload: true,
      onePublicSourceAttemptPerMissingVideo: true,
      maximumPublicSourceAttempts: 1,
      ytDlpRetryControls: {
        retries: 0, fragmentRetries: 0, extractorRetries: 0, fileAccessRetries: 0
      },
      acquisitionFormat: "bestaudio/best-or-frozen-hls-recovery",
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
    toolVersions: {
      ffmpeg: firstLine(execFileSync(ffmpeg, ["-version"], { encoding: "utf8" })),
      ffprobe: firstLine(execFileSync(ffprobe, ["-version"], { encoding: "utf8" })),
      ytDlp: execFileSync("python3", ["-m", "yt_dlp", "--version"], {
        encoding: "utf8"
      }).trim()
    },
    sources: sourceRecords,
    clips: clipRecords,
    totals: {
      sources: 3,
      sourceDownloads: 3,
      existingNormalizedSources: 0,
      sourceAcquisitionAttempts: 3,
      clips: 4,
      clipMinutes: Number(
        (clipRecords.reduce((sum, clip) => sum + clip.durationSeconds, 0) / 60)
          .toFixed(4)
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
      "prepare-freeze-validate-and-push-batch-09-audio-verification-manifest-and-cost-estimate-under-standing-authorization"
  };
  await writeFile(preparationPath, `${JSON.stringify(preparation, null, 2)}\n`);
  state.completeCohortValidated = true;
} catch (error) {
  executionFailure = {
    category: "source-or-validation-failure-during-authorized-transport-recovery",
    message: error.message,
    stopRequired: true,
    furtherOrdinaryAttemptsAuthorized: false
  };
}

const execution = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-09-audio-source-transport-recovery-execution",
  status: executionFailure
    ? "failed-one-shot-batch-09-audio-source-transport-recovery-stop-required"
    : "completed-one-shot-batch-09-audio-source-transport-recovery-and-cohort",
  batchNumber: 9,
  planSha256: sha256(planBytes),
  activationSha256: sha256(activationBytes),
  state,
  failure: executionFailure,
  protectedEvidencePreserved:
    await exists(plan.protectedInvalidEvidence.preservedPath),
  directIncrementalCostUsd: 0
};
await writeFile(executionPath, `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify(execution, null, 2));
if (executionFailure) process.exitCode = 1;
