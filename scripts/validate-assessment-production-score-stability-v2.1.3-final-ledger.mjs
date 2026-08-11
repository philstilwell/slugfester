#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  V213_FINAL_LEDGER_ROOT,
  loadV213FinalLedgerInputs,
  validateV213FinalLedger,
} from "./lib/assessment-production-score-stability-v2.1.3-final-ledger.mjs";

const ledgerPath = `${V213_FINAL_LEDGER_ROOT}/final-ledger.json`;
const ledger = JSON.parse(await readFile(path.resolve(ledgerPath), "utf8"));
const inputs = await loadV213FinalLedgerInputs();
console.log(
  JSON.stringify(
    validateV213FinalLedger(ledger, inputs.debateInputs, inputs.sourceHashes),
    null,
    2
  )
);
