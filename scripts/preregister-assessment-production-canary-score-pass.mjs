#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  PRODUCTION_CANARY_FINAL_LEDGER_ROOT,
  loadProductionCanaryFinalLedgerInputs,
  validateProductionCanaryFinalLedger,
} from "./lib/assessment-production-canary-final-ledger.mjs";
import {
  PRODUCTION_CANARY_SCORE_ROOT,
  PRODUCTION_CANARY_SCORE_STABILITY_THRESHOLDS,
} from "./lib/assessment-production-canary-score-gate.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);
const ledgerPath = `${PRODUCTION_CANARY_FINAL_LEDGER_ROOT}/final-ledger.json`;
const ledgerAnalysisPath = `${PRODUCTION_CANARY_FINAL_LEDGER_ROOT}/analysis.json`;
const manifestPath = `${PRODUCTION_CANARY_SCORE_ROOT}/score-pass-manifest.json`;
const scoresPath = `${PRODUCTION_CANARY_SCORE_ROOT}/calculated-scores.json`;
const scoreAnalysisPath = `${PRODUCTION_CANARY_SCORE_ROOT}/analysis.json`;
const exists = async (file) =>
  access(path.resolve(file)).then(
    () => true,
    () => false
  );
if (shouldWrite) {
  for (const future of [manifestPath, scoresPath, scoreAnalysisPath]) {
    assertV4(!(await exists(future)), `${future} already exists`);
  }
}
const [ledger, ledgerAnalysis, inputs] = await Promise.all([
  readFile(path.resolve(ledgerPath), "utf8").then(JSON.parse),
  readFile(path.resolve(ledgerAnalysisPath), "utf8").then(JSON.parse),
  loadProductionCanaryFinalLedgerInputs(),
]);
validateProductionCanaryFinalLedger(
  ledger,
  inputs.debateInputs,
  inputs.sourceHashes
);
assertV4(
  ledgerAnalysis.status ===
    "production-canary-deterministic-final-ledger-gate-passed" &&
    ledgerAnalysis.authorization.scoreDerivation &&
    ledgerAnalysis.authorization.scorePassesMaximum === 1,
  "single production-canary score pass is not authorized"
);
const sourcePaths = [
  ledgerPath,
  ledgerAnalysisPath,
  "src/data/debates.js",
  "docs/reassessment-rubric-v2.1.md",
  "docs/reassessment-rubric-v4.0.md",
  "docs/reassessment-rubric-v4.0.1.md",
  "docs/reassessment-rubric-v4.1.md",
  "docs/assessment-production-workflow.md",
  "scripts/lib/reassessment-scoring.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/lib/assessment-production-canary-final-ledger.mjs",
  "scripts/lib/assessment-production-canary-score-gate.mjs",
  "scripts/test-assessment-production-canary-score-gate.mjs",
  "scripts/preregister-assessment-production-canary-score-pass.mjs",
  "scripts/derive-assessment-production-canary-scores.mjs",
  "scripts/analyze-assessment-production-canary-scores.mjs",
];
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of sourcePaths) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}
const manifest = {
  schemaVersion: "1.0-production-canary-single-score-pass-manifest",
  protocolId: ledger.protocolId,
  status: "frozen-production-canary-single-deterministic-score-pass",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  productionCanary: true,
  stagingOnly: true,
  AIOnly: true,
  inputs: {
    finalLedger: ledgerPath,
    finalLedgerAnalysis: ledgerAnalysisPath,
    productionReference: "src/data/debates.js",
    debates: 10,
    finalSides: 20,
  },
  scoringPolicy: {
    passes: 1,
    repositoryDerivedOnly: true,
    modelScoringAllowed: false,
    scoresDerivedAfterAdjudicationOnly: true,
    initialPassScoresDerivedInSamePostAdjudicationPassForStabilityOnly: true,
    formulaChangesAllowed: false,
    postResultTuningAllowed: false,
    automaticRerunAllowed: false,
  },
  acceptanceRule: {
    prospective: true,
    productionScoresDiagnosticOnly: true,
    agreedInitialWinnerMustBePreserved: true,
    ...structuredClone(PRODUCTION_CANARY_SCORE_STABILITY_THRESHOLDS),
  },
  artifacts: {
    calculatedScores: scoresPath,
    analysis: scoreAnalysisPath,
  },
  authorization: {
    scoreDerivation: true,
    scorePassesMaximum: 1,
    scoreAnalysis: false,
    publicationPacketPreparation: false,
    publicationModelExecution: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  sourceHashes,
};
if (shouldWrite) {
  await mkdir(path.resolve(PRODUCTION_CANARY_SCORE_ROOT), { recursive: true });
  await writeFile(
    path.resolve(manifestPath),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
}
console.log(
  JSON.stringify(
    {
      status: shouldWrite ? "frozen" : "preview",
      scorePasses: 1,
      debates: 10,
      finalSides: 20,
      thresholds: PRODUCTION_CANARY_SCORE_STABILITY_THRESHOLDS,
      productionScoresDiagnosticOnly: true,
      modelContexts: 0,
      meteredApiCostUsd: 0,
      scoreDerivationAuthorized: true,
    },
    null,
    2
  )
);
