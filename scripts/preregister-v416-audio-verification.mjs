#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V41_LEAN_ROOT, assertV4, readJson } from "./lib/v41-lean-production.mjs";
import { V416_AUDIO_PROTOCOL_ID, V416_AUDIO_SCHEMA_VERSION, V416_AUDIO_THRESHOLDS } from "./lib/v416-audio-verification.mjs";
import { V416_PASS_B_ROOT } from "./lib/v416-triggered-consensus.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const localRoot = "output/transcribe/v416-pass-b-audio-verification";
const planPath = `${V416_PASS_B_ROOT}/audio-verification-plan.json`;
const executionPath = `${V416_PASS_B_ROOT}/audio-model-execution.json`;
const auditPath = `${V416_PASS_B_ROOT}/audio-verification.json`;
const postAudioPath = `${V416_PASS_B_ROOT}/post-audio-analysis.json`;
const helperPath = "/Users/philstilwell/.codex/skills/transcribe/scripts/transcribe_diarize.py";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const fileSha256 = async (file) => sha256(await readFile(path.resolve(root, file)));
const exists = async (file) => access(path.resolve(root, file)).then(() => true, () => false);
const ffmpeg = "/opt/homebrew/bin/ffmpeg";
const ffprobe = "/opt/homebrew/bin/ffprobe";

const debateConfigs = [
  {
    debateNumber: "55",
    sourceAudio: "output/transcribe/v388-performance-audio-verification/craig-malpass-kalam-nothing-2026/audio/source.mp3",
    sourceSha256: "46486cf86c24b069c128cae8e68360ed0b49425929f3711951414c5b6d924311",
    references: [
      { speaker: "William Lane Craig", verifiedClip: "output/transcribe/v388-reconstruction-quote-verification/craig-malpass-kalam-nothing-2026/clips/craig-candidate-03.mp3", verifiedClipSha256: "1a3328a31723087a637e73671d5cbb0bf2e195cfc676aea4e78a729b6fc7f657", offsetSeconds: 10 },
      { speaker: "Alex Malpass", verifiedClip: "output/transcribe/v388-performance-audio-verification/craig-malpass-kalam-nothing-2026/clips/move-12.mp3", verifiedClipSha256: "b0b1824d1b88068e8382804569952d2ee7f250f44660798f55c26168978b8c37", offsetSeconds: 10 }
    ]
  },
  {
    debateNumber: "103",
    sourceAudio: "output/transcribe/v388-performance-audio-verification/woodford-edwards-rational-belief-god-2023/audio/source.mp3",
    sourceSha256: "0a067cd52c4410c80e1fc9f25b18a1dcd95229323b45be38dc80bdd38f01a0c9",
    references: [
      { speaker: "Stephen Woodford", verifiedClip: "output/transcribe/v388-performance-audio-verification/woodford-edwards-rational-belief-god-2023/clips/move-11.mp3", verifiedClipSha256: "f6d4c85fbf610f4a4fae55c68a0eb1ed07a8beb0e1b93208b60533368c4043a9", offsetSeconds: 15 },
      { speaker: "Simon Edwards", verifiedClip: "output/transcribe/v388-performance-audio-verification/woodford-edwards-rational-belief-god-2023/clips/move-13.mp3", verifiedClipSha256: "dc17734d132b7ba9b1174261b3d2253fe5ae7d3acbe06685b4e79056d82edf31", offsetSeconds: 15 }
    ]
  },
  {
    debateNumber: "161",
    sourceAudio: "output/transcribe/v388-performance-audio-verification/craig-millican-does-god-exist-2011/audio/source.mp3",
    sourceSha256: "d703c6b47b2c427450280c778dc6ba7151c711e9e0a8a71d59afaadabd80b349",
    references: [
      { speaker: "William Lane Craig", verifiedClip: "output/transcribe/v388-performance-audio-verification/craig-millican-does-god-exist-2011/clips/move-21.mp3", verifiedClipSha256: "574f545fd02b33fb8bc5d95e3f88de54f3788ab8b85c45cbfaba99918c1a1e22", offsetSeconds: 15 },
      { speaker: "Peter Millican", verifiedClip: "output/transcribe/v388-performance-audio-verification/craig-millican-does-god-exist-2011/clips/move-17.mp3", verifiedClipSha256: "da53b827876bc0828c2c68d962733527d0483a20d6279f7b5f7b5899e86e4866", offsetSeconds: 15 }
    ]
  }
];

