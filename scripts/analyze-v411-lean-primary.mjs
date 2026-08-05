#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { V41_LEAN_ROOT, assertV4, deriveV41PrimaryScores, evaluateV415Timing, evaluateV41Escalation, readJson, validateV41PrimaryOutput } from "./lib/v41-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const [preparation, execution, comparatorSource] = await Promise.all([readJson(`${V41_LEAN_ROOT}/preparation-manifest.json`), readJson(`${V41_LEAN_ROOT}/primary-model-execution.json`), readJson("docs/calibration/v3.8.11/performance-judgment-consensus/calculated-scores.json")]);
assertV4(execution.status === "primary-execution-passed" && execution.validContexts === 3 && execution.retries === 0, "clean primary execution unavailable");
const comparatorByDebate = new Map(comparatorSource.debates.map((debate) => [debate.debateNumber, debate]));
const debates = [];
for (const item of preparation.debates) {
  const [packet, primary] = await Promise.all([readJson(item.packet), readJson(item.output)]);
  const validation = validateV41PrimaryOutput(primary, packet);
  const scores = deriveV41PrimaryScores(primary);
  const unresolvedAudioMoveIds = primary.sections.flatMap((section) => [...section.proMoves, ...section.conMoves]).filter((move) => move.attributionConfidence !== "high").map((move) => move.moveId);
  const escalation = evaluateV41Escalation({ primary, scores, controlSampleSelected: item.controlSampleSelected, unresolvedAudioMoveIds });
  const comparator = comparatorByDebate.get(item.debateNumber);
  assertV4(comparator, `${item.debateNumber}: comparator unavailable`);
  const expected = { pro: comparator.overall.pro.final.score, con: comparator.overall.con.final.score };
  const expectedWinner = expected.pro === expected.con ? "tie" : expected.pro > expected.con ? "pro" : "con";
  const deltas = { pro: scores.overall.pro.score - expected.pro, con: scores.overall.con.score - expected.con };
  const comparatorResult = { expected, actual: { pro: scores.overall.pro.score, con: scores.overall.con.score }, deltas, maximumAbsoluteDelta: Math.max(Math.abs(deltas.pro), Math.abs(deltas.con)), expectedWinner, actualWinner: scores.winner, winnerPreserved: scores.winner === expectedWinner, bothSidesWithinFive: Math.abs(deltas.pro) <= 5 && Math.abs(deltas.con) <= 5 };
  debates.push({ debateNumber: item.debateNumber, debateId: item.debateId, validation, provisionalScores: scores, controlSampleSelected: item.controlSampleSelected, escalation, comparator: comparatorResult, primaryOutput: item.output });
}
const runtime = evaluateV415Timing(execution.results);
const { centralProjection, conservativeProjection, runtimePassed } = runtime;
const pendingAudioMoves = debates.reduce((sum, debate) => sum + debate.escalation.audioVerificationMoveIds.length, 0);
const escalatedDebates = debates.filter((debate) => debate.escalation.requiresSecondPass).length;
const provisionalComparatorPassed = debates.every((debate) => debate.comparator.winnerPreserved && debate.comparator.bothSidesWithinFive);
const status = !runtimePassed ? "primary-failed-runtime-budget" : pendingAudioMoves > 0 ? "primary-passed-audio-verification-required" : "primary-passed-ready-to-freeze-triggered-pass-b";
const analysis = {
  schemaVersion: "4.1.5-bounded-primary-analysis",
  protocolId: "v4.1.5-bounded-lean-risk-triggered-consensus",
  status,
  debates,
  totals: { debates: 3, validPrimaryContexts: 3, sections: debates.reduce((sum, debate) => sum + debate.validation.sections, 0), moves: debates.reduce((sum, debate) => sum + debate.validation.moves, 0), escalatedDebates, escalationRate: escalatedDebates / debates.length, pendingAudioMoves, provisionalComparatorPassed, winnerClassificationsPreserved: debates.filter((debate) => debate.comparator.winnerPreserved).length, sidesWithinFive: debates.reduce((sum, debate) => sum + ["pro", "con"].filter((side) => Math.abs(debate.comparator.deltas[side]) <= 5).length, 0), attempts: 3, retries: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  runtime,
  authorization: { audioVerificationPreparation: runtimePassed && pendingAudioMoves > 0, passBPacketPreparation: runtimePassed && pendingAudioMoves === 0, passBModelExecution: false, adjudicationModelExecution: false, comparatorFinalAcceptance: false, reconstruction: false, productionMutation: false, all195Debates: false }
};
if (shouldWrite) await writeFile(path.resolve(V41_LEAN_ROOT, "primary-analysis.json"), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status, debates: 3, moves: analysis.totals.moves, sections: analysis.totals.sections, escalatedDebates, pendingAudioMoves, wallPrimaryMinutesPerDebate: analysis.runtime.wallPrimaryMinutesPerDebate, computePrimaryMinutesPerDebate: analysis.runtime.computePrimaryMinutesPerDebate, transportCleanContexts: analysis.runtime.transportCleanContexts, recoveredTransportContexts: analysis.runtime.recoveredTransportContexts, projected195HoursCentral: centralProjection.hours.total, projected195HoursConservative: conservativeProjection.hours.total, winnerClassificationsPreserved: analysis.totals.winnerClassificationsPreserved, sidesWithinFive: analysis.totals.sidesWithinFive, provisionalComparatorPassed, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, null, 2));
