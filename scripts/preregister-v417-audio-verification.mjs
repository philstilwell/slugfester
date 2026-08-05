#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, readJson } from "./lib/v41-lean-production.mjs";
import { V417_AUDIO_PROTOCOL_ID, V417_AUDIO_SCHEMA_VERSION, V417_AUDIO_THRESHOLDS } from "./lib/v417-audio-verification.mjs";
import { V417_PASS_B_ROOT } from "./lib/v417-triggered-consensus.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const localRoot = "output/transcribe/v417-pass-b-audio-verification";
const planPath = `${V417_PASS_B_ROOT}/audio-verification-plan.json`;
const executionPath = `${V417_PASS_B_ROOT}/audio-model-execution.json`;
const auditPath = `${V417_PASS_B_ROOT}/audio-verification.json`;
const postAudioPath = `${V417_PASS_B_ROOT}/post-audio-analysis.json`;
const helperPath = "/Users/philstilwell/.codex/skills/transcribe/scripts/transcribe_diarize.py";
const ffmpeg = "/opt/homebrew/bin/ffmpeg";
const ffprobe = "/opt/homebrew/bin/ffprobe";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const fileSha256 = async (file) => sha256(await readFile(path.resolve(root, file)));
const exists = async (file) => access(path.resolve(root, file)).then(() => true, () => false);

const configs = [
  { debateNumber: "58", references: [{ speaker: "Matt Dillahunty", moveId: "pro-relative-comparison" }, { speaker: "Matt Slick", moveId: "con-self-refutation-criterion" }] },
  { debateNumber: "91", references: [{ speaker: "Brian Cutter", moveId: "pro-harmony-data" }, { speaker: "Graham Oppy", moveId: "con-identity-opening" }] },
  { debateNumber: "59", references: [{ speaker: "Phil Halper", moveId: "con-cosmos-opening" }, { speaker: "Michel-Yves Bollore", moveId: "pro-cosmos-bgv" }] },
  { debateNumber: "144", references: [{ speaker: "Alvin Plantinga", moveId: "pro-compatibility-constructive" }, { speaker: "Daniel Dennett", moveId: "con-compatibility-reply" }] }
];

if (shouldWrite) for (const future of [planPath, executionPath, auditPath, postAudioPath]) assertV4(!(await exists(future)), `${future} already exists`);
const analysis = await readJson(`${V417_PASS_B_ROOT}/analysis.json`);
assertV4(analysis.status === "pass-b-passed-audio-verification-required" && analysis.authorization.audioVerification && analysis.pendingAudioMoves.length === 12, "v4.1.7 audio verification is not authorized");

function packetMoves(packet) {
  return packet.lockedSections.flatMap((section) => [...section.proMoves, ...section.conMoves]);
}

const debates = [];
for (const config of configs) {
  const analysisDebate = analysis.debates.find((item) => item.debateNumber === config.debateNumber);
  assertV4(analysisDebate, `${config.debateNumber}: analysis debate unavailable`);
  const packetPath = `${V417_PASS_B_ROOT}/packets/debate-${config.debateNumber}.json`;
  const outputPath = `${V417_PASS_B_ROOT}/outputs/debate-${config.debateNumber}.json`;
  const [packet, output] = await Promise.all([readJson(packetPath), readJson(outputPath)]);
  const sourceAudio = `${localRoot}/${packet.debateId}/audio/source.mp3`;
  assertV4(await exists(sourceAudio), `${config.debateNumber}: local source audio missing`);
  const sourceDurationSeconds = Number(execFileSync(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path.resolve(root, sourceAudio)], { encoding: "utf8" }).trim());
  assertV4(sourceDurationSeconds >= packet.durationSeconds - 3, `${config.debateNumber}: source audio is too short`);
  const byId = new Map(packetMoves(packet).map((move) => [move.moveId, move]));
  const judgmentById = new Map(output.moveJudgments.map((move) => [move.moveId, move]));
  const references = [];
  for (const reference of config.references) {
    const move = byId.get(reference.moveId);
    const judgment = judgmentById.get(reference.moveId);
    assertV4(move?.speaker === reference.speaker && judgment?.attributionConfidence === "high", `${reference.moveId}: speaker reference is not high-confidence`);
    const offsetSeconds = 10;
    const durationSeconds = 8;
    assertV4(move.sourceSpan.endMs - move.sourceSpan.startMs >= (offsetSeconds + durationSeconds) * 1000, `${reference.moveId}: reference span too short`);
    const speakerSlug = reference.speaker.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const localPath = `${localRoot}/${packet.debateId}/references/${speakerSlug}.mp3`;
    if (shouldWrite) {
      await mkdir(path.dirname(path.resolve(root, localPath)), { recursive: true });
      execFileSync(ffmpeg, ["-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-ss", String(move.sourceSpan.startMs / 1000 + offsetSeconds), "-i", path.resolve(root, sourceAudio), "-t", String(durationSeconds), "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", path.resolve(root, localPath)]);
    }
    assertV4(await exists(localPath), `${reference.speaker}: reference clip missing`);
    references.push({ speaker: reference.speaker, localPath, sha256: await fileSha256(localPath), durationSeconds, provenance: { lockedMoveId: reference.moveId, lockedSpeaker: move.speaker, passBAttributionConfidence: judgment.attributionConfidence, sourceSpan: move.sourceSpan, offsetSeconds } });
  }
  const moves = [];
  for (const moveId of analysisDebate.pendingAudioMoveIds) {
    const move = byId.get(moveId);
    assertV4(move, `${config.debateNumber}: pending move absent from packet: ${moveId}`);
    const clipStartMs = Math.max(0, move.sourceSpan.startMs - 3000);
    const clipEndMs = Math.min(Math.floor(sourceDurationSeconds * 1000), move.sourceSpan.endMs + 3000);
    const plannedDurationSeconds = (clipEndMs - clipStartMs) / 1000;
    const clipPath = `${localRoot}/${packet.debateId}/clips/${moveId}.mp3`;
    const transcriptPath = `${localRoot}/${packet.debateId}/transcripts/${moveId}.transcript.json`;
    if (shouldWrite) {
      assertV4(!(await exists(transcriptPath)), `${moveId}: transcript already exists`);
      await mkdir(path.dirname(path.resolve(root, clipPath)), { recursive: true });
      await mkdir(path.dirname(path.resolve(root, transcriptPath)), { recursive: true });
      execFileSync(ffmpeg, ["-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-ss", String(clipStartMs / 1000), "-i", path.resolve(root, sourceAudio), "-t", String(plannedDurationSeconds), "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", path.resolve(root, clipPath)]);
    }
    assertV4(await exists(clipPath), `${moveId}: target clip missing`);
    const measuredDurationSeconds = Number(execFileSync(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path.resolve(root, clipPath)], { encoding: "utf8" }).trim());
    assertV4(Math.abs(measuredDurationSeconds - plannedDurationSeconds) <= 0.1, `${moveId}: clip duration mismatch`);
    moves.push({ moveId, expectedSpeaker: move.speaker, sourceSpan: move.sourceSpan, verificationExcerpt: move.sourceSpan.excerpt, boundaryPaddingSecondsPerSide: 3, clipStartMs, clipEndMs, plannedDurationSeconds, measuredDurationSeconds, clipPath, clipSha256: await fileSha256(clipPath), transcriptPath });
  }
  debates.push({ debateNumber: config.debateNumber, debateId: packet.debateId, packetPath, passBOutput: outputPath, sourceAudio, sourceAudioSha256: await fileSha256(sourceAudio), sourceDurationSeconds, references, moves });
}

