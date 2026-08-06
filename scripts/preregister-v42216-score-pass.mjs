#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import {
  loadV42215FinalLedgerInputs,
  validateV42215FinalLedger,
  V42215_FINAL_LEDGER_ROOT
} from "./lib/v42215-final-ledger.mjs";
import { V42216_STABILITY_THRESHOLDS } from "./lib/v42216-score-gate.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");

const ledgerPath = `${V42215_FINAL_LEDGER_ROOT}/final-ledger.json`;
const ledgerAnalysisPath = `${V42215_FINAL_LEDGER_ROOT}/analysis.json`;
const manifestPath = `${V42215_FINAL_LEDGER_ROOT}/score-pass-manifest.json`;
const scoresPath = `${V42215_FINAL_LEDGER_ROOT}/calculated-scores.json`;
const scoreAnalysisPath = `${V42215_FINAL_LEDGER_ROOT}/score-analysis.json`;
const exists = async (file) => access(path.resolve(file)).then(() => true, () => false);
if (shouldWrite) {
  for (const future of [manifestPath, scoresPath, scoreAnalysisPath]) {
    assertV4(!(await exists(future)), `${future} already exists`);
  }
}

const [ledger, ledgerAnalysis, inputs] = await Promise.all([
  readFile(path.resolve(ledgerPath), "utf8").then(JSON.parse),
  readFile(path.resolve(ledgerAnalysisPath), "utf8").then(JSON.parse),
  loadV42215FinalLedgerInputs()
]);
validateV42215FinalLedger(ledger, inputs.debateInputs, inputs.sourceHashes);
assertV4(
  ledgerAnalysis.status === "deterministic-final-ledger-gate-passed" &&
    ledgerAnalysis.authorization.scoreDerivation &&
    ledgerAnalysis.authorization.scorePassesMaximum === 1,
  "v4.2.21.6 score pass not authorized"
);

const sourcePaths = [
  ledgerPath,
  ledgerAnalysisPath,
  "src/data/debates.js",
  "docs/reassessment-rubric-v4.0.md",
  "docs/reassessment-rubric-v4.0.1.md",
  "docs/reassessment-rubric-v4.1.md",
  "scripts/lib/reassessment-scoring.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v4219-primary-recovery.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/lib/v4221-pass-b-consensus.mjs",
  "scripts/lib/v42211-charity-closure.mjs",
  "scripts/lib/v42215-final-ledger.mjs",
  "scripts/lib/v42216-score-gate.mjs",
  "scripts/test-v42216-score-gate.mjs",
  "scripts/preregister-v42216-score-pass.mjs",
  "scripts/derive-v42216-scores.mjs",
  "scripts/analyze-v42216-scores.mjs"
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of sourcePaths) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
const manifest = {
  schemaVersion: "4.2.21.6-single-score-pass-manifest",
  protocolId: ledger.protocolId,
  status: "frozen-single-deterministic-score-pass",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  inputs: {
    finalLedger: ledgerPath,
    finalLedgerAnalysis: ledgerAnalysisPath,
    productionReference: "src/data/debates.js",
    debates: 3,
    finalSides: 6
  },
  scoringPolicy: {
    passes: 1,
    repositoryDerivedOnly: true,
    modelScoringAllowed: false,
    scoresDerivedAfterAdjudicationOnly: true,
    initialPassScoresDerivedInSamePostAdjudicationPassForStabilityOnly: true,
    formulaChangesAllowed: false,
    postResultTuningAllowed: false,
    automaticRerunAllowed: false
  },
  acceptanceRule: {
    prospective: true,
    productionScoresDiagnosticOnly: true,
    agreedInitialWinnerMustBePreserved: true,
    ...structuredClone(V42216_STABILITY_THRESHOLDS)
  },
  artifacts: { calculatedScores: scoresPath, analysis: scoreAnalysisPath },
  authorization: {
    scoreDerivation: true,
    scorePassesMaximum: 1,
    workflowQualityAnalysis: false,
    publicationFinalization: false,
    productionMutation: false,
    heldOutGate: false,
    all195Debates: false
  },
  sourceHashes
};
if (shouldWrite) await writeFile(path.resolve(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? "frozen" : "preview",
      scorePasses: 1,
      debates: 3,
      finalSides: 6,
      thresholds: V42216_STABILITY_THRESHOLDS,
      productionScoresDiagnosticOnly: true,
      scoreDerivationAuthorized: true
    },
    null,
    2
  )
);