if (shouldWrite) for (const future of [planPath, executionPath, auditPath, postAudioPath]) assertV4(!(await exists(future)), `${future} already exists`);
const [analysis, oldAudioAudit, quoteAudit] = await Promise.all([
  readJson(`${V416_PASS_B_ROOT}/analysis.json`),
  readJson("docs/calibration/v3.8.8/performance-judgment-consensus/audio-verification.json"),
  readJson("docs/calibration/v3.8.8/reconstruction/quote-verification.json")
]);
assertV4(analysis.status === "pass-b-passed-audio-verification-required" && analysis.authorization.audioVerification, "Pass B audio verification is not authorized");
assertV4(analysis.pendingAudioMoves.length === 8, "exactly eight pending audio moves required");
assertV4(oldAudioAudit.status === "passed-all-medium-confidence-moves-audio-verified", "prior audio audit unavailable");
assertV4(quoteAudit.status === "passed-six-representative-quotes-audio-verified", "prior quote audit unavailable");

function allPacketMoves(packet) {
  return packet.lockedSections.flatMap((section) => [...section.proMoves, ...section.conMoves]);
}

const debates = [];
for (const config of debateConfigs) {
  assertV4(await fileSha256(config.sourceAudio) === config.sourceSha256, `${config.debateNumber}: source audio hash mismatch`);
  const packetPath = `${V416_PASS_B_ROOT}/packets/debate-${config.debateNumber}.json`;
  const packet = await readJson(packetPath);
  const pendingIds = analysis.pendingAudioMoves.filter((item) => item.debateNumber === config.debateNumber).map((item) => item.moveId);
  const packetById = new Map(allPacketMoves(packet).map((move) => [move.moveId, move]));
  const debateRoot = `${localRoot}/${packet.debateId}`;
  const references = [];
  for (const reference of config.references) {
    assertV4(await fileSha256(reference.verifiedClip) === reference.verifiedClipSha256, `${reference.speaker}: verified reference source hash mismatch`);
    const speakerSlug = reference.speaker.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const localPath = `${debateRoot}/references/${speakerSlug}.mp3`;
    if (shouldWrite) {
      await mkdir(path.dirname(path.resolve(root, localPath)), { recursive: true });
      execFileSync(ffmpeg, ["-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-i", path.resolve(root, reference.verifiedClip), "-ss", String(reference.offsetSeconds), "-t", "8", "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", path.resolve(root, localPath)]);
    }
    assertV4(await exists(localPath), `${reference.speaker}: reference extract missing`);
    references.push({ speaker: reference.speaker, localPath, sha256: await fileSha256(localPath), durationSeconds: 8, provenance: { verifiedClip: reference.verifiedClip, verifiedClipSha256: reference.verifiedClipSha256, offsetSeconds: reference.offsetSeconds } });
  }
  const moves = [];
  for (const moveId of pendingIds) {
    const move = packetById.get(moveId);
    assertV4(move, `${config.debateNumber}: pending move absent from packet: ${moveId}`);
    const clipStartMs = Math.max(0, move.sourceSpan.startMs - 3000);
    const clipEndMs = move.sourceSpan.endMs + 3000;
    const plannedDurationSeconds = (clipEndMs - clipStartMs) / 1000;
    const clipPath = `${debateRoot}/clips/${moveId}.mp3`;
    const transcriptPath = `${debateRoot}/transcripts/${moveId}.transcript.json`;
    if (shouldWrite) {
      assertV4(!(await exists(transcriptPath)), `${moveId}: transcript already exists`);
      await mkdir(path.dirname(path.resolve(root, clipPath)), { recursive: true });
      await mkdir(path.dirname(path.resolve(root, transcriptPath)), { recursive: true });
      execFileSync(ffmpeg, ["-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-i", path.resolve(root, config.sourceAudio), "-ss", String(clipStartMs / 1000), "-t", String(plannedDurationSeconds), "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", path.resolve(root, clipPath)]);
    }
    assertV4(await exists(clipPath), `${moveId}: target clip missing`);
    const measuredDurationSeconds = Number(execFileSync(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path.resolve(root, clipPath)], { encoding: "utf8" }).trim());
    assertV4(Math.abs(measuredDurationSeconds - plannedDurationSeconds) <= 0.1, `${moveId}: clip duration mismatch`);
    moves.push({
      moveId,
      expectedSpeaker: move.speaker,
      sourceSpan: move.sourceSpan,
      verificationExcerpt: move.sourceSpan.excerpt,
      boundaryPaddingSecondsPerSide: 3,
      clipStartMs,
      clipEndMs,
      plannedDurationSeconds,
      measuredDurationSeconds,
      clipPath,
      clipSha256: await fileSha256(clipPath),
      transcriptPath
    });
  }
  debates.push({ debateNumber: config.debateNumber, debateId: packet.debateId, packetPath, sourceAudio: config.sourceAudio, sourceAudioSha256: config.sourceSha256, references, moves });
}

