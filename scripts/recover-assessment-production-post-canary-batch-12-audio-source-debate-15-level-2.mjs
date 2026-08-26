#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import {
  access,
  mkdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile
} from "node:fs/promises";
import https from "node:https";
import path from "node:path";
import { pipeline } from "node:stream/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-12/disagreement-extraction";
const PREPARATION = `${ROOT}/audio-source-recovery-1-failure.json`;
const EXECUTION = `${ROOT}/audio-source-recovery-2-debate-15.json`;
const LOCAL_ROOT =
  "output/transcribe/assessment-production-post-canary-batch-12-audio-verification/debate-15/audio";
const SOURCE = `${LOCAL_ROOT}/source.mp3`;
const FAILED_SOURCE = `${LOCAL_ROOT}/source.failed-recovery-1.mp3`;
const PARTIAL_DOWNLOAD = `${LOCAL_ROOT}/source.recovery-attempt-2.partial.m4a`;
const VIDEO_ID = "5OXPlUCGScY";
const FORMAT_SELECTOR = "140";
const REQUIRED_END_MS = 1246820;
const RANGE_BYTES = 10 * 1024 * 1024;
const MAXIMUM_RANGES = 32;
const MAXIMUM_REDIRECTS = 3;
const FFMPEG = "/opt/homebrew/bin/ffmpeg";
const FFPROBE = "/opt/homebrew/bin/ffprobe";
const command = process.argv[2] ?? "preview";

