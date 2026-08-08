#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { debates as productionDebates } from "../src/data/debates.js";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V42211732_DEBATES, V42211732_MODEL, V42211732_PROTOCOL_ID, V42211732_ROOT, buildV42211732PublicationPacket, buildV42211732PublicationSchema, v42211732ReferenceCatalog } from "./lib/v42211732-hard-route-publication.mjs";

const shouldWrite = process.argv.includes("--write");
const ledgerPath = "docs/calibration/v4.2.21.17.29/hard-route-final-ledger/final-ledger.json";
const scoresPath = "docs/calibration/v4.2.21.17.30/hard-route-single-score-pass/calculated-scores.json";
const readinessPath = "docs/calibration/v4.2.21.17.31/hard-route-workflow-readiness/analysis.json";
const audioAuditPath = "docs/calibration/v4.2.21.17.27/hard-route-audio-verification/audio-verification.json";
const preparationPath = `${V42211732_ROOT}/preparation-manifest.json`;
const catalogPath = `${V42211732_ROOT}/reference-catalog.json`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
if (shouldWrite) for (const file of [preparationPath, catalogPath]) assertV4(!(await exists(file)), `${file} already exists`);
const [ledger, scores, readiness, audioAudit] = await Promise.all([ledgerPath, scoresPath, readinessPath, audioAuditPath].map((file) => readFile(path.resolve(file), "utf8").then(JSON.parse)));
assertV4(readiness.status === "hard-route-five-passed-through-scores-publication-gate-required" && readiness.authorization.publicationFinalizationPreparation && !readiness.authorization.publicationFinalizationExecution, "publication reconstruction preparation is not authorized");
assertV4(ledger.status === "passed-hard-route-deterministic-final-ledger-assembly" && scores.status === "hard-route-single-score-pass-stability-gate-passed", "locked ledger or score gate unavailable");
const audioVerifiedMoveIds = new Set(audioAudit.debates.flatMap((debate) => debate.moves.filter((move) => move.status === "verified").map((move) => move.moveId)));
const catalog = { schemaVersion: "4.2.21.17.32-local-reference-catalog", references: v42211732ReferenceCatalog() };
const catalogBytes = Buffer.from(`${JSON.stringify(catalog, null, 2)}\n`);
const sharedInputs = {
  workflow: "docs/assessment-workflow-v4.2.21.17.32.md",
  outputContract: "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md",
  manual: `${V42211732_ROOT}/manual.md`,
  referenceCatalog: catalogPath
};
const sharedInputBytes = (await Promise.all(Object.entries(sharedInputs).filter(([key]) => key !== "referenceCatalog").map(([, file]) => readFile(path.resolve(file))))).reduce((sum, bytes) => sum + bytes.length, 0) + catalogBytes.length;
const contexts = [];
for (const debateNumber of V42211732_DEBATES) {
  const ledgerDebate = ledger.debates.find((debate) => debate.debateNumber === debateNumber);
  const scoreDebate = scores.debates.find((debate) => debate.debateNumber === debateNumber);
  const production = productionDebates.find((debate) => debate.number === debateNumber);
  const sourcePacketPath = `docs/calibration/v4.2.21.17.25/hard-route-independent-judgments/source-packets/debate-${debateNumber}.json`;
  const sourcePacket = JSON.parse(await readFile(path.resolve(sourcePacketPath), "utf8"));
  const eventsPath = sourcePacket.sourceChain.eventsPath;
  const eventsDocument = JSON.parse(await readFile(path.resolve(eventsPath), "utf8"));
  assertV4(ledgerDebate && scoreDebate && production && production.id === ledgerDebate.debateId, `Debate ${debateNumber}: publication source unavailable`);
  const packet = buildV42211732PublicationPacket({ ledgerDebate, scoreDebate, sourcePacket, eventsDocument, production, audioVerifiedMoveIds });
  const schema = buildV42211732PublicationSchema(packet);
  const packetPath = `${V42211732_ROOT}/packets/debate-${debateNumber}.json`;
  const schemaPath = `${V42211732_ROOT}/schemas/debate-${debateNumber}.schema.json`;
  const outputPath = `${V42211732_ROOT}/outputs/debate-${debateNumber}.json`;
  const compiledPath = `${V42211732_ROOT}/compiled/debate-${debateNumber}.json`;
  const packetBytes = Buffer.from(`${JSON.stringify(packet, null, 2)}\n`);
  const schemaBytes = Buffer.from(`${JSON.stringify(schema, null, 2)}\n`);
  if (shouldWrite) {
    await mkdir(path.dirname(path.resolve(packetPath)), { recursive: true });
    await mkdir(path.dirname(path.resolve(schemaPath)), { recursive: true });
    await writeFile(path.resolve(packetPath), packetBytes);
    await writeFile(path.resolve(schemaPath), schemaBytes);
  }
  contexts.push({ debateNumber, debateId: ledgerDebate.debateId, packet: packetPath, schema: schemaPath, output: outputPath, compiled: compiledPath, sourcePacket: sourcePacketPath, events: eventsPath, moves: packet.moves.length, sections: packet.sections.length, quoteEligibleMoves: packet.moves.filter((move) => move.quoteEligible).length, audioVerifiedMoves: packet.moves.filter((move) => move.audioVerified).length, packetBytes: packetBytes.length, schemaBytes: schemaBytes.length, copiedInputBytes: sharedInputBytes + packetBytes.length + schemaBytes.length });
}
const preparation = {
  schemaVersion: "4.2.21.17.32-hard-route-publication-preparation",
  protocolId: V42211732_PROTOCOL_ID,
  status: shouldWrite ? "prepared-five-isolated-hard-route-publication-contexts" : "preview",
  calibrationOnly: true,
  AIOnly: true,
  model: { ...V42211732_MODEL, meteredApiCostUsdMaximum: 0 },
  inputs: { ...sharedInputs, finalLedger: ledgerPath, calculatedScores: scoresPath, readiness: readinessPath, audioAudit: audioAuditPath },
  contexts,
  isolation: { oneDebatePerContext: true, participantJudgmentClosed: true, lockedScoresUnavailableAsMutableOutputFields: true, legacyAssessmentsUnavailable: true, otherDebatesUnavailable: true, productionScoresUnavailable: true, winnerComparisonsUnavailable: true, fullSelectedMoveEvidenceAvailable: true, aiExtensionPostScoringOnly: true },
  policy: { attemptsPerDebate: 1, retries: 0, correctionContexts: 0, maximumConcurrency: 2, timeoutMsPerDebate: 600000, maximumMinutesPerDebate: 8, maximumMeanMinutes: 6, deterministicCompilation: true, modelAuthoredScores: 0, tagsPostScoringOnly: true },
  totals: { contexts: contexts.length, moves: contexts.reduce((sum, context) => sum + context.moves, 0), sections: contexts.reduce((sum, context) => sum + context.sections, 0), quoteEligibleMoves: contexts.reduce((sum, context) => sum + context.quoteEligibleMoves, 0), audioVerifiedMoves: contexts.reduce((sum, context) => sum + context.audioVerifiedMoves, 0), maximumCopiedInputBytes: Math.max(...contexts.map((context) => context.copiedInputBytes)), meanCopiedInputBytes: Math.round(contexts.reduce((sum, context) => sum + context.copiedInputBytes, 0) / contexts.length), modelContextsExecuted: 0, modelAuthoredScores: 0, meteredApiCostUsd: 0, transcriptionCostUsdThisStage: 0 },
  authorization: { executionManifest: true, publicationModelExecution: false, deterministicCompilation: false, renderingVerification: false, readinessPromotion: false, productionMutation: false, all195Debates: false }
};
assertV4(contexts.length === 5 && preparation.totals.moves === 100 && contexts.every((context) => context.sections >= 4 && context.sections <= 6 && context.quoteEligibleMoves >= 2), "publication preparation population mismatch");
assertV4(preparation.totals.maximumCopiedInputBytes <= 400000, "publication context exceeds 400 KB transport budget");
if (shouldWrite) {
  await mkdir(path.resolve(V42211732_ROOT), { recursive: true });
  await writeFile(path.resolve(catalogPath), catalogBytes);
  await writeFile(path.resolve(preparationPath), `${JSON.stringify(preparation, null, 2)}\n`);
}
console.log(JSON.stringify({ status: preparation.status, debates: contexts.map((context) => ({ debateNumber: context.debateNumber, moves: context.moves, sections: context.sections, quoteEligibleMoves: context.quoteEligibleMoves, audioVerifiedMoves: context.audioVerifiedMoves, packetBytes: context.packetBytes, schemaBytes: context.schemaBytes, copiedInputBytes: context.copiedInputBytes })), totals: preparation.totals, publicationModelExecutionAuthorized: false }, null, 2));
