#!/usr/bin/env node

import assert from "node:assert/strict";
import { buildV4221176FinalLedger, loadV4221176FinalLedgerInputs, validateV4221176FinalLedger } from "./lib/v4221176-final-ledger.mjs";

const inputs = await loadV4221176FinalLedgerInputs();
const ledger = buildV4221176FinalLedger(inputs.debateInputs, inputs.sourceHashes);
const validation = validateV4221176FinalLedger(ledger, inputs.debateInputs, inputs.sourceHashes);
assert.equal(validation.status, "passed");
assert.equal(ledger.audit.candidateSelections, 172);
assert.equal(ledger.audit.meanMerges + ledger.audit.dependencyMeanMergesSuppressed, 106);
assert.equal(ledger.audit.audioVerifiedMoves, 2);
assert.equal(ledger.audit.calculatedScores, 0);
const mutatedLedger = structuredClone(ledger);
mutatedLedger.debates[0].finalJudgment.moves[0].ratings.logicalCoherence.value -= 1;
assert.throws(() => validateV4221176FinalLedger(mutatedLedger, inputs.debateInputs, inputs.sourceHashes));
const mutatedInputs = structuredClone(inputs.debateInputs);
const firstDisputed = mutatedInputs[0].adjudicationPacket.disputedMoves.find((move) => move.candidates.responsePair);
const mapping = mutatedInputs[0].provenance.mappings.moves[firstDisputed.moveId].responsePair;
mutatedInputs[0].provenance.mappings.moves[firstDisputed.moveId].responsePair = { candidate1: mapping.candidate2, candidate2: mapping.candidate1 };
assert.throws(() => buildV4221176FinalLedger(mutatedInputs, inputs.sourceHashes));
console.log(JSON.stringify({ status: "passed", debates: ledger.debates.length, candidateSelections: ledger.audit.candidateSelections, roundedMeanPopulation: ledger.audit.meanMerges + ledger.audit.dependencyMeanMergesSuppressed, audioVerifiedMoves: ledger.audit.audioVerifiedMoves, deterministicReplayMutationRejected: true, provenanceMutationRejected: true, calculatedScores: 0 }, null, 2));
