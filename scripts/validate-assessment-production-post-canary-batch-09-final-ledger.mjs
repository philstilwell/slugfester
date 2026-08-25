#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_09_FINAL_LEDGER_ROOT,
  loadPostCanaryBatch09FinalLedgerInputs,
  validatePostCanaryBatch09FinalLedger
} from "./lib/assessment-production-post-canary-batch-09-final-ledger.mjs";

const ledgerPath = `${POST_CANARY_BATCH_09_FINAL_LEDGER_ROOT}/final-ledger.json`;
const ledger = JSON.parse(await readFile(path.resolve(ledgerPath), "utf8"));
const inputs = await loadPostCanaryBatch09FinalLedgerInputs();
console.log(
  JSON.stringify(
    validatePostCanaryBatch09FinalLedger(
      ledger,
      inputs.debateInputs,
      inputs.sourceHashes
    ),
    null,
    2
  )
);