const estimatedMinutes = debates.flatMap((debate) => debate.moves).reduce((sum, move) => sum + move.measuredDurationSeconds / 60, 0);
const estimatedRateUsdPerMinute = 0.006;
const estimatedCostUsd = estimatedMinutes * estimatedRateUsdPerMinute;
assertV4(estimatedCostUsd <= 0.15, "planned transcription cost exceeds authorized cap");
const sourceFiles = [
  `${V416_PASS_B_ROOT}/analysis.json`, `${V416_PASS_B_ROOT}/model-execution.json`,
  "docs/calibration/v3.8.8/performance-judgment-consensus/audio-verification.json",
  "docs/calibration/v3.8.8/reconstruction/quote-verification.json",
  "scripts/lib/v416-audio-verification.mjs", "scripts/preregister-v416-audio-verification.mjs",
  "scripts/run-v416-audio-verification.mjs", "scripts/analyze-v416-audio-verification.mjs",
  "scripts/test-v416-audio-verification.mjs", helperPath,
  ...debates.flatMap((debate) => [debate.packetPath, debate.sourceAudio, ...debate.references.map((item) => item.localPath), ...debate.moves.map((item) => item.clipPath)])
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = await fileSha256(file);
const plan = {
  schemaVersion: V416_AUDIO_SCHEMA_VERSION,
  protocolId: V416_AUDIO_PROTOCOL_ID,
  status: "frozen-eight-move-known-speaker-diarization-plan",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  trigger: "speaker attribution confidence was medium or low in the valid v4.1.6 Pass B artifact",
  model: { id: "gpt-4o-transcribe-diarize", responseFormat: "diarized_json", chunkingStrategy: "auto", language: "en", prompt: null },
  verificationPolicy: { ...V416_AUDIO_THRESHOLDS, targetClipBoundaryPaddingSecondsPerSide: 3, knownSpeakerReferenceDurationSeconds: 8, completeTargetSpanRequired: true, fullClipTextMatchAloneInsufficient: true, expectedSpeakerSegmentMatchRequired: true, manualOverrideAuthorized: false },
  executionPolicy: { paidCalls: 8, attemptsPerMove: 1, retriesMaximum: 0, sequentialExecution: true, stopOnFirstFailure: true, helperPath, authentication: "OpenAI transcription API", sourceAudioAlreadyLocal: true },
  cost: { approved: true, estimatedMinutes, estimatedRateUsdPerMinute, estimatedCostUsd, maximumAuthorizedCostUsd: 0.15, exactBilledCostAvailable: false },
  debates,
  outputs: { execution: executionPath, audit: auditPath, postAudioAnalysis: postAudioPath },
  sourceHashes,
  authorization: { paidDiarization: true, deterministicAudioAnalysis: true, disagreementExtraction: false, adjudicationModelExecution: false, scoreDerivation: false, publicationFinalization: false, productionMutation: false, heldOutGate: false, all195Debates: false }
};
if (shouldWrite) await writeFile(path.resolve(root, planPath), `${JSON.stringify(plan, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", plan: planPath, debates: debates.length, moves: debates.flatMap((debate) => debate.moves).length, estimatedMinutes, estimatedCostUsd, maximumAuthorizedCostUsd: 0.15, paidCalls: 8, retriesMaximum: 0 }, null, 2));
