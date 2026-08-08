#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { V42211728_ADJUDICATION_ISOLATION, V42211728_OUTPUT_VERSION, V42211728_PROTOCOL_ID, validateV42211728AdjudicationOutput } from "./lib/v42211728-hard-route-adjudication.mjs";

const root = "docs/calibration/v4.2.21.17.28/hard-route-dispute-only-adjudication";
const preparation = JSON.parse(await readFile(`${root}/preparation-manifest.json`, "utf8"));
assert.equal(preparation.status, "prepared-five-isolated-hard-route-dispute-only-adjudication-contexts");
assert.equal(preparation.contexts.length, 5);
assert.equal(preparation.totals.disputedMoves, 94);
assert.equal(preparation.totals.candidateSelections, 271);
assert.equal(preparation.totals.audioVerifiedMoves, 3);
assert.equal(preparation.totals.scoresDerived, 0);
assert.equal(preparation.authorization.adjudicationModelExecution, false);
for (const context of preparation.contexts) {
  const [packetText, provenanceText] = await Promise.all([readFile(context.packet, "utf8"), readFile(context.provenance, "utf8")]);
  const packet = JSON.parse(packetText);
  const provenance = JSON.parse(provenanceText);
  assert.equal(packet.disputedMoves.length, context.disputedMoves);
  assert.equal(packet.evidenceBoundary.calculatedScoresUnavailable, true);
  assert.equal(packetText.includes('"passA"'), false);
  assert.equal(packetText.includes('"passB"'), false);
  assert.equal(packet.evidenceBoundary.initialPassRationalesUnavailable, true);
  assert.equal(provenance.modelInput, false);
  assert.equal(provenanceText.includes('"passA"') || provenanceText.includes('"passB"'), true);
  assert.equal(packet.disputedMoves.filter((move) => move.evidence.audioVerification !== null).length, context.audioVerifiedMoves);
  assert.equal(context.audioTranscriptInputs.length, context.audioVerifiedMoves);
  assert(context.audioTranscriptInputs.every((input) => input.modelInputFile.endsWith(".json")));
  const output = {
    schemaVersion: V42211728_OUTPUT_VERSION,
    protocolId: V42211728_PROTOCOL_ID,
    debateNumber: packet.debateNumber,
    debateId: packet.debateId,
    reviewerRole: "isolated-disputed-fields-only-adjudicator",
    assessmentModel: "5.6 Sol",
    calibrationOnly: true,
    isolation: structuredClone(V42211728_ADJUDICATION_ISOLATION),
    moveDecisions: packet.disputedMoves.map((move) => ({ moveId: move.moveId, importancePairChoice: move.candidates.importancePair ? 1 : null, attributionPairChoice: move.candidates.attributionPair ? 1 : null, responsePairChoice: move.candidates.responsePair ? 1 : null, charityPairChoice: move.candidates.charityPair ? 1 : null, assessmentConfidencePairChoice: move.candidates.assessmentConfidencePair ? 1 : null, scoringFieldChoices: Object.keys(move.candidates.scoringFields).map((fieldKey) => ({ fieldKey, choice: 1 })), rationale: "The selected candidate is better supported by the locked transcript evidence for this disputed move." })),
    burdenAdjustmentDecisions: packet.burdenAdjustmentDisputes.map((item) => ({ side: item.side, choice: 1, rationale: "The selected residual adjustment best satisfies the strict nonduplication and burden-effect requirements." })),
    audit: { allDisputedMovesDecidedOnce: true, onlyCandidateValuesSelected: true, dependencyPairsKeptIndivisible: true, nondisputedFieldsUntouched: true, calculatedScoresAbsent: true, publicationProseAbsent: true },
  };
  const validation = validateV42211728AdjudicationOutput(output, packet);
  assert.equal(validation.status, "passed");
  assert.equal(validation.candidateSelections, context.candidateSelections);
}
console.log(JSON.stringify({ status: "passed", contexts: 5, disputedMoves: 94, candidateSelections: 271, audioVerifiedMoves: 3, passIdentitiesInModelPackets: 0, syntheticCompilerValidations: 5, maximumCopiedInputBytes: preparation.totals.maximumCopiedInputBytes, modelContextsExecuted: 0, scoresDerived: 0 }, null, 2));
