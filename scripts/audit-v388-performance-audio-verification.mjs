#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V388_PERFORMANCE_ROOT, assertV388 } from "./lib/v388-performance-judgment.mjs";

const root = process.cwd();
const localRoot = "output/transcribe/v388-performance-audio-verification";
const planPath = `${localRoot}/verification-plan.json`;
const auditPath = `${V388_PERFORMANCE_ROOT}/audio-verification.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const bytes = (relativePath) => readFile(path.resolve(root, relativePath));
const readJson = async (relativePath) => JSON.parse(await bytes(relativePath));
const exists = async (relativePath) => { try { await access(path.resolve(root, relativePath)); return true; } catch { return false; } };
const words = (value) => value.toLowerCase().match(/[a-z0-9]+/g) ?? [];

function bagRecall(reference, candidate) {
  const referenceWords = words(reference);
  const candidateCounts = new Map();
  for (const word of words(candidate)) candidateCounts.set(word, (candidateCounts.get(word) ?? 0) + 1);
  let matches = 0;
  for (const word of referenceWords) {
    const count = candidateCounts.get(word) ?? 0;
    if (count === 0) continue;
    matches += 1;
    candidateCounts.set(word, count - 1);
  }
  return referenceWords.length === 0 ? 0 : matches / referenceWords.length;
}

assertV388(!(await exists(auditPath)), `${auditPath} already exists`);
const plan = await readJson(planPath);
assertV388(plan.status === "clips-built-pending-transcription" && plan.clipCount === 17 && plan.transcriptionModel === "gpt-transcribe" && plan.maximumAuthorizedTranscriptionCostUsd === 0.1, "audio verification plan invalid");

const debates = [];
let verifiedMoves = 0;
let minimumBagRecall = 1;
let transcriptWordCount = 0;
let originalTranscribedDurationMs = 0;
let collisionRecoveryDurationMs = 0;

for (const debate of plan.debates) {
  const moves = [];
  for (const clip of debate.clips) {
    const moveNumber = String(clip.moveIndex + 1).padStart(2, "0");
    const transcriptPath = `${localRoot}/${debate.debateId}/transcripts/move-${moveNumber}.transcript.txt`;
    assertV388(await exists(transcriptPath), `${transcriptPath} missing`);
    const transcriptBytes = await bytes(transcriptPath);
    const transcript = transcriptBytes.toString("utf8").trim();
    assertV388(transcript.length >= 40, `${transcriptPath}: transcript too short`);
    assertV388(sha256(await bytes(clip.clipPath)) === clip.clipSha256, `${clip.clipPath}: clip hash mismatch`);
    const recall = bagRecall(clip.lockedAtomicExcerpt, transcript);
    assertV388(recall >= 0.8, `${clip.moveId}: audio-derived transcript recall below 0.8`);
    const wordCount = words(transcript).length;
    moves.push({
      moveIndex: clip.moveIndex,
      moveId: clip.moveId,
      speaker: clip.speaker,
      side: clip.side,
      sourceSpan: clip.sourceSpan,
      passAConfidence: clip.passAConfidence,
      passBConfidence: clip.passBConfidence,
      clipPath: clip.clipPath,
      clipSha256: clip.clipSha256,
      clipDurationSeconds: clip.measuredDurationSeconds,
      transcriptPath,
      transcriptSha256: sha256(transcriptBytes),
      transcriptWordCount: wordCount,
      lockedExcerptWordCount: words(clip.lockedAtomicExcerpt).length,
      bagOfWordsRecallAgainstLockedExcerpt: recall,
      verificationStatus: "passed-audio-derived-transcript-matches-locked-excerpt",
      audioDerivedTranscript: transcript,
    });
    verifiedMoves += 1;
    minimumBagRecall = Math.min(minimumBagRecall, recall);
    transcriptWordCount += wordCount;
    originalTranscribedDurationMs += clip.plannedDurationMs;
    if ((debate.debateNumber === "55" && clip.moveIndex === 11) || (debate.debateNumber === "161" && clip.moveIndex === 24)) collisionRecoveryDurationMs += clip.plannedDurationMs;
  }
  debates.push({
    debateNumber: debate.debateNumber,
    debateId: debate.debateId,
    sourceUrl: debate.sourceUrl,
    localSourcePath: debate.sourcePath,
    localSourceSha256: debate.sourceSha256,
    verifiedMoveCount: moves.length,
    moves,
  });
}

assertV388(verifiedMoves === 17, "audio verification must cover exactly 17 medium-confidence moves");
const transcriptionDurationMinutesIncludingCollisionRecovery = (originalTranscribedDurationMs + collisionRecoveryDurationMs) / 60000;
const estimatedTranscriptionCostUsd = transcriptionDurationMinutesIncludingCollisionRecovery * plan.officialEstimatedCostUsdPerMinute;
assertV388(estimatedTranscriptionCostUsd <= plan.maximumAuthorizedTranscriptionCostUsd, "estimated transcription cost exceeded authorized cap");

const audit = {
  schemaVersion: "3.8.8-performance-audio-verification-audit",
  protocolId: "v3.8.8-performance-judgment-consensus",
  status: "passed-all-medium-confidence-moves-audio-verified",
  trigger: "assessmentConfidence was medium or low in either independent performance pass",
  verificationMethod: "locally stored source audio clipped with three seconds of context per side, transcribed with gpt-transcribe, and deterministically compared with the locked caption excerpt",
  localPlanPath: planPath,
  localSourceAudioStored: true,
  localPerMoveClipsStored: true,
  localPerMoveTranscriptsStored: true,
  debates: 3,
  verifiedMoves,
  minimumBagOfWordsRecallAgainstLockedExcerpt: minimumBagRecall,
  minimumRequiredBagOfWordsRecall: 0.8,
  transcriptWordCount,
  transcription: {
    model: "gpt-transcribe",
    originalRequests: 17,
    collisionRecoveryRequests: 2,
    filenameCollisionCause: "the bundled helper initially keyed shared output names only by move number",
    filenameCollisionDataLossRemaining: false,
    originalTranscribedDurationMinutes: originalTranscribedDurationMs / 60000,
    collisionRecoveryDurationMinutes: collisionRecoveryDurationMs / 60000,
    estimatedTotalTranscribedDurationMinutes: transcriptionDurationMinutesIncludingCollisionRecovery,
    officialEstimatedCostUsdPerMinute: plan.officialEstimatedCostUsdPerMinute,
    estimatedTranscriptionCostUsd,
    exactBilledCostAvailable: false,
    maximumAuthorizedTranscriptionCostUsd: plan.maximumAuthorizedTranscriptionCostUsd,
    stayedWithinAuthorizedCostCap: true,
  },
  adjudicationModelExecution: {
    authentication: "ChatGPT subscription",
    meteredApiCostUsd: 0,
  },
  authorization: {
    prepareDisputeOnlyAdjudicationPackets: true,
    adjudicationModelExecution: false,
    scoreDerivation: false,
    numericalParticipantScoring: false,
    assessmentProse: false,
    productionMutation: false,
    tenDebateGate: false,
    all195Debates: false,
  },
  debateAudits: debates,
};

await writeFile(path.resolve(root, auditPath), `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify({ status: audit.status, debates: audit.debates, verifiedMoves, minimumBagOfWordsRecallAgainstLockedExcerpt: minimumBagRecall, estimatedTranscriptionCostUsd, stayedWithinAuthorizedCostCap: true, prepareDisputeOnlyAdjudicationPackets: true, scoreDerivationAuthorized: false }, null, 2));
