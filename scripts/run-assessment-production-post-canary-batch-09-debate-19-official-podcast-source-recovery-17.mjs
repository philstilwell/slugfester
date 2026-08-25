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
const stageRoot = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-debate-19-official-podcast-recovery-17";
const planPath = `${stageRoot}/recovery-plan.json`;
const activationPath = `${stageRoot}/execution-activation.json`;
const executionPath = `${stageRoot}/execution.json`;
const analysisPath = `${stageRoot}/analysis.json`;
const rawPartPath = ".assessment-cache/audio-source-mirrors/official-podcast/109253941/source.attempt-1.part";
const rawFinalPath = ".assessment-cache/audio-source-mirrors/official-podcast/109253941/source.mp3";
const sourceTempPath = "output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-19/audio/source.official-podcast-recovery-17.tmp.mp3";
const sourceFinalPath = "output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-19/audio/source.mp3";
const clipTempPath = "output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-19/clips/pro-c009-phenomenal-value-reality.official-podcast-recovery-17.tmp.mp3";
const clipFinalPath = "output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-19/clips/pro-c009-phenomenal-value-reality.mp3";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const read = (path) => readFile(rel(path));
const readJson = async (path) => JSON.parse(await read(path));
const fileHash = async (path) => sha256(await read(path));
const exists = async (path) => stat(rel(path)).then(() => true, () => false);
const writeJson = async (path, value) => {
  await mkdir(dirname(rel(path)), { recursive: true });
  await writeFile(rel(path), `${JSON.stringify(value, null, 2)}\n`);
};
const probe = async (path) => {
  const { stdout } = await execFileAsync("/opt/homebrew/bin/ffprobe", [
    "-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name,channels,sample_rate",
    "-of", "json", rel(path)
  ], { maxBuffer: 1024 * 1024 });
  const parsed = JSON.parse(stdout);
  const durationSeconds = Number(parsed.format?.duration);
  assert(Number.isFinite(durationSeconds), `${path} duration unavailable`);
  return { durationSeconds, streams: parsed.streams || [] };
};

const state = {
  attempts: 1,
  officialPodcastMediaDownloadAttempts: 0,
  logicalRedirectObserved: 0,
  sourceBytesAccepted: 0,
  sourcesInstalled: 0,
  clipsCreated: 0,
  retries: 0,
  reruns: 0,
  timeoutExtensions: 0,
  audioPlaybackObservedSeconds: 0,
  semanticAudioEvaluations: 0,
  modelContexts: 0,
  transcriptionCalls: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0
};

