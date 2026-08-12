#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  CHECKPOINT_V22_FINAL_LEDGER_ROOT,
  loadCheckpointV22FinalLedgerInputs,
  validateCheckpointV22FinalLedger
} from "./lib/assessment-production-checkpoint-v2.2-final-ledger.mjs";

const ledgerPath = `${CHECKPOINT_V22_FINAL_LEDGER_ROOT}/final-ledger.json`;
const ledger = JSON.parse(await readFile(path.resolve(ledgerPath), "utf8"));
const inputs = await loadCheckpointV22FinalLedgerInputs();
console.log(
  JSON.stringify(
    validateCheckpointV22FinalLedger(
      ledger,
      inputs.debateInputs,
      inputs.sourceHashes
    ),
    null,
    2
  )
);
