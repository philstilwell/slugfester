#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

import { AUDIT, ISOLATION, MODEL, OUTPUT_VERSION, PROTOCOL_ID, ROOT, validateOutput } from "./lib/assessment-production-post-canary-batch-15-audio-attribution.mjs";

const preparation = JSON.parse(await readFile(`${ROOT}/preparation-manifest.json`, "utf8"));
const authorization = JSON.parse(await readFile("docs/assessment-production/post-canary-continuation-v1/batch-15/audio-verification/audio-attribution-successor-authorization.json", "utf8"));
assert.equal(preparation.status, "prepared-two-batch-15-audio-attribution-recovery-contexts-not-active");
assert.equal(authorization.status, "frozen-active-batch-15-audio-attribution-recovery-level-1-successor-authorization");
assert.deepEqual(preparation.contexts.map((item) => [item.debateNumber, item.moveIds.length]), [["39", 1], ["98", 1]]);
assert.equal(preparation.model.label, MODEL.label);
assert.equal(preparation.model.reasoningEffort, "low");
assert.equal(preparation.model.authentication, "ChatGPT subscription");
assert.equal(preparation.executionPolicy.retriesMaximum, 0);
assert.equal(preparation.executionPolicy.paidTranscriptionCalls, 0);
for (const context of preparation.contexts) {
  const packet = JSON.parse(await readFile(context.packet, "utf8"));
  const evidenceIndexes = [];
  for (const move of packet.moves) {
    const transcript = JSON.parse(await readFile(move.diarizedTranscriptPath, "utf8"));
    const segmentIndex = transcript.segments.findIndex((segment) => String(segment.text ?? "").trim());
    assert(segmentIndex >= 0);
    evidenceIndexes.push(segmentIndex);
  }
  const fixture = {
    schemaVersion: OUTPUT_VERSION,
    protocolId: PROTOCOL_ID,
    debateNumber: packet.debateNumber,
    debateId: packet.debateId,
    reviewerRole: "isolated-audio-attribution-adjudicator",
    assessmentModel: MODEL.label,
    productionCanary: false,
    stagingOnly: true,
    isolation: structuredClone(ISOLATION),
    adjudications: packet.moves.map((move, index) => ({
      moveId: move.moveId,
      expectedSpeaker: move.expectedSpeaker,
      status: "unresolved",
      authoringSpeaker: null,
      corePropositionAuthoredByExpectedSpeaker: false,
      mixedSpeakerSpan: true,
      identityResolution: "unresolved",
      evidenceSegmentIndexes: [evidenceIndexes[index]],
      confidence: "low",
      rationale: "Synthetic unresolved fixture validates the closed score-blind recovery output shape.",
    })),
    audit: structuredClone(AUDIT),
  };
  assert.equal((await validateOutput(fixture, packet)).unresolved, packet.moves.length);
  await access(context.schema);
}
console.log(JSON.stringify({ status: "passed-prepared", contexts: 2, decisions: 2, model: "5.6 Sol/low", authentication: "ChatGPT subscription", attemptsMaximum: 1, retriesMaximum: 0, paidTranscriptionCalls: 0, scoresDerived: 0 }, null, 2));
