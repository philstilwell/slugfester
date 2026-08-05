#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, canonicalJson } from "./lib/v41-lean-production.mjs";
import { V419_ROOT, compileV419PrimaryOutput, deriveV419PrimaryScores, evaluateV419Escalation, evaluateV419PrimaryTiming, validateV419PrimaryOutput } from "./lib/v419-schema-bounded-source.mjs";

const shouldWrite = process.argv.includes("--write");
const [preparation, execution] = await Promise.all([readFile(path.resolve(V419_ROOT, "preparation-manifest.json"), "utf8").then(JSON.parse), readFile(path.resolve(V419_ROOT, "primary-model-execution.json"), "utf8").then(JSON.parse)]);
assertV4(execution.status === "primary-execution-passed" && execution.validContexts === 6 && execution.compiledOutputs === 6 && execution.retries === 0 && execution.authorization.primaryAnalysis, "clean v4.1.9 primary execution unavailable");
const debates = [];
for (const item of preparation.debates) {
  const packet = JSON.parse(await readFile(item.packet, "utf8"));
  const [rawPrimary, compiledPrimary, eventsBytes] = await Promise.all([readFile(item.rawOutput, "utf8").then(JSON.parse), readFile(item.compiledOutput, "utf8").then(JSON.parse), readFile(packet.sourceChain.eventsPath)]);
  const eventsDocument = JSON.parse(eventsBytes);
  const validation = validateV419PrimaryOutput(rawPrimary, packet, eventsDocument, eventsBytes);
  const replayCompiled = compileV419PrimaryOutput(rawPrimary, packet, eventsDocument);
  assertV4(canonicalJson(replayCompiled) === canonicalJson(compiledPrimary), `${item.debateNumber}: compiled primary replay mismatch`);
  const triggerScores = deriveV419PrimaryScores(compiledPrimary);
  const moves = compiledPrimary.sections.flatMap((section) => [...section.proMoves, ...section.conMoves]);
  const audioVerificationMoveIds = moves.filter((move) => move.attributionConfidence !== "high").map((move) => move.moveId);
  const escalation = evaluateV419Escalation({ primary: compiledPrimary, scores: triggerScores, controlSampleSelected: item.controlSampleSelected, unresolvedAudioMoveIds: [] });
  debates.push({ debateNumber: item.debateNumber, debateId: item.debateId, family: item.family, durationSeconds: item.durationSeconds, validation, deterministicCompilationReplayPassed: true, controlSampleSelected: item.controlSampleSelected, escalation: { ...escalation, triggerScoresWithheldFromArtifacts: true }, audioVerificationMoveIds, rawPrimaryOutput: item.rawOutput, compiledPrimaryOutput: item.compiledOutput });
}
const runtime = evaluateV419PrimaryTiming(execution.results);
const pendingAudioMoves = debates.reduce((sum, debate) => sum + debate.audioVerificationMoveIds.length, 0);
const escalatedDebates = debates.filter((debate) => debate.escalation.requiresSecondPass).length;
const status = !runtime.runtimePassed ? "primary-failed-runtime-budget" : pendingAudioMoves > 0 ? "primary-passed-audio-verification-required" : "primary-passed-pass-b-preparation-authorized";
const analysis = {
  schemaVersion: "4.1.9-schema-bounded-primary-analysis",
  protocolId: "v4.1.9-schema-bounded-source-fresh-six-validation",
  status,
  legacyBoundary: { legacyAssessmentContentAccessed: false, legacyScoresAccessed: false, legacyWinnersAccessed: false, scoreArtifactCreated: false, priorFreshGateJudgmentsReused: false },
  sourceIntegrityBoundary: { eventFileHashesVerified: 6, eventAwareValidatedContexts: 6, schemaBoundedExcerptContexts: 6, deterministicTimeCompilationsReplayed: 6, modelSuppliedMillisecondsAccepted: false },
  debates,
  runtime,
  totals: { debates: 6, validPrimaryContexts: 6, sections: debates.reduce((sum, debate) => sum + debate.validation.sections, 0), moves: debates.reduce((sum, debate) => sum + debate.validation.moves, 0), escalatedDebates, observedEscalationRate: escalatedDebates / 6, pendingAudioMoves, attempts: execution.attempts, retries: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  authorization: { audioVerificationPreparation: runtime.runtimePassed && pendingAudioMoves > 0, passBPacketPreparation: runtime.runtimePassed && pendingAudioMoves === 0, paidTranscription: false, passBModelExecution: false, compressionAuditModelExecution: false, finalLedgerAssembly: false, scoreDerivation: false, legacyComparison: false, productionMutation: false, heldOutGate: false, all195Debates: false }
};
if (shouldWrite) await writeFile(path.resolve(V419_ROOT, "primary-analysis.json"), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status, debates: 6, sections: analysis.totals.sections, moves: analysis.totals.moves, eventAwareValidatedContexts: 6, schemaBoundedExcerptContexts: 6, deterministicTimeCompilationsReplayed: 6, escalatedDebates, observedEscalationRate: Number(analysis.totals.observedEscalationRate.toFixed(3)), pendingAudioMoves, computePrimaryMinutesPerDebate: runtime.computePrimaryMinutesPerDebate, conservativePrimaryMinutesPerDebate: runtime.conservativePrimaryMinutesPerDebate, projected195HoursCentral: runtime.centralProjection.hours.total, projected195HoursConservative: runtime.conservativeProjection.hours.total, scoreArtifactCreated: false, legacyComparisonAuthorized: false, meteredApiCostUsd: 0 }, null, 2));
