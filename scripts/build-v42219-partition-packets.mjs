#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { classifyV4219PrimaryRoute } from "./lib/v4219-primary-recovery.mjs";
import { buildV4220SourcePacket } from "./lib/v4220-source-span-rendering.mjs";
import {
  buildV42219ChunkLedger,
  makeV42219DiscoverySchema,
  planV42219Partition,
  V42219_MODEL,
  V42219_PROTOCOL_ID,
  V42219_ROOT
} from "./lib/v42219-generalized-partition.mjs";

const shouldWrite = process.argv.includes("--write");
const samplePath = "docs/calibration/v4.2.21.8/held-out-five/source-only-sample.json";
const screeningPath = "docs/calibration/v4.2.21.8/held-out-five/sample-screening.json";
const designPath = `${V42219_ROOT}/design-manifest.json`;
const manualPath = `${V42219_ROOT}/discovery-manual.md`;
const [sample, screening, design] = await Promise.all([samplePath, screeningPath, designPath].map((file) => readFile(file, "utf8").then(JSON.parse)));
assertV4(screening.status === "held-out-five-screened-lane-preparation-authorized" && screening.authorization.partitionLaneDesign, "v4.2.21.8 screening unavailable");
assertV4(design.status === "generalized-partition-design-frozen-packet-preparation-authorized" && design.authorization.partitionLanePacketPreparation, "v4.2.21.9 design authorization unavailable");
assertV4(sample.debates.filter((debate) => debate.route === "partition").length === 3, "expected three frozen partition debates");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const manualBytes = await readFile(manualPath);
const contexts = [];

for (const debate of sample.debates.filter((item) => item.route === "partition")) {
  const base = `.assessment-cache/captions/${debate.videoId}`;
  const transcriptPath = `${base}/transcript.txt`;
  const eventsPath = `${base}/events.json`;
  const manifestPath = `${base}/manifest.json`;
  const fullLedgerPath = `.assessment-cache/compact-ledgers/v4.2.21.9/debate-${debate.number}.jsonl`;
  const [transcriptBytes, eventsBytes, manifestBytes] = await Promise.all([transcriptPath, eventsPath, manifestPath].map((file) => readFile(file)));
  const built = buildV4220SourcePacket({ debate, transcriptPath, eventsPath, manifestPath, sourceLedgerPath: fullLedgerPath, transcriptBytes, eventsBytes, manifestBytes });
  const frozenRoute = classifyV4219PrimaryRoute({ sourceLedgerEvents: built.packet.eventCount, compactCopiedInputBytes: debate.compactCopiedInputBytes });
  assertV4(frozenRoute.route === "partition" && built.packet.eventCount === debate.sourceLedgerEvents && built.sourceLedgerBytes.length === debate.sourceLedgerBytes, `${debate.number}: frozen partition transport measurement changed`);
  const plan = { ...planV42219Partition(built.sourceLedgerBytes), debateNumber: debate.number, debateId: debate.debateId };
  const planPath = `${V42219_ROOT}/plans/debate-${debate.number}.json`;
  const planBytes = Buffer.from(`${JSON.stringify(plan, null, 2)}\n`);
  const packetPath = `${V42219_ROOT}/packets/debate-${debate.number}.json`;
  const packet = structuredClone(built.packet);
  packet.schemaVersion = "4.2.21.9-partition-source-packet";
  packet.protocolId = V42219_PROTOCOL_ID;
  packet.transportChain.partitionPlanPath = planPath;
  packet.transportChain.partitionPlanSha256 = sha256(planBytes);
  packet.transportChain.partitionChunks = plan.chunks.length;
  packet.modelInputBoundary = {
    distributedTranscriptCoverageRequired: true,
    wholeSourceLedgerDeliveredInOneContext: false,
    completeChunkContextRequired: true,
    chunkContextIsExactSourceLedgerSlice: true,
    everySourceEventOwnedExactlyOnce: true,
    boundaryContextMayRepeat: true,
    candidateStartMustBeInOwnedCore: true,
    candidateMayExtendIntoLockedLookahead: true,
    modelSuppliedSourceMillisecondsProhibited: true,
    modelAuthoredEvidenceTextProhibited: true,
    modelAuthoredMoveKindProhibited: true,
    scoreBlindDiscoveryOnly: true,
    legacyAssessmentsUnavailable: true,
    priorJudgmentsUnavailable: true,
    ratingsScoresWinnersAndAssessmentProseUnavailable: true
  };
  const packetBytes = Buffer.from(`${JSON.stringify(packet, null, 2)}\n`);
  const chunks = [];
  for (const chunk of plan.chunks) {
    const chunkLedgerBytes = buildV42219ChunkLedger(built.sourceLedgerBytes, chunk);
    const chunkLedgerPath = `.assessment-cache/partition-ledgers/v4.2.21.9/debate-${debate.number}/${chunk.chunkId}.jsonl`;
    const schemaPath = `${V42219_ROOT}/schemas/debate-${debate.number}-${chunk.chunkId}.schema.json`;
    const schemaBytes = Buffer.from(`${JSON.stringify(makeV42219DiscoverySchema({ packet, chunk }), null, 2)}\n`);
    const copiedInputBytes = manualBytes.length + packetBytes.length + schemaBytes.length + chunkLedgerBytes.length;
    if (shouldWrite) {
      await mkdir(path.dirname(chunkLedgerPath), { recursive: true });
      await mkdir(path.dirname(schemaPath), { recursive: true });
      await writeFile(chunkLedgerPath, chunkLedgerBytes);
      await writeFile(schemaPath, schemaBytes);
    }
    chunks.push({
      ...chunk,
      chunkLedgerPath,
      chunkLedgerSha256: sha256(chunkLedgerBytes),
      schemaPath,
      schemaSha256: sha256(schemaBytes),
      copiedInputBytes,
      rawOutput: `${V42219_ROOT}/discovery-outputs/debate-${debate.number}-${chunk.chunkId}.json`
    });
  }
  if (shouldWrite) {
    await mkdir(path.dirname(fullLedgerPath), { recursive: true });
    await mkdir(path.dirname(planPath), { recursive: true });
    await mkdir(path.dirname(packetPath), { recursive: true });
    await writeFile(fullLedgerPath, built.sourceLedgerBytes);
    await writeFile(planPath, planBytes);
    await writeFile(packetPath, packetBytes);
  }
  contexts.push({
    debateNumber: debate.number,
    debateId: debate.debateId,
    partitionSeverity: debate.partitionSeverity,
    packet: packetPath,
    packetSha256: sha256(packetBytes),
    plan: planPath,
    planSha256: sha256(planBytes),
    fullLedger: fullLedgerPath,
    fullLedgerSha256: sha256(built.sourceLedgerBytes),
    originalTranscript: transcriptPath,
    originalEvents: eventsPath,
    originalManifest: manifestPath,
    originalEventsSha256: sha256(eventsBytes),
    sourceEvents: built.packet.eventCount,
    sourceBytes: built.sourceLedgerBytes.length,
    chunks,
    repeatedContextEvents: chunks.reduce((sum, chunk) => sum + chunk.contextEvents, 0) - built.packet.eventCount,
    repeatedContextBytes: chunks.reduce((sum, chunk) => sum + chunk.contextBytes, 0) - built.sourceLedgerBytes.length
  });
}

