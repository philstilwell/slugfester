#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { V4219_ROOT, validateV4219PrimaryOutput } from "./lib/v4219-primary-recovery.mjs";

const shouldWrite = process.argv.includes("--write");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [manifest, execution] = await Promise.all(["execution-manifest.json", "model-execution.json"].map((file) => readFile(`${V4219_ROOT}/${file}`, "utf8").then(JSON.parse)));
assertV4(manifest.status === "frozen-three-recovery-primary-contexts-authorized" && execution.contextsAttempted === 3 && execution.retries === 0, "v4.2.19.2 execution unavailable for analysis");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(file)) === digest, `source hash mismatch during analysis: ${file}`);
const contexts = [];
for (const context of manifest.contexts) {
  const result = execution.results.find((item) => item.debateNumber === context.debateNumber);
  let replay = null;
  if (result.gateAcceptancePassed) {
    const [output, packet, eventsBytes, ledgerBytes] = await Promise.all([readFile(context.rawOutput, "utf8").then(JSON.parse), readFile(context.packet, "utf8").then(JSON.parse), readFile(context.originalEvents), readFile(context.sourceLedger)]);
    replay = validateV4219PrimaryOutput(output, packet, JSON.parse(eventsBytes), eventsBytes, ledgerBytes);
    assertV4(replay.status === "passed" && sha256(await readFile(context.rawOutput)) === result.rawOutputSha256 && sha256(await readFile(context.compiledOutput)) === result.compiledOutputSha256, `${context.debateNumber}: accepted output replay mismatch`);
  }
  contexts.push({ debateNumber: context.debateNumber, debateId: context.debateId, route: context.route, sourceLedgerEvents: context.sourceLedgerEvents, compactCopiedInputBytes: context.compactCopiedInputBytes, status: result.status, accepted: result.gateAcceptancePassed, elapsedMinutes: Number((result.elapsedMs / 60000).toFixed(2)), validationReplayed: replay?.status === "passed", chronologyReordered: replay?.deterministicRecovery.chronologyReordered ?? null, mediumOrLowAttributionMoves: replay?.mediumOrLowAttributionMoves ?? [], compiledEvidenceMaximumCharacters: replay ? Math.max(...replay.deterministicRecovery.compiledEvidence.map((item) => item.characters)) : null, repositoryDerivedResponseClass: replay?.deterministicRecovery.repositoryDerivedResponseClass ?? null, modelAuthoredAbsoluteResponsiveness: replay?.deterministicRecovery.modelAuthoredAbsoluteResponsiveness ?? null });
}
const valid = contexts.filter((context) => context.accepted);
const maximumElapsedMinutes = valid.length ? Math.max(...valid.map((context) => context.elapsedMinutes)) : null;
const meanElapsedMinutes = valid.length ? Number((valid.reduce((sum, context) => sum + context.elapsedMinutes, 0) / valid.length).toFixed(2)) : null;
const semanticPass = valid.length === 3;
const timingPass = semanticPass && maximumElapsedMinutes <= manifest.executionPolicy.maximumMinutesPerContext && meanElapsedMinutes <= manifest.executionPolicy.maximumMeanMinutes;
const passed = semanticPass && timingPass;
const analysis = { schemaVersion: "4.2.19.2-recovery-primary-analysis", protocolId: manifest.protocolId, status: passed ? "recovery-primary-gate-passed" : semanticPass ? "recovery-primary-gate-failed-timing" : "recovery-primary-gate-failed-validation", calibrationOnly: true, AIOnly: true, contexts, gate: { semanticPass, timingPass, validContexts: valid.length, requiredValidContexts: 3, maximumElapsedMinutes, maximumAllowedMinutesPerContext: manifest.executionPolicy.maximumMinutesPerContext, meanElapsedMinutes, maximumAllowedMeanMinutes: manifest.executionPolicy.maximumMeanMinutes, retries: execution.retries, corrections: execution.correctionContexts, scoresDerived: 0 }, recoveryEvidence: { routesReplayed: contexts.every((context) => context.route === "direct"), exactEvidenceAndBoundedCompilationPassed: semanticPass && contexts.every((context) => context.compiledEvidenceMaximumCharacters <= 450), repositoryChronologyApplied: semanticPass, targetEdgesValidatedAfterChronology: semanticPass, repositoryDerivedResponseClasses: semanticPass && contexts.every((context) => context.repositoryDerivedResponseClass), modelAuthoredAbsoluteResponsivenessAbsent: semanticPass && contexts.every((context) => context.modelAuthoredAbsoluteResponsiveness === false), mediumConfidenceMovesRequireAudioBeforeNextJudgmentStage: true }, totals: { modelContexts: execution.contextsAttempted, retries: 0, corrections: 0, scoresDerived: 0, meteredApiCostUsd: execution.meteredApiCostUsd, transcriptionCostUsd: execution.transcriptionCostUsd }, authorization: { passBRecoveryDesign: passed, passBModelExecution: false, audioVerification: false, scoreDerivation: false, productionMutation: false, all195Debates: false } };
if (shouldWrite) await writeFile(manifest.artifacts.analysis, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, validContexts: valid.length, timings: { byDebate: Object.fromEntries(contexts.map((context) => [context.debateNumber, context.elapsedMinutes])), maximumElapsedMinutes, meanElapsedMinutes, passed: timingPass }, mediumOrLowAttributionMoves: Object.fromEntries(contexts.map((context) => [context.debateNumber, context.mediumOrLowAttributionMoves])), scoresDerived: 0, meteredApiCostUsd: analysis.totals.meteredApiCostUsd, nextAuthorized: analysis.authorization.passBRecoveryDesign ? "pass-b-recovery-design" : "failure-diagnosis-only" }, null, 2));
