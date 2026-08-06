#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V4221_ROOT, buildV4221AudioWorkItems, extractV4221Disagreements, reconstructV4221PassB, validateV4221PassBOutput } from "./lib/v4221-pass-b-consensus.mjs";

const shouldWrite = process.argv.includes("--write");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [manifest, execution] = await Promise.all(["execution-manifest.json", "model-execution.json"].map((file) => readFile(`${V4221_ROOT}/${file}`, "utf8").then(JSON.parse)));
assertV4(manifest.status === "frozen-three-isolated-source-span-pass-b-contexts-authorized" && execution.contextsAttempted === 3 && execution.retries === 0, "v4.2.21 Pass B execution unavailable");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(file)) === digest, `source hash mismatch during Pass B analysis: ${file}`);

const contexts = [];
for (const context of manifest.contexts) {
  const result = execution.results.find((item) => item.debateNumber === context.debateNumber);
  let replay = null, disputes = null, audioItems = null;
  if (result.gateAcceptancePassed) {
    const [output, packet, sourcePacket, primary, eventsBytes, ledgerBytes] = await Promise.all([readFile(context.rawOutput, "utf8").then(JSON.parse), readFile(context.passBPacket, "utf8").then(JSON.parse), readFile(context.sourcePacket, "utf8").then(JSON.parse), readFile(context.sourcePrimary, "utf8").then(JSON.parse), readFile(context.originalEvents), readFile(context.sourceLedger)]);
    const events = JSON.parse(eventsBytes);
    replay = validateV4221PassBOutput(output, packet, sourcePacket, events, eventsBytes, ledgerBytes);
    const reconstructed = reconstructV4221PassB(packet, output);
    assertV4(replay.status === "passed" && sha256(await readFile(context.rawOutput)) === result.rawOutputSha256 && sha256(await readFile(context.reconstructedOutput)) === result.reconstructedOutputSha256, `${context.debateNumber}: Pass B replay mismatch`);
    disputes = extractV4221Disagreements(primary, reconstructed);
    audioItems = buildV4221AudioWorkItems(primary, reconstructed, packet, events);
  }
  contexts.push({ debateNumber: context.debateNumber, debateId: context.debateId, family: context.family, status: result.status, accepted: result.gateAcceptancePassed, elapsedMinutes: Number((result.elapsedMs / 60000).toFixed(2)), validationReplayed: replay?.status === "passed", lockedMoves: replay?.moves ?? null, mediumOrLowAttributionMovesInPassB: replay?.mediumOrLowAttributionMoves ?? null, disputedMovesPreview: disputes?.moveDisputes.length ?? null, nondisputedScalarMergesPreview: disputes?.nondisputedScalarMerges.length ?? null, audioVerificationMovesPreview: audioItems?.map((item) => item.moveId) ?? null, aggregateOrDiagnosticScoresComputed: disputes?.audit.aggregateOrDiagnosticScoresComputed ?? null });
}
const valid = contexts.filter((context) => context.accepted);
const maximumElapsedMinutes = valid.length ? Math.max(...valid.map((context) => context.elapsedMinutes)) : null;
const meanElapsedMinutes = valid.length ? Number((valid.reduce((sum, context) => sum + context.elapsedMinutes, 0) / valid.length).toFixed(2)) : null;
const semanticPass = valid.length === 3;
const timingPass = semanticPass && maximumElapsedMinutes <= manifest.executionPolicy.maximumMinutesPerContext && meanElapsedMinutes <= manifest.executionPolicy.maximumMeanMinutes;
const scoreBlindPass = semanticPass && contexts.every((context) => context.aggregateOrDiagnosticScoresComputed === 0);
const passed = semanticPass && timingPass && scoreBlindPass;
const analysis = {
  schemaVersion: "4.2.21-isolated-pass-b-analysis",
  protocolId: manifest.protocolId,
  status: passed ? "isolated-source-span-pass-b-gate-passed" : semanticPass ? timingPass ? "isolated-source-span-pass-b-gate-failed-scoreblindness" : "isolated-source-span-pass-b-gate-failed-timing" : "isolated-source-span-pass-b-gate-failed-validation",
  calibrationOnly: true,
  AIOnly: true,
  contexts,
  gate: { semanticPass, timingPass, scoreBlindPass, validContexts: valid.length, requiredValidContexts: 3, maximumElapsedMinutes, maximumAllowedMinutesPerContext: manifest.executionPolicy.maximumMinutesPerContext, meanElapsedMinutes, maximumAllowedMeanMinutes: manifest.executionPolicy.maximumMeanMinutes, retries: 0, corrections: 0, scoresDerived: 0 },
  compatibilityEvidence: { fullV4220ValidationReplayed: semanticPass, lockedSourceSpanTopologyPreserved: semanticPass, modelAuthoredEvidenceTextAbsent: semanticPass, repositoryDerivedResponseClassPreserved: semanticPass, aggregateOrDiagnosticScoresBeforeAdjudication: 0, audioUnionPreparedForEitherPassBelowHigh: semanticPass },
  previewOnly: { disputedMoves: semanticPass ? contexts.reduce((sum, context) => sum + context.disputedMovesPreview, 0) : null, nondisputedScalarMerges: semanticPass ? contexts.reduce((sum, context) => sum + context.nondisputedScalarMergesPreview, 0) : null, audioVerificationMoves: semanticPass ? contexts.reduce((sum, context) => sum + context.audioVerificationMovesPreview.length, 0) : null, artifactsWritten: 0 },
  totals: { modelContexts: execution.contextsAttempted, retries: 0, corrections: 0, scoresDerived: 0, meteredApiCostUsd: execution.meteredApiCostUsd, transcriptionCostUsd: execution.transcriptionCostUsd },
  authorization: { deterministicDisagreementExtraction: passed, audioWorkItemPreparation: passed, audioExecution: false, adjudicationPacketPreparation: false, adjudicationModelExecution: false, scoreDerivation: false, productionMutation: false, all195Debates: false }
};
if (shouldWrite) await writeFile(manifest.artifacts.analysis, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, validContexts: valid.length, timings: { byDebate: Object.fromEntries(contexts.map((context) => [context.debateNumber, context.elapsedMinutes])), maximumElapsedMinutes, meanElapsedMinutes, passed: timingPass }, preview: analysis.previewOnly, scoresDerived: 0, meteredApiCostUsd: analysis.totals.meteredApiCostUsd, nextAuthorized: passed ? "deterministic-disagreement-and-audio-preparation" : "failure-diagnosis-only" }, null, 2));
