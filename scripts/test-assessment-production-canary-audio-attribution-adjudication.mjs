#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

import {
  PRODUCTION_CANARY_AUDIO_ADJ_AUDIT,
  PRODUCTION_CANARY_AUDIO_ADJ_ISOLATION,
  PRODUCTION_CANARY_AUDIO_ADJ_OUTPUT_VERSION,
  PRODUCTION_CANARY_AUDIO_ADJ_PROTOCOL_ID,
  PRODUCTION_CANARY_AUDIO_ADJ_ROOT,
  makeProductionCanaryAudioAttributionAdjudicationSchema,
  validateProductionCanaryAudioAttributionAdjudicationOutput
} from "./lib/assessment-production-canary-audio-attribution-adjudication.mjs";

const packet = JSON.parse(
  await readFile(`${PRODUCTION_CANARY_AUDIO_ADJ_ROOT}/packet.json`, "utf8")
);
const preparation = JSON.parse(
  await readFile(
    `${PRODUCTION_CANARY_AUDIO_ADJ_ROOT}/preparation-manifest.json`,
    "utf8"
  )
);
const schema = makeProductionCanaryAudioAttributionAdjudicationSchema();
assert.equal(
  schema.properties.adjudications.items.properties.evidenceSegmentIndexes.uniqueItems,
  undefined
);
assert.equal(
  preparation.status,
  "prepared-one-production-canary-disputed-audio-attribution"
);
assert.equal(preparation.model.label, "5.6 Sol");
assert.equal(preparation.model.reasoningEffort, "low");
assert.equal(preparation.model.authentication, "ChatGPT subscription");
assert.equal(preparation.moves.length, 1);
assert.equal(preparation.authorization.modelExecution, false);
assert.equal(preparation.authorization.paidTranscription, false);
assert.equal(preparation.authorization.scoreDerivation, false);
assert.equal(packet.moves.length, 1);
assert.equal(packet.moves[0].moveId, "pro-move-07");
assert.equal(packet.moves[0].expectedSpeaker, "Sye Ten Bruggencate");
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
  schemaVersion: PRODUCTION_CANARY_AUDIO_ADJ_OUTPUT_VERSION,
  protocolId: PRODUCTION_CANARY_AUDIO_ADJ_PROTOCOL_ID,
  debateNumber: packet.debateNumber,
  debateId: packet.debateId,
  reviewerRole: "isolated-audio-attribution-adjudicator",
  assessmentModel: "5.6 Sol",
  productionCanary: true,
  stagingOnly: true,
  isolation: structuredClone(PRODUCTION_CANARY_AUDIO_ADJ_ISOLATION),
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
        "Synthetic unresolved fixture validates the closed production-canary output shape."
    }
  ],
  audit: structuredClone(PRODUCTION_CANARY_AUDIO_ADJ_AUDIT)
};
assert.equal(
  (await validateProductionCanaryAudioAttributionAdjudicationOutput(fixture, packet))
    .unresolved,
  1
);
const duplicate = structuredClone(fixture);
duplicate.adjudications[0].evidenceSegmentIndexes = [expectedIndex, expectedIndex];
await assert.rejects(() =>
  validateProductionCanaryAudioAttributionAdjudicationOutput(duplicate, packet)
);
const outputPath = `${PRODUCTION_CANARY_AUDIO_ADJ_ROOT}/output.json`;
const executionPath = `${PRODUCTION_CANARY_AUDIO_ADJ_ROOT}/model-execution.json`;
const exists = (file) => access(file).then(() => true, () => false);
if (!(await exists(executionPath))) {
  assert.equal(await exists(outputPath), false);
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
