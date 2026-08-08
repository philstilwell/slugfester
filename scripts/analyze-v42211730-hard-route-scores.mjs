#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V42211730_CALCULATED_SCORES_VERSION, V42211730_ROOT } from "./lib/v42211730-hard-route-score-gate.mjs";

const shouldWrite = process.argv.includes("--write");
const scoresPath = `${V42211730_ROOT}/calculated-scores.json`;
const analysisPath = `${V42211730_ROOT}/analysis.json`;
const scores = JSON.parse(await readFile(path.resolve(scoresPath), "utf8"));
assertV4(scores.schemaVersion === V42211730_CALCULATED_SCORES_VERSION, "hard-route score artifact identity mismatch");
const productionWinnerMatches = scores.debates.filter((debate) => debate.productionReferenceDiagnosticOnly.finalWinnerMatches).length;
const productionDeltas = scores.debates.flatMap((debate) => Object.values(debate.productionReferenceDiagnosticOnly.finalDeltas));
const passed = scores.totals.acceptancePassed;
const analysis = {
  schemaVersion: "4.2.21.17.30-hard-route-score-stability-analysis",
  protocolId: scores.protocolId,
  status: passed ? "hard-route-post-adjudication-score-stability-passed" : "hard-route-post-adjudication-score-stability-failed",
  resultIntegrity: { prospectiveThresholdsApplied: true, singleDeterministicScoringPass: true, scoresDerivedAfterLedgerLock: true, postResultTuningPerformed: false, automaticRerunPerformed: false, productionScoresUsedForAcceptance: false },
  stability: scores.stability,
  productionReferenceDiagnostic: { winnerMatches: productionWinnerMatches, debates: 5, signedSideDeltas: productionDeltas, meanSignedSideDelta: Number((productionDeltas.reduce((sum, value) => sum + value, 0) / productionDeltas.length).toFixed(2)), diagnosticNotGold: true },
  workflowFinding: { hardRouteSemanticConsensusPipelineComplete: true, scoringConsistencyPassed: passed, publicationContentStillUntested: true, full195RunStillUnauthorized: true },
  authorization: { nextReadinessAssessment: true, publicationFinalization: false, productionMutation: false, all195Debates: false }
};
if (shouldWrite) await writeFile(path.resolve(analysisPath), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, stability: analysis.stability, productionReferenceDiagnostic: analysis.productionReferenceDiagnostic, nextAuthorized: "workflow-readiness-assessment", all195DebatesAuthorized: false }, null, 2));
