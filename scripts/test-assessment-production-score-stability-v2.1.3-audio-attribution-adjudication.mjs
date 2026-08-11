#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

import {
  V213_AUDIO_ADJ_AUDIT,
  V213_AUDIO_ADJ_ISOLATION,
  V213_AUDIO_ADJ_OUTPUT_VERSION,
  V213_AUDIO_ADJ_PROTOCOL_ID,
  V213_AUDIO_ADJ_ROOT,
  makeV213AudioAttributionAdjudicationSchema,
  validateV213AudioAttributionAdjudicationOutput
} from "./lib/assessment-production-score-stability-v2.1.3-audio-attribution-adjudication.mjs";

const packet = JSON.parse(
  await readFile(`${V213_AUDIO_ADJ_ROOT}/packet.json`, "utf8")
);
const preparation = JSON.parse(
  await readFile(`${V213_AUDIO_ADJ_ROOT}/preparation-manifest.json`, "utf8")
);
const schema = makeV213AudioAttributionAdjudicationSchema();
assert.equal(
  schema.properties.adjudications.items.properties.evidenceSegmentIndexes
    .uniqueItems,
  undefined
);
assert.equal(
  preparation.status,
  "prepared-one-v2.1.3-disputed-audio-attribution"
);
assert.equal(preparation.model.label, "5.6 Sol");
assert.equal(preparation.model.reasoningEffort, "low");
assert.equal(preparation.model.authentication, "ChatGPT subscription");
assert.equal(preparation.moves.length, 1);
assert.equal(preparation.authorization.executionManifestPreparation, true);
assert.equal(preparation.authorization.modelExecution, false);
assert.equal(preparation.authorization.paidTranscription, false);
assert.equal(preparation.authorization.scoreDerivation, false);
assert.equal(packet.moves.length, 1);
assert.equal(
  packet.moves[0].moveId,
  "con-uncertain-single-catholic-lineage"
);
assert.equal(packet.moves[0].expectedSpeaker, "Graham Oppy");
assert.equal(packet.moves[0].diagnosedFailureClass, "mixed-speaker-locked-excerpt-contamination");
assert.equal(packet.decisionRule.thresholdRelaxationAuthorized, false);
assert.equal(packet.decisionRule.speakerRelabelingAuthorized, false);

const transcript = JSON.parse(
  await readFile(packet.moves[0].diarizedTranscriptPath, "utf8")
);
const expectedIndex = transcript.segments.findIndex(
  (segment) =>
    segment.speaker === packet.moves[0].expectedSpeaker && segment.text.trim()
);
assert(expectedIndex >= 0);
const fixture = {
  schemaVersion: V213_AUDIO_ADJ_OUTPUT_VERSION,
  protocolId: V213_AUDIO_ADJ_PROTOCOL_ID,
  debateNumber: packet.debateNumber,
  debateId: packet.debateId,
  reviewerRole: "isolated-audio-attribution-adjudicator",
  assessmentModel: "5.6 Sol",
  productionCanary: false,
  stagingOnly: true,
  developmentValidationOnly: true,
  isolation: structuredClone(V213_AUDIO_ADJ_ISOLATION),
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
        "Synthetic unresolved fixture validates the closed v2.1.3 output shape."
    }
  ],
  audit: structuredClone(V213_AUDIO_ADJ_AUDIT)
};
assert.equal(
  (await validateV213AudioAttributionAdjudicationOutput(fixture, packet))
    .unresolved,
  1
);
const duplicate = structuredClone(fixture);
duplicate.adjudications[0].evidenceSegmentIndexes = [
  expectedIndex,
  expectedIndex
];
await assert.rejects(() =>
  validateV213AudioAttributionAdjudicationOutput(duplicate, packet)
);
const outputPath = `${V213_AUDIO_ADJ_ROOT}/output.json`;
const executionManifestPath = `${V213_AUDIO_ADJ_ROOT}/execution-manifest.json`;
const executionPath = `${V213_AUDIO_ADJ_ROOT}/model-execution.json`;
const analysisPath = `${V213_AUDIO_ADJ_ROOT}/analysis.json`;
const exists = (file) => access(file).then(() => true, () => false);
if (!(await exists(executionManifestPath))) {
  assert.equal(await exists(outputPath), false);
  assert.equal(await exists(executionPath), false);
  assert.equal(await exists(analysisPath), false);
}
console.log(
  JSON.stringify(
    {
      status: "passed-prepared",
      disputedMoves: 1,
      model: "5.6 Sol/low",
      authentication: "ChatGPT subscription",
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
