#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  loadCheckpointV22FinalLedgerInputs,
  validateCheckpointV22FinalLedger
} from "./lib/assessment-production-checkpoint-v2.2-final-ledger.mjs";
import {
  CHECKPOINT_V22_SCORE_ROOT,
  validateCheckpointV22Scores
} from "./lib/assessment-production-checkpoint-v2.2-score-gate.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const manifest = JSON.parse(
  await readFile(
    path.resolve(`${CHECKPOINT_V22_SCORE_ROOT}/score-pass-manifest.json`),
    "utf8"
  )
);
const [scores, ledger, inputs, productionModule] = await Promise.all([
  readFile(path.resolve(manifest.artifacts.calculatedScores), "utf8").then(JSON.parse),
  readFile(path.resolve(manifest.inputs.finalLedger), "utf8").then(JSON.parse),
  loadCheckpointV22FinalLedgerInputs(),
  import(
    pathToFileURL(
      path.resolve(manifest.inputs.productionReferenceDiagnosticOnly)
    ).href
  )
]);
validateCheckpointV22FinalLedger(
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
assertV4(
  productionReferences.length === 10,
  "ten production diagnostic references required"
);
console.log(
  JSON.stringify(
    validateCheckpointV22Scores(
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
