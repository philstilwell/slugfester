#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { combineCalibrationCharity, scoreDimensions } from "./lib/reassessment-scoring.mjs";
import { V3811_PERFORMANCE_DEBATES, V3811_PERFORMANCE_ROOT, V3811_RATING_KEYS, assertV3811, canonicalJson, validateV3811PerformanceOutput } from "./lib/v3811-performance-judgment.mjs";

const root = process.cwd();
const initialOutputsRoot = `${V3811_PERFORMANCE_ROOT}/initial-outputs`;
const readJson = async (relativePath) => JSON.parse(await readFile(path.resolve(root, relativePath), "utf8"));
const fixed = (value, places = 2) => Number(value.toFixed(places));
const boundedRound = (value) => Math.max(0, Math.min(100, Math.round(value)));
const same = (actual, expected, label) => assertV3811(canonicalJson(actual) === canonicalJson(expected), `${label} mismatch`);

function scoreMove(ratings) {
  const calibrationCharity = combineCalibrationCharity({ epistemicCalibration: ratings.epistemicCalibration, representationalCharity: ratings.representationalCharity });
  return { calibrationCharity, score: scoreDimensions({ logicalCoherence: ratings.logicalCoherence, evidenceWarrant: ratings.evidenceWarrant, responsiveness: ratings.responsiveness, relevanceBurden: ratings.relevanceBurden, precisionClarity: ratings.precisionClarity, calibrationCharity }) };
}

function importanceMean(moves, key) {
  const denominator = moves.reduce((sum, move) => sum + move.importance, 0);
  assertV3811(moves.length > 0 && denominator > 0, "section side lacks scored moves");
  return Math.round(moves.reduce((sum, move) => sum + move[key] * move.importance, 0) / denominator);
}

function rank(values) {
  const sorted = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const output = Array(values.length);
  for (let start = 0; start < sorted.length;) {
    let end = start + 1;
    while (end < sorted.length && sorted[end].value === sorted[start].value) end += 1;
    const average = ((start + 1) + end) / 2;
    for (let index = start; index < end; index += 1) output[sorted[index].index] = average;
    start = end;
  }
  return output;
}

function correlation(a, b) {
  const meanA = a.reduce((sum, value) => sum + value, 0) / a.length;
  const meanB = b.reduce((sum, value) => sum + value, 0) / b.length;
  let numerator = 0, denominatorA = 0, denominatorB = 0;
  for (let index = 0; index < a.length; index += 1) {
    const da = a[index] - meanA, db = b[index] - meanB;
    numerator += da * db; denominatorA += da * da; denominatorB += db * db;
  }
  return numerator / Math.sqrt(denominatorA * denominatorB);
}

const scores = await readJson(`${V3811_PERFORMANCE_ROOT}/calculated-scores.json`);
const ledger = await readJson(`${V3811_PERFORMANCE_ROOT}/final-ledger.json`);
assertV3811(scores.status === "derived-pending-independent-calculator-validation" && scores.authorization.independentCalculatorValidation && !scores.authorization.assessmentProse && !scores.authorization.productionMutation && !scores.authorization.tenDebateGate && !scores.authorization.all195Debates, "score artifact boundary invalid");
assertV3811(scores.debates.length === 3 && ledger.debates.length === 3, "score population invalid");
const passTotalsA = [], passTotalsB = [];
let maximumDelta = 0;
let winnersIdentical = true;
let movesChecked = 0;
let sectionsChecked = 0;
const rawScalarDeltas = [];

