#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { V417_AUDIO_PROTOCOL_ID, V417_AUDIO_SCHEMA_VERSION, bagOfWordsRecall, evaluateAttributionTranscript, evaluateAttributionTranscriptV417, lexicalTokens } from "./lib/v417-audio-verification.mjs";

const move = { moveId: "synthetic-move", expectedSpeaker: "Expected Speaker", verificationExcerpt: "a cosmic designer invites caution and modesty" };
const transcript = { duration: 20, text: "A short introduction. A cosmic designer invites caution and modesty. A closing reply.", segments: [{ start: 0, end: 4, speaker: "Moderator", text: "A short introduction." }, { start: 4, end: 15, speaker: "Expected Speaker", text: "A cosmic designer invites caution and modesty." }, { start: 15, end: 20, speaker: "Other Speaker", text: "A closing reply." }] };
assert.equal(V417_AUDIO_SCHEMA_VERSION, "4.1.7-pass-b-audio-verification");
assert.equal(V417_AUDIO_PROTOCOL_ID, "v4.1.7-fresh-six-triggered-pass-b");
assert.deepEqual(lexicalTokens("Café—isn't 2nd"), ["cafe", "isn't", "2nd"]);
assert.equal(bagOfWordsRecall("one two two", "two one two three"), 1);
assert.equal(evaluateAttributionTranscript(transcript, move).status, "verified");
const swapped = structuredClone(transcript); swapped.segments[1].speaker = "Other Speaker";
assert.equal(evaluateAttributionTranscript(swapped, move).status, "unresolved");
const omitted = structuredClone(transcript); omitted.text = "A short introduction and a closing reply."; omitted.segments[1].text = "An unrelated sentence without the locked proposition.";
assert.equal(evaluateAttributionTranscript(omitted, move).status, "unresolved");
assert.throws(() => evaluateAttributionTranscript({ ...transcript, segments: [] }, move));
const boundaryFragment = structuredClone(transcript); boundaryFragment.segments.push({ start: 19.9, end: 20, speaker: "Expected Speaker", text: "" });
const amended = evaluateAttributionTranscriptV417(boundaryFragment, move);
assert.equal(amended.status, "verified");
assert.equal(amended.ignoredEmptySegmentAudit.count, 1);
assert.equal(amended.rawTranscriptMutationPerformed, false);
const oversized = structuredClone(transcript); oversized.segments.push({ start: 19.5, end: 20, speaker: "Expected Speaker", text: "" });
assert.throws(() => evaluateAttributionTranscriptV417(oversized, move));
console.log(JSON.stringify({ status: "passed", fixtures: 6, mutationsRejected: 4, emptyBoundaryElisionValidated: true, paidCalls: 0 }, null, 2));
