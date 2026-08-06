#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const repositoryRoot = process.cwd();
const planRoot = "docs/calibration/v4.2.21.17.3/deterministic-disagreement-audio-prep";
const localRoot = "output/transcribe/v4221173-audio-verification/debate-178";
const ffmpeg = "/opt/homebrew/bin/ffmpeg";
const ffprobe = "/opt/homebrew/bin/ffprobe";
const [analysis, work] = await Promise.all([
  readFile(`${planRoot}/analysis.json`, "utf8").then(JSON.parse),
  readFile(`${planRoot}/audio-work-items.json`, "utf8").then(JSON.parse)
]);
assertV4(analysis.status === "deterministic-disagreements-extracted-audio-source-preparation-authorized" && analysis.authorization.audioSourcePreparation, "audio source preparation is not authorized");
assertV4(work.moves.length === 2 && work.moves.every((move) => move.debateNumber === "178"), "expected exactly two Debate 178 audio work items");
assertV4(new Set(work.moves.map((move) => move.sourceVideoId)).size === 1, "audio work must use one source video");

const videoId = work.moves[0].sourceVideoId;
const audioDirectory = path.resolve(repositoryRoot, localRoot, "audio");
const clipDirectory = path.resolve(repositoryRoot, localRoot, "clips");
const sourceAudio = path.join(audioDirectory, "source.mp3");
const exists = async (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
await mkdir(audioDirectory, { recursive: true });
await mkdir(clipDirectory, { recursive: true });

let sourceDownloads = 0;
if (!(await exists(sourceAudio))) {
  const outputTemplate = path.join(audioDirectory, "source.download.%(ext)s");
  const common = ["-m", "yt_dlp", "--no-playlist", "--quiet", "--no-warnings", "--extractor-args", "youtube:player_client=android,web", "-o", outputTemplate, `https://www.youtube.com/watch?v=${videoId}`];
  try {
    execFileSync("python3", [...common.slice(0, -3), "-f", "ba", ...common.slice(-3)], { stdio: "inherit" });
  } catch {
    for (const name of (await readdir(audioDirectory)).filter((item) => item.startsWith("source.download."))) await unlink(path.join(audioDirectory, name));
    execFileSync("python3", [...common.slice(0, -3), "-f", "18", ...common.slice(-3)], { stdio: "inherit" });
  }
  const downloaded = (await readdir(audioDirectory)).filter((name) => name.startsWith("source.download."));
  assertV4(downloaded.length === 1, "expected one downloaded Debate 178 media file");
  const downloadedPath = path.join(audioDirectory, downloaded[0]);
  execFileSync(ffmpeg, ["-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-i", downloadedPath, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "48k", sourceAudio]);
  await unlink(downloadedPath);
  sourceDownloads = 1;
}

const sourceDurationSeconds = Number(execFileSync(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", sourceAudio], { encoding: "utf8" }).trim());
assertV4(Number.isFinite(sourceDurationSeconds) && sourceDurationSeconds * 1000 >= Math.max(...work.moves.map((move) => move.clipWindow.endMs)), "normalized Debate 178 source audio is too short");

const clips = [];
for (const move of work.moves) {
  const safeMoveId = move.moveId.replace(/[^A-Za-z0-9_-]+/g, "-");
  const clipPath = path.join(clipDirectory, `${safeMoveId}.mp3`);
  const durationSeconds = (move.clipWindow.endMs - move.clipWindow.startMs) / 1000;
  execFileSync(ffmpeg, ["-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-ss", (move.clipWindow.startMs / 1000).toFixed(3), "-i", sourceAudio, "-t", durationSeconds.toFixed(3), "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", clipPath]);
  const actualDurationSeconds = Number(execFileSync(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", clipPath], { encoding: "utf8" }).trim());
  assertV4(Math.abs(actualDurationSeconds - durationSeconds) <= 0.25, `${move.moveId}: clip duration mismatch`);
  clips.push({ debateNumber: move.debateNumber, debateId: move.debateId, moveId: move.moveId, expectedSpeaker: move.expectedSpeaker, proposition: move.proposition, verificationExcerpt: move.verificationExcerpt, sourceSpan: move.sourceSpan, clipWindow: move.clipWindow, trigger: move.trigger, clipPath: path.relative(repositoryRoot, clipPath), clipSha256: sha256(await readFile(clipPath)), durationSeconds: actualDurationSeconds });
}

const preparation = {
  schemaVersion: "4.2.21.17.3-audio-source-preparation",
  protocolId: analysis.protocolId,
  status: "prepared-two-local-audio-clips",
  source: { videoId, sourceAudio: path.relative(repositoryRoot, sourceAudio), sourceAudioSha256: sha256(await readFile(sourceAudio)), durationSeconds: sourceDurationSeconds },
  clips,
  totals: { sourceDownloads, clips: clips.length, clipMinutes: Number((clips.reduce((sum, clip) => sum + clip.durationSeconds, 0) / 60).toFixed(4)), paidTranscriptionCalls: 0, transcriptionCostUsd: 0, meteredModelApiCostUsd: 0 },
  authorization: { paidTranscriptionManifest: true, paidTranscriptionExecution: false, adjudicationPacketPreparation: false, adjudicationModelExecution: false, scoreDerivation: false }
};
if (shouldWrite) await writeFile(`${planRoot}/audio-source-preparation.json`, `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, sourceVideoId: videoId, sourceDurationMinutes: Number((sourceDurationSeconds / 60).toFixed(2)), clips: clips.length, clipMinutes: preparation.totals.clipMinutes, sourceDownloads, paidTranscriptionCalls: 0, transcriptionCostUsd: 0, meteredApiCostUsd: 0, nextAuthorized: "paid-transcription-manifest" }, null, 2));
