#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { validateV429Proposal, parseLedger, validateV429ChunkLedger } from "./lib/v429-long-context-partition.mjs";
import { V4292_CHUNKS, V4292_PROTOCOL_ID, V4292_ROOT, deriveMoveKindFromResponseIntent, makeV4292ProposalSchema } from "./lib/v4292-adaptive-partition.mjs";

const shouldWrite = process.argv.includes("--write");
const priorRoot = "docs/calibration/v4.2.9.1/long-context-schema-recovery";
const [priorPreparation, priorExecution, rawChunk1] = await Promise.all([
  readFile(`${priorRoot}/preparation-manifest.json`, "utf8").then(JSON.parse),
  readFile(`${priorRoot}/model-execution.json`, "utf8").then(JSON.parse),
  readFile(`${priorRoot}/proposals/chunk-1.json`, "utf8").then(JSON.parse)
]);
const chunk1Result = priorExecution.results.find((result) => result.chunkId === "chunk-1");
const chunk2Result = priorExecution.results.find((result) => result.chunkId === "chunk-2");
assertV4(chunk1Result.status === "output-validation-failed" && chunk2Result.status === "timed-out" && !chunk2Result.rawOutputWritten, "v4.2.9.1 mixed failure record unavailable");
const chunk1 = priorPreparation.chunks.find((chunk) => chunk.chunkId === "chunk-1");
const [packet, eventsBytes, fullLedgerBytes, chunk1Bytes] = await Promise.all([
  readFile(priorPreparation.source.packet, "utf8").then(JSON.parse),
  readFile(priorPreparation.source.originalEvents),
  readFile(priorPreparation.source.fullLedger),
  readFile(chunk1.chunkPath)
]);
const { derived: derivedChunk1, changedCandidateIds } = deriveMoveKindFromResponseIntent(rawChunk1);
assertV4(changedCandidateIds.length === 1 && changedCandidateIds[0] === "c6-pantheism-simpler", "unexpected inherited candidate derivation");
const inheritedValidation = validateV429Proposal(derivedChunk1, packet, chunk1, JSON.parse(eventsBytes), eventsBytes, chunk1Bytes, fullLedgerBytes);
const inheritedOutput = `${V4292_ROOT}/inherited/chunk-1-derived.json`;
if (shouldWrite) {
  await mkdir(`${V4292_ROOT}/inherited`, { recursive: true });
  await writeFile(inheritedOutput, `${JSON.stringify(derivedChunk1, null, 2)}\n`);
}

const fullRows = parseLedger(fullLedgerBytes);
const chunks = [];
for (const chunk of V4292_CHUNKS) {
  const rows = fullRows.slice(chunk.startEvent, chunk.endEvent + 1);
  const bytes = Buffer.from(rows.map(JSON.stringify).join("\n") + "\n");
  const chunkPath = `${V4292_ROOT}/chunks/${chunk.chunkId}.jsonl`;
  if (shouldWrite) {
    await mkdir(`${V4292_ROOT}/chunks`, { recursive: true });
    await writeFile(chunkPath, bytes);
  }
  validateV429ChunkLedger(bytes, fullLedgerBytes, chunk);
  chunks.push({ ...chunk, chunkPath, chunkSha256: createHash("sha256").update(bytes).digest("hex"), rows: rows.length, bytes: bytes.length, rawOutput: `${V4292_ROOT}/proposals/${chunk.chunkId}.json` });
}
const schemaPath = `${V4292_ROOT}/schema.json`;
if (shouldWrite) {
  await mkdir(V4292_ROOT, { recursive: true });
  await writeFile(schemaPath, `${JSON.stringify(makeV4292ProposalSchema(), null, 2)}\n`);
}
const preparation = {
  schemaVersion: "4.2.9.2-adaptive-partition-preparation",
  protocolId: V4292_PROTOCOL_ID,
  proposalProtocolId: priorPreparation.proposalProtocolId,
  status: shouldWrite ? "prepared-preserved-first-plus-two-smaller-continuations" : "preview",
  developmentOnly: true,
  AIOnly: true,
  debateNumber: "99",
  model: priorPreparation.model,
  source: { ...priorPreparation.source, priorPreparation: `${priorRoot}/preparation-manifest.json`, priorExecution: `${priorRoot}/model-execution.json`, priorAnalysis: `${priorRoot}/analysis.json`, rawChunk1: `${priorRoot}/proposals/chunk-1.json` },
  modelInputs: { ...priorPreparation.modelInputs, schema: schemaPath },
  inherited: { chunkId: "chunk-1", sourceChunk: chunk1, rawOutput: `${priorRoot}/proposals/chunk-1.json`, derivedOutput: inheritedOutput, changedCandidateIds, derivationRule: "moveKind = constructive only when responseIntent.kind is constructive; otherwise reply", allOtherCandidateFieldsImmutable: true, validation: inheritedValidation },
  chunks,
  coverage: { originalEvents: packet.eventCount, ranges: [{ chunkId: "chunk-1", startEvent: 0, endEvent: 1758 }, ...chunks.map(({ chunkId, startEvent, endEvent }) => ({ chunkId, startEvent, endEvent }))], overlapEventsPerBoundary: 121, complete: true },
  policy: { scoreBlindSourceDiscoveryOnly: true, newContexts: 2, attemptsPerNewContext: 1, semanticRetries: 0, timeoutMs: 600000, scoresAuthorized: false },
  authorization: { executionManifest: false, twoAdaptiveProposalContexts: false, integratedPrimaryPreparation: false, scoreDerivation: false, productionMutation: false }
};
if (shouldWrite) await writeFile(`${V4292_ROOT}/preparation-manifest.json`, `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, inheritedCandidates: derivedChunk1.candidates.length, derivedFieldsChanged: changedCandidateIds, newChunks: chunks.map(({ chunkId, startEvent, endEvent, rows, bytes }) => ({ chunkId, startEvent, endEvent, rows, bytes })), completeCoverage: true, semanticRetries: 0, meteredApiCostUsdMaximum: 0 }, null, 2));
