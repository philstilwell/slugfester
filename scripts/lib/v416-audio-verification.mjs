import { assertV4 } from "./v41-lean-production.mjs";

export const V416_AUDIO_SCHEMA_VERSION = "4.1.6-pass-b-audio-verification";
export const V416_AUDIO_PROTOCOL_ID = "v4.1.6-triggered-pass-b-consensus";
export const V416_AUDIO_THRESHOLDS = Object.freeze({
  minimumFullClipExcerptRecall: 0.8,
  minimumExpectedSpeakerExcerptRecall: 0.8,
  minimumExpectedSpeakerRecallMargin: 0.15,
  minimumExpectedSpeakerDurationSeconds: 5
});

export function lexicalTokens(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .match(/[a-z0-9]+(?:'[a-z0-9]+)?/g) ?? [];
}

export function bagOfWordsRecall(reference, candidate) {
  const referenceTokens = lexicalTokens(reference);
  assertV4(referenceTokens.length > 0, "audio-verification reference text has no lexical tokens");
  const counts = new Map();
  for (const token of lexicalTokens(candidate)) counts.set(token, (counts.get(token) ?? 0) + 1);
  let matched = 0;
  for (const token of referenceTokens) {
    const available = counts.get(token) ?? 0;
    if (available <= 0) continue;
    matched += 1;
    counts.set(token, available - 1);
  }
  return matched / referenceTokens.length;
}

export function evaluateAttributionTranscript(transcript, move, thresholds = V416_AUDIO_THRESHOLDS) {
  assertV4(transcript && typeof transcript === "object", `${move.moveId}: diarized transcript missing`);
  assertV4(typeof transcript.text === "string" && transcript.text.trim(), `${move.moveId}: transcript text missing`);
  assertV4(Number.isFinite(transcript.duration) && transcript.duration > 0, `${move.moveId}: transcript duration invalid`);
  assertV4(Array.isArray(transcript.segments) && transcript.segments.length > 0, `${move.moveId}: transcript segments missing`);
  assertV4(typeof move.expectedSpeaker === "string" && move.expectedSpeaker, `${move.moveId}: expected speaker missing`);
  assertV4(typeof move.verificationExcerpt === "string" && move.verificationExcerpt, `${move.moveId}: verification excerpt missing`);

  const bySpeaker = new Map();
  for (const [index, segment] of transcript.segments.entries()) {
    assertV4(segment && typeof segment.text === "string" && segment.text.trim(), `${move.moveId}: segment ${index} text invalid`);
    assertV4(typeof segment.speaker === "string" && segment.speaker.trim(), `${move.moveId}: segment ${index} speaker invalid`);
    assertV4(Number.isFinite(segment.start) && Number.isFinite(segment.end) && segment.start >= 0 && segment.end >= segment.start, `${move.moveId}: segment ${index} timing invalid`);
    const record = bySpeaker.get(segment.speaker) ?? { speaker: segment.speaker, text: "", durationSeconds: 0, segmentCount: 0 };
    record.text += ` ${segment.text}`;
    record.durationSeconds += segment.end - segment.start;
    record.segmentCount += 1;
    bySpeaker.set(segment.speaker, record);
  }

  const speakerEvidence = [...bySpeaker.values()].map((record) => ({
    speaker: record.speaker,
    segmentCount: record.segmentCount,
    durationSeconds: Number(record.durationSeconds.toFixed(3)),
    wordCount: lexicalTokens(record.text).length,
    excerptRecall: bagOfWordsRecall(move.verificationExcerpt, record.text)
  })).sort((a, b) => b.excerptRecall - a.excerptRecall || b.durationSeconds - a.durationSeconds || a.speaker.localeCompare(b.speaker));
  const expected = speakerEvidence.find((record) => record.speaker === move.expectedSpeaker) ?? { speaker: move.expectedSpeaker, segmentCount: 0, durationSeconds: 0, wordCount: 0, excerptRecall: 0 };
  const highestOther = speakerEvidence.find((record) => record.speaker !== move.expectedSpeaker) ?? { speaker: null, segmentCount: 0, durationSeconds: 0, wordCount: 0, excerptRecall: 0 };
  const fullClipExcerptRecall = bagOfWordsRecall(move.verificationExcerpt, transcript.text);
  const recallMargin = expected.excerptRecall - highestOther.excerptRecall;
  const checks = {
    fullClipExcerptRecovered: fullClipExcerptRecall >= thresholds.minimumFullClipExcerptRecall,
    expectedSpeakerExcerptRecovered: expected.excerptRecall >= thresholds.minimumExpectedSpeakerExcerptRecall,
    expectedSpeakerRecallDistinct: recallMargin >= thresholds.minimumExpectedSpeakerRecallMargin,
    expectedSpeakerDurationSufficient: expected.durationSeconds >= thresholds.minimumExpectedSpeakerDurationSeconds
  };
  const passed = Object.values(checks).every(Boolean);
  return {
    status: passed ? "verified" : "unresolved",
    expectedSpeaker: move.expectedSpeaker,
    fullClipExcerptRecall,
    expectedSpeakerExcerptRecall: expected.excerptRecall,
    highestOtherSpeaker: highestOther.speaker,
    highestOtherSpeakerExcerptRecall: highestOther.excerptRecall,
    expectedSpeakerRecallMargin: recallMargin,
    expectedSpeakerDurationSeconds: expected.durationSeconds,
    checks,
    speakerEvidence
  };
}
