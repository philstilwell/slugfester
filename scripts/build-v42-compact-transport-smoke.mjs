#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { V42_MODEL, V42_OUTPUT_VERSION, V42_PACKET_VERSION, V42_PROTOCOL_ID, V42_ROOT, buildV42SourceLedger, makeV42PrimarySchema, validateV42SourceLedger } from "./lib/v42-compact-transport.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const priorRoot = "docs/calibration/v4.1.9/schema-bounded-fresh-six-gate";
const priorPacket = JSON.parse(await readFile(path.resolve(root, `${priorRoot}/packets/debate-180.json`), "utf8"));
const priorFailure = JSON.parse(await readFile(path.resolve(root, `${priorRoot}/primary-failure-analysis.json`), "utf8"));
assertV4(priorFailure.status === "failed-long-context-timeout" && priorFailure.failedContext.debateNumber === "180" && !priorFailure.failedContext.rawOutputCreated, "v4.1.9 timeout diagnostic unavailable");
const [eventsBytes, transcriptBytes, manifestBytes] = await Promise.all([readFile(priorPacket.sourceChain.eventsPath), readFile(priorPacket.sourceChain.transcriptPath), readFile(priorPacket.sourceChain.localManifestPath)]);
const eventsDocument = JSON.parse(eventsBytes);
const sourceLedgerPath = ".assessment-cache/compact-ledgers/v4.2/debate-180.jsonl";
const sourceLedgerText = buildV42SourceLedger(eventsDocument);
const sourceLedgerBytes = Buffer.from(sourceLedgerText);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const ledgerValidation = validateV42SourceLedger(sourceLedgerBytes, eventsDocument, sha256(sourceLedgerBytes));
if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(root, sourceLedgerPath)), { recursive: true });
  await writeFile(path.resolve(root, sourceLedgerPath), sourceLedgerBytes);
}

const packet = {
  ...priorPacket,
  schemaVersion: V42_PACKET_VERSION,
  protocolId: V42_PROTOCOL_ID,
  sourceChain: { ...priorPacket.sourceChain, transcriptSha256: sha256(transcriptBytes), eventsSha256: sha256(eventsBytes), localManifestSha256: sha256(manifestBytes) },
  transportChain: { format: "jsonl rows [eventIndex,startMs,durationMs,text]", sourceLedgerPath, sourceLedgerSha256: sha256(sourceLedgerBytes), sourceLedgerBytes: sourceLedgerBytes.length, sourceLedgerEventCount: ledgerValidation.eventCount, replayExactToOriginalEvents: true },
  modelInputBoundary: { ...priorPacket.modelInputBoundary, completeTimestampedSourceLedgerRequired: true, plainTranscriptDeliveredToModel: false, originalEventsFileDeliveredToModel: false, originalTranscriptAndEventsStoredAndHashLockedLocally: true, historicalWorkflowAmendmentsDeliveredToModel: false, primaryRelevantRubricsDeliveredToModel: true, consolidatedPrimaryManualDeliveredToModel: true }
};
const packetPath = `${V42_ROOT}/packet.json`;
const schemaPath = `${V42_ROOT}/schema.json`;
const inputs = { rubricBase: "docs/reassessment-rubric-v4.0.md", rubricDerivedScores: "docs/reassessment-rubric-v4.0.1.md", rubricBounded: "docs/reassessment-rubric-v4.1.md", manual: `${V42_ROOT}/manual.md`, schema: schemaPath };
if (shouldWrite) {
  await mkdir(path.resolve(root, V42_ROOT), { recursive: true });
  await writeFile(path.resolve(root, packetPath), `${JSON.stringify(packet, null, 2)}\n`);
  await writeFile(path.resolve(root, schemaPath), `${JSON.stringify(makeV42PrimarySchema(), null, 2)}\n`);
}
const modelCopiedFiles = [...Object.values(inputs), packetPath, sourceLedgerPath];
const copiedBytes = {};
for (const file of modelCopiedFiles) copiedBytes[file] = file === packetPath && !shouldWrite ? Buffer.byteLength(`${JSON.stringify(packet, null, 2)}\n`) : file === schemaPath && !shouldWrite ? Buffer.byteLength(`${JSON.stringify(makeV42PrimarySchema(), null, 2)}\n`) : file === sourceLedgerPath ? sourceLedgerBytes.length : (await stat(path.resolve(root, file))).size;
const totalCopiedInputBytes = Object.values(copiedBytes).reduce((sum, bytes) => sum + bytes, 0);
const preparation = {
  schemaVersion: "4.2-compact-transport-smoke-preparation",
  protocolId: V42_PROTOCOL_ID,
  status: shouldWrite ? "prepared-retired-transport-smoke-no-model-execution" : "preview",
  developmentOnly: true,
  AIOnly: true,
  dyadicOnly: true,
  debate: { debateNumber: "180", debateId: packet.debateId, durationSeconds: packet.durationSeconds, priorFailure: `${priorRoot}/primary-failure-analysis.json`, packet: packetPath, sourceLedger: sourceLedgerPath, rawOutput: `${V42_ROOT}/primary-output.json`, compiledOutput: `${V42_ROOT}/primary-compiled.json` },
  model: { label: V42_MODEL.label, slug: V42_MODEL.slug, reasoningEffort: V42_MODEL.primaryReasoningEffort, authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0 },
  inputs,
  transport: { originalPlainTranscriptStoredLocally: true, originalEventsStoredLocally: true, sourceLedgerReplayExact: true, plainTranscriptDeliveredToModel: false, originalEventsDeliveredToModel: false, completeSourceTextDeliveredOnce: true, modelCopiedFiles, copiedBytes, totalCopiedInputBytes, priorV419CopiedInputBytes: priorFailure.inputShape.totalCopiedInputBytes, byteReduction: priorFailure.inputShape.totalCopiedInputBytes - totalCopiedInputBytes, reductionShare: Number((1 - totalCopiedInputBytes / priorFailure.inputShape.totalCopiedInputBytes).toFixed(6)) },
  judgmentPolicyChangedFromV419: false,
  totals: { debates: 1, modelContextsExecuted: 0, meteredApiCostUsd: 0, transcriptionApiCalls: 0, transcriptionCostUsd: 0 },
  authorization: { deterministicFixtures: true, executionManifest: false, primaryModelExecution: false, scoreDerivation: false, legacyComparison: false, freshGateSelection: false, productionMutation: false }
};
if (shouldWrite) await writeFile(path.resolve(root, `${V42_ROOT}/preparation-manifest.json`), `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, debateNumber: "180", sourceLedgerEvents: ledgerValidation.eventCount, sourceLedgerBytes: sourceLedgerBytes.length, priorCopiedInputBytes: preparation.transport.priorV419CopiedInputBytes, compactCopiedInputBytes: totalCopiedInputBytes, byteReduction: preparation.transport.byteReduction, reductionShare: preparation.transport.reductionShare, modelContextsExecuted: 0, meteredApiCostUsd: 0 }, null, 2));