const preparation = {
  schemaVersion: "4.2.21.9-partition-packet-preparation",
  protocolId: V42219_PROTOCOL_ID,
  status: shouldWrite ? "three-partition-contexts-prepared-structural-primary-design-required" : "preview",
  calibrationOnly: true,
  AIOnly: true,
  sourceBoundary: { transcriptContentSemanticallyInspected: false, mechanicalSourceParsingOnly: true, audioAccessed: false, legacyAssessmentContentAccessed: false, priorJudgmentsAccessed: false },
  model: { ...V42219_MODEL, authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0 },
  inputs: { sample: samplePath, screening: screeningPath, design: designPath, discoveryManual: manualPath },
  contexts,
  totals: {
    debates: contexts.length,
    discoveryContexts: contexts.reduce((sum, context) => sum + context.chunks.length, 0),
    sourceEvents: contexts.reduce((sum, context) => sum + context.sourceEvents, 0),
    repeatedContextEvents: contexts.reduce((sum, context) => sum + context.repeatedContextEvents, 0),
    sourceBytes: contexts.reduce((sum, context) => sum + context.sourceBytes, 0),
    repeatedContextBytes: contexts.reduce((sum, context) => sum + context.repeatedContextBytes, 0),
    copiedDiscoveryInputBytes: contexts.flatMap((context) => context.chunks).reduce((sum, chunk) => sum + chunk.copiedInputBytes, 0),
    modelContextsExecuted: 0,
    audioCalls: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0
  },
  authorization: { packetValidation: true, candidateGroundedStructuralPrimaryDesign: true, discoveryExecutionManifest: false, discoveryModelExecution: false, primaryModelExecution: false, passBModelExecution: false, audioExecution: false, adjudicationModelExecution: false, scoreDerivation: false, publicationFinalization: false, productionMutation: false, all195Debates: false }
};
if (shouldWrite) await writeFile(`${V42219_ROOT}/preparation-manifest.json`, `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, debates: contexts.map((context) => ({ debateNumber: context.debateNumber, severity: context.partitionSeverity, sourceEvents: context.sourceEvents, chunks: context.chunks.length, maximumChunkEvents: Math.max(...context.chunks.map((chunk) => chunk.contextEvents)), maximumChunkKilobytes: Math.round(Math.max(...context.chunks.map((chunk) => chunk.contextBytes)) / 1000), repeatedContextEvents: context.repeatedContextEvents })), discoveryContexts: preparation.totals.discoveryContexts, copiedDiscoveryInputMegabytes: Number((preparation.totals.copiedDiscoveryInputBytes / 1000000).toFixed(2)), modelContextsExecuted: 0, audioCalls: 0, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
