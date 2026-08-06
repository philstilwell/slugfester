#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { buildV4220SourcePacket } from "./lib/v4220-source-span-rendering.mjs";
import { buildV42219ChunkLedger, parseV42219Ledger, planV42219Partition, validateV42219ChunkLedger, validateV42219PartitionPlan } from "./lib/v42219-generalized-partition.mjs";
import { makeV422112DiscoverySchema } from "./lib/v422112-simplified-discovery.mjs";

const shouldWrite = process.argv.includes("--write");
const samplePath = "docs/calibration/v4.2.21.17.9/new-held-out-five/source-only-sample.json";
const screeningPath = "docs/calibration/v4.2.21.17.9/new-held-out-five/sample-screening.json";
const root = "docs/calibration/v4.2.21.17.10/held-out-source-preparation";
const manualPath = "docs/calibration/v4.2.21.12/simplified-partition-discovery/manual.md";
const [sample, screening, manualBytes] = await Promise.all([readFile(samplePath, "utf8").then(JSON.parse), readFile(screeningPath, "utf8").then(JSON.parse), readFile(manualPath)]);
assertV4(screening.status === "new-held-out-five-screened-source-preparation-authorized" && screening.authorization.sourcePacketPreparation, "held-out source preparation is not authorized");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const contexts = [];
for (const debate of sample.debates) {
  const base = `.assessment-cache/captions/${debate.videoId}`;
  const transcriptPath = `${base}/transcript.txt`;
  const eventsPath = `${base}/events.json`;
  const manifestPath = `${base}/manifest.json`;
  const fullLedgerPath = `.assessment-cache/compact-ledgers/v4.2.21.17.10/debate-${debate.number}.jsonl`;
  const [transcriptBytes, eventsBytes, manifestBytes] = await Promise.all([transcriptPath, eventsPath, manifestPath].map((file) => readFile(file)));
  const built = buildV4220SourcePacket({ debate, transcriptPath, eventsPath, manifestPath, sourceLedgerPath: fullLedgerPath, transcriptBytes, eventsBytes, manifestBytes });
  assertV4(built.packet.eventCount === debate.sourceLedgerEvents && built.sourceLedgerBytes.length === debate.sourceLedgerBytes, `${debate.number}: frozen source measurement changed`);
  const ledgerEvents = parseV42219Ledger(built.sourceLedgerBytes).length;
  const planOverrides = ledgerEvents <= 900 ? { contextEventsMaximum: Math.max(120, Math.ceil(ledgerEvents / 2) + 40) } : {};
  const plan = { ...planV42219Partition(built.sourceLedgerBytes, planOverrides), debateNumber: debate.number, debateId: debate.debateId, frozenRoute: debate.route };
  validateV42219PartitionPlan(plan, built.sourceLedgerBytes);
  const planPath = `${root}/plans/debate-${debate.number}.json`;
  const planBytes = Buffer.from(`${JSON.stringify(plan, null, 2)}\n`);
  const packet = structuredClone(built.packet);
  packet.schemaVersion = "4.2.21.17.10-held-out-source-packet";
  packet.protocolId = "v4.2.21.17.10-held-out-source-preparation";
  packet.transportChain.partitionPlanPath = planPath;
  packet.transportChain.partitionPlanSha256 = sha256(planBytes);
  packet.transportChain.partitionChunks = plan.chunks.length;
  packet.modelInputBoundary = { distributedTranscriptCoverageRequired: true, completeChunkContextRequired: true, everySourceEventOwnedExactlyOnce: true, boundaryContextMayRepeat: true, candidateStartMustBeInOwnedCore: true, candidateMayExtendIntoLockedLookahead: true, modelSuppliedSourceMillisecondsProhibited: true, modelAuthoredEvidenceTextProhibited: true, modelAuthoredTargetIdsProhibited: true, scoreBlindDiscoveryOnly: true, legacyAssessmentsPriorJudgmentsScoresWinnersAndPublicationProseUnavailable: true };
  const packetPath = `${root}/packets/debate-${debate.number}.json`;
  const packetBytes = Buffer.from(`${JSON.stringify(packet, null, 2)}\n`);
  const chunks = [];
  for (const chunk of plan.chunks) {
    const chunkBytes = buildV42219ChunkLedger(built.sourceLedgerBytes, chunk);
    validateV42219ChunkLedger(chunkBytes, built.sourceLedgerBytes, chunk);
    const chunkLedgerPath = `.assessment-cache/partition-ledgers/v4.2.21.17.10/debate-${debate.number}/${chunk.chunkId}.jsonl`;
    const schemaPath = `${root}/schemas/debate-${debate.number}-${chunk.chunkId}.schema.json`;
    const schemaBytes = Buffer.from(`${JSON.stringify(makeV422112DiscoverySchema({ packet, chunk }), null, 2)}\n`);
    if (shouldWrite) { await mkdir(path.dirname(chunkLedgerPath), { recursive: true }); await mkdir(path.dirname(schemaPath), { recursive: true }); await writeFile(chunkLedgerPath, chunkBytes); await writeFile(schemaPath, schemaBytes); }
    chunks.push({ ...chunk, chunkLedgerPath, chunkLedgerSha256: sha256(chunkBytes), schemaPath, schemaSha256: sha256(schemaBytes), copiedInputBytes: manualBytes.length + packetBytes.length + schemaBytes.length + chunkBytes.length, rawOutput: `${root}/discovery-outputs/debate-${debate.number}-${chunk.chunkId}.json` });
  }
  if (shouldWrite) { await mkdir(path.dirname(fullLedgerPath), { recursive: true }); await mkdir(path.dirname(planPath), { recursive: true }); await mkdir(path.dirname(packetPath), { recursive: true }); await writeFile(fullLedgerPath, built.sourceLedgerBytes); await writeFile(planPath, planBytes); await writeFile(packetPath, packetBytes); }
  contexts.push({ debateNumber: debate.number, debateId: debate.debateId, frozenRoute: debate.route, partitionSeverity: debate.partitionSeverity, packet: packetPath, packetSha256: sha256(packetBytes), plan: planPath, planSha256: sha256(planBytes), fullLedger: fullLedgerPath, fullLedgerSha256: sha256(built.sourceLedgerBytes), originalTranscript: transcriptPath, originalEvents: eventsPath, originalManifest: manifestPath, originalEventsSha256: sha256(eventsBytes), sourceEvents: built.packet.eventCount, sourceBytes: built.sourceLedgerBytes.length, chunks });
}
const preparation = { schemaVersion: "4.2.21.17.10-held-out-source-preparation", protocolId: "v4.2.21.17.10-held-out-source-preparation", status: shouldWrite ? "five-held-out-source-and-discovery-contexts-prepared" : "preview", calibrationOnly: true, AIOnly: true, sourceBoundary: { transcriptContentSemanticallyInspectedByPreparation: false, mechanicalSourceParsingOnly: true, audioAccessed: false, legacyAssessmentContentAccessed: false, priorJudgmentsAccessed: false }, model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "low", authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0 }, inputs: { sample: samplePath, screening: screeningPath, discoveryManual: manualPath }, contexts, totals: { debates: 5, direct: contexts.filter((context) => context.frozenRoute === "direct").length, partition: contexts.filter((context) => context.frozenRoute === "partition").length, discoveryContexts: contexts.reduce((sum, context) => sum + context.chunks.length, 0), sourceEvents: contexts.reduce((sum, context) => sum + context.sourceEvents, 0), copiedDiscoveryInputBytes: contexts.flatMap((context) => context.chunks).reduce((sum, chunk) => sum + chunk.copiedInputBytes, 0), maximumCopiedInputBytes: Math.max(...contexts.flatMap((context) => context.chunks.map((chunk) => chunk.copiedInputBytes))), modelContextsExecuted: 0, audioCalls: 0, scoresDerived: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, authorization: { deterministicValidation: true, discoveryExecutionManifest: true, discoveryModelExecution: false, inventoryExecution: false, independentJudgmentExecution: false, adjudicationExecution: false, scoreDerivation: false, publicationFinalization: false, productionMutation: false, all195Debates: false } };
if (shouldWrite) await writeFile(`${root}/preparation-manifest.json`, `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, debates: contexts.map((context) => ({ debateNumber: context.debateNumber, route: context.frozenRoute, severity: context.partitionSeverity, sourceEvents: context.sourceEvents, chunks: context.chunks.length, maximumCopiedInputKilobytes: Math.round(Math.max(...context.chunks.map((chunk) => chunk.copiedInputBytes)) / 1000) })), totals: preparation.totals, modelExecutionAuthorized: false }, null, 2));
