#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  PRODUCTION_CANARY_FINAL_LEDGER_ROOT,
  buildProductionCanaryFinalLedger,
  loadProductionCanaryFinalLedgerInputs,
  validateProductionCanaryFinalLedger,
} from "./lib/assessment-production-canary-final-ledger.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const manifestPath = `${PRODUCTION_CANARY_FINAL_LEDGER_ROOT}/final-ledger-manifest.json`;
const finalLedgerPath = `${PRODUCTION_CANARY_FINAL_LEDGER_ROOT}/final-ledger.json`;
const manifest = JSON.parse(
  await readFile(path.resolve(manifestPath), "utf8")
);
assertV4(
  manifest.status ===
    "frozen-ten-debate-production-canary-deterministic-final-ledger-assembly" &&
    manifest.productionCanary &&
    manifest.stagingOnly &&
    manifest.authorization.finalLedgerAssembly &&
    !manifest.authorization.scoreDerivation &&
    !manifest.authorization.modelExecution &&
    !manifest.authorization.paidApiCalls &&
    !manifest.authorization.productionMutation,
  "production-canary final-ledger manifest invalid"
);
await access(path.resolve(finalLedgerPath)).then(
  () => {
    throw new Error(`${finalLedgerPath} already exists`);
  },
  () => true
);
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
for (const [file, expected] of Object.entries(manifest.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === expected,
    `${file}: frozen production-canary source hash mismatch`
  );
}
const inputs = await loadProductionCanaryFinalLedgerInputs();
const ledger = buildProductionCanaryFinalLedger(
  inputs.debateInputs,
  inputs.sourceHashes
);
const validation = validateProductionCanaryFinalLedger(
  ledger,
  inputs.debateInputs,
  inputs.sourceHashes
);
await writeFile(
  path.resolve(finalLedgerPath),
  `${JSON.stringify(ledger, null, 2)}\n`
);
console.log(
  JSON.stringify(
    {
      ...validation,
      finalLedger: finalLedgerPath,
      modelContexts: 0,
      paidApiCalls: 0,
    },
    null,
    2
  )
);
