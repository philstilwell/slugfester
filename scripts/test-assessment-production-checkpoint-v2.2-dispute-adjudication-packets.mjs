#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  CHECKPOINT_V22_DISPUTE_ADJ_ISOLATION,
  CHECKPOINT_V22_DISPUTE_ADJ_OUTPUT_VERSION,
  CHECKPOINT_V22_DISPUTE_ADJ_PROTOCOL_ID,
  CHECKPOINT_V22_DISPUTE_ADJ_ROOT,
  validateCheckpointV22DisputeAdjudicationOutput
} from "./lib/assessment-production-checkpoint-v2.2-dispute-adjudication.mjs";

const preparation = JSON.parse(
  await readFile(
    `${CHECKPOINT_V22_DISPUTE_ADJ_ROOT}/preparation-manifest.json`,
    "utf8"
  )
);
assert.equal(
  preparation.status,
  "prepared-ten-isolated-production-checkpoint-v2.2-dispute-only-adjudication-contexts"
);
assert.equal(preparation.productionCanary, true);
assert.equal(preparation.developmentValidationOnly, false);
assert.equal(preparation.contexts.length, 10);
assert.equal(preparation.totals.disputedMoves, 178);
assert.equal(preparation.totals.candidateSelections, 507);
assert.equal(preparation.totals.audioVerifiedMoves, 2);
assert.equal(preparation.totals.maximumCopiedInputBytes <= 350000, true);
assert.equal(preparation.totals.scoresDerived, 0);
assert.equal(preparation.model.label, "5.6 Sol");
assert.equal(preparation.model.slug, "gpt-5.6-sol");
assert.equal(preparation.model.reasoningEffort, "low");
assert.equal(preparation.model.authentication, "ChatGPT subscription");
assert.equal(preparation.model.scoreBlind, true);
assert.equal(preparation.model.meteredApiCostUsdMaximum, 0);
assert.equal(preparation.authorization.executionManifestPreparation, true);
assert.equal(preparation.authorization.adjudicationModelExecution, false);
assert.equal(preparation.authorization.scoreDerivation, false);

for (const context of preparation.contexts) {
  const [packetText, provenanceText] = await Promise.all([
    readFile(context.packet, "utf8"),
    readFile(context.provenance, "utf8")
  ]);
  const packet = JSON.parse(packetText);
  const provenance = JSON.parse(provenanceText);
  assert.equal(packet.productionCanary, true);
  assert.equal(packet.stagingOnly, true);
  assert.equal(packet.developmentValidationOnly, false);
  assert.equal(packet.disputedMoves.length, context.disputedMoves);
  assert.equal(packet.evidenceBoundary.calculatedScoresUnavailable, true);
  assert.equal(packetText.includes('"passA"'), false);
  assert.equal(packetText.includes('"passB"'), false);
  assert.equal(packet.evidenceBoundary.initialPassRationalesUnavailable, true);
  assert.equal(provenance.modelInput, false);
  assert.equal(
    provenanceText.includes('"passA"') || provenanceText.includes('"passB"'),
    true
  );
  assert.equal(
    packet.disputedMoves.filter(
      (move) => move.evidence.audioVerification !== null
    ).length,
    context.audioVerifiedMoves
  );
  assert.equal(context.audioTranscriptInputs.length, context.audioVerifiedMoves);
  assert(
    context.audioTranscriptInputs.every((input) =>
      input.modelInputFile.endsWith(".json")
    )
  );
  const output = {
    schemaVersion: CHECKPOINT_V22_DISPUTE_ADJ_OUTPUT_VERSION,
    protocolId: CHECKPOINT_V22_DISPUTE_ADJ_PROTOCOL_ID,
    debateNumber: packet.debateNumber,
    debateId: packet.debateId,
    reviewerRole: "isolated-disputed-fields-only-adjudicator",
    assessmentModel: "5.6 Sol",
    productionCanary: true,
    stagingOnly: true,
    developmentValidationOnly: false,
    isolation: structuredClone(CHECKPOINT_V22_DISPUTE_ADJ_ISOLATION),
    moveDecisions: packet.disputedMoves.map((move) => ({
      moveId: move.moveId,
      importancePairChoice: move.candidates.importancePair ? 1 : null,
      attributionPairChoice: move.candidates.attributionPair ? 1 : null,
      responsePairChoice: move.candidates.responsePair ? 1 : null,
      charityPairChoice: move.candidates.charityPair ? 1 : null,
      assessmentConfidencePairChoice:
        move.candidates.assessmentConfidencePair ? 1 : null,
      scoringFieldChoices: Object.keys(move.candidates.scoringFields).map(
        (fieldKey) => ({ fieldKey, choice: 1 })
      ),
      rationale:
        "The selected candidate is better supported by the locked transcript evidence for this disputed move."
    })),
    burdenAdjustmentDecisions: packet.burdenAdjustmentDisputes.map((item) => ({
      side: item.side,
      choice: 1,
      rationale:
        "The selected residual adjustment best satisfies strict nonduplication and burden-effect requirements."
    })),
    audit: {
      allDisputedMovesDecidedOnce: true,
      onlyCandidateValuesSelected: true,
      dependencyPairsKeptIndivisible: true,
      nondisputedFieldsUntouched: true,
      calculatedScoresAbsent: true,
      publicationProseAbsent: true
    }
  };
  const validation = validateCheckpointV22DisputeAdjudicationOutput(
    output,
    packet
  );
  assert.equal(validation.status, "passed");
  assert.equal(validation.candidateSelections, context.candidateSelections);
}
console.log(
  JSON.stringify(
    {
      status: "passed",
      contexts: 10,
      disputedMoves: 178,
      candidateSelections: 507,
      audioVerifiedMoves: 2,
      passIdentitiesInModelPackets: 0,
      syntheticCompilerValidations: 10,
      maximumCopiedInputBytes: preparation.totals.maximumCopiedInputBytes,
      modelContextsExecuted: 0,
      scoresDerived: 0
    },
    null,
    2
  )
);
