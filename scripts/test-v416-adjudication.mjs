#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { validateV416AdjudicationOutput, V416_ADJUDICATION_OUTPUT_VERSION, V416_ADJUDICATION_PROTOCOL_ID } from "./lib/v416-adjudication.mjs";

const packet = {
  debateNumber: "schema-preflight",
  debateId: "synthetic",
  disputedMoves: [
    { moveId: "m1", candidates: { responsePair: { candidate1: {}, candidate2: {} }, charityPair: null, scoringFields: { logicalCoherence: { candidate1: { value: 70 }, candidate2: { value: 80 } } } } },
    { moveId: "m2", candidates: { responsePair: null, charityPair: { candidate1: {}, candidate2: {} }, scoringFields: {} } }
  ],
  burdenAdjustmentDisputes: [{ side: "pro" }]
};
const output = {
  schemaVersion: V416_ADJUDICATION_OUTPUT_VERSION,
  protocolId: V416_ADJUDICATION_PROTOCOL_ID,
  debateNumber: "schema-preflight",
  debateId: "synthetic",
  reviewerRole: "dispute-only-adjudicator",
  assessmentModel: "5.6 Sol",
  calibrationOnly: true,
  isolation: { candidateOrderingAnonymous: true, passIdentitiesUnavailable: true, initialRationalesUnavailable: true, nondisputedFieldsUnavailable: true, fullInitialOutputsUnavailable: true, legacyAssessmentsUnavailable: true, calculatedScoresUnavailable: true, winnerLabelsUnavailable: true, publicationProseUnavailable: true, contaminationDetected: false },
  moveDecisions: [
    { moveId: "m1", responsePairChoice: 1, charityPairChoice: null, scoringFieldChoices: [{ fieldKey: "logicalCoherence", choice: 2 }], rationale: "The selected candidates better fit the supplied evidence and the locked adjudication anchors." },
    { moveId: "m2", responsePairChoice: null, charityPairChoice: 2, scoringFieldChoices: [], rationale: "The selected charity pair better represents the supplied alternative and its decisive qualification." }
  ],
  burdenAdjustmentDecisions: [{ side: "pro", choice: 1, rationale: "The first record more strictly applies duplicate exclusion to the supplied route evidence." }],
  audit: { allDisputedMovesDecidedOnce: true, onlyCandidateValuesSelected: true, dependencyPairsKeptIndivisible: true, nondisputedFieldsUntouched: true, calculatedScoresAbsent: true, publicationProseAbsent: true }
};
assert.equal(validateV416AdjudicationOutput(output, packet).status, "passed");
const missing = structuredClone(output);
missing.moveDecisions[0].scoringFieldChoices = [];
assert.throws(() => validateV416AdjudicationOutput(missing, packet));
const third = structuredClone(output);
third.moveDecisions[0].responsePairChoice = 3;
assert.throws(() => validateV416AdjudicationOutput(third, packet));
const mutation = structuredClone(output);
mutation.moveDecisions.reverse();
assert.throws(() => validateV416AdjudicationOutput(mutation, packet));
console.log(JSON.stringify({ status: "passed", validFixture: 1, mutationsRejected: 3 }, null, 2));
