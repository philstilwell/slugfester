#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  V213_FINAL_LEDGER_ROOT,
  buildV213FinalLedger,
  loadV213FinalLedgerInputs,
  validateV213FinalLedger,
} from "./lib/assessment-production-score-stability-v2.1.3-final-ledger.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const manifestPath = `${V213_FINAL_LEDGER_ROOT}/final-ledger-manifest.json`;
const finalLedgerPath = `${V213_FINAL_LEDGER_ROOT}/final-ledger.json`;
const manifest = JSON.parse(
  await readFile(path.resolve(manifestPath), "utf8")
);
assertV4(
  manifest.status ===
    "frozen-ten-debate-v2.1.3-deterministic-final-ledger-assembly" &&
    !manifest.productionCanary &&
    manifest.stagingOnly &&
    manifest.developmentValidationOnly &&
    manifest.authorization.finalLedgerAssembly &&
    !manifest.authorization.scoreDerivation &&
    !manifest.authorization.modelExecution &&
    !manifest.authorization.paidApiCalls &&
    !manifest.authorization.policyPromotion &&
    !manifest.authorization.productionMutation,
  "v2.1.3 final-ledger manifest invalid"
);
await access(path.resolve(finalLedgerPath)).then(
  () => {
    throw new Error(`${finalLedgerPath} already exists`);
  },
  () => true
);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
for (const [file, expected] of Object.entries(manifest.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === expected,
    `${file}: frozen v2.1.3 source hash mismatch`
  );
}
const inputs = await loadV213FinalLedgerInputs();
const ledger = buildV213FinalLedger(inputs.debateInputs, inputs.sourceHashes);
const validation = validateV213FinalLedger(
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