for (const debateNumber of V3811_PERFORMANCE_DEBATES) {
  const scoreDebate = scores.debates.find((item) => item.debateNumber === debateNumber);
  const finalDebate = ledger.debates.find((item) => item.debateNumber === debateNumber);
  const [packet, passA, passB] = await Promise.all([
    readJson(`${V3811_PERFORMANCE_ROOT}/packets/debate-${debateNumber}.json`),
    readJson(`${initialOutputsRoot}/debate-${debateNumber}-pass-a.json`),
    readJson(`${initialOutputsRoot}/debate-${debateNumber}-pass-b.json`),
  ]);
  validateV3811PerformanceOutput(passA, packet, "A");
  validateV3811PerformanceOutput(passB, packet, "B");
  const mapA = new Map(passA.moveJudgments.map((move) => [move.moveId, move]));
  const mapB = new Map(passB.moveJudgments.map((move) => [move.moveId, move]));
  let weightTotal = 0;

  for (const finalSection of finalDebate.sections) {
    const scoreSection = scoreDebate.sections.find((item) => item.sectionId === finalSection.sectionId);
    assertV3811(scoreSection && scoreSection.weightPercent === finalSection.weight, `${debateNumber}:${finalSection.sectionId}: score section missing or weight changed`);
    weightTotal += scoreSection.weightPercent;
    for (const side of ["pro", "con"]) {
      const expectedMoves = finalDebate.moves.filter((move) => move.sectionId === finalSection.sectionId && move.side === side);
      assertV3811(scoreSection.sides[side].moves.length === expectedMoves.length, `${debateNumber}:${finalSection.sectionId}:${side}: move count mismatch`);
      const recomputed = expectedMoves.map((move) => {
        const judgmentA = mapA.get(move.moveId), judgmentB = mapB.get(move.moveId);
        const ratingsA = Object.fromEntries(Object.entries(judgmentA.ratings).map(([key, rating]) => [key, rating.value]));
        const ratingsB = Object.fromEntries(Object.entries(judgmentB.ratings).map(([key, rating]) => [key, rating.value]));
        for (const key of V3811_RATING_KEYS) rawScalarDeltas.push(Math.abs(ratingsA[key] - ratingsB[key]));
        const scoringA = scoreMove(ratingsA), scoringB = scoreMove(ratingsB), scoringFinal = scoreMove(move.ratings);
        return { moveId: move.moveId, speaker: move.speaker, importance: move.importance, passACalibrationCharity: scoringA.calibrationCharity, passAScore: scoringA.score, passBCalibrationCharity: scoringB.calibrationCharity, passBScore: scoringB.score, finalCalibrationCharity: scoringFinal.calibrationCharity, finalScore: scoringFinal.score };
      });
      same(scoreSection.sides[side].moves, recomputed, `${debateNumber}:${finalSection.sectionId}:${side}: move scoring`);
      assertV3811(scoreSection.sides[side].passAScore === importanceMean(recomputed, "passAScore") && scoreSection.sides[side].passBScore === importanceMean(recomputed, "passBScore") && scoreSection.sides[side].finalScore === importanceMean(recomputed, "finalScore"), `${debateNumber}:${finalSection.sectionId}:${side}: section calculation mismatch`);
      movesChecked += recomputed.length;
    }
    sectionsChecked += 1;
  }
  assertV3811(weightTotal === 100, `${debateNumber}: section weights do not total 100`);

  for (const side of ["pro", "con"]) {
    const weightedA = scoreDebate.sections.reduce((sum, section) => sum + section.sides[side].passAScore * section.weightPercent / 100, 0);
    const weightedB = scoreDebate.sections.reduce((sum, section) => sum + section.sides[side].passBScore * section.weightPercent / 100, 0);
    const weightedFinal = scoreDebate.sections.reduce((sum, section) => sum + section.sides[side].finalScore * section.weightPercent / 100, 0);
    const adjustmentA = passA.burdenCompletionAdjustment[side].value, adjustmentB = passB.burdenCompletionAdjustment[side].value, adjustmentFinal = finalDebate.burdenCompletionAdjustment[side].value;
    const expected = {
      label: finalDebate.sides[side].label,
      speakers: finalDebate.sides[side].speakers,
      passA: { weightedSectionMean: fixed(weightedA), burdenCompletionAdjustment: adjustmentA, score: boundedRound(weightedA + adjustmentA) },
      passB: { weightedSectionMean: fixed(weightedB), burdenCompletionAdjustment: adjustmentB, score: boundedRound(weightedB + adjustmentB) },
      final: { weightedSectionMean: fixed(weightedFinal), burdenCompletionAdjustment: adjustmentFinal, score: boundedRound(weightedFinal + adjustmentFinal) },
    };
    expected.confidenceRange = { low: Math.max(0, Math.min(expected.passA.score, expected.passB.score, expected.final.score) - 2), high: Math.min(100, Math.max(expected.passA.score, expected.passB.score, expected.final.score) + 2) };
    expected.diagnosticPassDelta = Math.abs(expected.passA.score - expected.passB.score);
    same(scoreDebate.overall[side], expected, `${debateNumber}:${side}: overall score`);
    passTotalsA.push(expected.passA.score); passTotalsB.push(expected.passB.score);
    maximumDelta = Math.max(maximumDelta, expected.diagnosticPassDelta);
  }
  const classify = (stage) => scoreDebate.overall.pro[stage].score === scoreDebate.overall.con[stage].score ? "tie" : scoreDebate.overall.pro[stage].score > scoreDebate.overall.con[stage].score ? "pro" : "con";
  const expectedWinners = { passA: classify("passA"), passB: classify("passB"), final: classify("final") };
  expectedWinners.identical = expectedWinners.passA === expectedWinners.passB && expectedWinners.passB === expectedWinners.final;
  same(scoreDebate.winnerDiagnostics, expectedWinners, `${debateNumber}: winner diagnostics`);
  winnersIdentical &&= expectedWinners.identical;
}

