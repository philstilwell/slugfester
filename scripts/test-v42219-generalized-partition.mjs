#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  buildV42219ChunkLedger,
  compileV42219CandidateBundle,
  makeV42219DiscoverySchema,
  planV42219Partition,
  serializeV42219Rows,
  validateV42219ChunkLedger,
  validateV42219Discovery,
  validateV42219PartitionPlan,
  V42219_MODEL,
  V42219_OUTPUT_VERSION,
  V42219_PROTOCOL_ID
} from "./lib/v42219-generalized-partition.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const rows = Array.from({ length: 37 }, (_, index) => [index, index * 1000, 1000, `Event ${index} supplies a sufficiently long synthetic argument passage with twelve or more lexical tokens for exact validation.`]);
const ledgerBytes = serializeV42219Rows(rows);
const eventsDocument = rows.map((row) => ({ startMs: row[1], durationMs: row[2], text: row[3] }));
const eventsBytes = Buffer.from(`${JSON.stringify(eventsDocument, null, 2)}\n`);
const plan = planV42219Partition(ledgerBytes, { contextEventsMaximum: 12, contextBytesMaximum: 10000, boundaryContextEvents: 2, candidatesPerChunkMaximum: 10 });
assert.ok(plan.chunks.length > 1);
assert.deepEqual(plan, planV42219Partition(ledgerBytes, { contextEventsMaximum: 12, contextBytesMaximum: 10000, boundaryContextEvents: 2, candidatesPerChunkMaximum: 10 }));
assert.equal(validateV42219PartitionPlan(plan, ledgerBytes).exactOwnedCoverage, true);
assert.equal(plan.chunks.reduce((sum, chunk) => sum + chunk.coreEvents, 0), rows.length);
for (const chunk of plan.chunks) {
  const bytes = buildV42219ChunkLedger(ledgerBytes, chunk);
  assert.equal(validateV42219ChunkLedger(bytes, ledgerBytes, chunk).exactSourceSlice, true);
}

const packet = { debateNumber: "fixture", debateId: "synthetic-partition-fixture", sides: { pro: { speakers: ["Pro Speaker"] }, con: { speakers: ["Con Speaker"] } }, sourceChain: { eventsSha256: sha256(eventsBytes) } };
const explanation = "This synthetic explanation is deliberately long enough to satisfy the closed fixture constraint without carrying any real assessment content.";
const candidate = (candidateId, side, speaker, startEvent, responseIntent) => ({
  candidateId,
  side,
  speaker,
  proposition: `The ${side} side advances a load-bearing synthetic proposition at event ${startEvent}.`,
  sourceSpan: { startEvent, endEvent: startEvent },
  attributionConfidence: "high",
  attributionBasis: explanation,
  loadBearingLevel: "central",
  loadBearingReason: explanation,
  responseIntent,
  contextSummary: explanation,
  candidateConfidence: "high"
});
const constructive = { kind: "constructive", localTargetCandidateIds: [], earlierTargetDescription: "" };
const outputs = plan.chunks.map((chunk, index) => ({
  schemaVersion: V42219_OUTPUT_VERSION,
  protocolId: V42219_PROTOCOL_ID,
  debateNumber: packet.debateNumber,
  debateId: packet.debateId,
  chunkId: chunk.chunkId,
  coreStartEvent: chunk.coreStartEvent,
  coreEndEvent: chunk.coreEndEvent,
  contextStartEvent: chunk.contextStartEvent,
  contextEndEvent: chunk.contextEndEvent,
  reviewerRole: "score-blind-source-discovery",
  assessmentModel: V42219_MODEL.label,
  calibrationOnly: true,
  completeCoreReviewed: true,
  candidates: index === 0 ? [
    candidate("c1", "pro", "Pro Speaker", chunk.coreStartEvent, constructive),
    candidate("c2", "con", "Con Speaker", chunk.coreStartEvent + 1, { kind: "local-reply", localTargetCandidateIds: ["c1"], earlierTargetDescription: "" })
  ] : index === 1 ? [candidate("c1", "pro", "Pro Speaker", chunk.coreStartEvent, { kind: "earlier-unselected-or-cross-chunk-reply", localTargetCandidateIds: [], earlierTargetDescription: "This reply addresses an argument located in an earlier source partition." })] : []
}));
for (const [index, output] of outputs.entries()) {
  const chunk = plan.chunks[index];
  const validation = validateV42219Discovery(output, { packet, chunk, plan, eventsDocument, eventsBytes, chunkBytes: buildV42219ChunkLedger(ledgerBytes, chunk), fullLedgerBytes: ledgerBytes });
  assert.equal(validation.scoresDerived, 0);
}
const bundle = compileV42219CandidateBundle({ packet, plan, outputs });
assert.equal(bundle.candidateCount, 3);
assert.deepEqual(bundle.candidates.map((item) => item.moveKind), ["constructive", "reply", "reply"]);
assert.equal(bundle.candidates[1].responseIntent.localTargetCandidateIds[0], `${plan.chunks[0].chunkId}:c1`);
assert.equal(Object.hasOwn(outputs[0].candidates[0], "moveKind"), false);
assert.equal(Object.hasOwn(outputs[0].candidates[0].sourceSpan, "excerpt"), false);
const schema = makeV42219DiscoverySchema({ packet, chunk: plan.chunks[0] });
assert.equal(Object.hasOwn(schema.properties.candidates.items.properties, "moveKind"), false);
assert.deepEqual(schema.properties.candidates.items.properties.sourceSpan.required, ["startEvent", "endEvent"]);

const futureTarget = structuredClone(outputs[0]);
futureTarget.candidates[0].responseIntent = { kind: "local-reply", localTargetCandidateIds: ["c2"], earlierTargetDescription: "" };
assert.throws(() => validateV42219Discovery(futureTarget, { packet, chunk: plan.chunks[0], plan, eventsDocument, eventsBytes, chunkBytes: buildV42219ChunkLedger(ledgerBytes, plan.chunks[0]), fullLedgerBytes: ledgerBytes }), /earlier candidate/);
const outsideCore = structuredClone(outputs[1]);
outsideCore.candidates[0].sourceSpan.startEvent = plan.chunks[1].contextStartEvent;
outsideCore.candidates[0].sourceSpan.endEvent = plan.chunks[1].contextStartEvent;
assert.throws(() => validateV42219Discovery(outsideCore, { packet, chunk: plan.chunks[1], plan, eventsDocument, eventsBytes, chunkBytes: buildV42219ChunkLedger(ledgerBytes, plan.chunks[1]), fullLedgerBytes: ledgerBytes }), /start-event ownership/);

console.log(JSON.stringify({ status: "passed", chunks: plan.chunks.length, sourceEvents: rows.length, exactOwnedCoverage: true, exactChunkReplay: true, deterministicPlanReplay: true, repositoryDerivedMoveKind: true, futureTargetHardFailure: true, outsideCoreStartHardFailure: true, modelAuthoredEvidenceText: false, scoresDerived: 0, modelContextsExecuted: 0, meteredApiCostUsd: 0 }, null, 2));
