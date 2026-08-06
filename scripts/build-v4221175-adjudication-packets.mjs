#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V4221175_ROOT, buildV4221175AdjudicationPacket, makeV4221175AdjudicationSchema } from "./lib/v4221175-decomposed-adjudication.mjs";

const shouldWrite = process.argv.includes("--write");
const disagreementRoot = "docs/calibration/v4.2.21.17.3/deterministic-disagreement-audio-prep";
const audioRoot = "docs/calibration/v4.2.21.17.4/medium-confidence-audio-verification";
const inventoryRoot = "docs/calibration/v4.2.21.16/decomposed-consensus-contract/locked-inventories";
const judgmentPreparationPath = "docs/calibration/v4.2.21.17.2/independent-judgment-schema-recovery/preparation-manifest.json";
const [sourceAnalysis, audioAnalysis, audioAudit, judgmentPreparation] = await Promise.all([
  readFile(`${disagreementRoot}/analysis.json`, "utf8").then(JSON.parse),
  readFile(`${audioRoot}/analysis.json`, "utf8").then(JSON.parse),
  readFile(`${audioRoot}/audio-verification.json`, "utf8").then(JSON.parse),
  readFile(judgmentPreparationPath, "utf8").then(JSON.parse)
]);
assertV4(sourceAnalysis.status === "deterministic-disagreements-extracted-audio-source-preparation-authorized" && audioAnalysis.status === "passed-all-two-medium-assessment-moves-audio-verified" && audioAnalysis.authorization.adjudicationPacketPreparation, "adjudication preparation is not authorized");
const audioByMoveId = new Map(audioAudit.debates.flatMap((debate) => debate.moves.map((move) => [move.moveId, move])));
const contexts = [];
let disputedMoves = 0;
let candidateSelections = 0;
let audioVerifiedMoves = 0;

for (const debateNumber of ["133", "178", "182"]) {
  const judgmentContext = judgmentPreparation.contexts.find((item) => item.debateNumber === debateNumber);
  const disagreementPath = `${disagreementRoot}/disagreements/debate-${debateNumber}.json`;
  const inventoryPath = `${inventoryRoot}/debate-${debateNumber}.json`;
  const [disagreements, lockedInventory, events] = await Promise.all([
    readFile(disagreementPath, "utf8").then(JSON.parse),
    readFile(inventoryPath, "utf8").then(JSON.parse),
    readFile(judgmentContext.originalEvents, "utf8").then(JSON.parse)
  ]);
  const built = buildV4221175AdjudicationPacket(disagreements, lockedInventory, events, audioByMoveId);
  const packetPath = `${V4221175_ROOT}/packets/debate-${debateNumber}.json`;
  const provenancePath = `${V4221175_ROOT}/provenance/debate-${debateNumber}.json`;
  const outputPath = `${V4221175_ROOT}/outputs/debate-${debateNumber}.json`;
  const selections = built.packet.disputedMoves.reduce((sum, move) => sum + [move.candidates.importancePair, move.candidates.attributionPair, move.candidates.responsePair, move.candidates.charityPair, move.candidates.assessmentConfidencePair].filter(Boolean).length + Object.keys(move.candidates.scoringFields).length, built.packet.burdenAdjustmentDisputes.length);
  const audioCount = built.packet.disputedMoves.filter((move) => move.evidence.audioVerification !== null).length;
  if (shouldWrite) {
    await mkdir(path.dirname(path.resolve(packetPath)), { recursive: true });
    await mkdir(path.dirname(path.resolve(provenancePath)), { recursive: true });
    await writeFile(path.resolve(packetPath), `${JSON.stringify(built.packet, null, 2)}\n`);
    await writeFile(path.resolve(provenancePath), `${JSON.stringify({ schemaVersion: "4.2.21.17.5-adjudication-candidate-provenance", protocolId: built.packet.protocolId, debateNumber, modelInput: false, mappings: built.provenance }, null, 2)}\n`);
  }
  contexts.push({ debateNumber, debateId: built.packet.debateId, packet: packetPath, provenance: provenancePath, output: outputPath, disputeSource: disagreementPath, lockedInventory: inventoryPath, sourcePacket: judgmentContext.sourcePacket, originalEvents: judgmentContext.originalEvents, disputedMoves: built.packet.disputedMoves.length, candidateSelections: selections, audioVerifiedMoves: audioCount, audioTranscriptInputs: built.audioTranscriptInputs, packetBytes: Buffer.byteLength(`${JSON.stringify(built.packet)}\n`) });
  disputedMoves += built.packet.disputedMoves.length;
  candidateSelections += selections;
  audioVerifiedMoves += audioCount;
}

const preparation = {
  schemaVersion: "4.2.21.17.5-dispute-only-adjudication-preparation",
  protocolId: "v4.2.21.17.5-decomposed-consensus",
  status: shouldWrite ? "prepared-three-isolated-dispute-only-adjudication-contexts" : "preview",
  calibrationOnly: true,
  AIOnly: true,
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high", authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0 },
  inputs: { rubricBase: "docs/reassessment-rubric-v4.0.md", rubricDerivedScores: "docs/reassessment-rubric-v4.0.1.md", rubricBounded: "docs/reassessment-rubric-v4.1.md", workflow: "docs/assessment-workflow-v4.2.21.17.3.md", audioWorkflow: "docs/assessment-workflow-v4.2.21.17.4.md", manual: `${V4221175_ROOT}/manual.md`, schema: `${V4221175_ROOT}/adjudication.schema.json` },
  contexts,
  evidenceBoundary: { disputedFieldsOnly: true, candidateOrderingAnonymizedPerPair: true, provenanceFilesNeverModelInputs: true, initialPassRationalesUnavailable: true, nondisputedFieldsUnavailable: true, fullInitialOutputsUnavailable: true, calculatedScoresUnavailable: true, winnersUnavailable: true, publicationProseUnavailable: true, verifiedAudioTranscriptsSuppliedOnlyWhereRequired: true },
  totals: { contexts: contexts.length, disputedMoves, candidateSelections, audioVerifiedMoves, modelContextsExecuted: 0, scoresDerived: 0, meteredApiCostUsd: 0, transcriptionCostUsdThisStage: 0 },
  authorization: { executionManifest: true, adjudicationModelExecution: false, finalLedgerAssembly: false, scoreDerivation: false, productionMutation: false, all195Debates: false }
};
if (shouldWrite) {
  await mkdir(path.resolve(V4221175_ROOT), { recursive: true });
  await writeFile(path.resolve(V4221175_ROOT, "adjudication.schema.json"), `${JSON.stringify(makeV4221175AdjudicationSchema(), null, 2)}\n`);
  await writeFile(path.resolve(V4221175_ROOT, "preparation-manifest.json"), `${JSON.stringify(preparation, null, 2)}\n`);
}
console.log(JSON.stringify({ status: preparation.status, debates: contexts.map((context) => ({ debateNumber: context.debateNumber, disputedMoves: context.disputedMoves, candidateSelections: context.candidateSelections, audioVerifiedMoves: context.audioVerifiedMoves, packetBytes: context.packetBytes })), totals: preparation.totals, adjudicationModelExecutionAuthorized: false }, null, 2));
