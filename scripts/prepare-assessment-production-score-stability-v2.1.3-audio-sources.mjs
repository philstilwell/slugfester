#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  access,
  mkdir,
  readFile,
  readdir,
  unlink,
  writeFile
} from "node:fs/promises";
import path from "node:path";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const repositoryRoot = process.cwd();
const planRoot =
  "docs/assessment-production/score-stability-v2.1.3-validation-cohort/disagreement-extraction";
const localRoot =
  "output/transcribe/assessment-production-score-stability-v2.1.3-audio-verification";
const workPreparationPath = `${planRoot}/audio-work-item-preparation.json`;
const workPath = `${planRoot}/audio-work-items.json`;
const preparationPath = `${planRoot}/audio-source-preparation.json`;
const ffmpeg = "/opt/homebrew/bin/ffmpeg";
const ffprobe = "/opt/homebrew/bin/ffprobe";
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
const firstLine = (value) => value.trim().split("\n")[0];

const [workPreparationBytes, workBytes] = await Promise.all([
  readFile(workPreparationPath),
  readFile(workPath)
]);
const workPreparation = JSON.parse(workPreparationBytes);
const work = JSON.parse(workBytes);

assertV4(
  workPreparation.status ===
    "prepared-and-frozen-five-v2.1.3-local-audio-source-work-items" &&
    workPreparation.authorization.localAudioSourcePreparation &&
    workPreparation.nextAuthorizedAction ===
      "prepare-five-v2.1.3-local-audio-sources-and-clips-model-free-only",
  "v2.1.3 local audio-source preparation is not authorized"
);
assertV4(
  work.status === "prepared-five-v2.1.3-local-audio-source-work-items" &&
    work.moves.length === 5 &&
    work.authorization.localAudioSourcePreparation,
  "v2.1.3 audio work-item population changed"
);
assertV4(
  sha256(workBytes) === workPreparation.workArtifact.sha256,
  "v2.1.3 audio work-item hash changed"
);
for (const [file, digest] of Object.entries(workPreparation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
}
assertV4(await exists(ffmpeg), "ffmpeg is unavailable");
assertV4(await exists(ffprobe), "ffprobe is unavailable");

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

if (shouldWrite) {
  assertV4(
    !(await exists(preparationPath)),
    `${preparationPath} already exists; the frozen preparation cannot be overwritten`
  );
}

const grouped = Map.groupBy(work.moves, (move) => move.sourceVideoId);
assertV4(grouped.size === 3, "expected exactly three v2.1.3 audio sources");
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
        status: "preview-three-v2.1.3-local-audio-sources-five-clips",
        wroteArtifacts: false,
        sources: plannedSources,
        clips: work.moves.map((move) => ({
          debateNumber: move.debateNumber,
          sourceVideoId: move.sourceVideoId,
          moveId: move.moveId,
          clipWindow: move.clipWindow
        })),
        acquisitionPolicy: {
          onePublicSourceAttemptPerMissingVideo: true,
          acquisitionFormat: "bestaudio/best",
          normalizeMonoHz: 16000,
          normalizeBitrateKbps: 48,
          clipBitrateKbps: 64,
          paidServices: false,
          transcription: false
        },
        toolVersions,
        estimatedExternalCostUsd: 0,
        mediaFilesAccessed: 0,
        nextAction: "freeze-tooling-before-media-access"
      },
      null,
      2
    )
  );
  process.exit(0);
}

const sources = [];
const clips = [];
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
  if (!(await exists(sourceAudio))) {
    const outputTemplate = path.join(audioDirectory, "source.download.%(ext)s");
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    try {
      execFileSync(
        "python3",
        [
          "-m",
          "yt_dlp",
          "--no-playlist",
          "--quiet",
          "--no-warnings",
          "--extractor-args",
          "youtube:player_client=android,web",
          "-f",
          "bestaudio/best",
          "-o",
          outputTemplate,
          videoUrl
        ],
        { stdio: "inherit" }
      );
    } catch (error) {
      for (const name of (await readdir(audioDirectory)).filter((item) =>
        item.startsWith("source.download.")
      )) {
        await unlink(path.join(audioDirectory, name));
      }
      throw new Error(
        `${videoId}: the single authorized public-source acquisition attempt failed`,
        { cause: error }
      );
    }
    const downloaded = (await readdir(audioDirectory)).filter(
      (name) => name.startsWith("source.download.") && !name.endsWith(".part")
    );
    assertV4(
      downloaded.length === 1,
      `${videoId}: expected one downloaded media file`
    );
    const downloadedPath = path.join(audioDirectory, downloaded[0]);
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
    sourceDownloads += 1;
  } else {
    existingNormalizedSources += 1;
  }

  const sourceDurationSeconds = Number(
    execFileSync(
      ffprobe,
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "csv=p=0",
        sourceAudio
      ],
      { encoding: "utf8" }
    ).trim()
  );
  assertV4(
    Number.isFinite(sourceDurationSeconds) &&
      sourceDurationSeconds * 1000 >=
        Math.max(...moves.map((move) => move.clipWindow.endMs)),
    `${videoId}: normalized source audio is too short`
  );
  sources.push({
    debateNumber,
    videoId,
    acquisitionMode,
    acquisitionAttempts: acquisitionMode === "downloaded-public-source" ? 1 : 0,
    sourceAudio: path.relative(repositoryRoot, sourceAudio),
    sourceAudioSha256: sha256(await readFile(sourceAudio)),
    durationSeconds: sourceDurationSeconds,
    normalizedChannels: 1,
    normalizedSampleRateHz: 16000,
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
    const actualDurationSeconds = Number(
      execFileSync(
        ffprobe,
        [
          "-v",
          "error",
          "-show_entries",
          "format=duration",
          "-of",
          "csv=p=0",
          clipPath
        ],
        { encoding: "utf8" }
      ).trim()
    );
    assertV4(
      Math.abs(actualDurationSeconds - plannedDurationSeconds) <= 0.25,
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
      audioVerificationCompleted: false
    });
  }
}

const preparation = {
  schemaVersion: "1.0-score-stability-v2.1.3-audio-source-preparation",
  protocolId: work.protocolId,
  status: "prepared-five-v2.1.3-local-audio-clips",
  productionCanary: false,
  stagingOnly: true,
  developmentValidationOnly: true,
  inputHashes: {
    [workPreparationPath]: sha256(workPreparationBytes),
    [workPath]: sha256(workBytes)
  },
  workItemSourceHashesReplayed: Object.keys(workPreparation.sourceHashes).length,
  acquisitionPolicy: {
    onePublicSourceAttemptPerMissingVideo: true,
    acquisitionFormat: "bestaudio/best",
    normalizedChannels: 1,
    normalizedSampleRateHz: 16000,
    normalizedBitrateKbps: 48,
    clipBitrateKbps: 64,
    paidServices: false,
    transcription: false
  },
  toolVersions,
  sources,
  clips,
  totals: {
    sources: sources.length,
    sourceDownloads,
    existingNormalizedSources,
    sourceAcquisitionAttempts: sources.reduce(
      (sum, source) => sum + source.acquisitionAttempts,
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
    retries: 0,
    timeoutExtensions: 0,
    scoresDerived: 0
  },
  proposedPolicy: workPreparation.proposedPolicy,
  authorization: {
    audioVerificationManifestPreparation: true,
    paidTranscriptionExecution: false,
    audioVerificationExecution: false,
    adjudicationPacketPreparation: false,
    adjudicationModelExecution: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    policyPromotion: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  nextAuthorizedAction:
    "prepare-v2.1.3-audio-verification-manifest-and-cost-estimate-only"
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