const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const hashFile = async (file) => sha256(await readFile(file));
const isAuthorizedMediaUrl = (value) => {
  const parsed = new URL(value);
  return (
    parsed.protocol === "https:" &&
    (parsed.hostname === "googlevideo.com" ||
      parsed.hostname.endsWith(".googlevideo.com"))
  );
};
const redactUrl = (value) => {
  const parsed = new URL(value);
  return {
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    urlSha256: sha256(value)
  };
};
const probe = (file) => {
  const output = JSON.parse(
    execFileSync(
      FFPROBE,
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

function resolveFreshMediaUrl() {
  const output = execFileSync(
    "python3",
    [
      "-m",
      "yt_dlp",
      "--no-playlist",
      "--quiet",
      "--no-warnings",
      "--retries",
      "0",
      "--fragment-retries",
      "0",
      "--extractor-retries",
      "0",
      "--file-access-retries",
      "0",
      "--extractor-args",
      "youtube:player_client=android_vr",
      "-f",
      FORMAT_SELECTOR,
      "--get-url",
      `https://www.youtube.com/watch?v=${VIDEO_ID}`
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }
  );
  const urls = output.split("\n").map((value) => value.trim()).filter(Boolean);
  assertV4(urls.length === 1, "Debate 15 recovery must resolve one media URL");
  assertV4(isAuthorizedMediaUrl(urls[0]), "resolved URL left authorized HTTPS media boundary");
  return urls[0];
}

async function requestRange(initialUrl, start, end, flags) {
  const redirectChain = [];
  const request = async (currentUrl, redirects) => {
    assertV4(isAuthorizedMediaUrl(currentUrl), "range URL left authorized HTTPS media boundary");
    redirectChain.push(redactUrl(currentUrl));
    return new Promise((resolve, reject) => {
      const mediaRequest = https.request(
        currentUrl,
        { method: "GET", headers: { Range: `bytes=${start}-${end}` }, agent: false },
        (response) => {
          const status = response.statusCode ?? 0;
          if (status >= 300 && status < 400) {
            const location = response.headers.location;
            response.resume();
            response.once("end", () => {
              try {
                assertV4(redirects < MAXIMUM_REDIRECTS, "media redirect limit exceeded");
                assertV4(location, "media redirect omitted Location");
                const next = new URL(location, currentUrl).toString();
                assertV4(isAuthorizedMediaUrl(next), "media redirect left authorized boundary");
                resolve(request(next, redirects + 1));
              } catch (error) {
                reject(error);
              }
            });
            response.once("error", reject);
            return;
          }
          if (status !== 206) {
            response.resume();
            response.once("end", () => reject(new Error(`range response was HTTP ${status}`)));
            response.once("error", reject);
            return;
          }
          const contentRange = response.headers["content-range"] ?? "";
          const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(contentRange);
          if (!match) {
            response.destroy();
            reject(new Error("range response omitted an exact Content-Range"));
            return;
          }
          const actualStart = Number(match[1]);
          const actualEnd = Number(match[2]);
          const totalBytes = Number(match[3]);
          if (actualStart !== start || actualEnd > end || actualEnd >= totalBytes) {
            response.destroy();
            reject(new Error("range response did not match the planned nonoverlapping range"));
            return;
          }
          let received = 0;
          response.on("data", (chunk) => { received += chunk.length; });
          const output = createWriteStream(PARTIAL_DOWNLOAD, { flags });
          pipeline(response, output)
            .then(() => {
              assertV4(received === actualEnd - actualStart + 1, "range byte count mismatch");
              resolve({
                start: actualStart,
                end: actualEnd,
                totalBytes,
                bytes: received,
                status,
                contentRange,
                redirects,
                redirectChain
              });
            })
            .catch(reject);
        }
      );
      mediaRequest.once("error", reject);
      mediaRequest.end();
    });
  };
  return request(initialUrl, 0);
}

async function validatePreparation() {
  const preparation = JSON.parse(await readFile(PREPARATION, "utf8"));
  assertV4(
    preparation.status ===
      "debate-15-audio-source-recovery-level-1-failed-preserved-level-2-authorized" &&
      preparation.recoveryLevel === 1 &&
      preparation.shardAttempt === 1 &&
      preparation.retries === 0 &&
      preparation.recoveryPlan.level === 2 &&
      preparation.recoveryPlan.shards === 1 &&
      preparation.recoveryPlan.attemptsPerShard === 1 &&
      preparation.recoveryPlan.freshFormatSelector === FORMAT_SELECTOR &&
      preparation.recoveryPlan.freshClient === "android_vr" &&
      preparation.preservedNormalizedFailure.sha256 ===
        "87965bd54bc175f5645aa773bd5a0a98c396524a0dd0c4e94463828c11ed2754",
    "Batch 12 Debate 15 recovery preparation changed"
  );
  assertV4(
    await hashFile(preparation.preservedDownloadedArtifact.path) ===
        preparation.preservedDownloadedArtifact.sha256 &&
      (await stat(preparation.preservedDownloadedArtifact.path)).size ===
        preparation.preservedDownloadedArtifact.bytes,
    "Batch 12 Debate 15 level-1 downloaded failure changed"
  );
  return preparation;
}

async function applyRecovery() {
  const preparation = await validatePreparation();
  assertV4(!(await exists(EXECUTION)), "Debate 15 recovery execution already exists");
  assertV4(!(await exists(FAILED_SOURCE)), "Debate 15 failed artifact was already moved");
  assertV4(await exists(SOURCE), "Debate 15 failed source artifact is missing");
  assertV4(
    await hashFile(SOURCE) === preparation.preservedNormalizedFailure.sha256,
    "Debate 15 failed source artifact hash changed"
  );
  await mkdir(LOCAL_ROOT, { recursive: true });
  await rename(SOURCE, FAILED_SOURCE);
  assertV4(!(await exists(PARTIAL_DOWNLOAD)), "unverified Debate 15 recovery partial already exists");

  const resolvedUrl = resolveFreshMediaUrl();
  const ranges = [];
  let start = 0;
  let totalBytes = null;
  while (totalBytes === null || start < totalBytes) {
    assertV4(ranges.length < MAXIMUM_RANGES, "Debate 15 recovery exceeded the frozen range limit");
    const end = Math.min(start + RANGE_BYTES - 1, (totalBytes ?? Number.MAX_SAFE_INTEGER) - 1);
    const range = await requestRange(resolvedUrl, start, end, ranges.length === 0 ? "wx" : "a");
    if (totalBytes === null) totalBytes = range.totalBytes;
    assertV4(range.totalBytes === totalBytes, "Debate 15 media size changed across ranges");
    ranges.push(range);
    start = range.end + 1;
  }
  const downloadedBytes = (await stat(PARTIAL_DOWNLOAD)).size;
  assertV4(downloadedBytes === totalBytes, "Debate 15 complete download size mismatch");

  execFileSync(FFMPEG, [
    "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
    "-i", PARTIAL_DOWNLOAD, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "48k", SOURCE
  ]);
  const sourceProbe = probe(SOURCE);
  assertV4(
    sourceProbe.durationSeconds * 1000 >= REQUIRED_END_MS &&
      sourceProbe.channels === 1 &&
      sourceProbe.sampleRateHz === 16000,
    "Debate 15 recovered normalized source is invalid or too short"
  );
  await unlink(PARTIAL_DOWNLOAD);

  const execution = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-12-audio-source-recovery",
    protocolId: preparation.protocolId,
    status: "debate-15-audio-source-recovery-level-2-passed",
    recoveredAt: new Date().toISOString(),
    preparation: PREPARATION,
    preparationSha256: await hashFile(PREPARATION),
    debateNumber: "15",
    videoId: VIDEO_ID,
    recoveryLevel: 2,
    shardAttempt: 1,
    retries: 0,
    failedArtifact: FAILED_SOURCE,
    failedArtifactSha256: await hashFile(FAILED_SOURCE),
    freshFormatSelector: FORMAT_SELECTOR,
    freshMediaUrlResolutions: 1,
    transport: {
      method: "complete-sequential-nonoverlapping-byte-ranges",
      rangeSizeBytes: RANGE_BYTES,
      ranges,
      rangesRequested: ranges.length,
      repeatedRanges: 0,
      downloadedBytes,
      resolvedUrl: redactUrl(resolvedUrl)
    },
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
  const preparation = await validatePreparation();
  const execution = JSON.parse(await readFile(EXECUTION, "utf8"));
  assertV4(
    execution.status === "debate-15-audio-source-recovery-level-2-passed" &&
      execution.preparationSha256 === await hashFile(PREPARATION) &&
      execution.shardAttempt === 1 &&
      execution.retries === 0 &&
      execution.transport.repeatedRanges === 0 &&
      execution.transport.rangesRequested === execution.transport.ranges.length &&
      execution.recoveredSourceSha256 === await hashFile(SOURCE) &&
      execution.failedArtifactSha256 === preparation.preservedNormalizedFailure.sha256 &&
      execution.failedArtifactSha256 === await hashFile(FAILED_SOURCE) &&
      execution.paidServiceCalls === 0,
    "Batch 12 Debate 15 recovery validation failed"
  );
  const probeResult = probe(SOURCE);
  assertV4(
    probeResult.durationSeconds * 1000 >= REQUIRED_END_MS &&
      probeResult.channels === 1 &&
      probeResult.sampleRateHz === 16000,
    "Batch 12 Debate 15 recovered source probe failed"
  );
  return execution;
}

if (command === "preview") {
  const preparation = await validatePreparation();
  console.log(JSON.stringify({
    status: "preview-final-debate-15-audio-source-recovery-level-2-shard",
    recoveryPlan: preparation.recoveryPlan,
    failedArtifactPresent: await exists(SOURCE),
    paidServiceCalls: 0,
    directIncrementalCostUsd: 0
  }, null, 2));
} else if (command === "apply") {
  const execution = await applyRecovery();
  console.log(JSON.stringify(execution, null, 2));
} else if (command === "validate") {
  const execution = await validateRecovery();
  console.log(JSON.stringify({
    status: "passed-batch-12-debate-15-audio-source-recovery-level-2",
    rangesRequested: execution.transport.rangesRequested,
    recoveredSourceBytes: execution.recoveredSourceBytes,
    directIncrementalCostUsd: 0
  }, null, 2));
} else {
  throw new Error(`unknown command: ${command}`);
}
