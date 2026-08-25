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
const stage = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-debate-183-tiekoetter-range-recovery-19";
const planPath = `${stage}/recovery-plan.json`;
const activationPath = `${stage}/execution-activation.json`;
const executionPath = `${stage}/execution.json`;
const analysisPath = `${stage}/analysis.json`;
const manifestPath = ".assessment-cache/proxy-metadata/piped/2WrywAaDvvw/tiekoetter-range-19/manifest.mpd";
const watchPagePath = ".assessment-cache/proxy-metadata/piped/2WrywAaDvvw/tiekoetter-range-19/watch.html";
const preservedPrefixPath = ".assessment-cache/audio-source-mirrors/tiekoetter/2WrywAaDvvw/source.attempt-1.part";
const rangePartPath = ".assessment-cache/audio-source-mirrors/tiekoetter/2WrywAaDvvw/target-range.attempt-1.part";
const rangeFinalPath = ".assessment-cache/audio-source-mirrors/tiekoetter/2WrywAaDvvw/target-range.bin";
const fragmentPath = ".assessment-cache/audio-source-mirrors/tiekoetter/2WrywAaDvvw/target-range.m4a";
const normalizedTempPath = "output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-183/audio/target-range.tiekoetter-range-recovery-19.tmp.mp3";
const normalizedFinalPath = "output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-183/audio/target-range.mp3";
const companionOrigin = "https://eu-de1.companion.invidious.tiekoetter.com";
const clipSpecs = [
  { moveId: "con-informed-deliberator-method", absoluteStartSeconds: 3224.140, relativeStartSeconds: 9.105079365, durationSeconds: 62.120 },
  { moveId: "con-foundational-anomaly-significance", absoluteStartSeconds: 3329.500, relativeStartSeconds: 114.465079365, durationSeconds: 316.760 }
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
    "-v", "error", "-show_entries", "format=start_time,duration:stream=codec_type,codec_name,channels,sample_rate,start_time,duration",
    "-of", "json", rel(path)
  ], { maxBuffer: 1024 * 1024 });
  const parsed = JSON.parse(stdout);
  const durationSeconds = Number(parsed.format?.duration);
  assert(Number.isFinite(durationSeconds), `${path} duration unavailable`);
  return { startTimeSeconds: Number(parsed.format?.start_time), durationSeconds, streams: parsed.streams || [] };
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
  assert.equal(parsed.searchParams.get("clen"), String(plan.proxyRepresentation.expectedFullBytes));
  return absoluteUrl;
};