const spearman = correlation(rank(passTotalsA), rank(passTotalsB));
const expectedGate = {
  maximumDiagnosticOverallPassDelta: maximumDelta,
  maximumAllowedDiagnosticOverallPassDelta: 5,
  diagnosticOverallPassDeltaPassed: maximumDelta <= 5,
  identicalWinnerClassificationsAcrossAllDebates: winnersIdentical,
  spearmanRankCorrelationAcrossSixSideTotals: fixed(spearman, 6),
  minimumRequiredSpearmanRankCorrelation: 0.9,
  spearmanRankCorrelationPassed: spearman >= 0.9,
};
expectedGate.passed = expectedGate.diagnosticOverallPassDeltaPassed && expectedGate.identicalWinnerClassificationsAcrossAllDebates && expectedGate.spearmanRankCorrelationPassed;
same(scores.reliabilityGate, expectedGate, "score reliability gate");
assertV3811(scores.population.debates === 3 && scores.population.sides === 6 && scores.population.sections === 15 && scores.population.moves === 81 && movesChecked === 81 && sectionsChecked === 15, "calculator validation coverage invalid");
const materialScalarDeltas = rawScalarDeltas.filter((value) => value > 5);
const scalarReliability = { fieldsCompared: rawScalarDeltas.length, meanAbsoluteRawScalarDelta: fixed(rawScalarDeltas.reduce((sum, value) => sum + value, 0) / rawScalarDeltas.length, 6), materiallyDisputedScalarFields: materialScalarDeltas.length, materiallyDisputedScalarFieldRate: fixed(materialScalarDeltas.length / rawScalarDeltas.length, 6), maximumRawScalarDelta: Math.max(...rawScalarDeltas), formalMaximum: 0.25, heldOutAuthorizationMaximum: 0.23 };
scalarReliability.formalPassed = scalarReliability.materiallyDisputedScalarFieldRate <= scalarReliability.formalMaximum;
scalarReliability.heldOutAuthorizationPassed = scalarReliability.materiallyDisputedScalarFieldRate <= scalarReliability.heldOutAuthorizationMaximum;
const gatePassed = expectedGate.passed && scalarReliability.formalPassed;
const validationPath = `${V3811_PERFORMANCE_ROOT}/calculated-scores-validation.json`;
const scoresPath = `${V3811_PERFORMANCE_ROOT}/calculated-scores.json`;
const validation = { schemaVersion: "3.8.11-performance-calculated-scores-validation", protocolId: "v3.8.11-performance-judgment-consensus", status: gatePassed ? "passed" : "failed-reliability-gate", calculatorValidated: true, scoresPath, scoresSha256: createHash("sha256").update(await readFile(path.resolve(root, scoresPath))).digest("hex"), debates: 3, sides: 6, sectionsChecked, movesChecked, scoreReliability: expectedGate, scalarReliability, gatePassed, authorization: { reconstructionPreparation: gatePassed, assessmentProseModelExecution: false, heldOutGate: gatePassed && scalarReliability.heldOutAuthorizationPassed, all195Debates: false } };
await writeFile(path.resolve(root, validationPath), `${JSON.stringify(validation, null, 2)}\n`);
console.log(JSON.stringify(validation, null, 2));
if (!gatePassed) process.exitCode = 1;
