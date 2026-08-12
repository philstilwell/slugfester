#!/usr/bin/env node

import assert from "node:assert/strict";

import {
  buildCheckpointV22FinalLedger,
  loadCheckpointV22FinalLedgerInputs,
  validateCheckpointV22FinalLedger
} from "./lib/assessment-production-checkpoint-v2.2-final-ledger.mjs";

const inputs = await loadCheckpointV22FinalLedgerInputs();
const ledger = buildCheckpointV22FinalLedger(
  inputs.debateInputs,
  inputs.sourceHashes
);
const validation = validateCheckpointV22FinalLedger(
  ledger,
  inputs.debateInputs,
  inputs.sourceHashes
);
assert.equal(validation.status, "passed");
assert.equal(ledger.debates.length, 10);
assert.equal(ledger.audit.disputedMoves, 178);
assert.equal(ledger.audit.candidateSelections, 507);
assert.equal(
  ledger.audit.meanMerges + ledger.audit.dependencyMeanMergesSuppressed,
  403
);
assert.equal(ledger.audit.audioVerifiedMoves, 2);
assert.equal(ledger.audit.calculatedScores, 0);
assert.equal(ledger.authorization.scorePassesMaximum, 1);
assert.equal(ledger.authorization.publicationFinalization, false);
assert.equal(ledger.authorization.productionMutation, false);

const mutatedLedger = structuredClone(ledger);
mutatedLedger.debates[0].finalJudgment.moves[0].ratings.logicalCoherence.value -= 1;
assert.throws(() =>
  validateCheckpointV22FinalLedger(
    mutatedLedger,
    inputs.debateInputs,
    inputs.sourceHashes
  )
);

const mutatedInputs = structuredClone(inputs.debateInputs);
const firstDisputed = mutatedInputs[0].adjudicationPacket.disputedMoves.find(
  (move) => move.candidates.responsePair
);
const mapping =
  mutatedInputs[0].provenance.mappings.moves[firstDisputed.moveId].responsePair;
mutatedInputs[0].provenance.mappings.moves[
  firstDisputed.moveId
].responsePair = {
  candidate1: mapping.candidate2,
  candidate2: mapping.candidate1
};
assert.throws(() =>
  buildCheckpointV22FinalLedger(mutatedInputs, inputs.sourceHashes)
);

console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: ledger.debates.length,
      disputedMoves: ledger.audit.disputedMoves,
      candidateSelections: ledger.audit.candidateSelections,
      roundedMeanPopulation:
        ledger.audit.meanMerges + ledger.audit.dependencyMeanMergesSuppressed,
      dependencyMeanMergesSuppressed:
        ledger.audit.dependencyMeanMergesSuppressed,
      audioVerifiedMoves: ledger.audit.audioVerifiedMoves,
      deterministicReplayMutationRejected: true,
      provenanceMutationRejected: true,
      calculatedScores: 0
    },
    null,
    2
  )
);
