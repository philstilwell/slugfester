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
const planRoot = "docs/assessment-production/canary-v1-disagreement-audio-prep";
const localRoot = "output/transcribe/assessment-production-canary-v1-audio-verification";
const preparationPath = `${planRoot}/audio-source-preparation.json`;
const ffmpeg = "/opt/homebrew/bin/ffmpeg";
const ffprobe = "/opt/homebrew/bin/ffprobe";
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const reusableSources = new Map([
  ["OL8LREmbDi0", "output/transcribe/v2.2-audio-verification/OL8LREmbDi0/source.m4a"]
]);

if (shouldWrite) {
  assertV4(
    !(await exists(preparationPath)),
    `${preparationPath} already exists; the frozen preparation cannot be overwritten`
  );
}

const analysisPath = `${planRoot}/analysis.json`;
const workPath = `${planRoot}/audio-work-items.json`;
const [analysisBytes, workBytes] = await Promise.all([
  readFile(analysisPath),
  readFile(workPath)
]);
const analysis = JSON.parse(analysisBytes);
const work = JSON.parse(workBytes);
assertV4(
  analysis.status ===
    "production-canary-deterministic-disagreements-extracted-audio-source-preparation-authorized" &&
    analysis.authorization.audioSourcePreparation,
  "production-canary audio-source preparation is not authorized"
);
assertV4(work.moves.length === 4, "expected exactly four audio work items");
assertV4(
  new Set(work.moves.map((move) => move.sourceVideoId)).size === 3,
  "expected exactly three production-canary audio sources"
);

const sources = [];
const clips = [];
let sourceDownloads = 0;
let reusedLocalSources = 0;
const grouped = Map.groupBy(work.moves, (move) => move.sourceVideoId);

for (const [videoId, moves] of grouped) {
  const debateNumber = moves[0].debateNumber;
  assertV4(
    moves.every(
      (move) =>
        move.debateNumber === debateNumber && move.sourceVideoId === videoId
    ),
    `${videoId}: mixed debate audio population`
  );
  const mediaDirectory = path.resolve(repositoryRoot, localRoot, `debate-${debateNumber}`);
  const audioDirectory = path.join(mediaDirectory, "audio");
  const clipDirectory = path.join(mediaDirectory, "clips");
  const sourceAudio = path.join(audioDirectory, "source.mp3");
  await mkdir(audioDirectory, { recursive: true });
  await mkdir(clipDirectory, { recursive: true });

  let acquisitionMode = "existing-normalized-source";
  let reusedLocalSource = null;
  if (!(await exists(sourceAudio))) {
    const reusable = reusableSources.get(videoId);
    if (reusable && (await exists(reusable))) {
      execFileSync(ffmpeg, [
        "-nostdin",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        path.resolve(repositoryRoot, reusable),
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-b:a",
        "48k",
        sourceAudio
      ]);
      acquisitionMode = "reused-local-source";
      reusedLocalSource = reusable;
      reusedLocalSources += 1;
    } else {
      const outputTemplate = path.join(audioDirectory, "source.download.%(ext)s");
      const baseArguments = [
        "-m",
        "yt_dlp",
        "--no-playlist",
        "--quiet",
        "--no-warnings",
        "--extractor-args",
        "youtube:player_client=android,web",
        "-o",
        outputTemplate
      ];
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      try {
        execFileSync(
          "python3",
          [...baseArguments, "-f", "ba", videoUrl],
          { stdio: "inherit" }
        );
      } catch {
        for (const name of (await readdir(audioDirectory)).filter((item) =>
          item.startsWith("source.download.")
        )) await unlink(path.join(audioDirectory, name));
        execFileSync(
          "python3",
          [...baseArguments, "-f", "18", videoUrl],
          { stdio: "inherit" }
        );
      }
      const downloaded = (await readdir(audioDirectory)).filter((name) =>
        name.startsWith("source.download.")
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
    }
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
    reusedLocalSource,
    sourceAudio: path.relative(repositoryRoot, sourceAudio),
    sourceAudioSha256: sha256(await readFile(sourceAudio)),
    durationSeconds: sourceDurationSeconds
  });

  for (const move of moves) {
    const safeMoveId = move.moveId.replace(/[^A-Za-z0-9_-]+/g, "-");
    const clipPath = path.join(clipDirectory, `${safeMoveId}.mp3`);
    const durationSeconds =
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
      durationSeconds.toFixed(3),
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
      Math.abs(actualDurationSeconds - durationSeconds) <= 0.25,
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
      durationSeconds: actualDurationSeconds
    });
  }
}

const preparation = {
  schemaVersion: "1.0-production-canary-audio-source-preparation",
  protocolId: analysis.protocolId,
  status: "prepared-four-local-production-canary-audio-clips",
  productionCanary: true,
  stagingOnly: true,
  inputHashes: {
    [analysisPath]: sha256(analysisBytes),
    [workPath]: sha256(workBytes)
  },
  sources,
  clips,
  totals: {
    sources: sources.length,
    sourceDownloads,
    reusedLocalSources,
    clips: clips.length,
    clipMinutes: Number(
      (clips.reduce((sum, clip) => sum + clip.durationSeconds, 0) / 60).toFixed(4)
    ),
    paidTranscriptionCalls: 0,
    transcriptionCostUsd: 0,
    modelContexts: 0,
    meteredModelApiCostUsd: 0,
    scoresDerived: 0
  },
  authorization: {
    audioVerificationManifest: true,
    paidTranscriptionExecution: false,
    audioVerificationExecution: false,
    adjudicationPacketPreparation: false,
    adjudicationModelExecution: false,
    finalLedgerAssembly: false,
    scoreDerivation: false,
    publicationFinalization: false,
    productionMutation: false,
    remainingProductionBatches: false
  }
};

if (shouldWrite) {
  await writeFile(preparationPath, `${JSON.stringify(preparation, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: preparation.status,
      sources: sources.map(({ debateNumber, videoId, acquisitionMode }) => ({
        debateNumber,
        videoId,
        acquisitionMode
      })),
      clips: clips.length,
      clipMinutes: preparation.totals.clipMinutes,
      sourceDownloads,
      reusedLocalSources,
      paidTranscriptionCalls: 0,
      transcriptionCostUsd: 0,
      meteredApiCostUsd: 0,
      scoresDerived: 0,
      nextAuthorized: "audio-verification-manifest"
    },
    null,
    2
  )
);
