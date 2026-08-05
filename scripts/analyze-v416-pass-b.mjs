#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { V41_LEAN_ROOT, assertV4, readJson } from "./lib/v41-lean-production.mjs";
import { V416_PASS_B_ROOT, evaluateV416PassBTiming, validateV416PassBOutput } from "./lib/v416-triggered-consensus.mjs";

const shouldWrite = process.argv.includes("--write");
const [preparation, execution, primaryAnalysis] = await Promise.all([readJson(`${V416_PASS_B_ROOT}/preparation-manifest.json`), readJson(`${V416_PASS_B_ROOT}/model-execution.json`), readJson(`${V41_LEAN_ROOT}/primary-analysis.json`)]);
assertV4(execution.status.startsWith("pass-b-execution-passed") && execution.validContexts === 3 && execution.retries === 0 && execution.authorization.passBAnalysis, "valid v4.1.6 Pass B execution unavailable");
const debates = [];
for (const context of preparation.contexts) {
  const [output, packet, sourcePacket] = await Promise.all([readJson(context.output), readJson(context.packet), readJson(context.sourcePacket)]);
  const validation = validateV416PassBOutput(output, packet, sourcePacket);
  debates.push({ debateNumber: context.debateNumber, debateId: context.debateId, output: context.output, validation, pendingAudioMoveIds: validation.mediumOrLowAttributionMoves });
}
const runtime = evaluateV416PassBTiming(execution.results, primaryAnalysis.runtime);
const pendingAudioMoves = debates.flatMap((debate) => debate.pendingAudioMoveIds.map((moveId) => ({ debateNumber: debate.debateNumber, moveId })));
const status = !runtime.runtimePassed ? "pass-b-failed-runtime-budget" : pendingAudioMoves.length > 0 ? "pass-b-passed-audio-verification-required" : "pass-b-passed-ready-for-disagreement-extraction";
const analysis = {
  schemaVersion: "4.1.6-triggered-pass-b-analysis",
  protocolId: "v4.1.6-triggered-pass-b-consensus",
  status,
  debates,
  runtime,
  totals: { debates: 3, validPassBContexts: 3, moves: debates.reduce((sum, item) => sum + item.validation.moves, 0), pendingAudioMoves: pendingAudioMoves.length, attempts: execution.attempts, retries: execution.retries, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  pendingAudioMoves,
  authorization: { audioVerification: runtime.runtimePassed && pendingAudioMoves.length > 0, disagreementExtraction: runtime.runtimePassed && pendingAudioMoves.length === 0, adjudicationModelExecution: false, scoreDerivation: false, publicationFinalization: false, productionMutation: false, heldOutGate: false, all195Debates: false }
};
if (shouldWrite) await writeFile(path.resolve(V416_PASS_B_ROOT, "analysis.json"), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status, debates: 3, moves: analysis.totals.moves, pendingAudioMoves: pendingAudioMoves.length, wallPassBMinutesPerDebate: runtime.wallPassBMinutesPerDebate, computePassBMinutesPerDebate: runtime.computePassBMinutesPerDebate, conservativePassBMinutesPerDebate: runtime.conservativePassBMinutesPerDebate, transportCleanContexts: runtime.transportCleanContexts, recoveredTransportContexts: runtime.recoveredTransportContexts, projected195HoursCentral: runtime.centralProjection.hours.total, projected195HoursConservative: runtime.conservativeProjection.hours.total, disagreementExtractionAuthorized: analysis.authorization.disagreementExtraction, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, null, 2));
