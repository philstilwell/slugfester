#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_01_FINAL_LEDGER_ROOT,
  loadPostCanaryBatch01FinalLedgerInputs,
  validatePostCanaryBatch01FinalLedger
} from "./lib/assessment-production-post-canary-batch-01-final-ledger.mjs";

const ledgerPath = `${POST_CANARY_BATCH_01_FINAL_LEDGER_ROOT}/final-ledger.json`;
const ledger = JSON.parse(await readFile(path.resolve(ledgerPath), "utf8"));
const inputs = await loadPostCanaryBatch01FinalLedgerInputs();
console.log(
  JSON.stringify(
    validatePostCanaryBatch01FinalLedger(
      ledger,
      inputs.debateInputs,
      inputs.sourceHashes
    ),
    null,
    2
  )
);
