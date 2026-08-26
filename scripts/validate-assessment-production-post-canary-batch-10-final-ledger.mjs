#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_10_FINAL_LEDGER_ROOT,
  loadPostCanaryBatch10FinalLedgerInputs,
  validatePostCanaryBatch10FinalLedger
} from "./lib/assessment-production-post-canary-batch-10-final-ledger.mjs";

const ledgerPath = `${POST_CANARY_BATCH_10_FINAL_LEDGER_ROOT}/final-ledger.json`;
const ledger = JSON.parse(await readFile(path.resolve(ledgerPath), "utf8"));
const inputs = await loadPostCanaryBatch10FinalLedgerInputs();
console.log(
  JSON.stringify(
    validatePostCanaryBatch10FinalLedger(
      ledger,
      inputs.debateInputs,
      inputs.sourceHashes
    ),
    null,
    2
  )
);
