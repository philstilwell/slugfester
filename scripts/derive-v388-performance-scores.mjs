#!/usr/bin/env node

import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { combineCalibrationCharity, scoreDimensions } from "./lib/reassessment-scoring.mjs";
import { V388_PERFORMANCE_DEBATES, V388_PERFORMANCE_ROOT, assertV388, validateV388PerformanceOutput } from "./lib/v388-performance-judgment.mjs";

const root = process.cwd();
const recoveryRoot = `${V388_PERFORMANCE_ROOT}/validated-recovery`;
const outputPath = `${V388_PERFORMANCE_ROOT}/calculated-scores.json`;
const readJson = async (relativePath) => JSON.parse(await readFile(path.resolve(root, relativePath), "utf8"));
const exists = async (relativePath) => { try { await access(path.resolve(root, relativePath)); return true; } catch { return false; } };
const boundedRound = (value) => Math.max(0, Math.min(100, Math.round(value)));
const fixed = (value, places = 2) => Number(value.toFixed(places));
assertV388(!(await exists(outputPath)), `${outputPath} already exists`);

function moveScore(ratings) {
  const calibrationCharity = combineCalibrationCharity({ epistemicCalibration: ratings.epistemicCalibration, representationalCharity: ratings.representationalCharity }, "v3.8.8 calibration/charity");
  const score = scoreDimensions({ logicalCoherence: ratings.logicalCoherence, evidenceWarrant: ratings.evidenceWarrant, responsiveness: ratings.responsiveness, relevanceBurden: ratings.relevanceBurden, precisionClarity: ratings.precisionClarity, calibrationCharity }, "v3.8.8 final move dimensions");
  return { calibrationCharity, score };
}

function weightedSectionScore(moveRecords, scoreKey) {
  const importanceTotal = moveRecords.reduce((sum, move) => sum + move.importance, 0);
  assertV388(moveRecords.length > 0 && importanceTotal > 0, "every side requires at least one move per section");
  return Math.round(moveRecords.reduce((sum, move) => sum + move[scoreKey] * move.importance, 0) / importanceTotal);
}

function ranks(values) {
  const indexed = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const result = Array(values.length);
  for (let start = 0; start < indexed.length;) {
    let end = start + 1;
    while (end < indexed.length && indexed[end].value === indexed[start].value) end += 1;
    const averageRank = ((start + 1) + end) / 2;
    for (let index = start; index < end; index += 1) result[indexed[index].index] = averageRank;
    start = end;
  }
  return result;
}

function pearson(valuesA, valuesB) {
  const meanA = valuesA.reduce((sum, value) => sum + value, 0) / valuesA.length;
  const meanB = valuesB.reduce((sum, value) => sum + value, 0) / valuesB.length;
  let numerator = 0, denominatorA = 0, denominatorB = 0;
  for (let index = 0; index < valuesA.length; index += 1) {
    const deltaA = valuesA[index] - meanA;
    const deltaB = valuesB[index] - meanB;
    numerator += deltaA * deltaB;
    denominatorA += deltaA * deltaA;
    denominatorB += deltaB * deltaB;
  }
  return denominatorA === 0 || denominatorB === 0 ? 0 : numerator / Math.sqrt(denominatorA * denominatorB);
}

const finalLedger = await readJson(`${V388_PERFORMANCE_ROOT}/final-ledger.json`);
assertV388(finalLedger.status === "assembled-pending-independent-ledger-validation" && finalLedger.authorization.independentLedgerValidation && !finalLedger.authorization.scoreDerivation, "final ledger boundary invalid; run independent validator before derivation");
const debates = [];
const passATotals = [];
const passBTotals = [];
let maxDiagnosticOverallPassDelta = 0;
let identicalWinnerClassifications = true;

