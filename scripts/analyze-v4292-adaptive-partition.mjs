#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { validateV429Proposal } from "./lib/v429-long-context-partition.mjs";
import { V4292_ROOT } from "./lib/v4292-adaptive-partition.mjs";

const shouldWrite = process.argv.includes("--write");
const [manifest, execution, preparation, inheritedExecution] = await Promise.all([
  readFile(`${V4292_ROOT}/execution-manifest.json`, "utf8").then(JSON.parse),
  readFile(`${V4292_ROOT}/model-execution.json`, "utf8").then(JSON.parse),
  readFile(`${V4292_ROOT}/preparation-manifest.json`, "utf8").then(JSON.parse),
  readFile("docs/calibration/v4.2.9.1/long-context-schema-recovery/model-execution.json", "utf8").then(JSON.parse)
]);
assertV4(execution.contextsAttempted === 2 && execution.authorization.analysis, "v4.2.9.2 complete execution unavailable");
const [packet, eventsBytes, fullLedgerBytes, inheritedOutput, inheritedChunkBytes] = await Promise.all([
  readFile(preparation.source.packet, "utf8").then(JSON.parse),
  readFile(preparation.source.originalEvents),
  readFile(preparation.source.fullLedger),
  readFile(preparation.inherited.derivedOutput, "utf8").then(JSON.parse),
  readFile(preparation.inherited.sourceChunk.chunkPath)
]);
const inheritedValidation = validateV429Proposal(inheritedOutput, packet, preparation.inherited.sourceChunk, JSON.parse(eventsBytes), eventsBytes, inheritedChunkBytes, fullLedgerBytes);
const chunks = [{ chunkId: "chunk-1", status: "valid-derived", elapsedMs: inheritedExecution.results.find((result) => result.chunkId === "chunk-1").elapsedMs, validation: inheritedValidation }];
const candidates = inheritedOutput.candidates.map((candidate) => ({ chunkId: "chunk-1", qualifiedCandidateId: `chunk-1:${candidate.candidateId}`, ...candidate }));
for (const chunk of preparation.chunks) {
  const result = execution.results.find((item) => item.chunkId === chunk.chunkId);
  if (!result.accepted) {
    chunks.push({ chunkId: chunk.chunkId, status: result.status, elapsedMs: result.elapsedMs, validationMessage: result.validationMessage ?? null });
    continue;
  }
  const [output, chunkBytes] = await Promise.all([readFile(chunk.rawOutput, "utf8").then(JSON.parse), readFile(chunk.chunkPath)]);
  const validation = validateV429Proposal(output, packet, chunk, JSON.parse(eventsBytes), eventsBytes, chunkBytes, fullLedgerBytes);
  chunks.push({ chunkId: chunk.chunkId, status: "valid", elapsedMs: result.elapsedMs, validation });
  for (const candidate of output.candidates) candidates.push({ chunkId: chunk.chunkId, qualifiedCandidateId: `${chunk.chunkId}:${candidate.candidateId}`, ...candidate });
}
const crossChunkSpanOverlaps = [];
for (let leftIndex = 0; leftIndex < candidates.length; leftIndex += 1) for (let rightIndex = leftIndex + 1; rightIndex < candidates.length; rightIndex += 1) {
  const left = candidates[leftIndex], right = candidates[rightIndex];
  if (left.chunkId === right.chunkId || left.side !== right.side) continue;
  const overlapStart = Math.max(left.sourceSpan.startEvent, right.sourceSpan.startEvent);
  const overlapEnd = Math.min(left.sourceSpan.endEvent, right.sourceSpan.endEvent);
  if (overlapStart <= overlapEnd) crossChunkSpanOverlaps.push({ leftCandidateId: left.qualifiedCandidateId, rightCandidateId: right.qualifiedCandidateId, overlapStartEvent: overlapStart, overlapEndEvent: overlapEnd });
}
const passed = execution.validContexts === 2;
const successfulLaneElapsedMs = chunks.filter((chunk) => chunk.status.startsWith("valid")).reduce((sum, chunk) => sum + chunk.elapsedMs, 0);
const analysis = {
  schemaVersion: "4.2.9.2-adaptive-partition-analysis",
  protocolId: manifest.protocolId,
  status: passed ? "adaptive-source-discovery-passed-integrated-primary-preparation-authorized" : "adaptive-source-discovery-failed",
  debateNumber: "99",
  developmentOnly: true,
  inheritedDerivation: preparation.inherited,
  completeSourceCoverage: preparation.coverage,
  chunks,
  candidates: { total: candidates.length, pro: candidates.filter((candidate) => candidate.side === "pro").length, con: candidates.filter((candidate) => candidate.side === "con").length, crossChunkSpanOverlaps },
  runtime: { newAdaptiveElapsedMs: execution.totalElapsedMs, newAdaptiveElapsedMinutes: Number((execution.totalElapsedMs / 60000).toFixed(2)), successfulLaneElapsedMs, successfulLaneElapsedMinutes: Number((successfulLaneElapsedMs / 60000).toFixed(2)), excludedDevelopmentTimeoutMs: 1800013 + 900009 },
  totals: { inheritedSemanticContexts: 1, newSemanticContexts: 2, semanticRetries: 0, scoresDerived: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  authorization: { integratedPrimaryPreparation: passed, integratedPrimaryExecution: false, scoreDerivation: false, freshGatePreparation: false, productionMutation: false, all195Debates: false }
};
if (shouldWrite) await writeFile(manifest.artifacts.analysis, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, chunksValid: chunks.filter((chunk) => chunk.status.startsWith("valid")).length, candidates: candidates.length, crossChunkSpanOverlaps: crossChunkSpanOverlaps.length, successfulLaneElapsedMinutes: analysis.runtime.successfulLaneElapsedMinutes, integratedPrimaryPreparationAuthorized: passed, semanticRetries: 0, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
