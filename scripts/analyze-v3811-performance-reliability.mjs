#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V3811_PERFORMANCE_DEBATES, V3811_PERFORMANCE_ROOT, V3811_RATING_KEYS, assertV3811 } from "./lib/v3811-performance-judgment.mjs";

const root = process.cwd();
const readJson = async (relativePath) => JSON.parse(await readFile(path.resolve(root, relativePath), "utf8"));
const fixed = (value, places = 6) => Number(value.toFixed(places));
const summarize = (records) => {
  const deltas = records.map((item) => item.delta);
  const material = records.filter((item) => item.delta > 5);
  return {
    fields: records.length,
    meanAbsoluteDelta: fixed(deltas.reduce((sum, value) => sum + value, 0) / deltas.length),
    materialFields: material.length,
    materialRate: fixed(material.length / records.length),
    maximumDelta: Math.max(...deltas),
  };
};

const disagreements = await readJson(`${V3811_PERFORMANCE_ROOT}/initial-disagreements.json`);
const scores = await readJson(`${V3811_PERFORMANCE_ROOT}/calculated-scores.json`);
const validation = await readJson(`${V3811_PERFORMANCE_ROOT}/calculated-scores-validation.json`);
assertV3811(validation.status === "failed-reliability-gate" && !validation.authorization.reconstructionPreparation, "reliability diagnostics require the preserved failed gate");

const records = [];
for (const debateNumber of V3811_PERFORMANCE_DEBATES) {
  const [passA, passB] = await Promise.all([
    readJson(`${V3811_PERFORMANCE_ROOT}/initial-outputs/debate-${debateNumber}-pass-a.json`),
    readJson(`${V3811_PERFORMANCE_ROOT}/initial-outputs/debate-${debateNumber}-pass-b.json`),
  ]);
  for (let index = 0; index < passA.moveJudgments.length; index += 1) {
    const moveA = passA.moveJudgments[index];
    const moveB = passB.moveJudgments[index];
    assertV3811(moveA.moveId === moveB.moveId, `${debateNumber}:${index}: move mismatch`);
    for (const ratingKey of V3811_RATING_KEYS) records.push({ debateNumber, moveId: moveA.moveId, sectionId: moveA.sectionId, side: moveA.side, speaker: moveA.speaker, ratingKey, passA: moveA.ratings[ratingKey].value, passB: moveB.ratings[ratingKey].value, delta: Math.abs(moveA.ratings[ratingKey].value - moveB.ratings[ratingKey].value) });
  }
}

const byDimension = Object.fromEntries(V3811_RATING_KEYS.map((key) => [key, summarize(records.filter((item) => item.ratingKey === key))]));
const byDebate = Object.fromEntries(V3811_PERFORMANCE_DEBATES.map((debateNumber) => {
  const dispute = disagreements.debates.find((item) => item.debateNumber === debateNumber);
  return [debateNumber, { ...summarize(records.filter((item) => item.debateNumber === debateNumber)), moves: dispute.moveCount, disputedMoves: dispute.disputedMoveCount, responseTupleDisputes: dispute.responseTupleDisputeCount, charityTestedDisputes: dispute.charityTestedDisputeCount, ratingFieldDisputes: dispute.ratingFieldDisputeCount }];
}));

const sideTotals = scores.debates.flatMap((debate) => ["pro", "con"].map((side) => ({ debateNumber: debate.debateNumber, side, passA: debate.overall[side].passA.score, passB: debate.overall[side].passB.score, final: debate.overall[side].final.score, absolutePassDelta: debate.overall[side].diagnosticPassDelta })));
const rankOrder = (key) => [...sideTotals].sort((a, b) => b[key] - a[key] || Number(a.debateNumber) - Number(b.debateNumber) || a.side.localeCompare(b.side)).map((item, index) => ({ rank: index + 1, debateNumber: item.debateNumber, side: item.side, score: item[key] }));
const topMaterialFields = records.filter((item) => item.delta > 5).sort((a, b) => b.delta - a.delta || Number(a.debateNumber) - Number(b.debateNumber) || a.moveId.localeCompare(b.moveId) || a.ratingKey.localeCompare(b.ratingKey)).slice(0, 30);

const output = {
  schemaVersion: "3.8.11-performance-reliability-diagnostics",
  protocolId: "v3.8.11-performance-judgment-consensus",
  status: "failed-gate-diagnosed",
  overall: validation.scalarReliability,
  scoreReliability: validation.scoreReliability,
  byDimension,
  byDebate,
  sideTotals,
  rankOrders: { passA: rankOrder("passA"), passB: rankOrder("passB"), final: rankOrder("final") },
  topMaterialFields,
  authorization: { reviseAnchors: true, rerunRetiredGate: true, reconstructionPreparation: false, heldOutGate: false, all195Debates: false },
};
await writeFile(path.resolve(root, `${V3811_PERFORMANCE_ROOT}/reliability-diagnostics.json`), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ status: output.status, byDimension, byDebate, sideTotals, authorization: output.authorization }, null, 2));
