#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V416_AUDIO_THRESHOLDS } from "./lib/v416-audio-verification.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const root = process.cwd();
const prepRoot = "docs/calibration/v4.2.21.17.26/hard-route-disagreement-audio-prep";
const stageRoot = "docs/calibration/v4.2.21.17.27/hard-route-audio-verification";
const mediaRoot = "output/transcribe/v42211726-audio-verification/debate-153";
const manifestPath = `${stageRoot}/execution-manifest.json`;
const executionPath = `${stageRoot}/model-execution.json`;
const auditPath = `${stageRoot}/audio-verification.json`;
const analysisPath = `${stageRoot}/analysis.json`;
const ffmpeg = "/opt/homebrew/bin/ffmpeg";
const ffprobe = "/opt/homebrew/bin/ffprobe";
const exists = (file) => access(file).then(() => true, () => false);
if (shouldWrite) for (const file of [manifestPath, executionPath, auditPath, analysisPath]) assertV4(!(await exists(file)), `${file} already exists`);
const [analysis, sourcePreparation] = await Promise.all([
  readFile(`${prepRoot}/analysis.json`, "utf8").then(JSON.parse),
  readFile(`${prepRoot}/audio-source-preparation.json`, "utf8").then(JSON.parse),
]);
assertV4(analysis.authorization.audioSourcePreparation && sourcePreparation.status === "prepared-three-local-hard-route-audio-clips" && sourcePreparation.authorization.paidTranscriptionManifest, "hard-route paid transcription manifest unauthorized");

