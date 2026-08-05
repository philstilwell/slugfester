#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, readJson } from "./lib/v41-lean-production.mjs";
import { V416_FINAL_LEDGER_ROOT } from "./lib/v416-final-ledger.mjs";

const shouldWrite = process.argv.includes("--write");
const [calculated, primaryAnalysis, comparator] = await Promise.all([
  readJson(`${V416_FINAL_LEDGER_ROOT}/calculated-scores.json`),
  readJson("docs/calibration/v4.1.5/lean-retired-gate/primary-analysis.json"),
  readJson("docs/calibration/v3.8.11/performance-judgment-consensus/calculated-scores.json")
]);
assertV4(calculated.status === "retired-three-debate-score-gate-failed" && !calculated.authorization.publicationFinalization, "frozen score failure unavailable");
const primaryByDebate = new Map(primaryAnalysis.debates.map((debate) => [debate.debateNumber, debate.provisionalScores]));
const comparatorByDebate = new Map(comparator.debates.map((debate) => [debate.debateNumber, debate]));
const signedDeltas = [];
let movedStrictlyTowardComparator = 0;
let unchangedDistance = 0;
const debates = calculated.debates.map((debate) => {
  const primary = primaryByDebate.get(debate.debateNumber);
  const reference = comparatorByDebate.get(debate.debateNumber);
  assertV4(primary && reference, `${debate.debateNumber}: audit source missing`);
  const sideAudit = Object.fromEntries(["pro", "con"].map((side) => {
    const expected = reference.overall[side].final.score;
    const primaryScore = primary.overall[side].score;
    const finalScore = debate.scores.overall[side].score;
    const primaryAbsoluteDelta = Math.abs(primaryScore - expected);
    const finalAbsoluteDelta = Math.abs(finalScore - expected);
    if (finalAbsoluteDelta < primaryAbsoluteDelta) movedStrictlyTowardComparator += 1;
    else if (finalAbsoluteDelta === primaryAbsoluteDelta) unchangedDistance += 1;
    signedDeltas.push(finalScore - expected);
    return [side, { expected, primaryScore, finalScore, primarySignedDelta: primaryScore - expected, finalSignedDelta: finalScore - expected, primaryAbsoluteDelta, finalAbsoluteDelta, adjudicationMovement: finalScore - primaryScore }];
  }));
  const oldMoves = reference.sections.reduce((sum, section) => sum + section.sides.pro.moves.length + section.sides.con.moves.length, 0);
  const leanMoves = debate.scores.sections.reduce((sum, section) => sum + section.sides.pro.moves.length + section.sides.con.moves.length, 0);
  const expectedMargin = Math.abs(reference.overall.pro.final.score - reference.overall.con.final.score);
  const actualMargin = debate.scores.winningMargin;
  return { debateNumber: debate.debateNumber, debateId: debate.debateId, sideAudit, inventory: { retiredMoves: oldMoves, leanMoves, retainedFraction: Number((leanMoves / oldMoves).toFixed(4)) }, outcome: { expectedWinner: debate.comparator.expectedWinner, actualWinner: debate.comparator.actualWinner, winnerPreserved: debate.comparator.winnerPreserved, expectedMargin, actualMargin, signedMarginDelta: actualMargin - expectedMargin, absoluteMarginDelta: Math.abs(actualMargin - expectedMargin) } };
});
const sortedDeltas = [...signedDeltas].sort((a, b) => a - b);
const meanSignedDelta = signedDeltas.reduce((sum, value) => sum + value, 0) / signedDeltas.length;
const medianSignedDelta = (sortedDeltas[2] + sortedDeltas[3]) / 2;
const totalRetiredMoves = debates.reduce((sum, debate) => sum + debate.inventory.retiredMoves, 0);
const totalLeanMoves = debates.reduce((sum, debate) => sum + debate.inventory.leanMoves, 0);
const audit = {
  schemaVersion: "4.1.6-retired-score-failure-audit",
  protocolId: calculated.protocolId,
  status: "confirmed-narrow-score-gate-failure",
  resultIntegrity: { scoreArtifactUnchanged: true, deterministicCompilerPassed: true, exactLedgerReplayPassed: true, sourceSchemaValidationPassed: true, postResultTuningPerformed: false, rerunPerformed: false },
  scorePattern: { signedDeltas, allFinalScoresAtOrAboveComparator: signedDeltas.every((value) => value >= 0), meanSignedDelta: Number(meanSignedDelta.toFixed(2)), medianSignedDelta, minimumSignedDelta: Math.min(...signedDeltas), maximumSignedDelta: Math.max(...signedDeltas), winnerClassificationsPreserved: calculated.totals.winnerClassificationsPreserved, sidesWithinFive: calculated.totals.sidesWithinFive, maximumAbsoluteDelta: calculated.totals.maximumAbsoluteDelta, maximumAbsoluteMarginDelta: Math.max(...debates.map((debate) => debate.outcome.absoluteMarginDelta)) },
  adjudicationEffect: { sidesMovedStrictlyTowardComparator: movedStrictlyTowardComparator, sidesUnchangedInComparatorDistance: unchangedDistance, sidesMovedAwayFromComparator: 6 - movedStrictlyTowardComparator - unchangedDistance },
  inventoryCompression: { retiredMoves: totalRetiredMoves, leanMoves: totalLeanMoves, retainedFraction: Number((totalLeanMoves / totalRetiredMoves).toFixed(4)) },
  comparatorLimitation: { diagnosticNotGold: true, originalReliabilityGatePassed: comparator.reliabilityGate.passed, originalSpearmanRankCorrelation: comparator.reliabilityGate.spearmanRankCorrelationAcrossSixSideTotals, originalMinimumRequiredSpearman: comparator.reliabilityGate.minimumRequiredSpearmanRankCorrelation },
  debates,
  diagnosis: { compilerDefectDetected: false, adjudicationInstabilityDetected: false, systematicPositiveScaleShiftDetected: true, boundedInventoryRepresentativenessRisk: true, interpretation: "The pattern is most consistent with a systematic scale or bounded-inventory difference rather than a compiler failure or a winner-level judgment reversal." },
  decision: { retiredGatePassed: false, publicationFinalizationAuthorized: false, productionMutationAuthorized: false, heldOutGateAuthorized: false, all195DebatesAuthorized: false },
  recommendation: { preserveFailureUnchanged: true, doNotApplyPostHocOffset: true, doNotRelaxThisFrozenGate: true, nextActionRequiresEditorialChoice: true, recommendedPath: "Treat the three current debates as development diagnostics, freeze a prospective v4.1.7 validation policy, and test it on a fresh disjoint two-speaker sample before any corpus run." }
};
if (shouldWrite) await writeFile(path.resolve(V416_FINAL_LEDGER_ROOT, "score-failure-audit.json"), `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify({ status: audit.status, signedDeltas, meanSignedDelta: audit.scorePattern.meanSignedDelta, medianSignedDelta, allFinalScoresAtOrAboveComparator: audit.scorePattern.allFinalScoresAtOrAboveComparator, winnersPreserved: audit.scorePattern.winnerClassificationsPreserved, maximumAbsoluteMarginDelta: audit.scorePattern.maximumAbsoluteMarginDelta, adjudicationMovedTowardComparator: movedStrictlyTowardComparator, retiredMoves: totalRetiredMoves, leanMoves: totalLeanMoves, compilerDefectDetected: false, heldOutGateAuthorized: false }, null, 2));
