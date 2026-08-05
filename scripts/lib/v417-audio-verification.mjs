import { V416_AUDIO_THRESHOLDS, bagOfWordsRecall, evaluateAttributionTranscript, lexicalTokens } from "./v416-audio-verification.mjs";
import { assertV4 } from "./v41-lean-production.mjs";

export const V417_AUDIO_SCHEMA_VERSION = "4.1.7-pass-b-audio-verification";
export const V417_AUDIO_PROTOCOL_ID = "v4.1.7-fresh-six-triggered-pass-b";
export const V417_AUDIO_THRESHOLDS = V416_AUDIO_THRESHOLDS;

export const V417_EMPTY_SEGMENT_POLICY = Object.freeze({
  maximumEmptySegmentsPerTranscript: 4,
  maximumSingleEmptySegmentDurationSeconds: 0.1,
  maximumTotalEmptySegmentDurationSeconds: 0.25
});

export function evaluateAttributionTranscriptV417(transcript, move, thresholds = V417_AUDIO_THRESHOLDS) {
  assertV4(transcript && Array.isArray(transcript.segments), `${move.moveId}: diarized transcript segments missing`);
  const empty = transcript.segments.map((segment, index) => ({ segment, index })).filter(({ segment }) => typeof segment?.text === "string" && !segment.text.trim());
  assertV4(empty.length <= V417_EMPTY_SEGMENT_POLICY.maximumEmptySegmentsPerTranscript, `${move.moveId}: too many empty diarization segments`);
  let ignoredDurationSeconds = 0;
  for (const { segment, index } of empty) {
    assertV4(Number.isFinite(segment.start) && Number.isFinite(segment.end) && segment.start >= 0 && segment.end >= segment.start, `${move.moveId}: empty segment ${index} timing invalid`);
    const duration = segment.end - segment.start;
    assertV4(duration <= V417_EMPTY_SEGMENT_POLICY.maximumSingleEmptySegmentDurationSeconds + 1e-9, `${move.moveId}: empty segment ${index} exceeds duration allowance`);
    ignoredDurationSeconds += duration;
  }
  assertV4(ignoredDurationSeconds <= V417_EMPTY_SEGMENT_POLICY.maximumTotalEmptySegmentDurationSeconds + 1e-9, `${move.moveId}: total empty segment duration exceeds allowance`);
  const filtered = { ...transcript, segments: transcript.segments.filter((segment) => typeof segment?.text === "string" && segment.text.trim()) };
  const evaluation = evaluateAttributionTranscript(filtered, move, thresholds);
  return {
    ...evaluation,
    rawTranscriptMutationPerformed: false,
    ignoredEmptySegmentAudit: {
      policy: V417_EMPTY_SEGMENT_POLICY,
      count: empty.length,
      indexes: empty.map(({ index }) => index),
      durationSeconds: Number(ignoredDurationSeconds.toFixed(6))
    }
  };
}

export { bagOfWordsRecall, evaluateAttributionTranscript, lexicalTokens };
