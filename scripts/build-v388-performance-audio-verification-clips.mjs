#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V388_PERFORMANCE_DEBATES, V388_PERFORMANCE_ROOT, assertV388, validateV388PerformanceOutput } from "./lib/v388-performance-judgment.mjs";

const root = process.cwd();
const localRoot = "output/transcribe/v388-performance-audio-verification";
const recoveryRoot = `${V388_PERFORMANCE_ROOT}/validated-recovery`;
const planPath = `${localRoot}/verification-plan.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const bytes = (relativePath) => readFile(path.resolve(root, relativePath));
const readJson = async (relativePath) => JSON.parse(await bytes(relativePath));
const exists = async (relativePath) => { try { await access(path.resolve(root, relativePath)); return true; } catch { return false; } };

assertV388(!(await exists(planPath)), `${planPath} already exists`);
const debates = [];
let clipCount = 0;
let paddedDurationMs = 0;

for (const debateNumber of V388_PERFORMANCE_DEBATES) {
  const packetPath = `${V388_PERFORMANCE_ROOT}/packets/debate-${debateNumber}.json`;
  const passAPath = `${recoveryRoot}/normalized/outputs/debate-${debateNumber}-pass-a.json`;
  const passBPath = `${recoveryRoot}/normalized/outputs/debate-${debateNumber}-pass-b.json`;
  const [packet, passA, passB] = await Promise.all([readJson(packetPath), readJson(passAPath), readJson(passBPath)]);
  validateV388PerformanceOutput(passA, packet, "A");
  validateV388PerformanceOutput(passB, packet, "B");
  const sourcePath = `${localRoot}/${packet.debateId}/audio/source.mp3`;
  assertV388(await exists(sourcePath), `${sourcePath} missing`);
  const clipsRoot = `${localRoot}/${packet.debateId}/clips`;
  assertV388(!(await exists(clipsRoot)), `${clipsRoot} already exists`);
  await mkdir(path.resolve(root, clipsRoot), { recursive: true });
  const clips = [];

  for (let index = 0; index < packet.moves.length; index += 1) {
    const judgmentA = passA.moveJudgments[index];
    const judgmentB = passB.moveJudgments[index];
    if (judgmentA.assessmentConfidence === "high" && judgmentB.assessmentConfidence === "high") continue;
    const move = packet.moves[index];
    assertV388(move.moveId === judgmentA.moveId && move.moveId === judgmentB.moveId, `${debateNumber}:${index}: medium-confidence move identity mismatch`);
    const paddedStartMs = Math.max(0, move.sourceSpan.startMs - 3000);
    const paddedEndMs = move.sourceSpan.endMs + 3000;
    const durationMs = paddedEndMs - paddedStartMs;
    const clipPath = `${clipsRoot}/move-${String(index + 1).padStart(2, "0")}.mp3`;
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-ss", (paddedStartMs / 1000).toFixed(3), "-i", path.resolve(root, sourcePath), "-t", (durationMs / 1000).toFixed(3), "-vn", "-ac", "1", "-ar", "16000", "-codec:a", "libmp3lame", "-q:a", "4", path.resolve(root, clipPath)], { cwd: root });
    const measuredDurationSeconds = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path.resolve(root, clipPath)], { cwd: root, encoding: "utf8" }).trim());
    assertV388(Number.isFinite(measuredDurationSeconds) && Math.abs(measuredDurationSeconds * 1000 - durationMs) <= 100, `${clipPath}: clip duration mismatch`);
    const clipBytes = await bytes(clipPath);
    clips.push({
      moveIndex: index,
      moveId: move.moveId,
      speaker: move.speaker,
      side: move.side,
      sourceSpan: move.sourceSpan,
      passAConfidence: judgmentA.assessmentConfidence,
      passBConfidence: judgmentB.assessmentConfidence,
      paddingMsPerSide: 3000,
      paddedStartMs,
      paddedEndMs,
      plannedDurationMs: durationMs,
      measuredDurationSeconds,
      clipPath,
      clipBytes: clipBytes.length,
      clipSha256: sha256(clipBytes),
      lockedAtomicExcerpt: move.atomicExcerpt,
      lockedProposition: move.proposition,
    });
    clipCount += 1;
    paddedDurationMs += durationMs;
  }

  debates.push({
    debateNumber,
    debateId: packet.debateId,
    sourceUrl: (await readJson(packet.sourceChain.localManifestPath)).sourceUrl,
    sourcePath,
    sourceSha256: sha256(await bytes(sourcePath)),
    packetPath,
    mediumConfidenceMoveCount: clips.length,
    clips,
  });
}

assertV388(clipCount === 17, "audio verification plan must contain exactly 17 observed medium-confidence moves");
const plan = {
  schemaVersion: "3.8.8-performance-audio-verification-plan",
  protocolId: "v3.8.8-performance-judgment-consensus",
  status: "clips-built-pending-transcription",
  generatedFrom: "assessmentConfidence is medium or low in either independent pass",
  sourceAudioStoredLocally: true,
  clipCount,
  paddedDurationMs,
  paddedDurationMinutes: paddedDurationMs / 60000,
  transcriptionModel: "gpt-transcribe",
  officialEstimatedCostUsdPerMinute: 0.0045,
  estimatedTranscriptionCostUsd: (paddedDurationMs / 60000) * 0.0045,
  maximumAuthorizedTranscriptionCostUsd: 0.1,
  adjudicationModelMeteredApiCostUsd: 0,
  debates,
};
assertV388(plan.estimatedTranscriptionCostUsd <= plan.maximumAuthorizedTranscriptionCostUsd, "audio verification exceeds authorized transcription cost cap");
await writeFile(path.resolve(root, planPath), `${JSON.stringify(plan, null, 2)}\n`);
console.log(JSON.stringify({ status: plan.status, debates: debates.length, clipCount, paddedDurationMinutes: plan.paddedDurationMinutes, estimatedTranscriptionCostUsd: plan.estimatedTranscriptionCostUsd, maximumAuthorizedTranscriptionCostUsd: plan.maximumAuthorizedTranscriptionCostUsd }, null, 2));
