#!/usr/bin/env node

import { strict as assert } from "node:assert";
import {
  buildV42215FinalLedger,
  loadV42215FinalLedgerInputs,
  validateV42215FinalLedger
} from "./lib/v42215-final-ledger.mjs";

const inputs = await loadV42215FinalLedgerInputs();
const ledger = buildV42215FinalLedger(inputs.debateInputs, inputs.sourceHashes);
const validation = validateV42215FinalLedger(ledger, inputs.debateInputs, inputs.sourceHashes);
assert.equal(validation.status, "passed");
assert.equal(ledger.audit.candidateSelections, 160);
assert.equal(ledger.audit.meanMerges + ledger.audit.dependencyMeanMergesSuppressed, 64);
assert.equal(ledger.audit.audioVerifiedMoves, 5);
assert.equal(ledger.audit.calculatedScores, 0);

const mutatedLedger = structuredClone(ledger);
mutatedLedger.debates[0].finalJudgment.moves[0].ratings.logicalCoherence.value -= 1;
assert.throws(() =>
  validateV42215FinalLedger(mutatedLedger, inputs.debateInputs, inputs.sourceHashes)
);

const mutatedInputs = structuredClone(inputs.debateInputs);
const firstMove = mutatedInputs[0].provenance.mappings.moves[
  mutatedInputs[0].adjudicationPacket.disputedMoves[0].moveId
];
firstMove.responsePair = {
  candidate1: firstMove.responsePair.candidate2,
  candidate2: firstMove.responsePair.candidate1
};
assert.throws(() => buildV42215FinalLedger(mutatedInputs, inputs.sourceHashes));

console.log(
  JSON.stringify(
    {
      status: "passed",
      debates: ledger.debates.length,
      candidateSelections: ledger.audit.candidateSelections,
      roundedMeanPopulation: ledger.audit.meanMerges + ledger.audit.dependencyMeanMergesSuppressed,
      audioVerifiedMoves: ledger.audit.audioVerifiedMoves,
      deterministicReplayMutationRejected: true,
      provenanceMutationRejected: true,
      calculatedScores: 0
    },
    null,
    2
  )
);
