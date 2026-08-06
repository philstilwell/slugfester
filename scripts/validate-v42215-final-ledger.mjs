#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  loadV42215FinalLedgerInputs,
  validateV42215FinalLedger,
  V42215_FINAL_LEDGER_ROOT
} from "./lib/v42215-final-ledger.mjs";

const ledger = JSON.parse(
  await readFile(path.resolve(`${V42215_FINAL_LEDGER_ROOT}/final-ledger.json`), "utf8")
);
const inputs = await loadV42215FinalLedgerInputs();
console.log(
  JSON.stringify(
    validateV42215FinalLedger(ledger, inputs.debateInputs, inputs.sourceHashes),
    null,
    2
  )
);
