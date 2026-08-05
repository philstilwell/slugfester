#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, readJson } from "./lib/v41-lean-production.mjs";
import { V417_ROOT } from "./lib/v417-fresh-validation.mjs";
import { V417_PASS_B_PROTOCOL_ID, V417_PASS_B_ROOT, evaluateV417PassBTiming, validateV417PassBOutput } from "./lib/v417-triggered-consensus.mjs";

const shouldWrite = process.argv.includes("--write");
const [preparation, execution, primaryAnalysis] = await Promise.all([
  readJson(`${V417_PASS_B_ROOT}/preparation-manifest.json`),
  readJson(`${V417_PASS_B_ROOT}/model-execution.json`),
  readJson(`${V417_ROOT}/primary-analysis.json`)
]);
assertV4(execution.status.startsWith("pass-b-execution-passed") && execution.validContexts === 5 && execution.retries === 0 && execution.authorization.passBAnalysis, "valid v4.1.7 Pass B execution unavailable");
const debates = [];
for (const context of preparation.contexts) {
  const [output, packet, sourcePacket] = await Promise.all([readJson(context.output), readJson(context.packet), readJson(context.sourcePacket)]);
  const validation = validateV417PassBOutput(output, packet, sourcePacket);
  debates.push({ debateNumber: context.debateNumber, debateId: context.debateId, family: context.family, output: context.output, validation, pendingAudioMoveIds: validation.mediumOrLowAttributionMoves });
}
const runtime = evaluateV417PassBTiming(execution.results, primaryAnalysis.runtime);
const pendingAudioMoves = debates.flatMap((debate) => debate.pendingAudioMoveIds.map((moveId) => ({ debateNumber: debate.debateNumber, moveId })));
const status = !runtime.runtimePassed ? "pass-b-failed-runtime-budget" : pendingAudioMoves.length > 0 ? "pass-b-passed-audio-verification-required" : "pass-b-passed-ready-for-disagreement-extraction";
const analysis = {
  schemaVersion: "4.1.7-fresh-six-triggered-pass-b-analysis",
  protocolId: V417_PASS_B_PROTOCOL_ID,
  status,
  legacyBoundary: { legacyAssessmentContentAccessed: false, legacyScoresAccessed: false, legacyWinnersAccessed: false, scoreArtifactCreated: false },
  debates,
  runtime,
  totals: { debates: 5, validPassBContexts: 5, moves: debates.reduce((sum, item) => sum + item.validation.moves, 0), pendingAudioMoves: pendingAudioMoves.length, attempts: execution.attempts, retries: execution.retries, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  pendingAudioMoves,
  authorization: { audioVerification: runtime.runtimePassed && pendingAudioMoves.length > 0, disagreementExtraction: runtime.runtimePassed && pendingAudioMoves.length === 0, adjudicationModelExecution: false, compressionAuditModelExecution: false, scoreDerivation: false, legacyComparison: false, publicationFinalization: false, productionMutation: false, heldOutGate: false, all195Debates: false }
};
if (shouldWrite) await writeFile(path.resolve(V417_PASS_B_ROOT, "analysis.json"), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status, debates: 5, moves: analysis.totals.moves, pendingAudioMoves: pendingAudioMoves.length, wallPassBMinutesPerDebate: runtime.wallPassBMinutesPerDebate, computePassBMinutesPerDebate: runtime.computePassBMinutesPerDebate, conservativePassBMinutesPerDebate: runtime.conservativePassBMinutesPerDebate, transportCleanContexts: runtime.transportCleanContexts, recoveredTransportContexts: runtime.recoveredTransportContexts, projected195HoursCentral: runtime.centralProjection.hours.total, projected195HoursConservative: runtime.conservativeProjection.hours.total, legacyAccessed: false, disagreementExtractionAuthorized: analysis.authorization.disagreementExtraction, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, null, 2));
