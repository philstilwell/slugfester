#!/usr/bin/env node

import { mkdir, readdir, unlink } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { readFile } from "node:fs/promises";

const gate = JSON.parse(await readFile(path.resolve("docs/calibration/v2.7/held-out-gates/gate-manifest.json"), "utf8"));
function run(command, args) { const result = spawnSync(command, args, { stdio: "inherit" }); if (result.status !== 0) throw new Error(`${command} failed with ${result.status}`); }
for (const lane of Object.values(gate.lanes)) for (const debate of lane.debates) {
  const directory = path.resolve("output/transcribe/v27-gate", debate.debateId); const audioDirectory = path.join(directory, "audio"); const chunkDirectory = path.join(directory, "chunks"); await mkdir(audioDirectory, { recursive: true }); await mkdir(chunkDirectory, { recursive: true });
  const outputTemplate = path.join(audioDirectory, "source.download.%(ext)s");
  run("python3", ["-m", "yt_dlp", "--no-playlist", "--quiet", "--no-warnings", "-f", "ba", "-o", outputTemplate, `https://www.youtube.com/watch?v=${debate.videoId}`]);
  const downloaded = (await readdir(audioDirectory)).filter((name) => name.startsWith("source.download.")); if (downloaded.length !== 1) throw new Error(`${debate.debateId}: expected one downloaded audio file`); const downloadedPath = path.join(audioDirectory, downloaded[0]); const normalizedPath = path.join(audioDirectory, "source.mp3");
  run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", downloadedPath, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "32k", normalizedPath]);
  run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", normalizedPath, "-f", "segment", "-segment_time", "900", "-reset_timestamps", "1", "-c", "copy", path.join(chunkDirectory, "chunk-%03d.mp3")]);
  await unlink(downloadedPath); const chunks = (await readdir(chunkDirectory)).filter((name) => /^chunk-\d+\.mp3$/.test(name)).sort(); console.log(JSON.stringify({ debateId: debate.debateId, videoId: debate.videoId, chunkCount: chunks.length }));
}