const referenceDirectory = path.resolve(root, mediaRoot, "references-v42211727");
await mkdir(referenceDirectory, { recursive: true });
const references = [
  { speaker: "Alex O'Connor", startSeconds: 200.36, requestedDurationSeconds: 8, file: path.join(referenceDirectory, "alex-oconnor.mp3") },
  { speaker: "Alex Carter", startSeconds: 458, requestedDurationSeconds: 8, file: path.join(referenceDirectory, "alex-carter.mp3") },
];
for (const reference of references) {
  execFileSync(ffmpeg, ["-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-ss", String(reference.startSeconds), "-i", path.resolve(root, sourcePreparation.source.sourceAudio), "-t", String(reference.requestedDurationSeconds), "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", reference.file]);
  reference.actualDurationSeconds = Number(execFileSync(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", reference.file], { encoding: "utf8" }).trim());
  assertV4(reference.actualDurationSeconds >= 1.2 && reference.actualDurationSeconds <= 10, `${reference.speaker}: encoded reference duration outside API range`);
}
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
for (const reference of references) {
  reference.localPath = path.relative(root, reference.file);
  reference.sha256 = sha256(await readFile(reference.file));
  delete reference.file;
}
const calls = sourcePreparation.clips.map((clip) => ({ debateNumber: clip.debateNumber, debateId: clip.debateId, moveId: clip.moveId, expectedSpeaker: clip.expectedSpeaker, proposition: clip.proposition, verificationExcerpt: clip.verificationExcerpt, trigger: clip.trigger, clipPath: clip.clipPath, clipSha256: clip.clipSha256, durationSeconds: clip.durationSeconds, transcriptPath: `${mediaRoot}/transcripts-v42211727/${clip.moveId}.transcript.json`, model: "gpt-4o-transcribe-diarize", responseFormat: "diarized_json", chunkingStrategy: "auto", language: "en", knownSpeakers: references.map((reference) => ({ speaker: reference.speaker, localPath: reference.localPath, sha256: reference.sha256, actualDurationSeconds: reference.actualDurationSeconds })) }));
const planningPricePerMinuteUsd = 0.006;
const clipMinutes = calls.reduce((sum, call) => sum + call.durationSeconds, 0) / 60;
const expectedCostUsd = clipMinutes * planningPricePerMinuteUsd;
const sourceFiles = [
  "docs/assessment-workflow-v4.2.21.17.27.md",
  `${prepRoot}/analysis.json`,
  `${prepRoot}/audio-work-items.json`,
  `${prepRoot}/audio-source-preparation.json`,
  "scripts/lib/v416-audio-verification.mjs",
  "scripts/preregister-v42211727-hard-route-audio-verification.mjs",
  "scripts/run-v42211727-hard-route-audio-verification.mjs",
  "scripts/analyze-v42211727-hard-route-audio-verification.mjs",
  "scripts/test-v42211727-hard-route-audio-verification.mjs",
  "/Users/philstilwell/.codex/skills/transcribe/scripts/transcribe_diarize.py",
  sourcePreparation.source.sourceAudio,
  ...calls.map((call) => call.clipPath),
  ...references.map((reference) => reference.localPath),
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(file));
const manifest = {
  schemaVersion: "4.2.21.17.27-hard-route-audio-verification-execution-manifest",
  protocolId: "v4.2.21.17.27-hard-route-audio-verification",
  status: "frozen-three-paid-known-speaker-diarizations-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  model: "gpt-4o-transcribe-diarize",
  calls,
  thresholds: V416_AUDIO_THRESHOLDS,
  referenceContract: { requestedDurationSeconds: 8, acceptedRangeSeconds: [1.2, 10], measuredBeforeExecution: true, references: references.map((reference) => ({ speaker: reference.speaker, actualDurationSeconds: reference.actualDurationSeconds, localPath: reference.localPath, sha256: reference.sha256 })) },
  costEstimate: { pricingSource: "https://developers.openai.com/api/docs/models/gpt-4o-transcribe-diarize", officialAudioInputUsdPerMillionTokens: 2.5, officialOutputUsdPerMillionTokens: 10, planningPricePerMinuteUsd, clipMinutes: Number(clipMinutes.toFixed(4)), expectedCostUsd: Number(expectedCostUsd.toFixed(4)), maximumAuthorizedCostUsd: 0.1, ChatGPTSubscriptionApplicable: false, OpenAIApiBillingRequired: true },
  executionPolicy: { callsMaximum: 3, attemptsPerCall: 1, retriesMaximum: 0, sequentialExecution: true, stopRemainingAfterRequestLevelFailure: true, continueAfterCompletedButDeterministicallyUnresolvedTranscript: true, chunkingStrategy: "auto", responseFormat: "diarized_json", knownSpeakerReferences: 2, transcriptsSavedLocally: true },
  authorization: { paidTranscriptionExecution: true, deterministicAudioAnalysis: true, retry: false, correctionCall: false, adjudicationPacketPreparation: false, adjudicationModelExecution: false, scoreDerivation: false, productionMutation: false, all195Debates: false },
  stopRules: { sourceHashMismatchBlocks: true, preexistingTranscriptBlocks: true, failedTranscriptPreserved: true, requestFailureStopsRemaining: true, retryAuthorized: false, correctionAuthorized: false },
  artifacts: { execution: executionPath, audit: auditPath, analysis: analysisPath, transcripts: calls.map((call) => call.transcriptPath) },
  futureOutputPathsExcludedFromSourceHashes: [...calls.map((call) => call.transcriptPath), executionPath, auditPath, analysisPath],
  sourceHashes,
};
assertV4(manifest.costEstimate.expectedCostUsd <= manifest.costEstimate.maximumAuthorizedCostUsd, "estimated transcription cost exceeds cap");
if (shouldWrite) {
  await mkdir(path.resolve(root, stageRoot), { recursive: true });
  await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", callsMaximum: 3, referenceDurationsSeconds: manifest.referenceContract.references.map((reference) => ({ speaker: reference.speaker, seconds: reference.actualDurationSeconds })), clipMinutes: manifest.costEstimate.clipMinutes, model: manifest.model, expectedCostUsd: manifest.costEstimate.expectedCostUsd, maximumAuthorizedCostUsd: manifest.costEstimate.maximumAuthorizedCostUsd, ChatGPTSubscriptionApplicable: false, retries: 0, transcriptsSavedLocally: true, scoreDerivationAuthorized: false }, null, 2));
