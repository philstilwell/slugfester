#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  PRODUCTION_CANARY_FINAL_LEDGER_ROOT,
  loadProductionCanaryFinalLedgerInputs,
  validateProductionCanaryFinalLedger,
} from "./lib/assessment-production-canary-final-ledger.mjs";

const ledgerPath = `${PRODUCTION_CANARY_FINAL_LEDGER_ROOT}/final-ledger.json`;
const ledger = JSON.parse(await readFile(path.resolve(ledgerPath), "utf8"));
const inputs = await loadProductionCanaryFinalLedgerInputs();
console.log(
  JSON.stringify(
    validateProductionCanaryFinalLedger(
      ledger,
      inputs.debateInputs,
      inputs.sourceHashes
    ),
    null,
    2
  )
);
