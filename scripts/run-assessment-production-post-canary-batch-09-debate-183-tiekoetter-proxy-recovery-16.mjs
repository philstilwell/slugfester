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
const planPath = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-tiekoetter-proxy-recovery-16/recovery-plan.json";
const activationPath = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-tiekoetter-proxy-recovery-16/execution-activation.json";
const executionPath = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-tiekoetter-proxy-recovery-16/execution.json";
const analysisPath = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-tiekoetter-proxy-recovery-16/analysis.json";
const manifestPath = ".assessment-cache/proxy-metadata/piped/2WrywAaDvvw/tiekoetter-manifest.mpd";
const watchPagePath = ".assessment-cache/proxy-metadata/piped/2WrywAaDvvw/tiekoetter-watch.html";
const companionOrigin = "https://eu-de1.companion.invidious.tiekoetter.com";
const rawPartPath = ".assessment-cache/audio-source-mirrors/tiekoetter/2WrywAaDvvw/source.attempt-1.part";
const rawFinalPath = ".assessment-cache/audio-source-mirrors/tiekoetter/2WrywAaDvvw/source.m4a";
const sourceTempPath = "output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-183/audio/source.tiekoetter-proxy-recovery-16.tmp.mp3";
const sourceFinalPath = "output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-183/audio/source.mp3";
const clipSpecs = [
  {
    moveId: "con-informed-deliberator-method",
    startSeconds: 3224.140,
    durationSeconds: 62.120
  },
  {
    moveId: "con-foundational-anomaly-significance",
    startSeconds: 3329.500,
    durationSeconds: 316.760
  }
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const read = (path) => readFile(rel(path));
const readJson = async (path) => JSON.parse(await read(path));
const fileHash = async (path) => sha256(await read(path));
const exists = async (path) => stat(rel(path)).then(() => true, () => false);
const writeJson = async (path, value) => {
  await mkdir(dirname(rel(path)), { recursive: true });
  await writeFile(rel(path), `${JSON.stringify(value, null, 2)}\n`);
};
const decodeXml = (value) => value
  .replaceAll("&amp;", "&")
  .replaceAll("&quot;", "\"")
  .replaceAll("&apos;", "'")
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">");
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
const selectedProxyUrl = async (plan) => {
  const mpd = (await read(manifestPath)).toString("utf8");
  assert.match(mpd, /mediaPresentationDuration="PT4200\.332S"/);
  const adaptationSets = [...mpd.matchAll(/<AdaptationSet\b([^>]*)>([\s\S]*?)<\/AdaptationSet>/g)];
  let relativeUrl = null;
  for (const [, attributes, body] of adaptationSets) {
    if (!/\bid="0"/.test(attributes) || !/mimeType="audio\/mp4"/.test(attributes)) continue;
    const representation = body.match(/<Representation\b(?=[^>]*\bid="140")(?=[^>]*\bbandwidth="134242")[^>]*>[\s\S]*?<BaseURL>([^<]+)<\/BaseURL>[\s\S]*?<\/Representation>/);
    if (representation) relativeUrl = decodeXml(representation[1]);
  }
  assert(relativeUrl, "frozen non-DRC audio representation 140 missing");
  assert.equal(relativeUrl.length, plan.proxyRepresentation.relativeUrlLength);
  assert.equal(sha256(relativeUrl), plan.proxyRepresentation.relativeUrlSha256);
  const absoluteUrl = new URL(relativeUrl, companionOrigin).toString();
  assert.equal(absoluteUrl.length, plan.proxyRepresentation.absoluteUrlLength);
  assert.equal(sha256(absoluteUrl), plan.proxyRepresentation.absoluteUrlSha256);
  const parsed = new URL(absoluteUrl);
  assert.equal(parsed.origin, companionOrigin);
  assert.equal(parsed.pathname, "/companion/videoplayback");
  assert.equal(parsed.searchParams.get("itag"), "140");
  assert.equal(parsed.searchParams.get("clen"), String(plan.proxyRepresentation.expectedBytes));
  assert.equal(parsed.searchParams.get("dur"), "4200.396");
  assert.equal(parsed.searchParams.get("mime"), "audio/mp4");
  assert.equal(parsed.searchParams.get("expire"), plan.proxyRepresentation.expiresUnix);
  return absoluteUrl;
};

