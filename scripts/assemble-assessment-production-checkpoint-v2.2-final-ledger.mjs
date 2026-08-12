#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  CHECKPOINT_V22_FINAL_LEDGER_ROOT,
  buildCheckpointV22FinalLedger,
  loadCheckpointV22FinalLedgerInputs,
  validateCheckpointV22FinalLedger
} from "./lib/assessment-production-checkpoint-v2.2-final-ledger.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const manifestPath = `${CHECKPOINT_V22_FINAL_LEDGER_ROOT}/final-ledger-manifest.json`;
const finalLedgerPath = `${CHECKPOINT_V22_FINAL_LEDGER_ROOT}/final-ledger.json`;
const manifest = JSON.parse(await readFile(path.resolve(manifestPath), "utf8"));
assertV4(
  manifest.status ===
      "frozen-ten-debate-production-checkpoint-v2.2-deterministic-final-ledger-assembly" &&
    manifest.productionCanary &&
    manifest.stagingOnly &&
    !manifest.developmentValidationOnly &&
    manifest.authorization.finalLedgerAssembly &&
    !manifest.authorization.scoreDerivation &&
    !manifest.authorization.modelExecution &&
    !manifest.authorization.paidApiCalls &&
    !manifest.authorization.policyPromotion &&
    !manifest.authorization.productionMutation,
  "production-checkpoint v2.2 final-ledger manifest invalid"
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
    `${file}: frozen production-checkpoint v2.2 source hash mismatch`
  );
}
const inputs = await loadCheckpointV22FinalLedgerInputs();
const ledger = buildCheckpointV22FinalLedger(
  inputs.debateInputs,
  inputs.sourceHashes
);
const validation = validateCheckpointV22FinalLedger(
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
      paidApiCalls: 0
    },
    null,
    2
  )
);
