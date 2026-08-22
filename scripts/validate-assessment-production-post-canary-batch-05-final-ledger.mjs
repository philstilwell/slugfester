#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_05_FINAL_LEDGER_ROOT,
  loadPostCanaryBatch05FinalLedgerInputs,
  validatePostCanaryBatch05FinalLedger
} from "./lib/assessment-production-post-canary-batch-05-final-ledger.mjs";

const ledgerPath = `${POST_CANARY_BATCH_05_FINAL_LEDGER_ROOT}/final-ledger.json`;
const ledger = JSON.parse(await readFile(path.resolve(ledgerPath), "utf8"));
const inputs = await loadPostCanaryBatch05FinalLedgerInputs();
console.log(
  JSON.stringify(
    validatePostCanaryBatch05FinalLedger(
      ledger,
      inputs.debateInputs,
      inputs.sourceHashes
    ),
    null,
    2
  )
);
