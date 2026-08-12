#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  loadCheckpointV22FinalLedgerInputs,
  validateCheckpointV22FinalLedger
} from "./lib/assessment-production-checkpoint-v2.2-final-ledger.mjs";
import {
  CHECKPOINT_V22_SCORE_ROOT,
  deriveCheckpointV22Scores
} from "./lib/assessment-production-checkpoint-v2.2-score-gate.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const manifestPath = `${CHECKPOINT_V22_SCORE_ROOT}/score-pass-manifest.json`;
const manifest = JSON.parse(await readFile(path.resolve(manifestPath), "utf8"));
assertV4(
  manifest.status ===
      "frozen-production-checkpoint-v2.2-single-deterministic-score-pass-authorized" &&
    manifest.productionCanary &&
    manifest.stagingOnly &&
    !manifest.developmentValidationOnly &&
    manifest.activePolicyControl.version === "v2.2" &&
    manifest.authorization.scoreDerivation &&
    manifest.authorization.scorePassesMaximum === 1 &&
    manifest.authorization.scoreAnalysis &&
    !manifest.authorization.scoreRerun &&
    !manifest.authorization.productionMutation,
  "production-checkpoint v2.2 score manifest invalid"
);
const scoresPath = manifest.artifacts.calculatedScores;
await access(path.resolve(scoresPath)).then(
  () => {
    throw new Error(`${scoresPath} already exists`);
  },
  () => true
);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
for (const [file, expected] of Object.entries(manifest.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === expected,
    `${file}: frozen production-checkpoint v2.2 score source hash mismatch`
  );
}
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(
    !(await access(path.resolve(future)).then(() => true, () => false)),
    `future output exists: ${future}`
  );
}
const [ledger, inputs, productionModule] = await Promise.all([
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
const calculated = deriveCheckpointV22Scores(
  ledger,
  inputs.debateInputs,
  productionReferences,
  {
    finalLedgerSha256: manifest.sourceHashes[manifest.inputs.finalLedger],
    productionReferenceSha256:
      manifest.sourceHashes[manifest.inputs.productionReferenceDiagnosticOnly],
    activePolicySha256:
      manifest.sourceHashes[manifest.activePolicyControl.promotionRecord]
  }
);
await writeFile(
  path.resolve(scoresPath),
  `${JSON.stringify(calculated, null, 2)}\n`
);
console.log(
  JSON.stringify(
    {
      status: calculated.status,
      debates: calculated.debates.map((debate) => ({
        debateNumber: debate.debateNumber,
        passA: {
          pro: debate.passA.overall.pro.score,
          con: debate.passA.overall.con.score,
          winner: debate.passA.winner
        },
        passB: {
          pro: debate.passB.overall.pro.score,
          con: debate.passB.overall.con.score,
          winner: debate.passB.winner
        },
        final: {
          pro: debate.final.overall.pro.score,
          con: debate.final.overall.con.score,
          winner: debate.final.winner
        },
        productionDiagnostic: debate.productionReferenceDiagnosticOnly
      })),
      stability: calculated.stability,
      scoringPasses: 1,
      acceptancePassed: calculated.totals.acceptancePassed,
      scoreRerunAuthorized: false,
      nextAuthorized: "score-analysis"
    },
    null,
    2
  )
);
