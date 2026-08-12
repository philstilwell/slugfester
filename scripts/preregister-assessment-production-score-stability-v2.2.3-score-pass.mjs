#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  V223_FINAL_LEDGER_ROOT,
  loadV223FinalLedgerInputs,
  validateV223FinalLedger,
} from "./lib/assessment-production-score-stability-v2.2.3-final-ledger.mjs";
import {
  V223_SCORE_ROOT,
  V223_SCORE_STABILITY_THRESHOLDS,
} from "./lib/assessment-production-score-stability-v2.2.3-score-gate.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(
  frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp"
);
const ledgerPath = `${V223_FINAL_LEDGER_ROOT}/final-ledger.json`;
const ledgerAnalysisPath = `${V223_FINAL_LEDGER_ROOT}/analysis.json`;
const manifestPath = `${V223_SCORE_ROOT}/score-pass-manifest.json`;
const scoresPath = `${V223_SCORE_ROOT}/calculated-scores.json`;
const scoreAnalysisPath = `${V223_SCORE_ROOT}/analysis.json`;
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
  loadV223FinalLedgerInputs(),
]);
validateV223FinalLedger(ledger, inputs.debateInputs, inputs.sourceHashes);
assertV4(
  ledgerAnalysis.status === "v2.2.3-deterministic-final-ledger-gate-passed" &&
    ledgerAnalysis.authorization.scoreDerivation &&
    ledgerAnalysis.authorization.scorePassesMaximum === 1,
  "single v2.2.3 score pass is not authorized"
);
const sourcePaths = [
  ledgerPath,
  ledgerAnalysisPath,
  "src/data/debates.js",
  "docs/assessment-production/score-stability-policy-v2.1-proposal.md",
  "docs/reassessment-rubric-v2.1.md",
  "docs/reassessment-rubric-v4.0.md",
  "docs/reassessment-rubric-v4.0.1.md",
  "docs/reassessment-rubric-v4.1.md",
  "docs/assessment-production-workflow.md",
  "scripts/lib/reassessment-scoring.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/lib/v4220-source-span-rendering.mjs",
  "scripts/lib/assessment-production-score-stability-policy-v2.mjs",
  "scripts/lib/assessment-production-score-stability-policy-v2.1.mjs",
  "scripts/lib/assessment-production-score-stability-v2.2.3-final-ledger.mjs",
  "scripts/lib/assessment-production-score-stability-v2.2.3-score-gate.mjs",
  "scripts/test-assessment-production-score-stability-policy-v2.1.mjs",
  "scripts/test-assessment-production-score-stability-v2.2.3-score-gate.mjs",
  "scripts/preregister-assessment-production-score-stability-v2.2.3-score-pass.mjs",
  "scripts/derive-assessment-production-score-stability-v2.2.3-scores.mjs",
  "scripts/validate-assessment-production-score-stability-v2.2.3-scores.mjs",
  "scripts/analyze-assessment-production-score-stability-v2.2.3-scores.mjs",
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of sourcePaths) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}
const manifest = {
  schemaVersion: "1.0-score-stability-v2.2.3-single-score-pass-manifest",
  protocolId: ledger.protocolId,
  status: "frozen-v2.2.3-single-deterministic-score-pass",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  productionCanary: false,
  stagingOnly: true,
  developmentValidationOnly: true,
  AIOnly: true,
  inputs: {
    finalLedger: ledgerPath,
    finalLedgerAnalysis: ledgerAnalysisPath,
    productionReference: "src/data/debates.js",
    debates: 10,
    finalSides: 20,
  },
  scoringPolicy: {
    proposal: "docs/assessment-production/score-stability-policy-v2.1-proposal.md",
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
    agreedInitialProOrConMayCollapseToIntegerRoundedTie: true,
    agreedInitialOppositeSideReversalAllowed: false,
    agreedInitialTieMustRemainTie: true,
    unroundedDirectionDiagnosticOnly: true,
    ...structuredClone(V223_SCORE_STABILITY_THRESHOLDS),
  },
  artifacts: {
    calculatedScores: scoresPath,
    analysis: scoreAnalysisPath,
  },
  authorization: {
    scoreDerivation: true,
    scorePassesMaximum: 1,
    scoreAnalysis: false,
    scoreRerun: false,
    readinessDecision: false,
    policyPromotion: false,
    publicationPacketPreparation: false,
    publicationModelExecution: false,
    productionMutation: false,
    remainingProductionBatches: false,
  },
  sourceHashes,
};
if (shouldWrite) {
  await mkdir(path.resolve(V223_SCORE_ROOT), { recursive: true });
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
      thresholds: V223_SCORE_STABILITY_THRESHOLDS,
      integerRoundedTiesAllowed: true,
      productionScoresDiagnosticOnly: true,
      modelContexts: 0,
      meteredApiCostUsd: 0,
      scoreDerivationAuthorized: true,
    },
    null,
    2
  )
);
