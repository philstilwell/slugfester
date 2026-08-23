#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  loadPostCanaryBatch07FinalLedgerInputs,
  validatePostCanaryBatch07FinalLedger
} from "./lib/assessment-production-post-canary-batch-07-final-ledger.mjs";
import {
  POST_CANARY_BATCH_07_SCORE_ROOT,
  validatePostCanaryBatch07Scores
} from "./lib/assessment-production-post-canary-batch-07-score-gate.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const manifest = JSON.parse(
  await readFile(
    path.resolve(`${POST_CANARY_BATCH_07_SCORE_ROOT}/score-pass-manifest.json`),
    "utf8"
  )
);
const [scores, ledger, inputs, productionModule] = await Promise.all([
  readFile(path.resolve(manifest.artifacts.calculatedScores), "utf8").then(JSON.parse),
  readFile(path.resolve(manifest.inputs.finalLedger), "utf8").then(JSON.parse),
  loadPostCanaryBatch07FinalLedgerInputs(),
  import(
    pathToFileURL(
      path.resolve(manifest.inputs.productionReferenceDiagnosticOnly)
    ).href
  )
]);
validatePostCanaryBatch07FinalLedger(
  ledger,
  inputs.debateInputs,
  inputs.sourceHashes
);
const requiredNumbers = new Set(
  ledger.debates.map((debate) => debate.debateNumber)
);
const productionReferences = productionModule.debates
  .filter((debate) => requiredNumbers.has(debate.number))
  .map((debate) => ({
    debateNumber: debate.number,
    pro: debate.score.pro,
    con: debate.score.con
  }));
assertV4(productionReferences.length === 10, "ten diagnostic references required");
console.log(
  JSON.stringify(
    validatePostCanaryBatch07Scores(
      scores,
      ledger,
      inputs.debateInputs,
      productionReferences,
      {
        finalLedgerSha256: manifest.sourceHashes[manifest.inputs.finalLedger],
        productionReferenceSha256:
          manifest.sourceHashes[
            manifest.inputs.productionReferenceDiagnosticOnly
          ],
        activePolicySha256:
          manifest.sourceHashes[manifest.activePolicyControl.promotionRecord]
      }
    ),
    null,
    2
  )
);
