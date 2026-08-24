#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_08_FINAL_LEDGER_ROOT,
  buildPostCanaryBatch08FinalLedger,
  loadPostCanaryBatch08FinalLedgerInputs,
  validatePostCanaryBatch08FinalLedger
} from "./lib/assessment-production-post-canary-batch-08-final-ledger.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const manifestPath =
  `${POST_CANARY_BATCH_08_FINAL_LEDGER_ROOT}/final-ledger-manifest.json`;
const finalLedgerPath =
  `${POST_CANARY_BATCH_08_FINAL_LEDGER_ROOT}/final-ledger.json`;
const manifest = JSON.parse(await readFile(path.resolve(manifestPath), "utf8"));
assertV4(
  manifest.status ===
      "frozen-ten-debate-post-canary-batch-08-deterministic-final-ledger-assembly" &&
    !manifest.productionCanary &&
    manifest.batchNumber === 8 &&
    manifest.stagingOnly &&
    !manifest.developmentValidationOnly &&
    manifest.authorization.finalLedgerAssembly &&
    manifest.authorization.deterministicValidation &&
    !manifest.authorization.modelExecution &&
    !manifest.authorization.paidServices &&
    !manifest.authorization.scorePassManifestPreparation &&
    !manifest.authorization.scoreDerivation &&
    !manifest.authorization.publicationReconstruction &&
    !manifest.authorization.productionMutation &&
    !manifest.authorization.nextBatchSelection,
  "post-canary Batch 8 final-ledger manifest invalid"
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
    `${file}: frozen Batch 8 final-ledger source hash mismatch`
  );
}
const inputs = await loadPostCanaryBatch08FinalLedgerInputs();
const ledger = buildPostCanaryBatch08FinalLedger(
  inputs.debateInputs,
  inputs.sourceHashes
);
const validation = validatePostCanaryBatch08FinalLedger(
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
      paidServiceCalls: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
