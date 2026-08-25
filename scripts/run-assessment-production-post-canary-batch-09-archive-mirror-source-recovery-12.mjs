#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, open, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(new URL("../", import.meta.url).pathname);
const rel = (path) => resolve(root, path);
const planPath = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-archive-mirror-recovery-12/recovery-plan.json";
const activationPath = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-archive-mirror-recovery-12/execution-activation.json";
const executionPath = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-archive-mirror-recovery-12/execution.json";
const analysisPath = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-archive-mirror-recovery-12/analysis.json";
const rawPartPath = ".assessment-cache/audio-source-mirrors/youtube-HoTILnpd3q8/HoTILnpd3q8.mp4.failed-attempt-1.part";
const rawFinalPath = ".assessment-cache/audio-source-mirrors/youtube-HoTILnpd3q8/HoTILnpd3q8.mp4";
const sourceTempPath = "output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-170/audio/source.archive-mirror-recovery-12.tmp.mp3";
const sourceFinalPath = "output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-170/audio/source.mp3";
const clipTempPath = "output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-170/clips/pro-suffering-christian-hope-response.archive-mirror-recovery-12.tmp.mp3";
const clipFinalPath = "output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-170/clips/pro-suffering-christian-hope-response.mp3";
const archiveUrl = "https://archive.org/download/youtube-HoTILnpd3q8/HoTILnpd3q8.mp4";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const read = (path) => readFile(rel(path));
const readJson = async (path) => JSON.parse(await read(path));
const fileHash = async (path, algorithm = "sha256") => createHash(algorithm).update(await read(path)).digest("hex");
const exists = async (path) => stat(rel(path)).then(() => true, () => false);
const writeJson = async (path, value) => {
  await mkdir(dirname(rel(path)), { recursive: true });
  await writeFile(rel(path), `${JSON.stringify(value, null, 2)}\n`);
};
const probeDuration = async (path) => {
  const { stdout } = await execFileAsync("/opt/homebrew/bin/ffprobe", [
    "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", rel(path)
  ], { maxBuffer: 1024 * 1024 });
  const value = Number(stdout.trim());
  assert(Number.isFinite(value), `${path} duration unavailable`);
  return value;
};

const state = {
  attempts: 1,
  archiveMetadataRequests: 0,
  archiveMediaDownloadAttempts: 0,
  archiveLogicalRedirectFollows: 0,
  sourceBytesAccepted: 0,
  sourcesInstalled: 0,
  clipsCreated: 0,
  debates19And183Attempted: false,
  retries: 0,
  reruns: 0,
  timeoutExtensions: 0,
  audioPlaybackObservedSeconds: 0,
  semanticAudioEvaluations: 0,
  modelContexts: 0,
  transcriptionCalls: 0,
  paidServiceCalls: 0,
  scoresDerived: 0,
  directIncrementalCostUsd: 0
};