const state = {
  attempts: 1,
  proxyMediaRangeAttempts: 0,
  responseBytesAccepted: 0,
  rangeFilesAccepted: 0,
  fragmentFilesCreated: 0,
  boundedSourcesInstalled: 0,
  clipsCreated: 0,
  retries: 0,
  reruns: 0,
  timeoutExtensions: 0,
  redirectFollows: 0,
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
  assert.equal((await stat(rel(preservedPrefixPath))).size, plan.preservedPrefix.bytes);
  assert.equal(await fileHash(preservedPrefixPath), plan.preservedPrefix.sha256);
  const watchPage = (await read(watchPagePath)).toString("utf8");
  assert(watchPage.includes("<title>Moral Realism Debate: Prof. David Enoch vs Dr. Justin Clarke-Doane - Invidious</title>"));
  assert(watchPage.includes("2WrywAaDvvw"));
  const mediaUrl = await selectedProxyUrl(plan);

  for (const path of [rangePartPath, rangeFinalPath, fragmentPath, normalizedTempPath, normalizedFinalPath]) {
    assert.equal(await exists(path), false, `${path} already exists`);
  }
  for (const clip of clipSpecs) {
    const finalPath = `output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-183/clips/${clip.moveId}.mp3`;
    const tempPath = `output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-183/clips/${clip.moveId}.tiekoetter-range-recovery-19.tmp.mp3`;
    assert.equal(await exists(finalPath), false, `${finalPath} already exists`);
    assert.equal(await exists(tempPath), false, `${tempPath} already exists`);
  }

  await mkdir(dirname(rel(rangePartPath)), { recursive: true });
  state.proxyMediaRangeAttempts = 1;
  const response = await fetch(mediaUrl, {
    method: "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(plan.executionPolicy.requestTimeoutMs),
    headers: {
      accept: "audio/mp4,application/octet-stream;q=0.9,*/*;q=0.1",
      range: plan.byteRange.rangeHeader,
      "user-agent": "SLUGFESTER-audio-range-audit/1.0"
    }
  });
  assert.equal(response.status, 206, `proxy range returned HTTP ${response.status}`);
  assert.equal(response.redirected, false, "proxy range request redirected");
  assert.equal(response.headers.get("content-range"), plan.byteRange.expectedContentRange, "proxy content-range mismatch");
  const reportedLength = response.headers.get("content-length");
  if (reportedLength !== null) assert.equal(Number(reportedLength), plan.byteRange.expectedBytes, "proxy content-length mismatch");
  assert(response.body, "proxy range response body missing");

  const rangeHash = createHash("sha256");
  const handle = await open(rel(rangePartPath), "wx");
  try {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      rangeHash.update(value);
      await handle.write(value);
      state.responseBytesAccepted += value.byteLength;
    }
  } finally {
    await handle.close();
  }
  assert.equal(state.responseBytesAccepted, plan.byteRange.expectedBytes, "downloaded range byte count mismatch");
  const rangeSha256 = rangeHash.digest("hex");
  await rename(rel(rangePartPath), rel(rangeFinalPath));
  state.rangeFilesAccepted = 1;

  const prefix = await read(preservedPrefixPath);
  const range = await read(rangeFinalPath);
  const fragment = Buffer.concat([prefix.subarray(0, plan.preservedPrefix.initializationBytes), range]);
  await writeFile(rel(fragmentPath), fragment, { flag: "wx" });
  state.fragmentFilesCreated = 1;
  assert.equal((await stat(rel(fragmentPath))).size, plan.byteRange.expectedBytes + plan.preservedPrefix.initializationBytes);
  const fragmentProbe = await probe(fragmentPath);
  assert(fragmentProbe.streams.some((stream) => stream.codec_type === "audio" && stream.codec_name === "aac"), "ranged fragment AAC stream missing");

  await mkdir(dirname(rel(normalizedTempPath)), { recursive: true });
  await execFileAsync("/opt/homebrew/bin/ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-nostdin", "-copyts", "-start_at_zero", "-i", rel(fragmentPath), "-vn",
    "-ac", "1", "-ar", "16000", "-b:a", "48k", "-map_metadata", "-1", "-n", rel(normalizedTempPath)
  ], { maxBuffer: 16 * 1024 * 1024 });
  const normalizedProbe = await probe(normalizedTempPath);
  assert(Math.abs(normalizedProbe.durationSeconds - plan.byteRange.indexedDurationSeconds) <= plan.localProcessing.rangeDurationToleranceSeconds,
    `normalized range duration ${normalizedProbe.durationSeconds} outside tolerance`);
  await rename(rel(normalizedTempPath), rel(normalizedFinalPath));
  state.boundedSourcesInstalled = 1;

  const clips = [];
  for (const clip of clipSpecs) {
    const finalPath = `output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-183/clips/${clip.moveId}.mp3`;
    const tempPath = `output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-183/clips/${clip.moveId}.tiekoetter-range-recovery-19.tmp.mp3`;
    await mkdir(dirname(rel(tempPath)), { recursive: true });
    await execFileAsync("/opt/homebrew/bin/ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-nostdin", "-i", rel(normalizedFinalPath),
      "-ss", clip.relativeStartSeconds.toFixed(9), "-t", clip.durationSeconds.toFixed(3),
      "-ac", "1", "-ar", "16000", "-b:a", "64k", "-map_metadata", "-1", "-n", rel(tempPath)
    ], { maxBuffer: 16 * 1024 * 1024 });
    const clipProbe = await probe(tempPath);
    assert(Math.abs(clipProbe.durationSeconds - clip.durationSeconds) <= plan.localProcessing.clipDurationToleranceSeconds, `${clip.moveId} duration outside tolerance`);
    await rename(rel(tempPath), rel(finalPath));
    state.clipsCreated += 1;
    clips.push({
      moveId: clip.moveId,
      path: finalPath,
      bytes: (await stat(rel(finalPath))).size,
      sha256: await fileHash(finalPath),
      absoluteStartSeconds: clip.absoluteStartSeconds,
      rangeRelativeStartSeconds: clip.relativeStartSeconds,
      durationSeconds: clipProbe.durationSeconds
    });
  }

  const execution = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-09-debate-183-tiekoetter-range-recovery-19-execution",
    status: "completed-one-shot-batch-09-debate-183-tiekoetter-range-source-and-two-clips",
    batchNumber: 9,
    planSha256: await fileHash(planPath),
    activationSha256: await fileHash(activationPath),
    state,
    result: {
      videoId: "2WrywAaDvvw",
      provider: "Invidious Tiekoetter companion range transport",
      representationId: "140",
      rangePath: rangeFinalPath,
      rangeBytes: state.responseBytesAccepted,
      rangeSha256,
      fragmentPath,
      fragmentBytes: (await stat(rel(fragmentPath))).size,
      fragmentSha256: await fileHash(fragmentPath),
      fragmentProbe,
      boundedSourcePath: normalizedFinalPath,
      boundedSourceBytes: (await stat(rel(normalizedFinalPath))).size,
      boundedSourceSha256: await fileHash(normalizedFinalPath),
      boundedSourceDurationSeconds: normalizedProbe.durationSeconds,
      clips
    }
  };
  const analysis = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-09-debate-183-tiekoetter-range-recovery-19-analysis",
    status: "batch-09-debate-183-exact-public-proxy-range-and-two-frozen-clips-recovered",
    batchNumber: 9,
    result: { exactVideoIdentityAccepted: true, exactIndexedRangeAccepted: true, boundedSourcesInstalled: 1, clipsCreated: 2, completeThree-sourceFourClipCohortReady: true },
    preservedControls: { retries: 0, redirectsFollowed: 0, cookiesSent: 0, accountDataUses: 0, audioPlaybackObservedSeconds: 0, semanticAudioEvaluationPerformed: false, modelContexts: 0, paidServiceCalls: 0, directIncrementalCostUsd: 0, judgmentsChanged: false, scoresChanged: false, productionChanged: false },
    nextAuthorizedAction: "prepare-validate-freeze-and-report-the-two-call-debate-183-audio-verification-cost-estimate"
  };
  await writeJson(executionPath, execution);
  await writeJson(analysisPath, analysis);
  console.log(JSON.stringify({ status: execution.status, rangeBytes: state.responseBytesAccepted, rangeSha256, boundedSourceDurationSeconds: normalizedProbe.durationSeconds, clips: clips.map(({ moveId, durationSeconds }) => ({ moveId, durationSeconds })) }));
} catch (error) {
  const failure = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-09-debate-183-tiekoetter-range-recovery-19-execution",
    status: "preserved-batch-09-debate-183-tiekoetter-range-recovery-failure",
    batchNumber: 9,
    planSha256: plan ? await fileHash(planPath) : null,
    activationSha256: activation ? await fileHash(activationPath) : null,
    state,
    failure: { name: error?.name || "Error", message: error?.message || String(error), code: error?.code || null }
  };
  const analysis = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-09-debate-183-tiekoetter-range-recovery-19-analysis",
    status: "batch-09-debate-183-tiekoetter-range-recovery-failed-stop-required",
    batchNumber: 9,
    result: { boundedSourcesInstalled: state.boundedSourcesInstalled, clipsCreated: state.clipsCreated },
    preservedControls: { retries: 0, redirectsFollowed: 0, cookiesSent: 0, accountDataUses: 0, audioPlaybackObservedSeconds: 0, semanticAudioEvaluationPerformed: false, modelContexts: 0, paidServiceCalls: 0, directIncrementalCostUsd: 0 },
    failure: failure.failure,
    nextAuthorizedAction: "stop-on-debate-183-range-recovery-failure"
  };
  await writeJson(executionPath, failure);
  await writeJson(analysisPath, analysis);
  console.error(JSON.stringify(failure.failure));
  process.exitCode = 1;
}