for (const debateNumber of V388_PERFORMANCE_DEBATES) {
  const finalDebate = finalLedger.debates.find((item) => item.debateNumber === debateNumber);
  const packet = await readJson(`${V388_PERFORMANCE_ROOT}/packets/debate-${debateNumber}.json`);
  const passA = await readJson(`${recoveryRoot}/normalized/outputs/debate-${debateNumber}-pass-a.json`);
  const passB = await readJson(`${recoveryRoot}/normalized/outputs/debate-${debateNumber}-pass-b.json`);
  validateV388PerformanceOutput(passA, packet, "A");
  validateV388PerformanceOutput(passB, packet, "B");
  const passAMap = new Map(passA.moveJudgments.map((move) => [move.moveId, move]));
  const passBMap = new Map(passB.moveJudgments.map((move) => [move.moveId, move]));
  const sectionRecords = [];

  for (const section of finalDebate.sections) {
    const sideRecords = {};
    for (const side of ["pro", "con"]) {
      const moves = finalDebate.moves.filter((move) => move.sectionId === section.sectionId && move.side === side).map((move) => {
        const judgmentA = passAMap.get(move.moveId);
        const judgmentB = passBMap.get(move.moveId);
        const passAScoring = moveScore(Object.fromEntries(Object.entries(judgmentA.ratings).map(([key, rating]) => [key, rating.value])));
        const passBScoring = moveScore(Object.fromEntries(Object.entries(judgmentB.ratings).map(([key, rating]) => [key, rating.value])));
        const finalScoring = moveScore(move.ratings);
        return { moveId: move.moveId, speaker: move.speaker, importance: move.importance, passACalibrationCharity: passAScoring.calibrationCharity, passAScore: passAScoring.score, passBCalibrationCharity: passBScoring.calibrationCharity, passBScore: passBScoring.score, finalCalibrationCharity: finalScoring.calibrationCharity, finalScore: finalScoring.score };
      });
      sideRecords[side] = { moves, passAScore: weightedSectionScore(moves, "passAScore"), passBScore: weightedSectionScore(moves, "passBScore"), finalScore: weightedSectionScore(moves, "finalScore") };
    }
    sectionRecords.push({ sectionId: section.sectionId, title: section.title, weightPercent: section.weight, sides: sideRecords });
  }

  const overall = {};
  for (const side of ["pro", "con"]) {
    const passAWeightedSectionMean = sectionRecords.reduce((sum, section) => sum + section.sides[side].passAScore * (section.weightPercent / 100), 0);
    const passBWeightedSectionMean = sectionRecords.reduce((sum, section) => sum + section.sides[side].passBScore * (section.weightPercent / 100), 0);
    const finalWeightedSectionMean = sectionRecords.reduce((sum, section) => sum + section.sides[side].finalScore * (section.weightPercent / 100), 0);
    const passAAdjustment = passA.burdenCompletionAdjustment[side].value;
    const passBAdjustment = passB.burdenCompletionAdjustment[side].value;
    const finalAdjustment = finalDebate.burdenCompletionAdjustment[side].value;
    const passAScore = boundedRound(passAWeightedSectionMean + passAAdjustment);
    const passBScore = boundedRound(passBWeightedSectionMean + passBAdjustment);
    const finalScore = boundedRound(finalWeightedSectionMean + finalAdjustment);
    overall[side] = {
      label: finalDebate.sides[side].label,
      speakers: finalDebate.sides[side].speakers,
      passA: { weightedSectionMean: fixed(passAWeightedSectionMean), burdenCompletionAdjustment: passAAdjustment, score: passAScore },
      passB: { weightedSectionMean: fixed(passBWeightedSectionMean), burdenCompletionAdjustment: passBAdjustment, score: passBScore },
      final: { weightedSectionMean: fixed(finalWeightedSectionMean), burdenCompletionAdjustment: finalAdjustment, score: finalScore },
      confidenceRange: { low: Math.max(0, Math.min(passAScore, passBScore, finalScore) - 2), high: Math.min(100, Math.max(passAScore, passBScore, finalScore) + 2) },
      diagnosticPassDelta: Math.abs(passAScore - passBScore),
    };
    passATotals.push(passAScore);
    passBTotals.push(passBScore);
    maxDiagnosticOverallPassDelta = Math.max(maxDiagnosticOverallPassDelta, Math.abs(passAScore - passBScore));
  }
  const winnerClass = (stage) => overall.pro[stage].score === overall.con[stage].score ? "tie" : overall.pro[stage].score > overall.con[stage].score ? "pro" : "con";
  const winnerDiagnostics = { passA: winnerClass("passA"), passB: winnerClass("passB"), final: winnerClass("final") };
  winnerDiagnostics.identical = winnerDiagnostics.passA === winnerDiagnostics.passB && winnerDiagnostics.passB === winnerDiagnostics.final;
  identicalWinnerClassifications &&= winnerDiagnostics.identical;
  debates.push({ debateNumber, debateId: finalDebate.debateId, motion: finalDebate.motion, sections: sectionRecords, overall, winnerDiagnostics });
}

const spearmanRankCorrelation = pearson(ranks(passATotals), ranks(passBTotals));
const reliabilityGate = {
  maximumDiagnosticOverallPassDelta: maxDiagnosticOverallPassDelta,
  maximumAllowedDiagnosticOverallPassDelta: 5,
  diagnosticOverallPassDeltaPassed: maxDiagnosticOverallPassDelta <= 5,
  identicalWinnerClassificationsAcrossAllDebates: identicalWinnerClassifications,
  spearmanRankCorrelationAcrossSixSideTotals: fixed(spearmanRankCorrelation, 6),
  minimumRequiredSpearmanRankCorrelation: 0.9,
  spearmanRankCorrelationPassed: spearmanRankCorrelation >= 0.9,
};
reliabilityGate.passed = reliabilityGate.diagnosticOverallPassDeltaPassed && reliabilityGate.identicalWinnerClassificationsAcrossAllDebates && reliabilityGate.spearmanRankCorrelationPassed;

const output = {
  schemaVersion: "3.8.8-performance-calculated-scores",
  protocolId: "v3.8.8-performance-judgment-consensus",
  status: "derived-pending-independent-calculator-validation",
  formulas: {
    calibrationCharity: "round((epistemicCalibration + representationalCharity) / 2)",
    move: "round(.25 logicalCoherence + .20 evidenceWarrant + .20 responsiveness + .15 relevanceBurden + .10 precisionClarity + .10 calibrationCharity)",
    section: "round(sum(move score * importance) / sum(importance))",
    overall: "round(section-weighted mean + burden-completion adjustment), bounded 0-100",
    confidenceRange: "two below minimum of Pass A, Pass B, and final through two above maximum, bounded 0-100",
  },
  population: { debates: 3, sides: 6, sections: debates.reduce((sum, debate) => sum + debate.sections.length, 0), moves: 81 },
  reliabilityGate,
  authorization: {
    independentCalculatorValidation: true,
    assessmentProse: false,
    productionMutation: false,
    tenDebateGate: false,
    all195Debates: false,
  },
  debates,
};
await writeFile(path.resolve(root, outputPath), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ status: output.status, population: output.population, reliabilityGate, scores: debates.map((debate) => ({ debateNumber: debate.debateNumber, pro: debate.overall.pro.final.score, con: debate.overall.con.final.score, winner: debate.winnerDiagnostics.final })), independentCalculatorValidationAuthorized: true, assessmentProseAuthorized: false }, null, 2));
