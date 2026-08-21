#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_04_FINAL_LEDGER_ROOT,
  loadPostCanaryBatch04FinalLedgerInputs,
  validatePostCanaryBatch04FinalLedger
} from "./lib/assessment-production-post-canary-batch-04-final-ledger.mjs";

const ledgerPath = `${POST_CANARY_BATCH_04_FINAL_LEDGER_ROOT}/final-ledger.json`;
const ledger = JSON.parse(await readFile(path.resolve(ledgerPath), "utf8"));
const inputs = await loadPostCanaryBatch04FinalLedgerInputs();
console.log(
  JSON.stringify(
    validatePostCanaryBatch04FinalLedger(
      ledger,
      inputs.debateInputs,
      inputs.sourceHashes
    ),
    null,
    2
  )
);

