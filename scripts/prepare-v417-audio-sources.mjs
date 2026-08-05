#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { access, mkdir, readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { assertV4, readJson } from "./lib/v41-lean-production.mjs";
import { V417_PASS_B_ROOT } from "./lib/v417-triggered-consensus.mjs";

const root = process.cwd();
const localRoot = "output/transcribe/v417-pass-b-audio-verification";
const ffmpeg = "/opt/homebrew/bin/ffmpeg";
const ffprobe = "/opt/homebrew/bin/ffprobe";
const configs = [
  { debateNumber: "58", videoId: "EKlycI9ZKsY", inheritedSource: "output/transcribe/EKlycI9ZKsY/transcription.mp3" },
  { debateNumber: "91", videoId: "dmTLjiGWgpE" },
  { debateNumber: "59", videoId: "oeYze2psUpw" },
  { debateNumber: "144", videoId: "f06J2R4MwGA" }
];
const exists = async (file) => access(path.resolve(root, file)).then(() => true, () => false);
const analysis = await readJson(`${V417_PASS_B_ROOT}/analysis.json`);
assertV4(analysis.status === "pass-b-passed-audio-verification-required" && analysis.authorization.audioVerification && analysis.pendingAudioMoves.length === 12, "v4.1.7 audio preparation unauthorized");

const results = [];
for (const config of configs) {
  const debate = analysis.debates.find((item) => item.debateNumber === config.debateNumber);
  assertV4(debate && debate.pendingAudioMoveIds.length > 0, `${config.debateNumber}: pending audio debate unavailable`);
  const directory = path.resolve(root, localRoot, debate.debateId, "audio");
  const source = path.join(directory, "source.mp3");
  await mkdir(directory, { recursive: true });
  if (!(await exists(source))) {
    let input;
    if (config.inheritedSource) {
      assertV4(await exists(config.inheritedSource), `${config.debateNumber}: inherited source audio missing`);
      input = path.resolve(root, config.inheritedSource);
    } else {
      const outputTemplate = path.join(directory, "source.download.%(ext)s");
      const common = ["-m", "yt_dlp", "--no-playlist", "--quiet", "--no-warnings", "--extractor-args", "youtube:player_client=android,web", "-o", outputTemplate, `https://www.youtube.com/watch?v=${config.videoId}`];
      try {
        execFileSync("python3", [...common.slice(0, -3), "-f", "ba", ...common.slice(-3)], { stdio: "inherit" });
      } catch {
        for (const name of (await readdir(directory)).filter((item) => item.startsWith("source.download."))) await unlink(path.join(directory, name));
        execFileSync("python3", [...common.slice(0, -3), "-f", "18", ...common.slice(-3)], { stdio: "inherit" });
      }
      const downloaded = (await readdir(directory)).filter((name) => name.startsWith("source.download."));
      assertV4(downloaded.length === 1, `${config.debateNumber}: expected one downloaded audio file`);
      input = path.join(directory, downloaded[0]);
    }
    execFileSync(ffmpeg, ["-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-i", input, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "48k", source]);
    if (!config.inheritedSource) await unlink(input);
  }
  const durationSeconds = Number(execFileSync(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", source], { encoding: "utf8" }).trim());
  const primaryPacket = await readJson(`docs/calibration/v4.1.7/fresh-six-gate/packets/debate-${config.debateNumber}.json`);
  assertV4(Number.isFinite(durationSeconds) && durationSeconds >= primaryPacket.durationSeconds - 3, `${config.debateNumber}: normalized source audio is too short`);
  results.push({ debateNumber: config.debateNumber, debateId: debate.debateId, videoId: config.videoId, sourceAudio: path.relative(root, source), durationSeconds });
  console.log(JSON.stringify(results.at(-1)));
}
console.log(JSON.stringify({ status: "prepared-four-local-audio-sources", debates: results.length, paidCalls: 0, meteredApiCostUsd: 0 }, null, 2));
