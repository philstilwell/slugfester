#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";

import {
  V223_AUDIO_ADJ_AUDIT,
  V223_AUDIO_ADJ_ISOLATION,
  V223_AUDIO_ADJ_OUTPUT_VERSION,
  V223_AUDIO_ADJ_PROTOCOL_ID,
  V223_AUDIO_ADJ_ROOT,
  makeV223AudioAttributionAdjudicationSchema,
  validateV223AudioAttributionAdjudicationOutput
} from "./lib/assessment-production-score-stability-v2.2.3-audio-attribution-adjudication.mjs";

const packet = JSON.parse(
  await readFile(`${V223_AUDIO_ADJ_ROOT}/packet.json`, "utf8")
);
const preparation = JSON.parse(
  await readFile(`${V223_AUDIO_ADJ_ROOT}/preparation-manifest.json`, "utf8")
);
const schema = makeV223AudioAttributionAdjudicationSchema();
assert.equal(
  schema.properties.adjudications.items.properties.evidenceSegmentIndexes
    .uniqueItems,
  undefined
);
assert.equal(
  preparation.status,
  "prepared-one-v2.2.3-disputed-audio-attribution"
);
assert.equal(preparation.model.label, "5.6 Sol");
assert.equal(preparation.model.reasoningEffort, "low");
assert.equal(preparation.model.authentication, "ChatGPT subscription");
assert.equal(preparation.model.meteredApiCostUsdMaximum, 0);
assert.equal(preparation.moves.length, 1);
assert.equal(preparation.authorization.executionManifestPreparation, true);
assert.equal(preparation.authorization.modelExecution, false);
assert.equal(preparation.authorization.paidTranscription, false);
assert.equal(preparation.authorization.retry, false);
assert.equal(preparation.authorization.scoreDerivation, false);
for (const [source, digest] of Object.entries(preparation.sourceHashes)) {
  assert.equal(
    createHash("sha256").update(await readFile(source)).digest("hex"),
    digest,
    `source hash mismatch: ${source}`
  );
}
assert.equal(packet.moves.length, 1);
assert.equal(packet.debateNumber, "17");
assert.equal(packet.debateId, "collins-oconnor-god-existence-2024");
assert.equal(packet.moves[0].moveId, "pro-cumulative-moral-christian-case");
assert.equal(packet.moves[0].expectedSpeaker, "Francis Collins");
assert.equal(
  packet.moves[0].diagnosedFailureClass,
  "mixed-speaker-locked-excerpt-contamination"
);
assert.equal(packet.evidenceBoundary.ratingsUnavailable, true);
assert.equal(packet.evidenceBoundary.scoresUnavailable, true);
assert.equal(packet.evidenceBoundary.legacyUnavailable, true);
assert.equal(packet.decisionRule.thresholdRelaxationAuthorized, false);
assert.equal(packet.decisionRule.speakerRelabelingAuthorized, false);
assert.equal(packet.decisionRule.manualOverrideAuthorized, false);

const transcript = JSON.parse(
  await readFile(packet.moves[0].diarizedTranscriptPath, "utf8")
);
assert.equal(transcript.segments.length, 77);
const expectedIndex = transcript.segments.findIndex(
  (segment) =>
    segment.speaker === packet.moves[0].expectedSpeaker && segment.text.trim()
);
assert(expectedIndex >= 0);
const fixture = {
  schemaVersion: V223_AUDIO_ADJ_OUTPUT_VERSION,
  protocolId: V223_AUDIO_ADJ_PROTOCOL_ID,
  debateNumber: packet.debateNumber,
  debateId: packet.debateId,
  reviewerRole: "isolated-audio-attribution-adjudicator",
  assessmentModel: "5.6 Sol",
  productionCanary: false,
  stagingOnly: true,
  developmentValidationOnly: true,
  isolation: structuredClone(V223_AUDIO_ADJ_ISOLATION),
  adjudications: [
    {
      moveId: packet.moves[0].moveId,
      expectedSpeaker: packet.moves[0].expectedSpeaker,
      status: "unresolved",
      authoringSpeaker: null,
      corePropositionAuthoredByExpectedSpeaker: false,
      mixedSpeakerSpan: true,
      evidenceSegmentIndexes: [expectedIndex],
      confidence: "low",
      rationale:
        "Synthetic unresolved fixture validates the closed v2.2.3 output shape."
    }
  ],
  audit: structuredClone(V223_AUDIO_ADJ_AUDIT)
};
assert.equal(
  (await validateV223AudioAttributionAdjudicationOutput(fixture, packet))
    .unresolved,
  1
);
const duplicate = structuredClone(fixture);
duplicate.adjudications[0].evidenceSegmentIndexes = [
  expectedIndex,
  expectedIndex
];
await assert.rejects(() =>
  validateV223AudioAttributionAdjudicationOutput(duplicate, packet)
);
const outputPath = `${V223_AUDIO_ADJ_ROOT}/output.json`;
const executionManifestPath = `${V223_AUDIO_ADJ_ROOT}/execution-manifest.json`;
const executionPath = `${V223_AUDIO_ADJ_ROOT}/model-execution.json`;
const analysisPath = `${V223_AUDIO_ADJ_ROOT}/analysis.json`;
const exists = (file) =>
  access(file).then(
    () => true,
    () => false
  );
assert.equal(await exists(executionManifestPath), false);
assert.equal(await exists(outputPath), false);
assert.equal(await exists(executionPath), false);
assert.equal(await exists(analysisPath), false);
console.log(
  JSON.stringify(
    {
      status: "passed-prepared",
      disputedMoves: 1,
      model: "5.6 Sol/low",
      authentication: "ChatGPT subscription",
      scoreBlind: true,
      unsupportedUniqueItemsAbsent: true,
      deterministicDuplicateRejectionRetained: true,
      modelContextsExecuted: 0,
      paidTranscriptionCalls: 0,
      scoresDerived: 0
    },
    null,
    2
  )
);
