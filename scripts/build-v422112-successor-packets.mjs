#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { makeV422112DiscoverySchema, V422112_MODEL, V422112_PROTOCOL_ID, V422112_ROOT } from "./lib/v422112-simplified-discovery.mjs";

const shouldWrite = process.argv.includes("--write");
const predecessorPreparationPath = "docs/calibration/v4.2.21.9/generalized-partition/preparation-manifest.json";
const designPath = `${V422112_ROOT}/design-manifest.json`;
const manualPath = `${V422112_ROOT}/manual.md`;
const [predecessor, design, manualBytes] = await Promise.all([readFile(predecessorPreparationPath, "utf8").then(JSON.parse), readFile(designPath, "utf8").then(JSON.parse), readFile(manualPath)]);
assertV4(predecessor.status === "three-partition-contexts-prepared-structural-primary-design-required" && predecessor.contexts.length === 3, "predecessor partition sources unavailable");
assertV4(design.status === "simplified-discovery-design-frozen-packet-preparation-authorized" && design.authorization.successorPacketPreparation && !design.predecessorBoundary.acceptedOutputsReusedForAssessment, "simplified discovery design unavailable");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const contexts = [];
for (const predecessorContext of predecessor.contexts) {
  const oldPacket = JSON.parse(await readFile(predecessorContext.packet, "utf8"));
  const packet = structuredClone(oldPacket);
  packet.schemaVersion = "4.2.21.12-simplified-partition-source-packet";
  packet.protocolId = V422112_PROTOCOL_ID;
  packet.modelInputBoundary.candidateTargetIdsProhibited = true;
  packet.modelInputBoundary.selectedMoveTargetTopologyDeferredToPrimaryA = true;
  const packetPath = `${V422112_ROOT}/packets/debate-${predecessorContext.debateNumber}.json`;
  const packetBytes = Buffer.from(`${JSON.stringify(packet, null, 2)}\n`);
  const chunks = [];
  for (const predecessorChunk of predecessorContext.chunks) {
    const schemaPath = `${V422112_ROOT}/schemas/debate-${predecessorContext.debateNumber}-${predecessorChunk.chunkId}.schema.json`;
    const schemaBytes = Buffer.from(`${JSON.stringify(makeV422112DiscoverySchema({ packet, chunk: predecessorChunk }), null, 2)}\n`);
    const chunkBytes = await readFile(predecessorChunk.chunkLedgerPath);
    assertV4(sha256(chunkBytes) === predecessorChunk.chunkLedgerSha256, `${predecessorContext.debateNumber}/${predecessorChunk.chunkId}: predecessor source changed`);
    if (shouldWrite) { await mkdir(path.dirname(schemaPath), { recursive: true }); await writeFile(schemaPath, schemaBytes); }
    chunks.push({ ...predecessorChunk, schemaPath, schemaSha256: sha256(schemaBytes), copiedInputBytes: manualBytes.length + packetBytes.length + schemaBytes.length + chunkBytes.length, rawOutput: `${V422112_ROOT}/discovery-outputs/debate-${predecessorContext.debateNumber}-${predecessorChunk.chunkId}.json` });
  }
  if (shouldWrite) { await mkdir(path.dirname(packetPath), { recursive: true }); await writeFile(packetPath, packetBytes); }
  contexts.push({ ...predecessorContext, packet: packetPath, packetSha256: sha256(packetBytes), chunks });
}
const preparation = { schemaVersion: "4.2.21.12-simplified-discovery-preparation", protocolId: V422112_PROTOCOL_ID, status: shouldWrite ? "twelve-simplified-discovery-contexts-prepared-execution-manifest-authorized" : "preview", calibrationOnly: true, AIOnly: true, sourceBoundary: { predecessorOutputsReadForAssessment: false, predecessorOutputsCopied: false, sourcePlansAndLedgersReusedExactly: true, transcriptContentSemanticallyInspected: false, mechanicalSourcePreparationOnly: true, audioAccessed: false, legacyAssessmentContentAccessed: false }, model: { ...V422112_MODEL, authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0 }, inputs: { predecessorPreparation: predecessorPreparationPath, design: designPath, manual: manualPath }, contexts, totals: { debates: contexts.length, discoveryContexts: contexts.reduce((sum, context) => sum + context.chunks.length, 0), copiedInputBytes: contexts.flatMap((context) => context.chunks).reduce((sum, chunk) => sum + chunk.copiedInputBytes, 0), modelContextsExecuted: 0, audioCalls: 0, scoresDerived: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, authorization: { deterministicValidation: true, executionManifest: true, modelExecution: false, candidateCompilation: false, primaryExecution: false, scoreDerivation: false, productionMutation: false, all195Debates: false } };
if (shouldWrite) await writeFile(`${V422112_ROOT}/preparation-manifest.json`, `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, debates: contexts.map((context) => ({ debateNumber: context.debateNumber, chunks: context.chunks.length })), discoveryContexts: preparation.totals.discoveryContexts, copiedInputMegabytes: Number((preparation.totals.copiedInputBytes / 1000000).toFixed(2)), predecessorOutputsReused: false, modelContextsExecuted: 0, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
