#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, readJson } from "./lib/v41-lean-production.mjs";
import { loadV416FinalLedgerInputs, validateV416FinalLedger, V416_FINAL_LEDGER_ROOT } from "./lib/v416-final-ledger.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const manifestPath = `${V416_FINAL_LEDGER_ROOT}/score-derivation-manifest.json`;
const scoresPath = `${V416_FINAL_LEDGER_ROOT}/calculated-scores.json`;
const finalLedgerPath = `${V416_FINAL_LEDGER_ROOT}/final-ledger.json`;
const comparatorPath = "docs/calibration/v3.8.11/performance-judgment-consensus/calculated-scores.json";
const exists = async (file) => access(path.resolve(file)).then(() => true, () => false);
if (shouldWrite) for (const future of [manifestPath, scoresPath]) assertV4(!(await exists(future)), `${future} already exists`);
const [ledger, inputs] = await Promise.all([readJson(finalLedgerPath), loadV416FinalLedgerInputs()]);
validateV416FinalLedger(ledger, inputs.debateInputs, inputs.sourceHashes);
assertV4(ledger.authorization.scoreDerivation && ledger.audit.singleScoringPassSchema && ledger.audit.calculatedScores === 0, "score derivation boundary invalid");
const sourcePaths = [finalLedgerPath, comparatorPath, "scripts/lib/v41-lean-production.mjs", "scripts/lib/v4-lean-production.mjs", "scripts/lib/reassessment-scoring.mjs", "scripts/lib/v416-score-gate.mjs", "scripts/preregister-v416-score-derivation.mjs", "scripts/derive-v416-scores.mjs"];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of sourcePaths) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
const manifest = {
  schemaVersion: "4.1.6-score-derivation-manifest",
  protocolId: ledger.protocolId,
  status: "frozen-single-deterministic-score-pass",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  inputs: { finalLedger: finalLedgerPath, retiredComparator: comparatorPath, debates: 3, sides: 6 },
  scoringPolicy: { passes: 1, repositoryDerivedOnly: true, modelScoringAllowed: false, scoresDerivedAfterAdjudicationOnly: true, formulaChangesAllowed: false, postResultTuningAllowed: false },
  acceptanceRule: { preserveWinnerClassificationEveryDebate: true, absoluteSideDeltaMaximum: 5, debatesRequired: 3, sidesWithinThresholdRequired: 6 },
  stopRule: { acceptanceFailureStopsPublicationFinalization: true, automaticReanalysisAllowed: false, rubricOrFormulaAdjustmentAllowedAfterResult: false },
  artifacts: { calculatedScores: scoresPath },
  authorization: { scoreDerivation: true, publicationFinalization: false, productionMutation: false, heldOutGate: false, all195Debates: false },
  sourceHashes
};
if (shouldWrite) await writeFile(path.resolve(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", scorePasses: 1, debates: 3, sides: 6, maximumAbsoluteSideDelta: 5, scoreDerivationAuthorized: true, publicationFinalizationAuthorized: false }, null, 2));
