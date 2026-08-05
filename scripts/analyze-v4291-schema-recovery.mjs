#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { V4291_ROOT } from "./lib/v4291-schema-recovery.mjs";
import { validateV429Proposal } from "./lib/v429-long-context-partition.mjs";

const shouldWrite = process.argv.includes("--write");
const [manifest, execution, preparation] = await Promise.all([
  readFile(`${V4291_ROOT}/execution-manifest.json`, "utf8").then(JSON.parse),
  readFile(`${V4291_ROOT}/model-execution.json`, "utf8").then(JSON.parse),
  readFile(`${V4291_ROOT}/preparation-manifest.json`, "utf8").then(JSON.parse)
]);
assertV4(execution.contextsAttempted === 2 && execution.authorization.analysis, "v4.2.9.1 complete execution unavailable");
const [packet, eventsBytes, fullLedgerBytes] = await Promise.all([readFile(preparation.source.packet, "utf8").then(JSON.parse), readFile(preparation.source.originalEvents), readFile(preparation.source.fullLedger)]);
const chunks = [];
const candidates = [];
for (const chunk of preparation.chunks) {
  const result = execution.results.find((item) => item.chunkId === chunk.chunkId);
  if (!result.accepted) {
    chunks.push({ chunkId: chunk.chunkId, status: result.status, elapsedMs: result.elapsedMs, validationMessage: result.validationMessage ?? null });
    continue;
  }
  const [output, chunkBytes] = await Promise.all([readFile(chunk.rawOutput, "utf8").then(JSON.parse), readFile(chunk.chunkPath)]);
  const validation = validateV429Proposal(output, packet, chunk, JSON.parse(eventsBytes), eventsBytes, chunkBytes, fullLedgerBytes);
  chunks.push({ chunkId: chunk.chunkId, status: "valid", elapsedMs: result.elapsedMs, validation });
  for (const candidate of output.candidates) candidates.push({ chunkId: chunk.chunkId, ...candidate });
}
const crossChunkSpanOverlaps = [];
for (let leftIndex = 0; leftIndex < candidates.length; leftIndex += 1) for (let rightIndex = leftIndex + 1; rightIndex < candidates.length; rightIndex += 1) {
  const left = candidates[leftIndex], right = candidates[rightIndex];
  if (left.chunkId === right.chunkId || left.side !== right.side) continue;
  const overlapStart = Math.max(left.sourceSpan.startEvent, right.sourceSpan.startEvent);
  const overlapEnd = Math.min(left.sourceSpan.endEvent, right.sourceSpan.endEvent);
  if (overlapStart <= overlapEnd) crossChunkSpanOverlaps.push({ leftChunkId: left.chunkId, leftCandidateId: left.candidateId, rightChunkId: right.chunkId, rightCandidateId: right.candidateId, overlapStartEvent: overlapStart, overlapEndEvent: overlapEnd });
}
const passed = execution.validContexts === 2;
const analysis = {
  schemaVersion: "4.2.9.1-long-context-schema-recovery-analysis",
  protocolId: manifest.protocolId,
  status: passed ? "schema-recovered-partition-passed-integrated-primary-preparation-authorized" : "schema-recovered-partition-failed",
  debateNumber: "99",
  developmentOnly: true,
  diagnosis: preparation.diagnosis,
  completeSourceCoverage: preparation.coverage,
  chunks,
  candidates: { total: candidates.length, pro: candidates.filter((candidate) => candidate.side === "pro").length, con: candidates.filter((candidate) => candidate.side === "con").length, crossChunkSpanOverlaps },
  runtime: { schemaRecoveryProposalElapsedMs: execution.totalElapsedMs, schemaRecoveryProposalElapsedMinutes: Number((execution.totalElapsedMs / 60000).toFixed(2)), priorRejectedRequestElapsedMs: 5514, priorWholePrimaryTimeoutMs: 1800013 },
  totals: { schemaRecoveryModelContexts: 2, semanticRetries: 0, priorRejectedBeforeInference: 2, technicalProbeModelContexts: preparation.diagnosis.technicalProbeModelContexts, scoresDerived: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  authorization: { integratedPrimaryPreparation: passed, integratedPrimaryExecution: false, scoreDerivation: false, freshGatePreparation: false, productionMutation: false, all195Debates: false }
};
if (shouldWrite) await writeFile(manifest.artifacts.analysis, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify({ status: analysis.status, chunksValid: execution.validContexts, candidates: candidates.length, crossChunkSpanOverlaps: crossChunkSpanOverlaps.length, proposalElapsedMinutes: analysis.runtime.schemaRecoveryProposalElapsedMinutes, integratedPrimaryPreparationAuthorized: passed, semanticRetries: 0, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
