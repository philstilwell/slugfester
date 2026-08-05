#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { bagOfWordsRecall, evaluateAttributionTranscript, lexicalTokens } from "./lib/v416-audio-verification.mjs";

const move = { moveId: "synthetic-move", expectedSpeaker: "Expected Speaker", verificationExcerpt: "a cosmic designer invites caution and modesty" };
const transcript = {
  duration: 20,
  text: "A short introduction. A cosmic designer invites caution and modesty. A closing reply.",
  segments: [
    { start: 0, end: 4, speaker: "Moderator", text: "A short introduction." },
    { start: 4, end: 15, speaker: "Expected Speaker", text: "A cosmic designer invites caution and modesty." },
    { start: 15, end: 20, speaker: "Other Speaker", text: "A closing reply." }
  ]
};

assert.deepEqual(lexicalTokens("Café—isn't 2nd"), ["cafe", "isn't", "2nd"]);
assert.equal(bagOfWordsRecall("one two two", "two one two three"), 1);
assert.equal(evaluateAttributionTranscript(transcript, move).status, "verified");

const swapped = structuredClone(transcript);
swapped.segments[1].speaker = "Other Speaker";
assert.equal(evaluateAttributionTranscript(swapped, move).status, "unresolved");

const omitted = structuredClone(transcript);
omitted.text = "A short introduction and a closing reply.";
omitted.segments[1].text = "An unrelated sentence without the locked proposition.";
assert.equal(evaluateAttributionTranscript(omitted, move).status, "unresolved");

assert.throws(() => evaluateAttributionTranscript({ ...transcript, segments: [] }, move));
console.log(JSON.stringify({ status: "passed", fixtures: 4, mutationsRejected: 3 }, null, 2));
