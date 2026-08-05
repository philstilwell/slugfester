#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { V422_MODEL, V422_OUTPUT_VERSION, V422_PACKET_VERSION, V422_PROTOCOL_ID, V422_ROOT, makeV422PrimarySchema, validateV422SourceLedger } from "./lib/v422-chronology-first.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const priorRoot = "docs/calibration/v4.2.1/compact-fresh-six-gate";
const [priorFailure, priorPacket] = await Promise.all([
  readFile(path.resolve(root, `${priorRoot}/primary-failure-analysis.json`), "utf8").then(JSON.parse),
  readFile(path.resolve(root, `${priorRoot}/packets/debate-07.json`), "utf8").then(JSON.parse)
]);
assertV4(priorFailure.status === "failed-chronology-cross-reference-validation" && priorFailure.failedContext.debateNumber === "07" && priorFailure.disposition.chronologyFirstContractDevelopmentAuthorized, "v4.2.1 chronology diagnostic unavailable");
const [eventsBytes, transcriptBytes, manifestBytes, ledgerBytes] = await Promise.all([readFile(priorPacket.sourceChain.eventsPath), readFile(priorPacket.sourceChain.transcriptPath), readFile(priorPacket.sourceChain.localManifestPath), readFile(priorPacket.transportChain.sourceLedgerPath)]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const ledgerValidation = validateV422SourceLedger(ledgerBytes, JSON.parse(eventsBytes), priorPacket.transportChain.sourceLedgerSha256);
const packet = {
  ...priorPacket,
  schemaVersion: V422_PACKET_VERSION,
  protocolId: V422_PROTOCOL_ID,
  sourceChain: { ...priorPacket.sourceChain, transcriptSha256: sha256(transcriptBytes), eventsSha256: sha256(eventsBytes), localManifestSha256: sha256(manifestBytes) },
  modelInputBoundary: { ...priorPacket.modelInputBoundary, movesNestedUnderSections: false, oneChronologicalMoveInventoryRequired: true, replyTargetsMustAlreadyAppearInInventory: true, failedV421OutputDeliveredToModel: false }
};
const packetPath = `${V422_ROOT}/packet.json`;
const schemaPath = `${V422_ROOT}/schema.json`;
const inputs = { rubricBase: "docs/reassessment-rubric-v4.0.md", rubricDerivedScores: "docs/reassessment-rubric-v4.0.1.md", rubricBounded: "docs/reassessment-rubric-v4.1.md", manual: `${V422_ROOT}/manual.md`, schema: schemaPath };
if (shouldWrite) {
  await mkdir(path.resolve(root, V422_ROOT), { recursive: true });
  await writeFile(path.resolve(root, packetPath), `${JSON.stringify(packet, null, 2)}\n`);
  await writeFile(path.resolve(root, schemaPath), `${JSON.stringify(makeV422PrimarySchema(), null, 2)}\n`);
}
const copiedFiles = [...Object.values(inputs), packetPath, priorPacket.transportChain.sourceLedgerPath];
const copiedBytes = {};
for (const file of copiedFiles) copiedBytes[file] = file === packetPath && !shouldWrite ? Buffer.byteLength(`${JSON.stringify(packet, null, 2)}\n`) : file === schemaPath && !shouldWrite ? Buffer.byteLength(`${JSON.stringify(makeV422PrimarySchema(), null, 2)}\n`) : (await stat(path.resolve(root, file))).size;
const totalCopiedInputBytes = Object.values(copiedBytes).reduce((sum, value) => sum + value, 0);
const preparation = {
  schemaVersion: "4.2.2-chronology-first-smoke-preparation",
  protocolId: V422_PROTOCOL_ID,
  status: shouldWrite ? "prepared-retired-chronology-smoke-no-model-execution" : "preview",
  developmentOnly: true,
  AIOnly: true,
  dyadicOnly: true,
  debate: { debateNumber: "07", debateId: packet.debateId, durationSeconds: packet.durationSeconds, priorFailure: `${priorRoot}/primary-failure-analysis.json`, priorRawOutputExcluded: `${priorRoot}/primary-outputs/debate-07.json`, packet: packetPath, sourceLedger: packet.transportChain.sourceLedgerPath, originalTranscript: packet.sourceChain.transcriptPath, originalEvents: packet.sourceChain.eventsPath, originalManifest: packet.sourceChain.localManifestPath, rawOutput: `${V422_ROOT}/primary-output.json`, compiledOutput: `${V422_ROOT}/primary-compiled.json` },
  model: { label: V422_MODEL.label, slug: V422_MODEL.slug, reasoningEffort: V422_MODEL.primaryReasoningEffort, authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0 },
  inputs,
  transport: { sourceLedgerReplayExact: ledgerValidation.replayExact, sourceLedgerSha256: packet.transportChain.sourceLedgerSha256, sourceLedgerEvents: ledgerValidation.eventCount, completeSourceTextDeliveredOnce: true, duplicatePlainTranscriptDelivered: false, originalEventsDelivered: false, totalCopiedInputBytes, copiedFiles, copiedBytes },
  topologyChange: { judgmentAnchorsChanged: false, nestedMoveArraysRemoved: true, chronologicalTopLevelMovesRequired: true, earlierEmittedTargetRequired: true, deterministicCrossReferenceRejectionRetained: true, automaticRepairAuthorized: false },
  totals: { debates: 1, modelContextsExecuted: 0, meteredApiCostUsd: 0, transcriptionApiCalls: 0, transcriptionCostUsd: 0 },
  authorization: { deterministicFixtures: true, executionManifest: false, primaryModelExecution: false, scoreDerivation: false, legacyComparison: false, freshGateSelection: false, productionMutation: false }
};
if (shouldWrite) await writeFile(path.resolve(root, `${V422_ROOT}/preparation-manifest.json`), `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, outputSchemaVersion: V422_OUTPUT_VERSION, debateNumber: "07", sourceLedgerEvents: ledgerValidation.eventCount, totalCopiedInputBytes, nestedMoveArraysRemoved: true, chronologicalTopLevelMovesRequired: true, modelContextsExecuted: 0, meteredApiCostUsd: 0 }, null, 2));
