#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const root = process.cwd();
const prepRoot = "docs/calibration/v4.2.21.17.3/deterministic-disagreement-audio-prep";
const stageRoot = "docs/calibration/v4.2.21.17.4/medium-confidence-audio-verification";
const manifestPath = `${stageRoot}/execution-manifest.json`;
const executionPath = `${stageRoot}/model-execution.json`;
const auditPath = `${stageRoot}/audio-verification.json`;
const analysisPath = `${stageRoot}/analysis.json`;
if (shouldWrite) for (const file of [manifestPath, executionPath, auditPath, analysisPath]) await access(file).then(() => { throw new Error(`${file} already exists`); }, () => true);

const sourcePreparation = JSON.parse(await readFile(`${prepRoot}/audio-source-preparation.json`, "utf8"));
assertV4(sourcePreparation.status === "prepared-two-local-audio-clips" && sourcePreparation.authorization.paidTranscriptionManifest, "paid transcription manifest is not authorized");
const mediaRoot = "output/transcribe/v4221173-audio-verification/debate-178";
const calls = sourcePreparation.clips.map((clip) => ({
  debateNumber: clip.debateNumber,
  debateId: clip.debateId,
  moveId: clip.moveId,
  expectedSpeaker: clip.expectedSpeaker,
  proposition: clip.proposition,
  verificationExcerpt: clip.verificationExcerpt,
  trigger: clip.trigger,
  clipPath: clip.clipPath,
  clipSha256: clip.clipSha256,
  durationSeconds: clip.durationSeconds,
  transcriptPath: `${mediaRoot}/transcripts/${clip.moveId}.transcript.txt`,
  model: "gpt-4o-mini-transcribe",
  responseFormat: "text",
  chunkingStrategy: "auto",
  language: "en"
}));
const pricePerMinuteUsd = 0.003;
const clipMinutes = calls.reduce((sum, call) => sum + call.durationSeconds, 0) / 60;
const expectedCostUsd = clipMinutes * pricePerMinuteUsd;
const sourceFiles = [
  "docs/assessment-workflow-v4.2.21.17.3.md",
  `${prepRoot}/analysis.json`,
  `${prepRoot}/audio-work-items.json`,
  `${prepRoot}/audio-source-preparation.json`,
  "scripts/lib/v416-audio-verification.mjs",
  "scripts/preregister-v4221174-audio-verification.mjs",
  "scripts/run-v4221174-audio-verification.mjs",
  "scripts/analyze-v4221174-audio-verification.mjs",
  "scripts/test-v4221174-audio-verification.mjs",
  "/Users/philstilwell/.codex/skills/transcribe/scripts/transcribe_diarize.py",
  ...calls.map((call) => call.clipPath)
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(file));
const manifest = {
  schemaVersion: "4.2.21.17.4-medium-confidence-audio-verification-manifest",
  protocolId: "v4.2.21.17.4-decomposed-consensus",
  status: "frozen-two-paid-audio-transcriptions-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  calls,
  deterministicThresholds: { minimumFullClipExcerptRecall: 0.8 },
  costEstimate: {
    pricingSource: "https://platform.openai.com/docs/pricing",
    pricePerMinuteUsd,
    clipMinutes: Number(clipMinutes.toFixed(4)),
    expectedCostUsd: Number(expectedCostUsd.toFixed(4)),
    maximumAuthorizedCostUsd: 0.01,
    ChatGPTSubscriptionApplicable: false,
    OpenAIApiBillingRequired: true
  },
  executionPolicy: { callsMaximum: 2, attemptsPerCall: 1, retriesMaximum: 0, sequentialExecution: true, stopRemainingAfterRequestLevelFailure: true, continueAfterCompletedButDeterministicallyUnresolvedTranscript: true, transcriptsSavedLocally: true, responseFormat: "text", chunkingStrategy: "auto" },
  authorization: { paidTranscriptionExecution: true, deterministicAudioAnalysis: true, retry: false, correctionCall: false, adjudicationPacketPreparation: false, adjudicationModelExecution: false, scoreDerivation: false, productionMutation: false },
  stopRules: { sourceHashMismatchBlocks: true, preexistingTranscriptBlocks: true, failedTranscriptPreserved: true, requestFailureStopsRemaining: true, retryAuthorized: false, correctionAuthorized: false },
  artifacts: { execution: executionPath, audit: auditPath, analysis: analysisPath, transcripts: calls.map((call) => call.transcriptPath) },
  futureOutputPathsExcludedFromSourceHashes: [...calls.map((call) => call.transcriptPath), executionPath, auditPath, analysisPath],
  sourceHashes
};
assertV4(manifest.costEstimate.expectedCostUsd <= manifest.costEstimate.maximumAuthorizedCostUsd, "estimated transcription cost exceeds cap");
if (shouldWrite) {
  await mkdir(path.resolve(root, stageRoot), { recursive: true });
  await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", calls: calls.length, clipMinutes: manifest.costEstimate.clipMinutes, model: calls[0].model, expectedCostUsd: manifest.costEstimate.expectedCostUsd, maximumAuthorizedCostUsd: manifest.costEstimate.maximumAuthorizedCostUsd, retries: 0, transcriptsSavedLocally: true, scoresDerived: 0 }, null, 2));