let plan;
let activation;
try {
  plan = await readJson(planPath);
  activation = await readJson(activationPath);
  assert.equal(activation.plan.sha256, await fileHash(planPath));
  for (const [path, expected] of Object.entries(plan.authenticatedInputs)) assert.equal(await fileHash(path), expected, `${path} hash mismatch`);
  for (const [path, expected] of Object.entries(plan.sourceHashes)) assert.equal(await fileHash(path), expected, `${path} hash mismatch`);
  for (const [path, expected] of Object.entries(activation.sourceHashes)) assert.equal(await fileHash(path), expected, `${path} activation source hash mismatch`);
  assert.equal(plan.archiveMirror.fileUrl, archiveUrl);
  assert.equal(plan.archiveMirror.fileBytes, 1220045661);
  assert.equal(plan.archiveMirror.md5, "1dc9c00ced2cb28375c06457222d8f0a");
  assert.equal(plan.archiveMirror.sha1, "18edc94dab97a981806b343c1a54044ff84e82bf");
  assert.equal(await exists(rawPartPath), false, "partial path already exists");
  assert.equal(await exists(rawFinalPath), false, "raw final path already exists");
  assert.equal(await exists(sourceTempPath), false, "source temp path already exists");
  assert.equal(await exists(sourceFinalPath), false, "source final path already exists");
  assert.equal(await exists(clipTempPath), false, "clip temp path already exists");
  assert.equal(await exists(clipFinalPath), false, "clip final path already exists");

  await mkdir(dirname(rel(rawPartPath)), { recursive: true });
  await mkdir(dirname(rel(sourceTempPath)), { recursive: true });
  await mkdir(dirname(rel(clipTempPath)), { recursive: true });

  state.archiveMediaDownloadAttempts = 1;
  const response = await fetch(archiveUrl, {
    method: "GET",
    redirect: "follow",
    signal: AbortSignal.timeout(60 * 60 * 1000),
    headers: { "user-agent": "SLUGFESTER-audio-source-audit/1.0" }
  });
  assert.equal(response.ok, true, `archive media returned HTTP ${response.status}`);
  state.archiveLogicalRedirectFollows = response.redirected ? 1 : 0;
  assert(response.body, "archive response body missing");

  const hashes = {
    md5: createHash("md5"),
    sha1: createHash("sha1"),
    sha256: createHash("sha256")
  };
  const handle = await open(rel(rawPartPath), "wx");
  try {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const hash of Object.values(hashes)) hash.update(value);
      await handle.write(value);
      state.sourceBytesAccepted += value.byteLength;
    }
  } finally {
    await handle.close();
  }
  const downloaded = {
    bytes: state.sourceBytesAccepted,
    md5: hashes.md5.digest("hex"),
    sha1: hashes.sha1.digest("hex"),
    sha256: hashes.sha256.digest("hex")
  };
  assert.equal(downloaded.bytes, plan.archiveMirror.fileBytes, "archive byte count mismatch");
  assert.equal(downloaded.md5, plan.archiveMirror.md5, "archive MD5 mismatch");
  assert.equal(downloaded.sha1, plan.archiveMirror.sha1, "archive SHA-1 mismatch");
  await rename(rel(rawPartPath), rel(rawFinalPath));

  await execFileAsync("/opt/homebrew/bin/ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-nostdin", "-i", rel(rawFinalPath), "-vn",
    "-ac", "1", "-ar", "16000", "-b:a", "48k", "-map_metadata", "-1", "-n", rel(sourceTempPath)
  ], { maxBuffer: 16 * 1024 * 1024 });
  const sourceDurationSeconds = await probeDuration(sourceTempPath);
  assert(Math.abs(sourceDurationSeconds - 6365) <= 12, `source duration ${sourceDurationSeconds} outside tolerance`);
  await rename(rel(sourceTempPath), rel(sourceFinalPath));
  state.sourcesInstalled = 1;

  await execFileAsync("/opt/homebrew/bin/ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-nostdin", "-i", rel(sourceFinalPath),
    "-ss", "4508.900", "-t", "213.870", "-ac", "1", "-ar", "16000", "-b:a", "64k",
    "-map_metadata", "-1", "-n", rel(clipTempPath)
  ], { maxBuffer: 16 * 1024 * 1024 });
  const clipDurationSeconds = await probeDuration(clipTempPath);
  assert(Math.abs(clipDurationSeconds - 213.87) <= 0.25, `clip duration ${clipDurationSeconds} outside tolerance`);
  await rename(rel(clipTempPath), rel(clipFinalPath));
  state.clipsCreated = 1;

  const execution = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-09-archive-mirror-source-recovery-12-execution",
    status: "completed-one-shot-batch-09-debate-170-canonical-archive-mirror-source-and-clip-recovery",
    batchNumber: 9,
    planSha256: await fileHash(planPath),
    activationSha256: await fileHash(activationPath),
    state,
    result: {
      archiveIdentifier: "youtube-HoTILnpd3q8",
      archiveFileName: "HoTILnpd3q8.mp4",
      archiveFile: downloaded,
      rawCachePath: rawFinalPath,
      sourcePath: sourceFinalPath,
      sourceBytes: (await stat(rel(sourceFinalPath))).size,
      sourceSha256: await fileHash(sourceFinalPath),
      sourceDurationSeconds,
      clipPath: clipFinalPath,
      clipBytes: (await stat(rel(clipFinalPath))).size,
      clipSha256: await fileHash(clipFinalPath),
      clipDurationSeconds
    }
  };
  const analysis = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-09-archive-mirror-source-recovery-12-analysis",
    status: "batch-09-debate-170-canonical-archive-mirror-source-and-frozen-clip-recovered",
    batchNumber: 9,
    result: {
      canonicalDebate170SourceAccepted: true,
      canonicalVideoId: "HoTILnpd3q8",
      alternateAudioOverlayNoLongerRequired: true,
      sourcesInstalled: 1,
      clipsCreated: 1,
      debates19And183RemainUnattempted: true,
      completeThreeSourceFourClipCohortValidated: false
    },
    preservedControls: {
      transcriptPacketsChanged: false,
      judgmentsChanged: false,
      scoresChanged: false,
      productionChanged: false,
      audioPlaybackObservedSeconds: 0,
      semanticAudioEvaluationPerformed: false,
      modelContexts: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0
    },
    nextAuthorizedAction: "discover-freeze-and-run-one-public-mirror-route-for-untouched-debate-19-or-stop-if-none-is-available"
  };
  await writeJson(executionPath, execution);
  await writeJson(analysisPath, analysis);
  console.log(JSON.stringify({ status: execution.status, sourceDurationSeconds, clipDurationSeconds, archiveSha256: downloaded.sha256 }));
} catch (error) {
  const failure = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-09-archive-mirror-source-recovery-12-execution",
    status: "preserved-one-shot-batch-09-debate-170-archive-mirror-source-recovery-failure",
    batchNumber: 9,
    planSha256: plan ? await fileHash(planPath) : null,
    activationSha256: activation ? await fileHash(activationPath) : null,
    state,
    failure: { name: error?.name || "Error", message: error?.message || String(error), code: error?.code || null }
  };
  const analysis = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-09-archive-mirror-source-recovery-12-analysis",
    status: "batch-09-debate-170-archive-mirror-source-recovery-failed-preserved",
    batchNumber: 9,
    result: { sourcesInstalled: state.sourcesInstalled, clipsCreated: state.clipsCreated, debates19And183RemainUnattempted: true },
    preservedControls: { retries: 0, audioPlaybackObservedSeconds: 0, semanticAudioEvaluationPerformed: false, modelContexts: 0, paidServiceCalls: 0, directIncrementalCostUsd: 0 },
    failure: failure.failure,
    nextAuthorizedAction: "stop-on-archive-mirror-source-recovery-failure"
  };
  await writeJson(executionPath, failure);
  await writeJson(analysisPath, analysis);
  console.error(JSON.stringify(failure.failure));
  process.exitCode = 1;
}
