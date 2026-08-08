#!/usr/bin/env node

import assert from "node:assert/strict";
import { buildV42211729FinalLedger, loadV42211729FinalLedgerInputs, validateV42211729FinalLedger } from "./lib/v42211729-hard-route-final-ledger.mjs";

const inputs = await loadV42211729FinalLedgerInputs();
const ledger = buildV42211729FinalLedger(inputs.debateInputs, inputs.sourceHashes);
const validation = validateV42211729FinalLedger(ledger, inputs.debateInputs, inputs.sourceHashes);
assert.equal(validation.status, "passed");
assert.equal(ledger.audit.disputedMoves, 94);
assert.equal(ledger.audit.candidateSelections, 271);
assert.equal(ledger.audit.meanMerges + ledger.audit.dependencyMeanMergesSuppressed, 287);
assert.equal(ledger.audit.audioVerifiedMoves, 3);
assert.equal(ledger.audit.calculatedScores, 0);
const mutatedLedger = structuredClone(ledger);
mutatedLedger.debates[0].finalJudgment.moves[0].ratings.logicalCoherence.value -= 1;
assert.throws(() => validateV42211729FinalLedger(mutatedLedger, inputs.debateInputs, inputs.sourceHashes));
const mutatedInputs = structuredClone(inputs.debateInputs);
const firstDisputed = mutatedInputs[0].adjudicationPacket.disputedMoves.find((move) => move.candidates.responsePair);
const mapping = mutatedInputs[0].provenance.mappings.moves[firstDisputed.moveId].responsePair;
mutatedInputs[0].provenance.mappings.moves[firstDisputed.moveId].responsePair = { candidate1: mapping.candidate2, candidate2: mapping.candidate1 };
assert.throws(() => buildV42211729FinalLedger(mutatedInputs, inputs.sourceHashes));
console.log(JSON.stringify({ status: "passed", debates: ledger.debates.length, disputedMoves: ledger.audit.disputedMoves, candidateSelections: ledger.audit.candidateSelections, roundedMeanPopulation: ledger.audit.meanMerges + ledger.audit.dependencyMeanMergesSuppressed, audioVerifiedMoves: ledger.audit.audioVerifiedMoves, deterministicReplayMutationRejected: true, provenanceMutationRejected: true, calculatedScores: 0 }, null, 2));
