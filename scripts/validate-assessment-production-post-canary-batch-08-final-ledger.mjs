#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_08_FINAL_LEDGER_ROOT,
  loadPostCanaryBatch08FinalLedgerInputs,
  validatePostCanaryBatch08FinalLedger
} from "./lib/assessment-production-post-canary-batch-08-final-ledger.mjs";

const ledgerPath = `${POST_CANARY_BATCH_08_FINAL_LEDGER_ROOT}/final-ledger.json`;
const ledger = JSON.parse(await readFile(path.resolve(ledgerPath), "utf8"));
const inputs = await loadPostCanaryBatch08FinalLedgerInputs();
console.log(
  JSON.stringify(
    validatePostCanaryBatch08FinalLedger(
      ledger,
      inputs.debateInputs,
      inputs.sourceHashes
    ),
    null,
    2
  )
);