const estimatedMinutes = debates.flatMap((debate) => debate.moves).reduce((sum, move) => sum + move.measuredDurationSeconds / 60, 0);
const estimatedRateUsdPerMinute = 0.006;
const estimatedCostUsd = estimatedMinutes * estimatedRateUsdPerMinute;
assertV4(estimatedCostUsd <= 0.3, "planned transcription cost exceeds authorized cap");
const sourceFiles = [
  `${V417_PASS_B_ROOT}/analysis.json`, `${V417_PASS_B_ROOT}/model-execution.json`,
  "docs/assessment-workflow-v4.0.md", "docs/assessment-workflow-v4.1.6.md", "docs/assessment-workflow-v4.1.7.md",
  "scripts/lib/v416-audio-verification.mjs", "scripts/lib/v417-audio-verification.mjs", "scripts/prepare-v417-audio-sources.mjs", "scripts/preregister-v417-audio-verification.mjs", "scripts/run-v417-audio-verification.mjs", "scripts/analyze-v417-audio-verification.mjs", "scripts/test-v417-audio-verification.mjs", helperPath,
  ...debates.flatMap((debate) => [debate.packetPath, debate.passBOutput, debate.sourceAudio, ...debate.references.map((item) => item.localPath), ...debate.moves.map((item) => item.clipPath)])
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = await fileSha256(file);
const plan = {
  schemaVersion: V417_AUDIO_SCHEMA_VERSION,
  protocolId: V417_AUDIO_PROTOCOL_ID,
  status: "frozen-twelve-move-known-speaker-diarization-plan",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  trigger: "speaker attribution confidence was medium or low in a valid v4.1.7 Pass B artifact",
  model: { id: "gpt-4o-transcribe-diarize", responseFormat: "diarized_json", chunkingStrategy: "auto", language: "en", prompt: null },
  verificationPolicy: { ...V417_AUDIO_THRESHOLDS, targetClipBoundaryPaddingSecondsPerSide: 3, knownSpeakerReferenceDurationSeconds: 8, knownSpeakerReferencesMustComeFromLockedHighConfidencePassBMoves: true, completeTargetSpanRequired: true, fullClipTextMatchAloneInsufficient: true, expectedSpeakerSegmentMatchRequired: true, manualOverrideAuthorized: false },
  executionPolicy: { paidCalls: 12, attemptsPerMove: 1, retriesMaximum: 0, sequentialExecution: true, stopOnFirstFailure: true, helperPath, authentication: "OpenAI transcription API", sourceAudioAlreadyLocal: true },
  cost: { approvedByUser: true, estimateDisclosedBeforePaidExecution: true, pricingSource: "https://platform.openai.com/docs/pricing", estimatedMinutes, estimatedRateUsdPerMinute, estimatedCostUsd, maximumAuthorizedCostUsd: 0.3, exactBilledCostAvailable: false },
  legacyBoundary: { legacyAssessmentContentAccessed: false, legacyScoresAccessed: false, legacyWinnersAccessed: false, scoreArtifactCreated: false },
  debates,
  outputs: { execution: executionPath, audit: auditPath, postAudioAnalysis: postAudioPath },
  sourceHashes,
  authorization: { paidDiarization: true, deterministicAudioAnalysis: true, disagreementExtraction: false, adjudicationModelExecution: false, compressionAuditModelExecution: false, scoreDerivation: false, legacyComparison: false, publicationFinalization: false, productionMutation: false, heldOutGate: false, all195Debates: false }
};
if (shouldWrite) await writeFile(path.resolve(root, planPath), `${JSON.stringify(plan, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", plan: planPath, debates: debates.length, moves: debates.flatMap((debate) => debate.moves).length, estimatedMinutes, estimatedCostUsd, maximumAuthorizedCostUsd: 0.3, paidCalls: 12, retriesMaximum: 0, legacyAccessed: false }, null, 2));
