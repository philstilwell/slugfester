#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  V223_DISPUTE_ADJ_ISOLATION,
  V223_DISPUTE_ADJ_OUTPUT_VERSION,
  V223_DISPUTE_ADJ_PROTOCOL_ID,
  V223_DISPUTE_ADJ_ROOT,
  validateV223DisputeAdjudicationOutput
} from "./lib/assessment-production-score-stability-v2.2.3-dispute-adjudication.mjs";

const preparation = JSON.parse(
  await readFile(`${V223_DISPUTE_ADJ_ROOT}/preparation-manifest.json`, "utf8")
);
assert.equal(
  preparation.status,
  "prepared-ten-isolated-v2.2.3-dispute-only-adjudication-contexts"
);
assert.equal(preparation.contexts.length, 10);
assert.equal(preparation.totals.disputedMoves, 185);
assert.equal(preparation.totals.candidateSelections, 490);
assert.equal(preparation.totals.audioVerifiedMoves, 4);
assert.equal(preparation.totals.maximumCopiedInputBytes <= 350000, true);
assert.equal(preparation.totals.scoresDerived, 0);
assert.equal(preparation.model.label, "5.6 Sol");
assert.equal(preparation.model.reasoningEffort, "low");
assert.equal(preparation.model.authentication, "ChatGPT subscription");
assert.equal(preparation.model.meteredApiCostUsdMaximum, 0);
assert.equal(preparation.authorization.executionManifest, true);
assert.equal(preparation.authorization.adjudicationModelExecution, false);
assert.equal(preparation.authorization.scoreDerivation, false);

for (const context of preparation.contexts) {
  const [packetText, provenanceText] = await Promise.all([
    readFile(context.packet, "utf8"),
    readFile(context.provenance, "utf8")
  ]);
  const packet = JSON.parse(packetText);
  const provenance = JSON.parse(provenanceText);
  assert.equal(packet.productionCanary, false);
  assert.equal(packet.stagingOnly, true);
  assert.equal(packet.developmentValidationOnly, true);
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
    schemaVersion: V223_DISPUTE_ADJ_OUTPUT_VERSION,
    protocolId: V223_DISPUTE_ADJ_PROTOCOL_ID,
    debateNumber: packet.debateNumber,
    debateId: packet.debateId,
    reviewerRole: "isolated-disputed-fields-only-adjudicator",
    assessmentModel: "5.6 Sol",
    productionCanary: false,
    stagingOnly: true,
    developmentValidationOnly: true,
    isolation: structuredClone(V223_DISPUTE_ADJ_ISOLATION),
    moveDecisions: packet.disputedMoves.map((move) => ({
      moveId: move.moveId,
      importancePairChoice: move.candidates.importancePair ? 1 : null,
      attributionPairChoice: move.candidates.attributionPair ? 1 : null,
      responsePairChoice: move.candidates.responsePair ? 1 : null,
      charityPairChoice: move.candidates.charityPair ? 1 : null,
      assessmentConfidencePairChoice: move.candidates.assessmentConfidencePair
        ? 1
        : null,
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
  const validation = validateV223DisputeAdjudicationOutput(output, packet);
  assert.equal(validation.status, "passed");
  assert.equal(validation.candidateSelections, context.candidateSelections);
}
console.log(
  JSON.stringify(
    {
      status: "passed",
      contexts: 10,
      disputedMoves: 185,
      candidateSelections: 490,
      audioVerifiedMoves: 4,
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
