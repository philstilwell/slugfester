#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { assertV4, canonicalJson } from "./lib/v41-lean-production.mjs";
import { validateV429Proposal } from "./lib/v429-long-context-partition.mjs";
import { deriveMoveKindFromResponseIntent } from "./lib/v4292-adaptive-partition.mjs";

const ROOT = "docs/calibration/v4.2.9.3/partition-compiler-recovery";
const shouldWrite = process.argv.includes("--write");
const priorRoot = "docs/calibration/v4.2.9.2/adaptive-long-context-continuation";
const preparation = JSON.parse(await readFile(`${priorRoot}/preparation-manifest.json`, "utf8"));
const [packet, eventsBytes, fullLedgerBytes] = await Promise.all([readFile(preparation.source.packet, "utf8").then(JSON.parse), readFile(preparation.source.originalEvents), readFile(preparation.source.fullLedger)]);
const sources = [
  { chunk: preparation.inherited.sourceChunk, rawOutput: preparation.source.rawChunk1 },
  ...preparation.chunks.map((chunk) => ({ chunk, rawOutput: chunk.rawOutput }))
];
const outputs = [];
for (const source of sources) {
  const [raw, chunkBytes] = await Promise.all([readFile(source.rawOutput, "utf8").then(JSON.parse), readFile(source.chunk.chunkPath)]);
  const { derived, changedCandidateIds } = deriveMoveKindFromResponseIntent(raw);
  const validation = validateV429Proposal(derived, packet, source.chunk, JSON.parse(eventsBytes), eventsBytes, chunkBytes, fullLedgerBytes);
  const rawWithoutMoveKind = structuredClone(raw), derivedWithoutMoveKind = structuredClone(derived);
  for (const candidate of rawWithoutMoveKind.candidates) delete candidate.moveKind;
  for (const candidate of derivedWithoutMoveKind.candidates) delete candidate.moveKind;
  assertV4(canonicalJson(rawWithoutMoveKind) === canonicalJson(derivedWithoutMoveKind), `${source.chunk.chunkId}: unauthorized derived-field change`);
  const outputPath = `${ROOT}/proposals/${source.chunk.chunkId}-derived.json`;
  if (shouldWrite) {
    await mkdir(`${ROOT}/proposals`, { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(derived, null, 2)}\n`);
  }
  outputs.push({ chunk: source.chunk, rawOutput: source.rawOutput, derivedOutput: outputPath, changedCandidateIds, onlyMoveKindChanged: true, validation });
}

const candidates = [];
for (const output of outputs) {
  const derived = JSON.parse(await readFile(output.derivedOutput, "utf8"));
  for (const candidate of derived.candidates) candidates.push({ chunkId: output.chunk.chunkId, qualifiedCandidateId: `${output.chunk.chunkId}:${candidate.candidateId}`, ...candidate });
}
const crossChunkSpanOverlaps = [];
for (let leftIndex = 0; leftIndex < candidates.length; leftIndex += 1) for (let rightIndex = leftIndex + 1; rightIndex < candidates.length; rightIndex += 1) {
  const left = candidates[leftIndex], right = candidates[rightIndex];
  if (left.chunkId === right.chunkId || left.side !== right.side) continue;
  const overlapStart = Math.max(left.sourceSpan.startEvent, right.sourceSpan.startEvent), overlapEnd = Math.min(left.sourceSpan.endEvent, right.sourceSpan.endEvent);
  if (overlapStart <= overlapEnd) crossChunkSpanOverlaps.push({ leftCandidateId: left.qualifiedCandidateId, rightCandidateId: right.qualifiedCandidateId, overlapStartEvent: overlapStart, overlapEndEvent: overlapEnd });
}
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const outputRecords = [];
for (const output of outputs) outputRecords.push({ ...output, rawSha256: sha256(await readFile(output.rawOutput)), derivedSha256: sha256(await readFile(output.derivedOutput)) });
const result = {
  schemaVersion: "4.2.9.3-partition-compiler-recovery",
  status: "partition-compiler-recovery-passed-integrated-primary-preparation-authorized",
  debateNumber: "99",
  developmentOnly: true,
  derivation: { rule: "moveKind is constructive exactly when responseIntent.kind is constructive; otherwise reply", hybridCrossChunkLocalTargetsPermitted: true, localTargetIdsMustReferenceEarlierCandidates: true, modelCalls: 0 },
  outputs: outputRecords,
  sourceCoverage: preparation.coverage,
  candidates: { total: candidates.length, pro: candidates.filter((candidate) => candidate.side === "pro").length, con: candidates.filter((candidate) => candidate.side === "con").length, crossChunkSpanOverlaps },
  totals: { modelContexts: 0, semanticRetries: 0, scoresDerived: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  authorization: { integratedPrimaryPreparation: true, integratedPrimaryExecution: false, scoreDerivation: false, freshGatePreparation: false, productionMutation: false, all195Debates: false }
};
if (shouldWrite) await writeFile(`${ROOT}/analysis.json`, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ status: result.status, validatedChunks: outputs.length, candidates: candidates.length, derivedMoveKinds: outputs.flatMap((output) => output.changedCandidateIds), hybridCrossChunkLocalTargetsPermitted: true, integratedPrimaryPreparationAuthorized: true, modelCalls: 0, scoresDerived: 0 }, null, 2));
