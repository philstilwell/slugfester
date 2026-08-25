#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { copyFile, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(new URL("../", import.meta.url).pathname);
const rel = (path) => resolve(root, path);
const base = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-invidious-low-bitrate-correction-14";
const planPath = `${base}/correction-plan.json`;
const activationPath = `${base}/execution-activation.json`;
const executionPath = `${base}/execution.json`;
const analysisPath = `${base}/analysis.json`;
const rawCachePath = ".assessment-cache/audio-source-mirrors/invidious-nerdvpn/2WrywAaDvvw/source.webm";
const sourceTempPath = "output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-183/audio/source.invidious-low-bitrate-correction-14.tmp.mp3";
const sourceFinalPath = "output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-183/audio/source.mp3";
const clips = [
  { moveId: "con-informed-deliberator-method", startSeconds: "3224.140", durationSeconds: "62.120", expectedDurationSeconds: 62.12 },
  { moveId: "con-foundational-anomaly-significance", startSeconds: "3329.500", durationSeconds: "316.760", expectedDurationSeconds: 316.76 }
];

const downloadPath = process.argv[2];
if (!downloadPath) throw new Error("Usage: node scripts/finalize-assessment-production-post-canary-batch-09-invidious-low-bitrate-correction-14.mjs <browser-download-path>");

const read = (path) => readFile(rel(path));
const readJson = async (path) => JSON.parse(await read(path));
const fileHash = async (path) => createHash("sha256").update(await readFile(path.startsWith("/") ? path : rel(path))).digest("hex");
const exists = async (path) => stat(path.startsWith("/") ? path : rel(path)).then(() => true, () => false);
const writeJson = async (path, value) => {
  await mkdir(dirname(rel(path)), { recursive: true });
  await writeFile(rel(path), `${JSON.stringify(value, null, 2)}\n`);
};
const probeDuration = async (path) => {
  const target = path.startsWith("/") ? path : rel(path);
  const { stdout } = await execFileAsync("/opt/homebrew/bin/ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", target], { maxBuffer: 1024 * 1024 });
  const value = Number(stdout.trim());
  assert(Number.isFinite(value), `${path} duration unavailable`);
  return value;
};