const state = {
  attempts: 1,
  proxyMetadataRequestsDuringExecution: 0,
  proxyMediaDownloadAttempts: 0,
  redirectFollows: 0,
  sourceBytesAccepted: 0,
  sourcesInstalled: 0,
  clipsCreated: 0,
  retries: 0,
  reruns: 0,
  timeoutExtensions: 0,
  cookiesSent: 0,
  accountDataUses: 0,
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
  for (const [path, expected] of Object.entries(plan.sourceHashes)) assert.equal(await fileHash(path), expected, `${path} source hash mismatch`);
  for (const [path, expected] of Object.entries(activation.sourceHashes)) assert.equal(await fileHash(path), expected, `${path} activation source hash mismatch`);
  const watchPage = (await read(watchPagePath)).toString("utf8");
  assert(watchPage.includes("<title>Moral Realism Debate: Prof. David Enoch vs Dr. Justin Clarke-Doane - Invidious</title>"));
  assert(watchPage.includes("2WrywAaDvvw"));
  const mediaUrl = await selectedProxyUrl(plan);

  for (const path of [rawPartPath, rawFinalPath, sourceTempPath, sourceFinalPath]) {
    assert.equal(await exists(path), false, `${path} already exists`);
  }
  for (const clip of clipSpecs) {
    const finalPath = `output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-183/clips/${clip.moveId}.mp3`;
    const tempPath = `output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-183/clips/${clip.moveId}.tiekoetter-proxy-recovery-16.tmp.mp3`;
    assert.equal(await exists(finalPath), false, `${finalPath} already exists`);
    assert.equal(await exists(tempPath), false, `${tempPath} already exists`);
  }

  await mkdir(dirname(rel(rawPartPath)), { recursive: true });
  state.proxyMediaDownloadAttempts = 1;
  const response = await fetch(mediaUrl, {
    method: "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(plan.executionPolicy.requestTimeoutMs),
    headers: {
      "accept": "audio/mp4,application/octet-stream;q=0.9,*/*;q=0.1",
      "user-agent": "SLUGFESTER-audio-source-audit/1.0"
    }
  });
  assert.equal(response.status, 200, `proxy media returned HTTP ${response.status}`);
  assert.equal(response.redirected, false, "proxy media request redirected");
  const reportedLength = response.headers.get("content-length");
  if (reportedLength !== null) assert.equal(Number(reportedLength), plan.proxyRepresentation.expectedBytes, "proxy content-length mismatch");
  assert(response.body, "proxy response body missing");

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
  assert.equal(state.sourceBytesAccepted, plan.proxyRepresentation.expectedBytes, "downloaded proxy byte count mismatch");
  const rawSha256 = rawHash.digest("hex");
  await rename(rel(rawPartPath), rel(rawFinalPath));
  const rawProbe = await probe(rawFinalPath);
  assert(Math.abs(rawProbe.durationSeconds - 4200.396) <= 0.5, `raw source duration ${rawProbe.durationSeconds} outside tolerance`);
  assert(rawProbe.streams.some((stream) => stream.codec_type === "audio" && stream.codec_name === "aac"), "raw source AAC stream missing");

  await mkdir(dirname(rel(sourceTempPath)), { recursive: true });
  await execFileAsync("/opt/homebrew/bin/ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-nostdin", "-i", rel(rawFinalPath), "-vn",
    "-ac", "1", "-ar", "16000", "-b:a", "48k", "-map_metadata", "-1", "-n", rel(sourceTempPath)
  ], { maxBuffer: 16 * 1024 * 1024 });
  const sourceProbe = await probe(sourceTempPath);
  assert(Math.abs(sourceProbe.durationSeconds - 4200.396) <= 0.5, `normalized source duration ${sourceProbe.durationSeconds} outside tolerance`);
  await rename(rel(sourceTempPath), rel(sourceFinalPath));
  state.sourcesInstalled = 1;

  const clips = [];
  for (const clip of clipSpecs) {
    const finalPath = `output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-183/clips/${clip.moveId}.mp3`;
    const tempPath = `output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-183/clips/${clip.moveId}.tiekoetter-proxy-recovery-16.tmp.mp3`;
    await mkdir(dirname(rel(tempPath)), { recursive: true });
    await execFileAsync("/opt/homebrew/bin/ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-nostdin", "-i", rel(sourceFinalPath),
      "-ss", clip.startSeconds.toFixed(3), "-t", clip.durationSeconds.toFixed(3),
      "-ac", "1", "-ar", "16000", "-b:a", "64k", "-map_metadata", "-1", "-n", rel(tempPath)
    ], { maxBuffer: 16 * 1024 * 1024 });
    const clipProbe = await probe(tempPath);
    assert(Math.abs(clipProbe.durationSeconds - clip.durationSeconds) <= 0.25, `${clip.moveId} duration outside tolerance`);
    await rename(rel(tempPath), rel(finalPath));
    state.clipsCreated += 1;
    clips.push({
      moveId: clip.moveId,
      path: finalPath,
      bytes: (await stat(rel(finalPath))).size,
      sha256: await fileHash(finalPath),
      durationSeconds: clipProbe.durationSeconds
    });
  }

  const execution = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-09-debate-183-tiekoetter-proxy-recovery-16-execution",
    status: "completed-one-shot-batch-09-debate-183-tiekoetter-proxy-source-and-two-clips",
    batchNumber: 9,
    planSha256: await fileHash(planPath),
    activationSha256: await fileHash(activationPath),
    state,
    result: {
      videoId: "2WrywAaDvvw",
      provider: "Invidious Tiekoetter companion",
      representationId: "140",
      rawCachePath: rawFinalPath,
      rawBytes: state.sourceBytesAccepted,
      rawSha256,
      rawDurationSeconds: rawProbe.durationSeconds,
      sourcePath: sourceFinalPath,
      sourceBytes: (await stat(rel(sourceFinalPath))).size,
      sourceSha256: await fileHash(sourceFinalPath),
      sourceDurationSeconds: sourceProbe.durationSeconds,
      clips
    }
  };
  const analysis = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-09-debate-183-tiekoetter-proxy-recovery-16-analysis",
    status: "batch-09-debate-183-exact-public-proxy-source-and-two-frozen-clips-recovered",
    batchNumber: 9,
    result: {
      exactVideoIdentityAccepted: true,
      newlyVettedFreeNoAccountProxyAccepted: true,
      sourcesInstalled: 1,
      clipsCreated: 2,
      debate170SourceAndClipPreserved: true,
      debate19RemainsUnattempted: true,
      completeThreeSourceFourClipCohortValidated: false
    },
    preservedControls: {
      retries: 0,
      redirectsFollowed: 0,
      cookiesSent: 0,
      accountDataUses: 0,
      audioPlaybackObservedSeconds: 0,
      semanticAudioEvaluationPerformed: false,
      modelContexts: 0,
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0,
      transcriptPacketsChanged: false,
      judgmentsChanged: false,
      scoresChanged: false,
      productionChanged: false
    },
    nextAuthorizedAction: "prepare-freeze-and-run-the-untouched-debate-19-official-podcast-source-work"
  };
  await writeJson(executionPath, execution);
  await writeJson(analysisPath, analysis);
  console.log(JSON.stringify({ status: execution.status, rawBytes: state.sourceBytesAccepted, rawSha256, sourceDurationSeconds: sourceProbe.durationSeconds, clips: clips.map(({ moveId, durationSeconds }) => ({ moveId, durationSeconds })) }));
} catch (error) {
  const failure = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-09-debate-183-tiekoetter-proxy-recovery-16-execution",
    status: "preserved-final-batch-09-debate-183-tiekoetter-proxy-source-recovery-failure",
    batchNumber: 9,
    planSha256: plan ? await fileHash(planPath) : null,
    activationSha256: activation ? await fileHash(activationPath) : null,
    state,
    failure: { name: error?.name || "Error", message: error?.message || String(error), code: error?.code || null }
  };
  const analysis = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-09-debate-183-tiekoetter-proxy-recovery-16-analysis",
    status: "batch-09-debate-183-final-authorized-public-proxy-recovery-failed-stop-required",
    batchNumber: 9,
    result: { sourcesInstalled: state.sourcesInstalled, clipsCreated: state.clipsCreated, debate19RemainsUnattempted: true },
    preservedControls: { retries: 0, redirectsFollowed: 0, cookiesSent: 0, accountDataUses: 0, audioPlaybackObservedSeconds: 0, semanticAudioEvaluationPerformed: false, modelContexts: 0, paidServiceCalls: 0, directIncrementalCostUsd: 0 },
    failure: failure.failure,
    nextAuthorizedAction: "stop-on-final-debate-183-proxy-recovery-failure"
  };
  await writeJson(executionPath, failure);
  await writeJson(analysisPath, analysis);
  console.error(JSON.stringify(failure.failure));
  process.exitCode = 1;
}
