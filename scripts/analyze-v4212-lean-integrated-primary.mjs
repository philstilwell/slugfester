#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { assertV4, canonicalJson } from "./lib/v41-lean-production.mjs";
import { evaluateV426PrimaryTiming } from "./lib/v426-retired-completion.mjs";
import { compileAndValidateV4212, V4212_ROOT } from "./lib/v4212-lean-integrated-primary.mjs";

const shouldWrite = process.argv.includes("--write");
const [manifest, execution, baseline, baselineExecution, discoveryAnalysis, anchorExecution, priorExecution, continuationExecution, correctionExecution] = await Promise.all([
  readFile(`${V4212_ROOT}/execution-manifest.json`, "utf8").then(JSON.parse),
  readFile(`${V4212_ROOT}/model-execution.json`, "utf8").then(JSON.parse),
  readFile("docs/calibration/v4.2.10/integrated-long-context-primary/analysis.json", "utf8").then(JSON.parse),
  readFile("docs/calibration/v4.2.10/integrated-long-context-primary/model-execution.json", "utf8").then(JSON.parse),
  readFile("docs/calibration/v4.2.9.2/adaptive-long-context-continuation/analysis.json", "utf8").then(JSON.parse),
  readFile("docs/calibration/v4.2.5/conservative-excerpt-smoke/model-execution.json", "utf8").then(JSON.parse),
  readFile("docs/calibration/v4.2.6/conservative-excerpt-retired-completion/model-execution.json", "utf8").then(JSON.parse),
  readFile("docs/calibration/v4.2.8/correction-aware-retired-continuation/model-execution.json", "utf8").then(JSON.parse),
  readFile("docs/calibration/v4.2.11/lean-structural-correction/model-execution.json", "utf8").then(JSON.parse)
]);
assertV4(execution.authorization.analysis, "v4.2.12 analysis unauthorized");
let validation = null, compilerReplayPassed = false, selectedCandidateProvenancePassed = false;
if (execution.result.accepted) {
  const [proposal, output, compiled, bundle, packet, eventsBytes, ledgerBytes] = await Promise.all([readFile(manifest.outputs.proposal, "utf8").then(JSON.parse), readFile(manifest.outputs.primary, "utf8").then(JSON.parse), readFile(manifest.outputs.compiled, "utf8").then(JSON.parse), readFile(manifest.inputs.candidateBundle, "utf8").then(JSON.parse), readFile(manifest.inputs.packet, "utf8").then(JSON.parse), readFile(manifest.source.originalEvents), readFile(manifest.source.fullLedger)]);
  const replay = compileAndValidateV4212(proposal, bundle, packet, JSON.parse(eventsBytes), eventsBytes, ledgerBytes);
  assertV4(canonicalJson(replay.output) === canonicalJson(output), "v4.2.12 primary replay mismatch");
  compilerReplayPassed = canonicalJson(replay.compiled) === canonicalJson(compiled); assertV4(compilerReplayPassed, "v4.2.12 compiler replay mismatch");
  validation = replay.validation; selectedCandidateProvenancePassed = replay.provenance.every((item) => item.immutableCandidateFieldsPreserved);
}
let timing = null, correctionAdjustedProjection = null, runtimePassed = false, runtimeComparison = null;
if (execution.result.accepted) {
  const discoveryMs = discoveryAnalysis.runtime.successfulLaneElapsedMs + discoveryAnalysis.runtime.newAdaptiveElapsedMs, debate99ElapsedMs = discoveryMs + execution.result.elapsedMs;
  const observations = [anchorExecution.result, priorExecution.results[0], ...continuationExecution.results.filter((result) => result.debateNumber !== "99")].map((result) => ({ debateNumber: result.debateNumber, gateAcceptancePassed: true, elapsedMs: result.elapsedMs, recoverableStreamEvents: result.recoverableStreamEvents ?? 0 }));
  observations.splice(3, 0, { debateNumber: "99", gateAcceptancePassed: true, elapsedMs: debate99ElapsedMs, recoverableStreamEvents: execution.result.recoverableStreamEvents }); assertV4(observations.length === 6, "six timing observations required");
  timing = evaluateV426PrimaryTiming(observations);
  const correctionMinutes = correctionExecution.result.elapsedMs / 60000, centralCorrectionHours = (1 / 6) * correctionMinutes * 195 / 60, conservativeCorrectionHours = 0.25 * correctionMinutes * 1.25 * 195 / 60;
  correctionAdjustedProjection = { debate99SuccessfulLaneMinutes: Number((debate99ElapsedMs / 60000).toFixed(2)), central: { baseHours: timing.centralProjection.hours.total, correctionHours: Number(centralCorrectionHours.toFixed(2)), totalHours: Number((timing.centralProjection.hours.total + centralCorrectionHours).toFixed(2)) }, conservative: { baseHours: timing.conservativeProjection.hours.total, correctionHours: Number(conservativeCorrectionHours.toFixed(2)), totalHours: Number((timing.conservativeProjection.hours.total + conservativeCorrectionHours).toFixed(2)) } };
  const priorIntegratedMinutes = baselineExecution.result.elapsedMs / 60000, leanIntegratedMinutes = execution.result.elapsedMs / 60000;
  runtimeComparison = { priorIntegratedMinutes: Number(priorIntegratedMinutes.toFixed(2)), leanIntegratedMinutes: Number(leanIntegratedMinutes.toFixed(2)), integratedReductionFraction: Number((1 - leanIntegratedMinutes / priorIntegratedMinutes).toFixed(4)), priorSuccessfulLaneMinutes: baseline.correctionAdjustedProjection.debate99SuccessfulLaneMinutes, leanSuccessfulLaneMinutes: correctionAdjustedProjection.debate99SuccessfulLaneMinutes, laneMinutesSaved: Number((baseline.correctionAdjustedProjection.debate99SuccessfulLaneMinutes - correctionAdjustedProjection.debate99SuccessfulLaneMinutes).toFixed(2)), requiredLaneMinutesSaved: 1.66 };
  runtimePassed = timing.timingEligible && correctionAdjustedProjection.central.totalHours <= 52 && correctionAdjustedProjection.conservative.totalHours <= 60;
}
const passed = execution.result.accepted && compilerReplayPassed && selectedCandidateProvenancePassed && runtimePassed;
const analysis = { schemaVersion: "4.2.12-lean-integrated-primary-analysis", protocolId: manifest.protocolId, status: !execution.result.accepted ? "lean-integrated-primary-failed" : passed ? "lean-integrated-primary-passed-fresh-gate-preparation-authorized" : "lean-integrated-primary-passed-runtime-gate-failed", debateNumber: "99", developmentOnly: true, validation, compilerReplayPassed, selectedCandidateProvenancePassed, runtimeComparison, timing, correctionAdjustedProjection, totals: { retiredDebatesFinallyValidated: execution.result.accepted ? 6 : 5, modelContexts: 1, attempts: 1, retries: 0, scoresDerived: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, authorization: { newDisjointFreshGatePreparation: passed, newFreshGateExecution: false, scoreDerivation: false, productionMutation: false, all195Debates: false } };
if (shouldWrite) await writeFile(manifest.artifacts.analysis, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, integratedMinutes: runtimeComparison?.leanIntegratedMinutes ?? null, laneMinutesSaved: runtimeComparison?.laneMinutesSaved ?? null, projected195CentralHours: correctionAdjustedProjection?.central.totalHours ?? null, projected195ConservativeHours: correctionAdjustedProjection?.conservative.totalHours ?? null, freshGatePreparationAuthorized: passed, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
