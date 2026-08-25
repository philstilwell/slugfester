#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  access,
  mkdir,
  open,
  readFile,
  rename,
  stat,
  unlink,
  writeFile
} from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldExecute = process.argv.includes("--execute");
const repositoryRoot = process.cwd();
const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-10/disagreement-extraction";
const recoveryRoot = `${root}/audio-source-redirect-range-recovery-4`;
const planPath = `${recoveryRoot}/correction-plan.json`;
const activationPath = `${recoveryRoot}/execution-activation.json`;
const executionPath = `${recoveryRoot}/execution.json`;
const preparationPath = `${root}/audio-source-preparation.json`;
const workPreparationPath = `${root}/audio-work-item-preparation.json`;
const workPath = `${root}/audio-work-items.json`;
const standingPath =
  "docs/assessment-production/post-canary-continuation-v1/batch-10/standing-authorization.json";
const localRoot =
  "output/transcribe/assessment-production-post-canary-batch-10-audio-verification";
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
    "frozen-one-shot-batch-10-three-source-format139-one-redirect-per-range-recovery-ready",
  "frozen Batch 10 audio recovery plan changed"
);
assertV4(
  activation.status ===
      "active-for-exactly-one-batch-10-three-source-format139-one-redirect-per-range-recovery" &&
    activation.plan.sha256 === sha256(planBytes),
  "Batch 10 audio recovery is not activated"
);
for (const [file, digest] of Object.entries(plan.authenticatedInputs)) {
  assertV4(sha256(await readFile(file)) === digest, `input hash changed: ${file}`);
}
for (const [file, digest] of Object.entries(plan.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `source hash changed: ${file}`);
}
for (const evidence of plan.protectedInvalidEvidence) {
  assertV4(
    sha256(await readFile(evidence.path)) === evidence.sha256,
    `${evidence.path}: protected invalid evidence changed`
  );
}
assertV4(!(await exists(executionPath)), "audio recovery execution already exists");
assertV4(!(await exists(preparationPath)), "audio-source preparation already exists");