let plan;
let activation;
try {
  plan = await readJson(planPath);
  activation = await readJson(activationPath);
  assert.equal(activation.plan.sha256, await fileHash(planPath));
  for (const [path, expected] of Object.entries(plan.authenticatedInputs)) assert.equal(await fileHash(path), expected, `${path} hash mismatch`);
  for (const [path, expected] of Object.entries(plan.sourceHashes)) assert.equal(await fileHash(path), expected, `${path} source hash mismatch`);
  for (const [path, expected] of Object.entries(activation.sourceHashes)) assert.equal(await fileHash(path), expected, `${path} activation source hash mismatch`);
  for (const path of [rawPartPath, rawFinalPath, sourceTempPath, sourceFinalPath, clipTempPath, clipFinalPath]) {
    assert.equal(await exists(path), false, `${path} already exists`);
  }

  const rss = (await read(plan.officialPodcast.rssPath)).toString("utf8");
  assert(rss.includes(`<guid isPermaLink="false">${plan.officialPodcast.guid}</guid>`));
  assert(rss.includes(`<itunes:duration>${plan.officialPodcast.duration}</itunes:duration>`));
  assert(rss.includes(plan.officialPodcast.enclosureUrl.replaceAll("&", "&amp;")) || rss.includes(plan.officialPodcast.enclosureUrl));

  await mkdir(dirname(rel(rawPartPath)), { recursive: true });
  state.officialPodcastMediaDownloadAttempts = 1;
  const response = await fetch(plan.officialPodcast.enclosureUrl, {
    method: "GET",
    redirect: "follow",
    signal: AbortSignal.timeout(plan.executionPolicy.requestTimeoutMs),
    headers: {
      "accept": "audio/mpeg,application/octet-stream;q=0.9,*/*;q=0.1",
      "user-agent": "SLUGFESTER-audio-source-audit/1.0"
    }
  });
  assert.equal(response.status, 200, `official podcast media returned HTTP ${response.status}`);
  state.logicalRedirectObserved = response.redirected ? 1 : 0;
  const reportedLength = response.headers.get("content-length");
  if (reportedLength !== null) assert.equal(Number(reportedLength), plan.officialPodcast.enclosureBytes, "official podcast content-length mismatch");
  assert(response.body, "official podcast response body missing");

  const rawHash = createHash("sha256");
  const handle = await open(rel(rawPartPath), "wx");
  try {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      rawHash.update(value);
      await handle.write(value);
      state.sourceBytesAccepted += value.byteLength;
    }
  } finally {
    await handle.close();
  }
  assert.equal(state.sourceBytesAccepted, plan.officialPodcast.enclosureBytes, "official podcast downloaded byte count mismatch");
  const rawSha256 = rawHash.digest("hex");
  await rename(rel(rawPartPath), rel(rawFinalPath));
  const rawProbe = await probe(rawFinalPath);
  assert(Math.abs(rawProbe.durationSeconds - plan.officialPodcast.expectedDurationSeconds) <= plan.officialPodcast.durationToleranceSeconds, `official podcast duration ${rawProbe.durationSeconds} outside tolerance`);
  assert(rawProbe.streams.some((stream) => stream.codec_type === "audio" && stream.codec_name === "mp3"), "official podcast MP3 stream missing");

  await mkdir(dirname(rel(sourceTempPath)), { recursive: true });
  await execFileAsync("/opt/homebrew/bin/ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-nostdin", "-i", rel(rawFinalPath), "-vn",
    "-ac", "1", "-ar", "16000", "-b:a", "48k", "-map_metadata", "-1", "-n", rel(sourceTempPath)
  ], { maxBuffer: 16 * 1024 * 1024 });
  const sourceProbe = await probe(sourceTempPath);
  assert(Math.abs(sourceProbe.durationSeconds - rawProbe.durationSeconds) <= 0.5, "normalized source duration mismatch");
  await rename(rel(sourceTempPath), rel(sourceFinalPath));
  state.sourcesInstalled = 1;

  await mkdir(dirname(rel(clipTempPath)), { recursive: true });
  await execFileAsync("/opt/homebrew/bin/ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-nostdin", "-i", rel(sourceFinalPath),
    "-ss", (plan.deterministicAlignment.paddedPodcastClipStartMs / 1000).toFixed(3),
    "-t", (plan.deterministicAlignment.paddedPodcastClipDurationMs / 1000).toFixed(3),
    "-ac", "1", "-ar", "16000", "-b:a", "64k", "-map_metadata", "-1", "-n", rel(clipTempPath)
  ], { maxBuffer: 16 * 1024 * 1024 });
  const clipProbe = await probe(clipTempPath);
  const expectedClipDurationSeconds = plan.deterministicAlignment.paddedPodcastClipDurationMs / 1000;
  assert(Math.abs(clipProbe.durationSeconds - expectedClipDurationSeconds) <= 0.25, `official podcast clip duration ${clipProbe.durationSeconds} outside tolerance`);
  await rename(rel(clipTempPath), rel(clipFinalPath));
  state.clipsCreated = 1;

  const execution = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-09-debate-19-official-podcast-source-recovery-17-execution",
    status: "completed-one-shot-batch-09-debate-19-official-podcast-source-and-frozen-aligned-clip",
    batchNumber: 9,
    planSha256: await fileHash(planPath),
    activationSha256: await fileHash(activationPath),
    state,
    result: {
      episodeGuid: plan.officialPodcast.guid,
      rawCachePath: rawFinalPath,
      rawBytes: state.sourceBytesAccepted,
      rawSha256,
      rawDurationSeconds: rawProbe.durationSeconds,
      sourcePath: sourceFinalPath,
      sourceBytes: (await stat(rel(sourceFinalPath))).size,
      sourceSha256: await fileHash(sourceFinalPath),
      sourceDurationSeconds: sourceProbe.durationSeconds,
      clip: {
        moveId: "pro-c009-phenomenal-value-reality",
        path: clipFinalPath,
        bytes: (await stat(rel(clipFinalPath))).size,
        sha256: await fileHash(clipFinalPath),
        durationSeconds: clipProbe.durationSeconds,
        startMs: plan.deterministicAlignment.paddedPodcastClipStartMs,
        endMs: plan.deterministicAlignment.paddedPodcastClipEndMs
      }
    }
  };
  const analysis = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-09-debate-19-official-podcast-source-recovery-17-analysis",
    status: "batch-09-debate-19-official-podcast-source-and-caption-aligned-frozen-clip-recovered",
    batchNumber: 9,
    result: {
      officialPodcastIdentityAccepted: true,
      sourcesInstalled: 1,
      clipsCreated: 1,
      debate170SourceAndClipPreserved: true,
      debate183SourceFailurePreservedAndDeferred: true,
      availableAudioVerificationClips: 2,
      requiredAudioVerificationClipsBlockedByDebate183: 2,
      completeFourClipCohortValidated: false
    },
    preservedControls: {
      retries: 0,
      audioPlaybackObservedSeconds: 0,
      semanticAudioEvaluationPerformed: false,
      modelContexts: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0,
      judgmentsChanged: false,
      scoresChanged: false,
      productionChanged: false
    },
    nextAuthorizedAction: "prepare-validate-freeze-and-report-a-two-available-clip-audio-verification-manifest-while-preserving-the-two-debate-183-blockers"
  };
  await writeJson(executionPath, execution);
  await writeJson(analysisPath, analysis);
  console.log(JSON.stringify({ status: execution.status, rawBytes: state.sourceBytesAccepted, rawSha256, sourceDurationSeconds: sourceProbe.durationSeconds, clipDurationSeconds: clipProbe.durationSeconds }));
} catch (error) {
  const failure = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-09-debate-19-official-podcast-source-recovery-17-execution",
    status: "preserved-one-shot-batch-09-debate-19-official-podcast-source-recovery-failure",
    batchNumber: 9,
    planSha256: plan ? await fileHash(planPath) : null,
    activationSha256: activation ? await fileHash(activationPath) : null,
    state,
    failure: { name: error?.name || "Error", message: error?.message || String(error), code: error?.code || null }
  };
  const analysis = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-09-debate-19-official-podcast-source-recovery-17-analysis",
    status: "batch-09-debate-19-official-podcast-source-recovery-failed-stop-required",
    batchNumber: 9,
    result: { sourcesInstalled: state.sourcesInstalled, clipsCreated: state.clipsCreated, debate183FailureRemainsPreserved: true },
    preservedControls: { retries: 0, audioPlaybackObservedSeconds: 0, semanticAudioEvaluationPerformed: false, modelContexts: 0, paidServiceCalls: 0, directIncrementalCostUsd: 0 },
    failure: failure.failure,
    nextAuthorizedAction: "stop-on-debate-19-official-podcast-source-recovery-failure"
  };
  await writeJson(executionPath, failure);
  await writeJson(analysisPath, analysis);
  console.error(JSON.stringify(failure.failure));
  process.exitCode = 1;
}
