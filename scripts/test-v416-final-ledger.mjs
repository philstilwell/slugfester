#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { buildV416FinalLedger, loadV416FinalLedgerInputs, validateV416FinalLedger } from "./lib/v416-final-ledger.mjs";

const { debateInputs, sourceHashes } = await loadV416FinalLedgerInputs();
const ledger = buildV416FinalLedger(debateInputs, sourceHashes);
const validation = validateV416FinalLedger(ledger, debateInputs, sourceHashes);
assert.equal(validation.status, "passed");
assert.equal(ledger.audit.candidateSelections, 154);
assert.equal(ledger.audit.meanMerges + ledger.audit.dependencyMeanMergesSuppressed, 39);
assert.equal(ledger.audit.calculatedScores, 0);
const mutated = structuredClone(ledger);
mutated.debates[0].finalJudgment.sections[0].proMoves[0].ratings.logicalCoherence.value -= 1;
assert.throws(() => validateV416FinalLedger(mutated, debateInputs, sourceHashes));
console.log(JSON.stringify({ status: "passed", debates: 3, candidateSelections: ledger.audit.candidateSelections, roundedMeanMerges: ledger.audit.meanMerges, dependencyMeanMergesSuppressed: ledger.audit.dependencyMeanMergesSuppressed, mutationRejected: true, calculatedScores: 0 }, null, 2));
