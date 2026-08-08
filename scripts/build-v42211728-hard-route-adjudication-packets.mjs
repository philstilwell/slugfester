#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V42211728_PROTOCOL_ID, V42211728_ROOT, buildV42211728AdjudicationPacket, makeV42211728AdjudicationSchema } from "./lib/v42211728-hard-route-adjudication.mjs";

const shouldWrite = process.argv.includes("--write");
const disagreementRoot = "docs/calibration/v4.2.21.17.26/hard-route-disagreement-audio-prep";
const audioRoot = "docs/calibration/v4.2.21.17.27/hard-route-audio-verification";
const judgmentPreparationPath = "docs/calibration/v4.2.21.17.25/hard-route-independent-judgments/preparation-manifest.json";
const [sourceAnalysis, audioAnalysis, audioAudit, judgmentPreparation] = await Promise.all([
  readFile(`${disagreementRoot}/analysis.json`, "utf8").then(JSON.parse),
  readFile(`${audioRoot}/analysis.json`, "utf8").then(JSON.parse),
  readFile(`${audioRoot}/audio-verification.json`, "utf8").then(JSON.parse),
  readFile(judgmentPreparationPath, "utf8").then(JSON.parse),
]);
assertV4(sourceAnalysis.status === "hard-route-deterministic-disagreements-extracted-audio-source-preparation-authorized" && audioAnalysis.status === "passed-all-three-hard-route-confidence-moves-audio-verified" && audioAnalysis.authorization.adjudicationPacketPreparation, "hard-route adjudication preparation is not authorized");
const audioByMoveId = new Map(audioAudit.debates.flatMap((debate) => debate.moves.map((move) => [move.moveId, move])));
const schema = makeV42211728AdjudicationSchema();
const schemaBytes = Buffer.from(`${JSON.stringify(schema, null, 2)}\n`);
const inputPaths = { rubricBase: "docs/reassessment-rubric-v4.0.md", rubricDerivedScores: "docs/reassessment-rubric-v4.0.1.md", rubricBounded: "docs/reassessment-rubric-v4.1.md", workflow: "docs/assessment-workflow-v4.2.21.17.28.md", audioWorkflow: "docs/assessment-workflow-v4.2.21.17.27.md", manual: `${V42211728_ROOT}/manual.md`, schema: `${V42211728_ROOT}/adjudication.schema.json` };
const sharedInputBytes = (await Promise.all(Object.entries(inputPaths).filter(([key]) => key !== "schema").map(([, file]) => readFile(file)))).reduce((sum, bytes) => sum + bytes.length, 0) + schemaBytes.length;
const contexts = [];
let disputedMoves = 0, candidateSelections = 0, audioVerifiedMoves = 0;

