#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { validateV4221175AdjudicationOutput } from "./lib/v4221175-decomposed-adjudication.mjs";

const shouldWrite = process.argv.includes("--write");
const root = "docs/calibration/v4.2.21.17.5/dispute-only-adjudication";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [manifest, execution, preparation] = await Promise.all(["execution-manifest.json", "model-execution.json", "preparation-manifest.json"].map((file) => readFile(`${root}/${file}`, "utf8").then(JSON.parse)));
assertV4(manifest.status === "frozen-three-isolated-dispute-only-adjudication-contexts-authorized" && execution.contextsAttempted === 3 && execution.retries === 0, "adjudication execution is unavailable");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(file)) === digest, `source hash mismatch during adjudication analysis: ${file}`);
const contexts = [];
for (const context of manifest.contexts) {
  const result = execution.results.find((item) => item.debateNumber === context.debateNumber);
  let replay = null;
  if (result.gateAcceptancePassed) {
    replay = validateV4221175AdjudicationOutput(JSON.parse(await readFile(context.output, "utf8")), JSON.parse(await readFile(context.packet, "utf8")));
    assertV4(replay.status === "passed" && sha256(await readFile(context.output)) === result.outputSha256, `${context.debateNumber}: adjudication replay mismatch`);
  }
  contexts.push({ debateNumber: context.debateNumber, debateId: context.debateId, status: result.status, accepted: result.gateAcceptancePassed, elapsedMinutes: Number((result.elapsedMs / 60000).toFixed(2)), validationReplayed: replay?.status === "passed", disputedMoves: replay?.disputedMoves ?? null, candidateSelections: replay?.candidateSelections ?? null, audioTranscriptInputs: result.audioTranscriptInputs.length, calculatedScores: replay?.calculatedScores ?? null });
}
const valid = contexts.filter((context) => context.accepted);
const maximumElapsedMinutes = valid.length ? Math.max(...valid.map((context) => context.elapsedMinutes)) : null;
const meanElapsedMinutes = valid.length ? Number((valid.reduce((sum, context) => sum + context.elapsedMinutes, 0) / valid.length).toFixed(2)) : null;
const semanticPass = valid.length === 3 && valid.reduce((sum, context) => sum + context.candidateSelections, 0) === preparation.totals.candidateSelections && valid.reduce((sum, context) => sum + context.disputedMoves, 0) === preparation.totals.disputedMoves;
const timingPass = semanticPass && maximumElapsedMinutes <= manifest.executionPolicy.maximumMinutesPerContext && meanElapsedMinutes <= manifest.executionPolicy.maximumMeanMinutes;
const scoreBlindPass = semanticPass && contexts.every((context) => context.calculatedScores === 0);
const passed = semanticPass && timingPass && scoreBlindPass;
const analysis = {
  schemaVersion: "4.2.21.17.5-dispute-only-adjudication-analysis",
  protocolId: manifest.protocolId,
  status: passed ? "partition-dispute-only-adjudication-gate-passed" : semanticPass ? timingPass ? "partition-adjudication-gate-failed-scoreblindness" : "partition-adjudication-gate-failed-timing" : "partition-adjudication-gate-failed-validation",
  calibrationOnly: true,
  AIOnly: true,
  contexts,
  gate: { semanticPass, timingPass, scoreBlindPass, validContexts: valid.length, requiredValidContexts: 3, disputedMovesDecided: valid.reduce((sum, context) => sum + context.disputedMoves, 0), requiredDisputedMoves: preparation.totals.disputedMoves, candidateSelections: valid.reduce((sum, context) => sum + context.candidateSelections, 0), requiredCandidateSelections: preparation.totals.candidateSelections, maximumElapsedMinutes, maximumAllowedMinutesPerContext: manifest.executionPolicy.maximumMinutesPerContext, meanElapsedMinutes, maximumAllowedMeanMinutes: manifest.executionPolicy.maximumMeanMinutes, retries: 0, corrections: 0, scoresDerived: 0 },
  evidenceBoundary: { provenanceFilesUnavailableToModel: true, passIdentitiesUnavailable: true, initialRationalesUnavailable: true, nondisputedFieldsUnavailable: true, verifiedAudioTranscriptsSuppliedOnlyWhereRequired: true, audioTranscriptInputs: contexts.reduce((sum, context) => sum + context.audioTranscriptInputs, 0), candidateValuesInvented: 0, calculatedScores: 0 },
  totals: { modelContexts: execution.contextsAttempted, retries: 0, corrections: 0, scoresDerived: 0, meteredApiCostUsd: 0, transcriptionCostUsdThisStage: 0 },
  authorization: { finalLedgerAssembly: passed, scoreDerivation: false, publicationFinalization: false, productionMutation: false, all195Debates: false }
};
if (shouldWrite) await writeFile(manifest.artifacts.analysis, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, validContexts: valid.length, disputedMovesDecided: analysis.gate.disputedMovesDecided, candidateSelections: analysis.gate.candidateSelections, timings: { byDebate: Object.fromEntries(contexts.map((context) => [context.debateNumber, context.elapsedMinutes])), maximumElapsedMinutes, meanElapsedMinutes, passed: timingPass }, audioTranscriptInputs: analysis.evidenceBoundary.audioTranscriptInputs, scoresDerived: 0, meteredApiCostUsd: 0, nextAuthorized: passed ? "final-ledger-assembly" : "failure-diagnosis-only" }, null, 2));
