#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_11_FINAL_LEDGER_ROOT,
  loadPostCanaryBatch11FinalLedgerInputs,
  validatePostCanaryBatch11FinalLedger
} from "./lib/assessment-production-post-canary-batch-11-final-ledger.mjs";

const ledgerPath = `${POST_CANARY_BATCH_11_FINAL_LEDGER_ROOT}/final-ledger.json`;
const ledger = JSON.parse(await readFile(path.resolve(ledgerPath), "utf8"));
const inputs = await loadPostCanaryBatch11FinalLedgerInputs();
console.log(
  JSON.stringify(
    validatePostCanaryBatch11FinalLedger(
      ledger,
      inputs.debateInputs,
      inputs.sourceHashes
    ),
    null,
    2
  )
);
