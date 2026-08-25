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
const stage = "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction/audio-source-debate-183-speaker-reference-range-20";
const planPath = `${stage}/recovery-plan.json`;
const activationPath = `${stage}/execution-activation.json`;
const executionPath = `${stage}/execution.json`;
const analysisPath = `${stage}/analysis.json`;
const manifestPath = ".assessment-cache/proxy-metadata/piped/2WrywAaDvvw/tiekoetter-range-19/manifest.mpd";
const prefixPath = ".assessment-cache/audio-source-mirrors/tiekoetter/2WrywAaDvvw/source.attempt-1.part";
const partPath = ".assessment-cache/audio-source-mirrors/tiekoetter/2WrywAaDvvw/speaker-reference-range.attempt-1.part";
const rangePath = ".assessment-cache/audio-source-mirrors/tiekoetter/2WrywAaDvvw/speaker-reference-range.bin";
const fragmentPath = ".assessment-cache/audio-source-mirrors/tiekoetter/2WrywAaDvvw/speaker-reference-range.m4a";
const normalizedTempPath = "output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-183/audio/speaker-reference-range.tmp.mp3";
const normalizedPath = "output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-183/audio/speaker-reference-range.mp3";
const davidSourcePath = "output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-183/audio/target-range.mp3";
const references = [
  { speaker: "David Enoch", sourcePath: davidSourcePath, startSeconds: 2.922539683, path: "output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-183/references/david-enoch.mp3" },
  { speaker: "Justin Clarke-Doane", sourcePath: normalizedPath, startSeconds: 0.992290249, path: "output/transcribe/assessment-production-post-canary-batch-09-audio-verification/debate-183/references/justin-clarke-doane.mp3" }
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const read = (path) => readFile(rel(path));
const readJson = async (path) => JSON.parse(await read(path));
const fileHash = async (path) => sha256(await read(path));
const exists = async (path) => stat(rel(path)).then(() => true, () => false);
const writeJson = async (path, value) => { await mkdir(dirname(rel(path)), { recursive: true }); await writeFile(rel(path), `${JSON.stringify(value, null, 2)}\n`); };
const decodeXml = (value) => value.replaceAll("&amp;", "&").replaceAll("&quot;", "\"").replaceAll("&apos;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
const probe = async (path) => {
  const { stdout } = await execFileAsync("/opt/homebrew/bin/ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name,channels,sample_rate", "-of", "json", rel(path)], { maxBuffer: 1024 * 1024 });
  const parsed = JSON.parse(stdout);
  const durationSeconds = Number(parsed.format?.duration);
  assert(Number.isFinite(durationSeconds), `${path}: duration unavailable`);
  return { durationSeconds, streams: parsed.streams || [] };
};
const mediaUrl = async (plan) => {
  const mpd = (await read(manifestPath)).toString("utf8");
  const adaptation = [...mpd.matchAll(/<AdaptationSet\b([^>]*)>([\s\S]*?)<\/AdaptationSet>/g)]
    .find(([, attributes]) => /\bid="0"/.test(attributes) && /mimeType="audio\/mp4"/.test(attributes));
  assert(adaptation, "audio adaptation set 0 missing");
  const representation = adaptation[2].match(/<Representation\b(?=[^>]*\bid="140")(?=[^>]*\bbandwidth="134242")[^>]*>[\s\S]*?<BaseURL>([^<]+)<\/BaseURL>[\s\S]*?<\/Representation>/);
  assert(representation, "representation 140 missing");
  const relativeUrl = decodeXml(representation[1]);
  assert.equal(sha256(relativeUrl), plan.proxyRepresentation.relativeUrlSha256);
  const absoluteUrl = new URL(relativeUrl, plan.proxyRepresentation.companionOrigin).toString();
  assert.equal(sha256(absoluteUrl), plan.proxyRepresentation.absoluteUrlSha256);
  return absoluteUrl;
};

const state = { attempts: 1, mediaRangeAttempts: 0, responseBytesAccepted: 0, referencesCreated: 0, retries: 0, reruns: 0, timeoutExtensions: 0, redirectFollows: 0, cookiesSent: 0, accountDataUses: 0, audioPlaybackObservedSeconds: 0, semanticAudioEvaluations: 0, modelContexts: 0, transcriptionCalls: 0, paidServiceCalls: 0, directIncrementalCostUsd: 0 };
let plan;
let activation;
try {
  plan = await readJson(planPath);
  activation = await readJson(activationPath);
  assert.equal(activation.plan.sha256, await fileHash(planPath));
  for (const [path, expected] of Object.entries(plan.authenticatedInputs)) assert.equal(await fileHash(path), expected, `${path}: hash mismatch`);
  for (const [path, expected] of Object.entries(plan.sourceHashes)) assert.equal(await fileHash(path), expected, `${path}: source hash mismatch`);
  for (const [path, expected] of Object.entries(activation.sourceHashes)) assert.equal(await fileHash(path), expected, `${path}: activation source hash mismatch`);
  for (const path of [partPath, rangePath, fragmentPath, normalizedTempPath, normalizedPath, ...references.map((item) => item.path)]) assert.equal(await exists(path), false, `${path} already exists`);
  const url = await mediaUrl(plan);

  state.mediaRangeAttempts = 1;
  const response = await fetch(url, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(plan.executionPolicy.requestTimeoutMs), headers: { accept: "audio/mp4,application/octet-stream;q=0.9,*/*;q=0.1", range: plan.byteRange.rangeHeader, "user-agent": "SLUGFESTER-speaker-reference-audit/1.0" } });
  assert.equal(response.status, 206, `speaker-reference range returned HTTP ${response.status}`);
  assert.equal(response.redirected, false, "speaker-reference range redirected");
  assert.equal(response.headers.get("content-range"), plan.byteRange.expectedContentRange, "content-range mismatch");
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) assert.equal(Number(contentLength), plan.byteRange.expectedBytes, "content-length mismatch");
  assert(response.body, "response body missing");
  await mkdir(dirname(rel(partPath)), { recursive: true });
  const digest = createHash("sha256");
  const handle = await open(rel(partPath), "wx");
  try {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      digest.update(value);
      await handle.write(value);
      state.responseBytesAccepted += value.byteLength;
    }
  } finally { await handle.close(); }
  assert.equal(state.responseBytesAccepted, plan.byteRange.expectedBytes, "speaker-reference range byte count mismatch");
  const rangeSha256 = digest.digest("hex");
  await rename(rel(partPath), rel(rangePath));
  const prefix = await read(prefixPath);
  const range = await read(rangePath);
  await writeFile(rel(fragmentPath), Buffer.concat([prefix.subarray(0, plan.initializationBytes), range]), { flag: "wx" });
  const fragmentProbe = await probe(fragmentPath);
  assert(fragmentProbe.streams.some((stream) => stream.codec_type === "audio" && stream.codec_name === "aac"), "AAC stream missing");
  await mkdir(dirname(rel(normalizedTempPath)), { recursive: true });
  await execFileAsync("/opt/homebrew/bin/ffmpeg", ["-hide_banner", "-loglevel", "error", "-nostdin", "-copyts", "-start_at_zero", "-i", rel(fragmentPath), "-vn", "-ac", "1", "-ar", "16000", "-b:a", "48k", "-map_metadata", "-1", "-n", rel(normalizedTempPath)], { maxBuffer: 16 * 1024 * 1024 });
  const normalizedProbe = await probe(normalizedTempPath);
  assert(Math.abs(normalizedProbe.durationSeconds - plan.byteRange.durationSeconds) <= 0.25, "normalized speaker-reference range duration mismatch");
  await rename(rel(normalizedTempPath), rel(normalizedPath));

  const createdReferences = [];
  for (const reference of references) {
    await mkdir(dirname(rel(reference.path)), { recursive: true });
    const tempPath = `${reference.path}.tmp.mp3`;
    await execFileAsync("/opt/homebrew/bin/ffmpeg", ["-hide_banner", "-loglevel", "error", "-nostdin", "-ss", reference.startSeconds.toFixed(9), "-i", rel(reference.sourcePath), "-t", "8.000", "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", "-map_metadata", "-1", "-n", rel(tempPath)], { maxBuffer: 16 * 1024 * 1024 });
    const referenceProbe = await probe(tempPath);
    assert(referenceProbe.durationSeconds >= 7.9 && referenceProbe.durationSeconds <= 8.1, `${reference.speaker}: reference duration invalid`);
    await rename(rel(tempPath), rel(reference.path));
    state.referencesCreated += 1;
    createdReferences.push({ speaker: reference.speaker, path: reference.path, bytes: (await stat(rel(reference.path))).size, sha256: await fileHash(reference.path), durationSeconds: referenceProbe.durationSeconds, sourceStartSeconds: reference.startSeconds });
  }
  const execution = { schemaVersion: "1.0-assessment-production-post-canary-batch-09-debate-183-speaker-reference-range-20-execution", status: "completed-one-shot-batch-09-debate-183-high-attribution-speaker-references", batchNumber: 9, planSha256: await fileHash(planPath), activationSha256: await fileHash(activationPath), state, result: { rangePath, rangeBytes: state.responseBytesAccepted, rangeSha256, fragmentPath, fragmentSha256: await fileHash(fragmentPath), normalizedPath, normalizedSha256: await fileHash(normalizedPath), normalizedDurationSeconds: normalizedProbe.durationSeconds, references: createdReferences } };
  const analysis = { schemaVersion: "1.0-assessment-production-post-canary-batch-09-debate-183-speaker-reference-range-20-analysis", status: "batch-09-debate-183-two-high-attribution-same-debate-speaker-references-ready", batchNumber: 9, result: { referencesCreated: 2, davidEnochReferenceFromAcceptedTargetRange: true, justinClarkeDoaneReferenceFromOneAdditionalIndexedFragment: true }, preservedControls: { retries: 0, redirectsFollowed: 0, cookiesSent: 0, accountDataUses: 0, audioPlaybackObservedSeconds: 0, semanticAudioEvaluationPerformed: false, modelContexts: 0, paidServiceCalls: 0, directIncrementalCostUsd: 0, judgmentsChanged: false, scoresChanged: false, productionChanged: false }, nextAuthorizedAction: "prepare-validate-freeze-and-report-the-two-call-debate-183-audio-verification-cost-estimate" };
  await writeJson(executionPath, execution);
  await writeJson(analysisPath, analysis);
  console.log(JSON.stringify({ status: execution.status, rangeBytes: state.responseBytesAccepted, references: createdReferences.map(({ speaker, durationSeconds }) => ({ speaker, durationSeconds })) }));
} catch (error) {
  const failure = { schemaVersion: "1.0-assessment-production-post-canary-batch-09-debate-183-speaker-reference-range-20-execution", status: "preserved-batch-09-debate-183-speaker-reference-range-failure", batchNumber: 9, planSha256: plan ? await fileHash(planPath) : null, activationSha256: activation ? await fileHash(activationPath) : null, state, failure: { name: error?.name || "Error", message: error?.message || String(error), code: error?.code || null } };
  const analysis = { schemaVersion: "1.0-assessment-production-post-canary-batch-09-debate-183-speaker-reference-range-20-analysis", status: "batch-09-debate-183-speaker-reference-range-failed-stop-required", batchNumber: 9, failure: failure.failure, preservedControls: { retries: 0, cookiesSent: 0, accountDataUses: 0, audioPlaybackObservedSeconds: 0, semanticAudioEvaluationPerformed: false, modelContexts: 0, paidServiceCalls: 0, directIncrementalCostUsd: 0 }, nextAuthorizedAction: "stop-on-speaker-reference-range-failure" };
  await writeJson(executionPath, failure);
  await writeJson(analysisPath, analysis);
  console.error(JSON.stringify(failure.failure));
  process.exitCode = 1;
}
