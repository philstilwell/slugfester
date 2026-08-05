#!/usr/bin/env node

import { readJson } from "./lib/v41-lean-production.mjs";
import { loadV416FinalLedgerInputs, validateV416FinalLedger, V416_FINAL_LEDGER_ROOT } from "./lib/v416-final-ledger.mjs";

const ledger = await readJson(`${V416_FINAL_LEDGER_ROOT}/final-ledger.json`);
const { debateInputs, sourceHashes } = await loadV416FinalLedgerInputs();
console.log(JSON.stringify(validateV416FinalLedger(ledger, debateInputs, sourceHashes), null, 2));