const state = {
  correctionAttempts: 1,
  optionSelections: 1,
  selectedOptionLabel: "audio/webm @ 59.142k - audio only",
  downloadButtonClicks: 1,
  downloadAttempts: 1,
  downloadsCompleted: 1,
  sourcesInstalled: 0,
  clipsCreated: 0,
  retries: 0,
  reruns: 0,
  timeoutExtensions: 0,
  audioPlaybackObservedSeconds: 0,
  semanticAudioEvaluations: 0,
  browserCookiesInspected: 0,
  browserCookiesExported: 0,
  browserStorageInspected: 0,
  youtubeAccountIdentifiersRead: 0,
  modelContexts: 0,
  transcriptionCalls: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0,
  temporaryTabClosed: true
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
  assert.equal(await exists(downloadPath), true, "browser download path missing");
  assert.equal(await exists(rawCachePath), false, "raw cache path already exists");
  assert.equal(await exists(sourceTempPath), false, "source temp path already exists");
  assert.equal(await exists(sourceFinalPath), false, "source final path already exists");
  for (const clip of clips) {
    clip.tempPath = `output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-183/clips/${clip.moveId}.invidious-low-bitrate-correction-14.tmp.mp3`;
    clip.finalPath = `output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-183/clips/${clip.moveId}.mp3`;
    assert.equal(await exists(clip.tempPath), false, `${clip.moveId} temp path already exists`);
    assert.equal(await exists(clip.finalPath), false, `${clip.moveId} final path already exists`);
  }

  await mkdir(dirname(rel(rawCachePath)), { recursive: true });
  await mkdir(dirname(rel(sourceTempPath)), { recursive: true });
  for (const clip of clips) await mkdir(dirname(rel(clip.tempPath)), { recursive: true });
  await copyFile(downloadPath, rel(rawCachePath));
  const rawBytes = (await stat(rel(rawCachePath))).size;
  const rawSha256 = await fileHash(rawCachePath);
  const rawDurationSeconds = await probeDuration(rawCachePath);
  assert(Math.abs(rawDurationSeconds - 4200) <= 12, `raw duration ${rawDurationSeconds} outside tolerance`);

  await execFileAsync("/opt/homebrew/bin/ffmpeg", ["-hide_banner", "-loglevel", "error", "-nostdin", "-i", rel(rawCachePath), "-vn", "-ac", "1", "-ar", "16000", "-b:a", "48k", "-map_metadata", "-1", "-n", rel(sourceTempPath)], { maxBuffer: 16 * 1024 * 1024 });
  const sourceDurationSeconds = await probeDuration(sourceTempPath);
  assert(Math.abs(sourceDurationSeconds - 4200) <= 12, `source duration ${sourceDurationSeconds} outside tolerance`);
  await rename(rel(sourceTempPath), rel(sourceFinalPath));
  state.sourcesInstalled = 1;

  const clipResults = [];
  for (const clip of clips) {
    await execFileAsync("/opt/homebrew/bin/ffmpeg", ["-hide_banner", "-loglevel", "error", "-nostdin", "-i", rel(sourceFinalPath), "-ss", clip.startSeconds, "-t", clip.durationSeconds, "-ac", "1", "-ar", "16000", "-b:a", "64k", "-map_metadata", "-1", "-n", rel(clip.tempPath)], { maxBuffer: 16 * 1024 * 1024 });
    const durationSeconds = await probeDuration(clip.tempPath);
    assert(Math.abs(durationSeconds - clip.expectedDurationSeconds) <= 0.25, `${clip.moveId} duration ${durationSeconds} outside tolerance`);
    await rename(rel(clip.tempPath), rel(clip.finalPath));
    state.clipsCreated += 1;
    clipResults.push({ moveId: clip.moveId, path: clip.finalPath, bytes: (await stat(rel(clip.finalPath))).size, sha256: await fileHash(clip.finalPath), durationSeconds });
  }

  const execution = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-09-invidious-low-bitrate-correction-14-execution",
    status: "completed-one-shot-batch-09-debate-183-low-bitrate-invidious-source-and-two-clip-recovery",
    batchNumber: 9,
    planSha256: await fileHash(planPath),
    activationSha256: await fileHash(activationPath),
    state,
    result: {
      sourceVideoId: "2WrywAaDvvw",
      selectedOptionLabel: state.selectedOptionLabel,
      selectedOptionValue: "{\"itag\":249,\"ext\":\"webm\"}",
      rawCachePath,
      rawBytes,
      rawSha256,
      rawDurationSeconds,
      sourcePath: sourceFinalPath,
      sourceBytes: (await stat(rel(sourceFinalPath))).size,
      sourceSha256: await fileHash(sourceFinalPath),
      sourceDurationSeconds,
      clips: clipResults
    }
  };
  const analysis = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-09-invidious-low-bitrate-correction-14-analysis",
    status: "batch-09-debate-183-public-invidious-source-and-two-frozen-clips-recovered-after-bounded-transport-correction",
    batchNumber: 9,
    result: { debate183SourceAccepted: true, sourcesInstalled: 1, clipsCreated: 2, debate170AcceptedSourcePreserved: true, debate19RemainsUnattempted: true, completeThreeSourceFourClipCohortValidated: false },
    preservedControls: { transcriptPacketsChanged: false, judgmentsChanged: false, scoresChanged: false, productionChanged: false, audioPlaybackObservedSeconds: 0, semanticAudioEvaluationPerformed: false, youtubeAccountDataAccessed: false, modelContexts: 0, paidServiceCalls: 0, directIncrementalCostUsd: 0 },
    nextAuthorizedAction: "prepare-freeze-and-run-one-official-podcast-feed-alternate-source-recovery-for-untouched-debate-19"
  };
  await writeJson(executionPath, execution);
  await writeJson(analysisPath, analysis);
  console.log(JSON.stringify({ status: execution.status, rawBytes, rawDurationSeconds, sourceDurationSeconds, clips: clipResults.map(({ moveId, durationSeconds }) => ({ moveId, durationSeconds })) }));
} catch (error) {
  const failure = { schemaVersion: "1.0-assessment-production-post-canary-batch-09-invidious-low-bitrate-correction-14-execution", status: "preserved-one-shot-batch-09-debate-183-low-bitrate-invidious-correction-failure", batchNumber: 9, planSha256: plan ? await fileHash(planPath) : null, activationSha256: activation ? await fileHash(activationPath) : null, state, failure: { name: error?.name || "Error", message: error?.message || String(error), code: error?.code || null } };
  const analysis = { schemaVersion: "1.0-assessment-production-post-canary-batch-09-invidious-low-bitrate-correction-14-analysis", status: "batch-09-debate-183-low-bitrate-invidious-correction-failed-preserved", batchNumber: 9, result: { sourcesInstalled: state.sourcesInstalled, clipsCreated: state.clipsCreated, debate19RemainsUnattempted: true }, preservedControls: { retries: 0, audioPlaybackObservedSeconds: 0, semanticAudioEvaluationPerformed: false, youtubeAccountDataAccessed: false, modelContexts: 0, paidServiceCalls: 0, directIncrementalCostUsd: 0 }, failure: failure.failure, nextAuthorizedAction: "stop-on-second-invidious-source-recovery-failure" };
  await writeJson(executionPath, failure);
  await writeJson(analysisPath, analysis);
  console.error(JSON.stringify(failure.failure));
  process.exitCode = 1;
}
