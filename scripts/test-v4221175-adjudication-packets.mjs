#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { V4221175_ADJUDICATION_ISOLATION, validateV4221175AdjudicationOutput } from "./lib/v4221175-decomposed-adjudication.mjs";

const root = "docs/calibration/v4.2.21.17.5/dispute-only-adjudication";
const preparation = JSON.parse(await readFile(`${root}/preparation-manifest.json`, "utf8"));
assert.equal(preparation.status, "prepared-three-isolated-dispute-only-adjudication-contexts");
assert.equal(preparation.contexts.length, 3);
assert.equal(preparation.totals.disputedMoves, 53);
assert.equal(preparation.totals.candidateSelections, 172);
assert.equal(preparation.totals.audioVerifiedMoves, 2);
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
  const output = {
    schemaVersion: "4.2.21.17.5-dispute-only-adjudication-output",
    protocolId: "v4.2.21.17.5-decomposed-consensus",
    debateNumber: packet.debateNumber,
    debateId: packet.debateId,
    reviewerRole: "isolated-disputed-fields-only-adjudicator",
    assessmentModel: "5.6 Sol",
    calibrationOnly: true,
    isolation: structuredClone(V4221175_ADJUDICATION_ISOLATION),
    moveDecisions: packet.disputedMoves.map((move) => ({ moveId: move.moveId, importancePairChoice: move.candidates.importancePair ? 1 : null, attributionPairChoice: move.candidates.attributionPair ? 1 : null, responsePairChoice: move.candidates.responsePair ? 1 : null, charityPairChoice: move.candidates.charityPair ? 1 : null, assessmentConfidencePairChoice: move.candidates.assessmentConfidencePair ? 1 : null, scoringFieldChoices: Object.keys(move.candidates.scoringFields).map((fieldKey) => ({ fieldKey, choice: 1 })), rationale: "The selected candidate is better supported by the locked transcript evidence for this disputed move." })),
    burdenAdjustmentDecisions: packet.burdenAdjustmentDisputes.map((item) => ({ side: item.side, choice: 1, rationale: "The selected residual adjustment best satisfies the strict nonduplication and burden-effect requirements." })),
    audit: { allDisputedMovesDecidedOnce: true, onlyCandidateValuesSelected: true, dependencyPairsKeptIndivisible: true, nondisputedFieldsUntouched: true, calculatedScoresAbsent: true, publicationProseAbsent: true }
  };
  assert.equal(validateV4221175AdjudicationOutput(output, packet).status, "passed");
}
console.log(JSON.stringify({ status: "passed", contexts: 3, disputedMoves: 53, candidateSelections: 172, audioVerifiedMoves: 2, passIdentitiesInModelPackets: 0, syntheticCompilerValidations: 3, modelContextsExecuted: 0, scoresDerived: 0 }, null, 2));
