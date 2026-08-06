#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V4221_ROOT, buildV4221AudioWorkItems, extractV4221Disagreements, reconstructV4221PassB } from "./lib/v4221-pass-b-consensus.mjs";
import { V42211_ROOT, reconstructV42211PassB, validateV42211PassBOutput } from "./lib/v42211-charity-closure.mjs";

const shouldWrite = process.argv.includes("--write"), sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [manifest, execution] = await Promise.all(["execution-manifest.json", "model-execution.json"].map((file) => readFile(`${V42211_ROOT}/${file}`, "utf8").then(JSON.parse)));
assertV4(manifest.status === "frozen-one-fresh-debate-195-pass-b-recovery-authorized" && execution.contextsAttempted === 1 && execution.retries === 0, "v4.2.21.1 recovery execution unavailable");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(file)) === digest, `source hash mismatch during recovery analysis: ${file}`);
const context = manifest.context, result = execution.result;
let replay = null, reconstructed195 = null;
if (result.gateAcceptancePassed) {
  const [output, packet, sourcePacket, eventsBytes, ledgerBytes] = await Promise.all([readFile(context.rawOutput, "utf8").then(JSON.parse), readFile(context.passBPacket, "utf8").then(JSON.parse), readFile(context.sourcePacket, "utf8").then(JSON.parse), readFile(context.originalEvents), readFile(context.sourceLedger)]);
  replay = validateV42211PassBOutput(output, packet, sourcePacket, JSON.parse(eventsBytes), eventsBytes, ledgerBytes);
  reconstructed195 = reconstructV42211PassB(packet, output);
  assertV4(replay.status === "passed" && sha256(await readFile(context.rawOutput)) === result.rawOutputSha256 && sha256(await readFile(context.reconstructedOutput)) === result.reconstructedOutputSha256, "Debate 195 recovery replay mismatch");
}
const semanticPass = replay?.status === "passed";
const elapsedMinutes = Number((result.elapsedMs / 60000).toFixed(2));
const timingPass = semanticPass && elapsedMinutes <= manifest.executionPolicy.maximumMinutes;
let previews = null, combinedIndex = null;
if (semanticPass) {
  const contexts = [];
  for (const debateNumber of ["27", "188", "195"]) {
    const primaryPath = `docs/calibration/v4.2.20/source-span-rendering/primary-outputs/debate-${debateNumber}.json`, packetPath = `${V4221_ROOT}/packets/debate-${debateNumber}.json`, sourcePacketPath = `docs/calibration/v4.2.20/source-span-rendering/packets/debate-${debateNumber}.json`;
    const [primary, packet, sourcePacket, eventsBytes] = await Promise.all([readFile(primaryPath, "utf8").then(JSON.parse), readFile(packetPath, "utf8").then(JSON.parse), readFile(sourcePacketPath, "utf8").then(JSON.parse), readFile(JSON.parse(await readFile(sourcePacketPath, "utf8")).sourceChain.eventsPath)]);
    let rawPath, reconstructed;
    if (debateNumber === "195") { rawPath = context.rawOutput; reconstructed = reconstructed195; }
    else { rawPath = `${V4221_ROOT}/pass-b-outputs/debate-${debateNumber}.json`; reconstructed = reconstructV4221PassB(packet, JSON.parse(await readFile(rawPath, "utf8"))); }
    const disputes = extractV4221Disagreements(primary, reconstructed), audioItems = buildV4221AudioWorkItems(primary, reconstructed, packet, JSON.parse(eventsBytes));
    contexts.push({ debateNumber, primaryPath, passBOutputPath: rawPath, passBOutputSha256: sha256(await readFile(rawPath)), reconstructedPath: debateNumber === "195" ? context.reconstructedOutput : `${V4221_ROOT}/pass-b-reconstructed/debate-${debateNumber}.json`, reconstructedSha256: debateNumber === "195" ? result.reconstructedOutputSha256 : sha256(await readFile(`${V4221_ROOT}/pass-b-reconstructed/debate-${debateNumber}.json`)), moveCount: reconstructed.moves.length, disputedMovesPreview: disputes.moveDisputes.length, nondisputedScalarMergesPreview: disputes.nondisputedScalarMerges.length, audioVerificationMovesPreview: audioItems.map((item) => item.moveId), aggregateOrDiagnosticScoresComputed: disputes.audit.aggregateOrDiagnosticScoresComputed });
  }
  previews = { disputedMoves: contexts.reduce((sum, item) => sum + item.disputedMovesPreview, 0), nondisputedScalarMerges: contexts.reduce((sum, item) => sum + item.nondisputedScalarMergesPreview, 0), audioVerificationMoves: contexts.reduce((sum, item) => sum + item.audioVerificationMovesPreview.length, 0), aggregateOrDiagnosticScoresComputed: contexts.reduce((sum, item) => sum + item.aggregateOrDiagnosticScoresComputed, 0) };
  combinedIndex = { schemaVersion: "4.2.21.1-combined-accepted-pass-b-index", protocolId: manifest.protocolId, status: "three-accepted-independent-pass-b-outputs-locked", debates: contexts, sourceGate: `${V4221_ROOT}/pass-b-analysis.json`, recoveryAnalysis: manifest.artifacts.analysis, acceptedUnder: { "27": "v4.2.21", "188": "v4.2.21", "195": "v4.2.21.1" }, retries: 0, corrections: 0, scoresDerived: 0, authorization: { disagreementExtraction: timingPass, audioWorkItemPreparation: timingPass, audioExecution: false, adjudicationModelExecution: false, scoreDerivation: false } };
}
const passed = semanticPass && timingPass && previews?.aggregateOrDiagnosticScoresComputed === 0;
const analysis = { schemaVersion: "4.2.21.1-single-pass-b-recovery-analysis", protocolId: manifest.protocolId, status: passed ? "three-debate-pass-b-gate-recovered-and-passed" : semanticPass ? "debate-195-pass-b-recovery-failed-timing" : "debate-195-pass-b-recovery-failed-validation", calibrationOnly: true, AIOnly: true, recovery: { debateNumber: "195", status: result.status, accepted: result.gateAcceptancePassed, elapsedMinutes, maximumMinutes: manifest.executionPolicy.maximumMinutes, semanticPass, timingPass, charityConditionalClosureReplayed: replay?.charityConditionalClosure.status === "passed" }, combinedGate: { acceptedDebates: semanticPass ? ["27", "188", "195"] : ["27", "188"], acceptedPassBOutputs: semanticPass ? 3 : 2, requiredPassBOutputs: 3, oldAcceptedOutputsMutated: false, failedV4221OutputAccepted: false, retries: 0, corrections: 0, scoresDerived: 0 }, previewOnly: previews, totals: { modelContextsThisRecovery: 1, cumulativePassBModelContextsIncludingFailedEvidence: 4, meteredApiCostUsd: 0, transcriptionCostUsd: 0, scoresDerived: 0 }, authorization: { deterministicDisagreementExtraction: passed, audioWorkItemPreparation: passed, audioExecution: false, adjudicationPacketPreparation: false, adjudicationModelExecution: false, scoreDerivation: false, productionMutation: false, all195Debates: false } };
if (shouldWrite) { await writeFile(manifest.artifacts.analysis, `${JSON.stringify(analysis, null, 2)}\n`); if (passed) await writeFile(manifest.artifacts.combinedIndex, `${JSON.stringify(combinedIndex, null, 2)}\n`); }
console.log(JSON.stringify({ status: analysis.status, recovery: analysis.recovery, combinedAcceptedPassBOutputs: analysis.combinedGate.acceptedPassBOutputs, preview: analysis.previewOnly, scoresDerived: 0, meteredApiCostUsd: 0, nextAuthorized: passed ? "deterministic-disagreement-and-audio-preparation" : "failure-diagnosis-only" }, null, 2));
