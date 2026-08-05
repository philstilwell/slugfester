#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, readJson } from "./lib/v41-lean-production.mjs";
import { deriveV417PrimaryScores, evaluateV417Escalation, evaluateV417PrimaryTiming, validateV417PrimaryOutput, V417_ROOT } from "./lib/v417-fresh-validation.mjs";

const shouldWrite = process.argv.includes("--write");
const [preparation, execution] = await Promise.all([readJson(`${V417_ROOT}/preparation-manifest.json`), readJson(`${V417_ROOT}/primary-model-execution.json`)]);
assertV4(execution.status === "primary-execution-passed" && execution.validContexts === 6 && execution.retries === 0 && execution.authorization.primaryAnalysis, "clean fresh-six primary execution unavailable");
const debates = [];
for (const item of preparation.debates) {
  const [packet, primary] = await Promise.all([readJson(item.packet), readJson(item.output)]);
  const validation = validateV417PrimaryOutput(primary, packet);
  const triggerScores = deriveV417PrimaryScores(primary);
  const audioVerificationMoveIds = primary.sections.flatMap((section) => [...section.proMoves, ...section.conMoves]).filter((move) => move.attributionConfidence !== "high").map((move) => move.moveId);
  const escalation = evaluateV417Escalation({ primary, scores: triggerScores, controlSampleSelected: item.controlSampleSelected, unresolvedAudioMoveIds: [] });
  debates.push({ debateNumber: item.debateNumber, debateId: item.debateId, family: item.family, durationSeconds: item.durationSeconds, validation, controlSampleSelected: item.controlSampleSelected, escalation: { ...escalation, triggerScoresWithheldFromArtifacts: true }, audioVerificationMoveIds, primaryOutput: item.output });
}
const runtime = evaluateV417PrimaryTiming(execution.results);
const pendingAudioMoves = debates.reduce((sum, debate) => sum + debate.audioVerificationMoveIds.length, 0);
const escalatedDebates = debates.filter((debate) => debate.escalation.requiresSecondPass).length;
const status = !runtime.runtimePassed ? "primary-failed-runtime-budget" : pendingAudioMoves > 0 ? "primary-passed-audio-verification-required" : "primary-passed-pass-b-preparation-authorized";
const analysis = {
  schemaVersion: "4.1.7-fresh-six-primary-analysis",
  protocolId: "v4.1.7-fresh-six-validation",
  status,
  legacyBoundary: { legacyAssessmentContentAccessed: false, legacyScoresAccessed: false, legacyWinnersAccessed: false, scoreArtifactCreated: false },
  debates,
  runtime,
  totals: { debates: 6, validPrimaryContexts: 6, sections: debates.reduce((sum, debate) => sum + debate.validation.sections, 0), moves: debates.reduce((sum, debate) => sum + debate.validation.moves, 0), escalatedDebates, observedEscalationRate: escalatedDebates / 6, pendingAudioMoves, attempts: execution.attempts, retries: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  authorization: { audioVerificationPreparation: runtime.runtimePassed && pendingAudioMoves > 0, passBPacketPreparation: runtime.runtimePassed && pendingAudioMoves === 0, paidTranscription: false, passBModelExecution: false, compressionAuditModelExecution: false, finalLedgerAssembly: false, scoreDerivation: false, legacyComparison: false, productionMutation: false, heldOutGate: false, all195Debates: false }
};
if (shouldWrite) await writeFile(path.resolve(V417_ROOT, "primary-analysis.json"), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status, debates: 6, sections: analysis.totals.sections, moves: analysis.totals.moves, escalatedDebates, observedEscalationRate: Number(analysis.totals.observedEscalationRate.toFixed(3)), pendingAudioMoves, computePrimaryMinutesPerDebate: runtime.computePrimaryMinutesPerDebate, conservativePrimaryMinutesPerDebate: runtime.conservativePrimaryMinutesPerDebate, projected195HoursCentral: runtime.centralProjection.hours.total, projected195HoursConservative: runtime.conservativeProjection.hours.total, scoreArtifactCreated: false, legacyComparisonAuthorized: false, meteredApiCostUsd: 0 }, null, 2));
