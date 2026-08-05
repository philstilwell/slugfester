#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { V4_LEAN_ROOT, assertV4, deriveV4PrimaryScores, evaluateV4Escalation, projectV4ComputeHours, readJson, validateV4PrimaryOutput } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const [preparation, execution] = await Promise.all([readJson(`${V4_LEAN_ROOT}/preparation-manifest.json`), readJson(`${V4_LEAN_ROOT}/primary-model-execution.json`)]);
assertV4(execution.status === "primary-execution-passed" && execution.validContexts === 3 && execution.retries === 0, "clean primary execution unavailable");
const debates = [];
for (const item of preparation.debates) {
  const [packet, primary] = await Promise.all([readJson(item.packet), readJson(item.output)]);
  const validation = validateV4PrimaryOutput(primary, packet);
  const scores = deriveV4PrimaryScores(primary);
  const unresolvedAudioMoveIds = primary.moves.filter((move) => move.attributionConfidence !== "high").map((move) => move.moveId);
  const escalation = evaluateV4Escalation({ primary, scores, controlSampleSelected: item.controlSampleSelected, unresolvedAudioMoveIds });
  debates.push({ debateNumber: item.debateNumber, debateId: item.debateId, validation, provisionalScores: scores, controlSampleSelected: item.controlSampleSelected, escalation, primaryOutput: item.output });
}
const actualPrimaryMinutesPerDebate = execution.totalElapsedMs / 60000 / debates.length;
const computeProjection = projectV4ComputeHours({ primaryMinutesPerDebate: actualPrimaryMinutesPerDebate });
const pendingAudioMoves = debates.reduce((sum, debate) => sum + debate.escalation.audioVerificationMoveIds.length, 0);
const escalatedDebates = debates.filter((debate) => debate.escalation.requiresSecondPass).length;
const analysis = {
  schemaVersion: "4.0.1-lean-primary-analysis",
  protocolId: "v4.0.1-lean-risk-triggered-consensus",
  status: pendingAudioMoves === 0 ? "primary-passed-ready-to-freeze-triggered-pass-b" : "primary-passed-audio-verification-required",
  debates,
  totals: { debates: 3, validPrimaryContexts: 3, sections: debates.reduce((sum, debate) => sum + debate.validation.sections, 0), moves: debates.reduce((sum, debate) => sum + debate.validation.moves, 0), escalatedDebates, escalationRate: escalatedDebates / debates.length, pendingAudioMoves, attempts: 3, retries: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  runtime: { actualPrimaryMinutesPerDebate: Number(actualPrimaryMinutesPerDebate.toFixed(2)), computeProjection },
  authorization: { audioVerificationPreparation: pendingAudioMoves > 0, passBPacketPreparation: pendingAudioMoves === 0, passBModelExecution: false, adjudicationModelExecution: false, comparatorAccess: false, reconstruction: false, productionMutation: false, all195Debates: false }
};
if (shouldWrite) await writeFile(path.resolve(V4_LEAN_ROOT, "primary-analysis.json"), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, debates: 3, moves: analysis.totals.moves, sections: analysis.totals.sections, escalatedDebates, pendingAudioMoves, actualPrimaryMinutesPerDebate: analysis.runtime.actualPrimaryMinutesPerDebate, projected195Hours: computeProjection.hours.total, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, null, 2));