if (!shouldExecute) {
  console.log(
    JSON.stringify(
      {
        status: "passed-activated-batch-10-audio-source-redirect-range-recovery-4-preflight",
        sources: plan.exactCohort.sourceCount,
        clips: plan.exactCohort.clipCount,
        redirectRangeSources: plan.redirectRangeSources.length,
        directUrlResolutionInvocationsMaximum: 3,
        rangeHttpGetInvocationsMaximum: plan.executionPolicy.rangeHttpGetInvocationsMaximum,
        publicSourceDownloadsMaximum: 3,
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
  directUrlResolutionCliInvocations: 0,
  rangeHttpGetInvocations: 0,
  redirectsFollowed: 0,
  repeatedByteRanges: 0,
  publicSourceDownloads: 0,
  localNormalizations: 0,
  acceptedExistingSourcesRevalidated: 0,
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

const normalize = (input, output, timeout = undefined) => {
  execFileSync(ffmpeg, [
    "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
    "-i", input, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "48k", output
  ], { timeout });
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
  let normalizedTemporaryPath;
  let acquisitionMode;

  if (source.mode === "accepted-prefix-source") {
    const accepted = plan.acceptedPrefixSources.find(
      (item) => item.sourceVideoId === source.sourceVideoId
    );
    const sourceBytes = await readFile(finalSourcePath);
    const sourceProbe = probeAudio(finalSourcePath);
    assertV4(
      accepted &&
        accepted.path === path.relative(repositoryRoot, finalSourcePath) &&
        accepted.bytes === sourceBytes.length &&
        accepted.sha256 === sha256(sourceBytes) &&
        Number.isFinite(sourceProbe.durationSeconds) &&
        sourceProbe.durationSeconds * 1000 >= source.maximumRequiredEndMs &&
        sourceProbe.channels === 1 &&
        sourceProbe.sampleRateHz === 16000,
      `${debateNumber}: accepted prefix source validation failed`
    );
    state.acceptedExistingSourcesRevalidated += 1;
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
      acquisitionMode: "downloaded-public-source-original-route-accepted-prefix",
      publicSourceAcquisitionAttempts: 1,
      publicSourceAttemptOutcome: "success",
      sourceAudio: path.relative(repositoryRoot, finalSourcePath),
      sourceAudioSha256: sha256(sourceBytes),
      durationSeconds: sourceProbe.durationSeconds,
      channels: sourceProbe.channels,
      sampleRateHz: sourceProbe.sampleRateHz,
      measuredBitRateBps: sourceProbe.measuredBitRateBps,
      normalizedBitrateKbps: 48
    });
    return;
  }

  const rangeSource = plan.redirectRangeSources.find(
    (item) => item.sourceVideoId === source.sourceVideoId
  );
  assertV4(
    source.mode === "range-verified-format139-once" && rangeSource,
    `${debateNumber}: range-verified format-139 source plan is missing`
  );
  assertV4(!(await exists(finalSourcePath)), `${debateNumber}: source already exists`);
  normalizedTemporaryPath = path.join(
    audioDirectory,
    "source.redirect-range4-format139.normalized.mp3"
  );
  const rawSourcePath = path.join(
    audioDirectory,
    "source.redirect-range4-format139.m4a"
  );
  assertV4(
    !(await exists(rawSourcePath)),
    `${debateNumber}: range-transfer evidence already exists`
  );
  state.directUrlResolutionCliInvocations += 1;
  const directUrl = execFileSync(
    "python3",
    [
      "-m", "yt_dlp", "--no-playlist", "--quiet", "--no-warnings",
      "--retries", "0", "--fragment-retries", "0", "--extractor-retries", "0",
      "--file-access-retries", "0", "-f", rangeSource.formatId,
      "-g", rangeSource.videoUrl
    ],
    { encoding: "utf8" }
  ).trim();
  assertV4(
    directUrl.startsWith("https://") && !directUrl.includes("\n"),
    `${debateNumber}: direct format-139 URL resolution failed`
  );
  state.publicSourceDownloads += 1;
  const rangeRecords = [];
  const seenRangeKeys = new Set();
  const rawHandle = await open(rawSourcePath, "wx");
  try {
    for (
      let rangeStart = 0, index = 0;
      rangeStart < rangeSource.declaredBytes;
      rangeStart += rangeSource.rangeChunkBytes, index += 1
    ) {
      const rangeEnd = Math.min(
        rangeStart + rangeSource.rangeChunkBytes - 1,
        rangeSource.declaredBytes - 1
      );
      const rangeKey = `${rangeStart}-${rangeEnd}`;
      assertV4(!seenRangeKeys.has(rangeKey), `${debateNumber}: repeated byte range`);
      seenRangeKeys.add(rangeKey);
      const partPath = path.join(
        audioDirectory,
        `source.redirect-range4-format139.part-${String(index).padStart(3, "0")}.m4a`
      );
      const headersPath = path.join(
        audioDirectory,
        `source.redirect-range4-format139.part-${String(index).padStart(3, "0")}.headers.txt`
      );
      assertV4(
        !(await exists(partPath)) && !(await exists(headersPath)),
        `${debateNumber}: range ${index} evidence already exists`
      );
      state.rangeHttpGetInvocations += 1;
      execFileSync(
        "/usr/bin/curl",
        [
          "--fail-with-body", "--silent", "--show-error", "--retry", "0",
          "--location", "--max-redirs", "1",
          "--proto", "=https", "--proto-redir", "=https",
          "--max-time", String(Math.floor(rangeSource.rangeHttpGetTimeoutMs / 1000)),
          "--range", `${rangeStart}-${rangeEnd}`,
          "--dump-header", headersPath,
          "--output", partPath,
          directUrl
        ],
        { timeout: rangeSource.rangeHttpGetTimeoutMs }
      );
      const partBytes = await readFile(partPath);
      const responseHeaders = await readFile(headersPath, "utf8");
      const redirectCount = (
        responseHeaders.match(/HTTP\/(?:1\.[01]|2) 302/gi) ?? []
      ).length;
      const partialContentCount = (
        responseHeaders.match(/HTTP\/(?:1\.[01]|2) 206/gi) ?? []
      ).length;
      assertV4(
        partBytes.length === rangeEnd - rangeStart + 1 &&
          redirectCount === 1 &&
          partialContentCount === 1 &&
          responseHeaders.toLowerCase().includes(
            `content-range: bytes ${rangeStart}-${rangeEnd}/${rangeSource.declaredBytes}`
          ),
        `${debateNumber}: range ${index} byte or response-header validation failed`
      );
      state.redirectsFollowed += redirectCount;
      await rawHandle.write(partBytes);
      rangeRecords.push({
        index,
        start: rangeStart,
        end: rangeEnd,
        bytes: partBytes.length,
        redirectCount,
        sha256: sha256(partBytes),
        responseHeaders: path.relative(repositoryRoot, headersPath),
        responseHeadersSha256: sha256(responseHeaders)
      });
      await unlink(partPath);
    }
  } finally {
    await rawHandle.close();
  }
  const rawStat = await stat(rawSourcePath);
  const rawBytes = await readFile(rawSourcePath);
  assertV4(
    rawStat.size === rangeSource.declaredBytes &&
      rangeRecords.length === rangeSource.rangeHttpGetInvocationsMaximum &&
      seenRangeKeys.size === rangeSource.rangeHttpGetInvocationsMaximum,
    `${debateNumber}: assembled range source validation failed`
  );
  const rawProbe = probeAudio(rawSourcePath);
  assertV4(
    Number.isFinite(rawProbe.durationSeconds) &&
      rawProbe.durationSeconds * 1000 >= source.maximumRequiredEndMs,
    `${debateNumber}: downloaded format-139 source validation failed`
  );
  state.localNormalizations += 1;
  normalize(rawSourcePath, normalizedTemporaryPath);
  const sourceProbe = probeAudio(normalizedTemporaryPath);
  assertV4(
    Number.isFinite(sourceProbe.durationSeconds) &&
      sourceProbe.durationSeconds * 1000 >= source.maximumRequiredEndMs &&
      sourceProbe.channels === 1 &&
      sourceProbe.sampleRateHz === 16000,
    `${debateNumber}: normalized source validation failed`
  );
  await rename(normalizedTemporaryPath, finalSourcePath);
  acquisitionMode =
    "downloaded-public-source-format139-range-verified-one-redirect-per-range";
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
    sourceFormatId: rangeSource.formatId,
    declaredSourceBytes: rangeSource.declaredBytes,
    downloadedSourceBytes: rawStat.size,
    downloadedSource: path.relative(repositoryRoot, rawSourcePath),
    downloadedSourceSha256: sha256(rawBytes),
    rangeChunkBytes: rangeSource.rangeChunkBytes,
    rangeRequests: rangeRecords,
    downloadedDurationSeconds: rawProbe.durationSeconds,
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
      "1.0-assessment-production-post-canary-batch-10-audio-source-preparation",
    protocolId: work.protocolId,
    status:
      "prepared-nine-post-canary-batch-10-local-audio-clips-standing-authorization-active-for-audio-verification-preparation",
    productionCanary: false,
    batchNumber: 10,
    stagingOnly: true,
    developmentValidationOnly: false,
    checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8"
    }).trim(),
    userAuthorization: {
      instruction: plan.userAuthorization.instruction,
      standingAuthorizationPath: standingPath,
      standingAuthorizationSha256: sha256(await readFile(standingPath)),
      directIncrementalCostUsdMaximum: 0,
      conditionalPaidAudioMaximumUsd: 1,
      sequentialTranscriptionEstimateUsd: 0.1308768,
      sourceAudioFilesAuthorized: 5,
      clipsAuthorized: 9,
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
      failedPartialOutputsReused: 0,
      acceptedPrefixOutputsRevalidated: 2,
      additionalUserAuthorizedRecoveryUsed: true,
      redirectRangeFormat139Downloads: 3,
      redirectsFollowed: 15,
      repeatedByteRanges: 0
    },
    acquisitionPolicy: {
      reuseValidatedLocalSourceBeforeDownload: true,
      onePublicSourceAttemptPerMissingVideo: true,
      maximumPublicSourceAttempts: 1,
      ytDlpRetryControls: {
        retries: 0, fragmentRetries: 0, extractorRetries: 0, fileAccessRetries: 0
      },
      acquisitionFormat:
        "frozen-youtube-audio-only-format139-range-verified-one-https-redirect-per-range",
      exactDeclaredByteCountRequired: true,
      http206AndContentRangeRequired: true,
      redirectsPerRangeRequired: 1,
      repeatedByteRangesMaximum: 0,
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
      }).trim(),
      curl: execFileSync("/usr/bin/curl", ["--version"], {
        encoding: "utf8"
      }).trim().split("\n")[0]
    },
    sources: sourceRecords,
    clips: clipRecords,
    totals: {
      sources: 5,
      sourceDownloads: 5,
      existingNormalizedSources: 0,
      sourceAcquisitionAttempts: 5,
      clips: 9,
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
      "prepare-freeze-validate-and-push-batch-10-audio-verification-manifest-and-cost-estimate-under-standing-authorization"
  };
  await writeFile(preparationPath, `${JSON.stringify(preparation, null, 2)}\n`);
  state.completeCohortValidated = true;
} catch (error) {
  executionFailure = {
    category: "source-or-validation-failure-during-authorized-redirect-range-recovery-4",
    message: error.message,
    stopRequired: true,
    furtherOrdinaryAttemptsAuthorized: false
  };
}

const execution = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-10-audio-source-redirect-range-recovery-4-execution",
  status: executionFailure
    ? "failed-one-shot-batch-10-audio-source-redirect-range-recovery-4-stop-required"
    : "completed-one-shot-batch-10-audio-source-redirect-range-recovery-4-and-cohort",
  batchNumber: 10,
  planSha256: sha256(planBytes),
  activationSha256: sha256(activationBytes),
  state,
  failure: executionFailure,
  protectedEvidencePreserved: (
    await Promise.all(plan.protectedInvalidEvidence.map((item) => exists(item.path)))
  ).every(Boolean),
  directIncrementalCostUsd: 0
};
await writeFile(executionPath, `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify(execution, null, 2));
if (executionFailure) process.exitCode = 1;
