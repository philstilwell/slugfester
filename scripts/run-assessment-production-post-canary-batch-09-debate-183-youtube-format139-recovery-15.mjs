#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("../", import.meta.url).pathname);
const rel = (path) => resolve(root, path);
const base = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-youtube-format139-recovery-15";
const planPath = `${base}/recovery-plan.json`;
const activationPath = `${base}/execution-activation.json`;
const executionPath = `${base}/execution.json`;
const analysisPath = `${base}/analysis.json`;
const downloadDirectory = ".assessment-cache/audio-source-mirrors/youtube-direct/2WrywAaDvvw";
const outputTemplate = `${downloadDirectory}/source.%(ext)s`;
const expectedRawPath = `${downloadDirectory}/source.m4a`;

const read = (path) => readFile(rel(path));
const readJson = async (path) => JSON.parse(await read(path));
const hash = async (path) => createHash("sha256").update(await read(path)).digest("hex");
const writeJson = async (path, value) => {
  await mkdir(dirname(rel(path)), { recursive: true });
  await writeFile(rel(path), `${JSON.stringify(value, null, 2)}\n`);
};
const probeDuration = (path) => {
  const stdout = execFileSync("/opt/homebrew/bin/ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", rel(path)], { encoding: "utf8", maxBuffer: 1024 * 1024 });
  const value = Number(stdout.trim());
  assert(Number.isFinite(value), "download duration unavailable");
  return value;
};

const plan = await readJson(planPath);
const activation = await readJson(activationPath);
assert.equal(activation.plan.sha256, await hash(planPath));
for (const [path, expected] of Object.entries(plan.authenticatedInputs)) assert.equal(await hash(path), expected, `${path} hash mismatch`);
for (const [path, expected] of Object.entries(plan.sourceHashes)) assert.equal(await hash(path), expected, `${path} source hash mismatch`);
for (const [path, expected] of Object.entries(activation.sourceHashes)) assert.equal(await hash(path), expected, `${path} activation source hash mismatch`);

const state = {
  attempts: 1,
  ytDlpCliInvocations: 0,
  downloadAttempts: 0,
  downloadsCompleted: 0,
  formatId: "139",
  retries: 0,
  fragmentRetries: 0,
  extractorRetries: 0,
  fileAccessRetries: 0,
  reruns: 0,
  timeoutExtensions: 0,
  audioPlaybackCalls: 0,
  semanticAudioEvaluations: 0,
  browserSessionUses: 0,
  modelContexts: 0,
  transcriptionCalls: 0,
  paidServiceCalls: 0,
  directIncrementalCostUsd: 0
};

try {
  await mkdir(rel(downloadDirectory), { recursive: true });
  const preexisting = await readdir(rel(downloadDirectory));
  assert.deepEqual(preexisting, [], "direct-source recovery directory is not empty");
  state.ytDlpCliInvocations = 1;
  state.downloadAttempts = 1;
  execFileSync("python3", [
    "-m", "yt_dlp",
    "--no-playlist",
    "--quiet",
    "--no-warnings",
    "--no-continue",
    "--retries", "0",
    "--fragment-retries", "0",
    "--extractor-retries", "0",
    "--file-access-retries", "0",
    "--socket-timeout", "60",
    "--extractor-args", "youtube:player_client=android_vr",
    "-f", "139",
    "-o", rel(outputTemplate),
    "https://www.youtube.com/watch?v=2WrywAaDvvw"
  ], { encoding: "utf8", timeout: 600000, maxBuffer: 16 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  const files = await readdir(rel(downloadDirectory));
  assert.deepEqual(files, ["source.m4a"], "expected exactly one completed format-139 download");
  const rawDurationSeconds = probeDuration(expectedRawPath);
  assert(Math.abs(rawDurationSeconds - 4200) <= 12, `raw duration ${rawDurationSeconds} outside tolerance`);
  state.downloadsCompleted = 1;
  const execution = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-09-debate-183-youtube-format139-recovery-15-execution",
    status: "completed-one-shot-batch-09-debate-183-youtube-format139-public-source-download",
    batchNumber: 9,
    planSha256: await hash(planPath),
    activationSha256: await hash(activationPath),
    state,
    result: {
      sourceVideoId: "2WrywAaDvvw",
      sourceTitle: "Moral Realism Debate: Prof. David Enoch vs Dr. Justin Clarke-Doane",
      rawPath: expectedRawPath,
      rawBytes: (await stat(rel(expectedRawPath))).size,
      rawSha256: await hash(expectedRawPath),
      rawDurationSeconds
    }
  };
  const analysis = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-09-debate-183-youtube-format139-recovery-15-analysis",
    status: "batch-09-debate-183-exact-youtube-format139-source-downloaded-for-local-finalization",
    batchNumber: 9,
    result: { directSourceAccepted: true, rawDownloadsCompleted: 1, normalizedSourcesInstalled: 0, clipsCreated: 0, localFinalizationPending: true },
    preservedControls: { retries: 0, audioPlaybackCalls: 0, semanticAudioEvaluationPerformed: false, browserSessionUses: 0, modelContexts: 0, paidServiceCalls: 0, directIncrementalCostUsd: 0 },
    nextAuthorizedAction: "prepare-freeze-and-run-one-local-debate-183-source-normalization-and-two-clip-finalization-pass"
  };
  await writeJson(executionPath, execution);
  await writeJson(analysisPath, analysis);
  console.log(JSON.stringify({ status: execution.status, rawBytes: execution.result.rawBytes, rawDurationSeconds }));
} catch (error) {
  const files = await readdir(rel(downloadDirectory)).catch(() => []);
  const failure = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-09-debate-183-youtube-format139-recovery-15-execution",
    status: "preserved-one-shot-batch-09-debate-183-youtube-format139-download-failure",
    batchNumber: 9,
    planSha256: await hash(planPath),
    activationSha256: await hash(activationPath),
    state,
    preservedFiles: files,
    failure: { name: error?.name || "Error", message: error?.message || String(error), code: error?.status ?? error?.code ?? null, stderr: String(error?.stderr || "").slice(-8000) }
  };
  const analysis = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-09-debate-183-youtube-format139-recovery-15-analysis",
    status: "batch-09-debate-183-youtube-format139-download-failed-preserved",
    batchNumber: 9,
    result: { directSourceAccepted: false, rawDownloadsCompleted: 0, preservedFiles: files },
    preservedControls: { retries: 0, timeoutExtensions: 0, audioPlaybackCalls: 0, semanticAudioEvaluationPerformed: false, browserSessionUses: 0, modelContexts: 0, paidServiceCalls: 0, directIncrementalCostUsd: 0 },
    failure: failure.failure,
    nextAuthorizedAction: "stop-and-diagnose-preserved-direct-source-failure"
  };
  await writeJson(executionPath, failure);
  await writeJson(analysisPath, analysis);
  console.error(JSON.stringify({ name: failure.failure.name, message: failure.failure.message, code: failure.failure.code }));
  process.exitCode = 1;
}
