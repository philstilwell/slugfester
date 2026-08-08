#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V42211729_ROOT, loadV42211729FinalLedgerInputs, validateV42211729FinalLedger } from "./lib/v42211729-hard-route-final-ledger.mjs";
import { V42211730_ROOT, V42211730_STABILITY_THRESHOLDS } from "./lib/v42211730-hard-route-score-gate.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const ledgerPath = `${V42211729_ROOT}/final-ledger.json`;
const ledgerAnalysisPath = `${V42211729_ROOT}/analysis.json`;
const manifestPath = `${V42211730_ROOT}/score-pass-manifest.json`;
const scoresPath = `${V42211730_ROOT}/calculated-scores.json`;
const scoreAnalysisPath = `${V42211730_ROOT}/analysis.json`;
const exists = async (file) => access(path.resolve(file)).then(() => true, () => false);
if (shouldWrite) for (const future of [manifestPath, scoresPath, scoreAnalysisPath]) assertV4(!(await exists(future)), `${future} already exists`);
const [ledger, ledgerAnalysis, inputs] = await Promise.all([readFile(path.resolve(ledgerPath), "utf8").then(JSON.parse), readFile(path.resolve(ledgerAnalysisPath), "utf8").then(JSON.parse), loadV42211729FinalLedgerInputs()]);
validateV42211729FinalLedger(ledger, inputs.debateInputs, inputs.sourceHashes);
assertV4(ledgerAnalysis.status === "hard-route-deterministic-final-ledger-gate-passed" && ledgerAnalysis.authorization.scoreDerivation && ledgerAnalysis.authorization.scorePassesMaximum === 1, "single hard-route score pass is not authorized");
const sourcePaths = [ledgerPath, ledgerAnalysisPath, "src/data/debates.js", "docs/reassessment-rubric-v4.0.md", "docs/reassessment-rubric-v4.0.1.md", "docs/reassessment-rubric-v4.1.md", "docs/assessment-workflow-v4.2.21.17.30.md", "scripts/lib/reassessment-scoring.mjs", "scripts/lib/v4-lean-production.mjs", "scripts/lib/v4220-source-span-rendering.mjs", "scripts/lib/v42211729-hard-route-final-ledger.mjs", "scripts/lib/v42211730-hard-route-score-gate.mjs", "scripts/test-v42211730-hard-route-score-gate.mjs", "scripts/preregister-v42211730-hard-route-score-pass.mjs", "scripts/derive-v42211730-hard-route-scores.mjs", "scripts/analyze-v42211730-hard-route-scores.mjs"];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of sourcePaths) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
const manifest = {
  schemaVersion: "4.2.21.17.30-hard-route-single-score-pass-manifest",
  protocolId: ledger.protocolId,
  status: "frozen-hard-route-single-deterministic-score-pass",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  inputs: { finalLedger: ledgerPath, finalLedgerAnalysis: ledgerAnalysisPath, productionReference: "src/data/debates.js", debates: 5, finalSides: 10 },
  scoringPolicy: { passes: 1, repositoryDerivedOnly: true, modelScoringAllowed: false, scoresDerivedAfterAdjudicationOnly: true, initialPassScoresDerivedInSamePostAdjudicationPassForStabilityOnly: true, formulaChangesAllowed: false, postResultTuningAllowed: false, automaticRerunAllowed: false },
  acceptanceRule: { prospective: true, productionScoresDiagnosticOnly: true, agreedInitialWinnerMustBePreserved: true, ...structuredClone(V42211730_STABILITY_THRESHOLDS) },
  artifacts: { calculatedScores: scoresPath, analysis: scoreAnalysisPath },
  authorization: { scoreDerivation: true, scorePassesMaximum: 1, workflowQualityAnalysis: false, publicationFinalization: false, productionMutation: false, all195Debates: false },
  sourceHashes
};
if (shouldWrite) { await mkdir(path.resolve(V42211730_ROOT), { recursive: true }); await writeFile(path.resolve(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`); }
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", scorePasses: 1, debates: 5, finalSides: 10, thresholds: V42211730_STABILITY_THRESHOLDS, productionScoresDiagnosticOnly: true, modelContexts: 0, meteredApiCostUsd: 0, scoreDerivationAuthorized: true }, null, 2));
