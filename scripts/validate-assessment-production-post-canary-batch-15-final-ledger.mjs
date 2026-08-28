#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_15_FINAL_LEDGER_ROOT,
  loadPostCanaryBatch15FinalLedgerInputs,
  validatePostCanaryBatch15FinalLedger
} from "./lib/assessment-production-post-canary-batch-15-final-ledger.mjs";

const ledgerPath = `${POST_CANARY_BATCH_15_FINAL_LEDGER_ROOT}/final-ledger.json`;
const ledger = JSON.parse(await readFile(path.resolve(ledgerPath), "utf8"));
const inputs = await loadPostCanaryBatch15FinalLedgerInputs();
console.log(
  JSON.stringify(
    validatePostCanaryBatch15FinalLedger(
      ledger,
      inputs.debateInputs,
      inputs.sourceHashes
    ),
    null,
    2
  )
);