for (const debateNumber of ["51", "63", "90", "153", "165"]) {
  const judgmentContext = judgmentPreparation.contexts.find((item) => item.debateNumber === debateNumber && item.reviewerPass === "A");
  assertV4(judgmentContext, `Debate ${debateNumber}: judgment context unavailable`);
  const disagreementPath = `${disagreementRoot}/disagreements/debate-${debateNumber}.json`;
  const [disagreements, lockedInventory, events] = await Promise.all([
    readFile(disagreementPath, "utf8").then(JSON.parse),
    readFile(judgmentContext.lockedInventory, "utf8").then(JSON.parse),
    readFile(judgmentContext.originalEvents, "utf8").then(JSON.parse),
  ]);
  const built = buildV42211728AdjudicationPacket(disagreements, lockedInventory, events, audioByMoveId);
  const packetPath = `${V42211728_ROOT}/packets/debate-${debateNumber}.json`;
  const provenancePath = `${V42211728_ROOT}/provenance/debate-${debateNumber}.json`;
  const outputPath = `${V42211728_ROOT}/outputs/debate-${debateNumber}.json`;
  const packetBytes = Buffer.from(`${JSON.stringify(built.packet, null, 2)}\n`);
  const selections = built.packet.disputedMoves.reduce((sum, move) => sum + [move.candidates.importancePair, move.candidates.attributionPair, move.candidates.responsePair, move.candidates.charityPair, move.candidates.assessmentConfidencePair].filter(Boolean).length + Object.keys(move.candidates.scoringFields).length, built.packet.burdenAdjustmentDisputes.length);
  const audioCount = built.packet.disputedMoves.filter((move) => move.evidence.audioVerification !== null).length;
  const audioTranscriptBytes = (await Promise.all(built.audioTranscriptInputs.map((input) => readFile(input.sourcePath)))).reduce((sum, bytes) => sum + bytes.length, 0);
  if (shouldWrite) {
    await mkdir(path.dirname(packetPath), { recursive: true });
    await mkdir(path.dirname(provenancePath), { recursive: true });
    await writeFile(packetPath, packetBytes);
    await writeFile(provenancePath, `${JSON.stringify({ schemaVersion: "4.2.21.17.28-adjudication-candidate-provenance", protocolId: built.packet.protocolId, debateNumber, modelInput: false, mappings: built.provenance }, null, 2)}\n`);
  }
  contexts.push({ debateNumber, debateId: built.packet.debateId, packet: packetPath, provenance: provenancePath, output: outputPath, disputeSource: disagreementPath, lockedInventory: judgmentContext.lockedInventory, sourcePacket: judgmentContext.sourcePacket, originalEvents: judgmentContext.originalEvents, disputedMoves: built.packet.disputedMoves.length, candidateSelections: selections, audioVerifiedMoves: audioCount, audioTranscriptInputs: built.audioTranscriptInputs, packetBytes: packetBytes.length, copiedInputBytes: sharedInputBytes + packetBytes.length + audioTranscriptBytes });
  disputedMoves += built.packet.disputedMoves.length;
  candidateSelections += selections;
  audioVerifiedMoves += audioCount;
}

const preparation = {
  schemaVersion: "4.2.21.17.28-hard-route-dispute-only-adjudication-preparation",
  protocolId: V42211728_PROTOCOL_ID,
  status: shouldWrite ? "prepared-five-isolated-hard-route-dispute-only-adjudication-contexts" : "preview",
  calibrationOnly: true,
  AIOnly: true,
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high", authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0 },
  inputs: inputPaths,
  contexts,
  evidenceBoundary: { disputedFieldsOnly: true, candidateOrderingAnonymizedPerPair: true, provenanceFilesNeverModelInputs: true, initialPassRationalesUnavailable: true, nondisputedFieldsUnavailable: true, fullInitialOutputsUnavailable: true, calculatedScoresUnavailable: true, winnersUnavailable: true, publicationProseUnavailable: true, rawVerifiedDiarizedTranscriptsSuppliedOnlyWhereRequired: true },
  totals: { contexts: contexts.length, disputedMoves, candidateSelections, audioVerifiedMoves, maximumCopiedInputBytes: Math.max(...contexts.map((context) => context.copiedInputBytes)), meanCopiedInputBytes: Math.round(contexts.reduce((sum, context) => sum + context.copiedInputBytes, 0) / contexts.length), modelContextsExecuted: 0, scoresDerived: 0, meteredApiCostUsd: 0, transcriptionCostUsdThisStage: 0 },
  authorization: { executionManifest: true, adjudicationModelExecution: false, finalLedgerAssembly: false, scoreDerivation: false, productionMutation: false, all195Debates: false },
};
assertV4(contexts.length === 5 && disputedMoves === sourceAnalysis.adjudicationWorkload.disputedMoves && candidateSelections === sourceAnalysis.adjudicationWorkload.candidateSelections, "adjudication workload differs from deterministic extraction");
assertV4(audioVerifiedMoves === 3, "verified audio work was not attached to every triggered disputed move");
if (shouldWrite) {
  await mkdir(V42211728_ROOT, { recursive: true });
  await writeFile(`${V42211728_ROOT}/adjudication.schema.json`, schemaBytes);
  await writeFile(`${V42211728_ROOT}/preparation-manifest.json`, `${JSON.stringify(preparation, null, 2)}\n`);
}
console.log(JSON.stringify({ status: preparation.status, debates: contexts.map((context) => ({ debateNumber: context.debateNumber, disputedMoves: context.disputedMoves, candidateSelections: context.candidateSelections, audioVerifiedMoves: context.audioVerifiedMoves, packetBytes: context.packetBytes, copiedInputBytes: context.copiedInputBytes })), totals: preparation.totals, adjudicationModelExecutionAuthorized: false }, null, 2));
