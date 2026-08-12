#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  V223_FINAL_LEDGER_ROOT,
  loadV223FinalLedgerInputs,
  validateV223FinalLedger,
} from "./lib/assessment-production-score-stability-v2.2.3-final-ledger.mjs";

const ledgerPath = `${V223_FINAL_LEDGER_ROOT}/final-ledger.json`;
const ledger = JSON.parse(await readFile(path.resolve(ledgerPath), "utf8"));
const inputs = await loadV223FinalLedgerInputs();
console.log(
  JSON.stringify(
    validateV223FinalLedger(ledger, inputs.debateInputs, inputs.sourceHashes),
    null,
    2
  )
);

