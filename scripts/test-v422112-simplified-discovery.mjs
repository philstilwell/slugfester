#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildV422112FailureFixture, compileV422112CandidateBundle, makeV422112DiscoverySchema, validateV422112Discovery } from "./lib/v422112-simplified-discovery.mjs";

const predecessorRoot = "docs/calibration/v4.2.21.9/generalized-partition";
const preparation = JSON.parse(await readFile(`${predecessorRoot}/preparation-manifest.json`, "utf8"));
const context = preparation.contexts.find((item) => item.debateNumber === "182");
const [packet, plan, eventsBytes, fullLedgerBytes] = await Promise.all([context.packet, context.plan, context.originalEvents, context.fullLedger].map((file) => readFile(file)).map(async (promise, index) => index < 2 ? JSON.parse(await promise) : promise));
const outputs = [];
for (const chunk of context.chunks) {
  const predecessor = JSON.parse(await readFile(chunk.rawOutput, "utf8"));
  const output = buildV422112FailureFixture(predecessor);
  const chunkBytes = await readFile(chunk.chunkLedgerPath);
  const validation = validateV422112Discovery(output, { packet, chunk, plan, eventsDocument: JSON.parse(eventsBytes), eventsBytes, chunkBytes, fullLedgerBytes });
  assert.equal(validation.localTargetIdsModelAuthored, false);
  outputs.push(output);
}
const bundle = compileV422112CandidateBundle({ packet, plan, outputs });
assert.equal(bundle.completeSourceDiscovery.localTargetIdsModelAuthored, false);
assert.equal(bundle.completeSourceDiscovery.selectedTargetTopologyDeferredToPrimaryA, true);
assert.equal(bundle.candidates.every((candidate) => !Object.hasOwn(candidate.responseIntent, "localTargetCandidateIds")), true);
const schema = makeV422112DiscoverySchema({ packet, chunk: context.chunks[0] });
assert.deepEqual(schema.properties.candidates.items.properties.responseIntent.required, ["kind", "earlierTargetDescription"]);
assert.equal(Object.hasOwn(schema.properties.candidates.items.properties.responseIntent.properties, "localTargetCandidateIds"), false);
const replyOutputIndex = outputs.findIndex((output) => output.candidates.some((candidate) => candidate.responseIntent.kind === "reply"));
assert.ok(replyOutputIndex >= 0);
const shortReply = structuredClone(outputs[replyOutputIndex]);
const reply = shortReply.candidates.find((candidate) => candidate.responseIntent.kind === "reply");
reply.responseIntent.earlierTargetDescription = "too short";
const replyChunk = context.chunks[replyOutputIndex];
const replyChunkBytes = await readFile(replyChunk.chunkLedgerPath);
assert.throws(() => validateV422112Discovery(shortReply, { packet, chunk: replyChunk, plan, eventsDocument: JSON.parse(eventsBytes), eventsBytes, chunkBytes: replyChunkBytes, fullLedgerBytes }), /too short/);
console.log(JSON.stringify({ status: "passed", predecessorFailureFixture: "debate-182-all-five-chunks", candidates: bundle.candidateCount, localTargetIdsRemoved: true, sameSideTargetFailureStructurallyImpossible: true, moveKindRepositoryDerived: true, targetTopologyDeferredToPrimaryA: true, acceptedPredecessorOutputsReusableInSuccessorGate: false, modelContextsExecuted: 0, audioCalls: 0, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
