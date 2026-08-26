#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, stat, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-12/disagreement-extraction";
const PREPARATION = `${ROOT}/audio-source-recovery-2-shard-2-failure.json`;
const EXECUTION = `${ROOT}/audio-source-recovery-2-shard-3-debate-15.json`;
const LOCAL_ROOT =
  "output/transcribe/assessment-production-post-canary-batch-12-audio-verification/debate-15/audio";
const DOWNLOAD = `${LOCAL_ROOT}/source.recovery-level-2-shard-3.m4a`;
const DOWNLOAD_PART = `${DOWNLOAD}.part`;
const SOURCE = `${LOCAL_ROOT}/source.mp3`;
const FFMPEG = "/opt/homebrew/bin/ffmpeg";
const FFPROBE = "/opt/homebrew/bin/ffprobe";
const VIDEO_ID = "5OXPlUCGScY";
const FORMAT_SELECTOR = "140";
const EXPECTED_BYTES = 110126165;
const REQUIRED_END_MS = 1246820;
const command = process.argv[2] ?? "preview";

const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const hashFile = async (file) => sha256(await readFile(file));
const probe = (file) => {
  const output = JSON.parse(
    execFileSync(
      FFPROBE,
      [
        "-v", "error", "-select_streams", "a:0",
        "-show_entries", "format=duration,bit_rate:stream=channels,sample_rate,bit_rate",
        "-of", "json", file
      ],
      { encoding: "utf8" }
    )
  );
  const stream = output.streams?.[0] ?? {};
  return {
    durationSeconds: Number(output.format?.duration),
    channels: Number(stream.channels),
    sampleRateHz: Number(stream.sample_rate),
    measuredBitRateBps: Number(stream.bit_rate ?? output.format?.bit_rate)
  };
};

async function loadPreparation() {
  const preparation = JSON.parse(await readFile(PREPARATION, "utf8"));
  assertV4(
    preparation.status ===
      "debate-15-audio-source-recovery-level-2-shard-2-http-403-preserved-shard-3-authorized" &&
      preparation.recoveryLevel === 2 &&
      preparation.shardIndex === 2 &&
      preparation.shardAttempt === 1 &&
      preparation.retries === 0 &&
      preparation.mediaBytesReceived === 0 &&
      preparation.recoveryPlan.level === 2 &&
      preparation.recoveryPlan.shardIndex === 3 &&
      preparation.recoveryPlan.attemptsPerShard === 1 &&
      preparation.recoveryPlan.extractorClient === "android_vr" &&
      preparation.recoveryPlan.formatSelector === FORMAT_SELECTOR &&
      preparation.recoveryPlan.cookiesAllowed === false,
    "Batch 12 Debate 15 final recovery shard preparation changed"
  );
  return preparation;
}

async function applyRecovery() {
  const preparation = await loadPreparation();
  assertV4(!(await exists(EXECUTION)), "final recovery execution already exists");
  assertV4(!(await exists(SOURCE)), "recovered source unexpectedly exists");
  assertV4(!(await exists(DOWNLOAD)), "final recovery download unexpectedly exists");
  assertV4(!(await exists(DOWNLOAD_PART)), "final recovery partial unexpectedly exists");

  execFileSync(
    "python3",
    [
      "-m", "yt_dlp", "--no-playlist", "--quiet", "--no-warnings",
      "--retries", "0", "--fragment-retries", "0", "--extractor-retries", "0",
      "--file-access-retries", "0", "--no-continue", "--no-overwrites",
      "--extractor-args", "youtube:player_client=android_vr",
      "-f", FORMAT_SELECTOR, "-o", DOWNLOAD,
      `https://www.youtube.com/watch?v=${VIDEO_ID}`
    ],
    { stdio: ["ignore", "inherit", "inherit"] }
  );
  assertV4(await exists(DOWNLOAD), "yt-dlp did not produce the frozen recovery output");
  assertV4((await stat(DOWNLOAD)).size === EXPECTED_BYTES, "recovered download size changed");
  const downloadProbe = probe(DOWNLOAD);
  assertV4(
    downloadProbe.durationSeconds * 1000 >= REQUIRED_END_MS,
    "recovered source download is too short"
  );

  execFileSync(FFMPEG, [
    "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
    "-i", DOWNLOAD, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "48k", SOURCE
  ]);
  const sourceProbe = probe(SOURCE);
  assertV4(
    sourceProbe.durationSeconds * 1000 >= REQUIRED_END_MS &&
      sourceProbe.channels === 1 &&
      sourceProbe.sampleRateHz === 16000,
    "normalized recovered source is invalid"
  );

  const execution = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-12-audio-source-recovery",
    protocolId: preparation.protocolId,
    status: "debate-15-audio-source-recovery-level-2-shard-3-passed",
    recoveredAt: new Date().toISOString(),
    preparation: PREPARATION,
    preparationSha256: await hashFile(PREPARATION),
    debateNumber: "15",
    videoId: VIDEO_ID,
    recoveryLevel: 2,
    shardIndex: 3,
    shardAttempt: 1,
    retries: 0,
    extractorClient: "android_vr",
    formatSelector: FORMAT_SELECTOR,
    transport: "yt-dlp-single-process-resolution-and-download",
    cookiesUsed: false,
    downloadedSource: DOWNLOAD,
    downloadedSourceSha256: await hashFile(DOWNLOAD),
    downloadedSourceBytes: (await stat(DOWNLOAD)).size,
    downloadedSourceProbe: downloadProbe,
    recoveredSource: SOURCE,
    recoveredSourceSha256: await hashFile(SOURCE),
    recoveredSourceBytes: (await stat(SOURCE)).size,
    recoveredSourceProbe: sourceProbe,
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0,
    nextAuthorizedAction: "assemble-and-validate-complete-batch-12-audio-source-preparation"
  };
  await writeFile(EXECUTION, `${JSON.stringify(execution, null, 2)}\n`);
  return execution;
}

async function validateRecovery() {
  await loadPreparation();
  const execution = JSON.parse(await readFile(EXECUTION, "utf8"));
  assertV4(
    execution.status === "debate-15-audio-source-recovery-level-2-shard-3-passed" &&
      execution.preparationSha256 === await hashFile(PREPARATION) &&
      execution.recoveryLevel === 2 &&
      execution.shardIndex === 3 &&
      execution.shardAttempt === 1 &&
      execution.retries === 0 &&
      execution.downloadedSourceSha256 === await hashFile(DOWNLOAD) &&
      execution.recoveredSourceSha256 === await hashFile(SOURCE) &&
      execution.paidServiceCalls === 0,
    "Batch 12 Debate 15 final recovery validation failed"
  );
  return execution;
}

if (command === "preview") {
  const preparation = await loadPreparation();
  console.log(JSON.stringify({
    status: "preview-final-level-2-debate-15-audio-source-recovery-shard-3",
    recoveryPlan: preparation.recoveryPlan,
    sourceAbsent: !(await exists(SOURCE)),
    downloadAbsent: !(await exists(DOWNLOAD)),
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0
  }, null, 2));
} else if (command === "apply") {
  console.log(JSON.stringify(await applyRecovery(), null, 2));
} else if (command === "validate") {
  const execution = await validateRecovery();
  console.log(JSON.stringify({
    status: "passed-batch-12-debate-15-audio-source-recovery-level-2-shard-3",
    downloadedSourceBytes: execution.downloadedSourceBytes,
    recoveredSourceBytes: execution.recoveredSourceBytes,
    directIncrementalCostUsd: 0
  }, null, 2));
} else {
  throw new Error(`unknown command: ${command}`);
}
