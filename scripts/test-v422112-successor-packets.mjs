#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { makeV422112DiscoverySchema, V422112_PROTOCOL_ID, V422112_ROOT } from "./lib/v422112-simplified-discovery.mjs";
import { validateV42219ChunkLedger, validateV42219PartitionPlan } from "./lib/v42219-generalized-partition.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const preparation = JSON.parse(await readFile(`${V422112_ROOT}/preparation-manifest.json`, "utf8"));
assert.equal(preparation.status, "twelve-simplified-discovery-contexts-prepared-execution-manifest-authorized");
assert.equal(preparation.sourceBoundary.predecessorOutputsReadForAssessment, false);
assert.equal(preparation.totals.discoveryContexts, 12);
for (const context of preparation.contexts) {
  const [packetBytes, planBytes, fullLedgerBytes] = await Promise.all([context.packet, context.plan, context.fullLedger].map((file) => readFile(file)));
  assert.equal(sha256(packetBytes), context.packetSha256);
  const packet = JSON.parse(packetBytes);
  const plan = JSON.parse(planBytes);
  assert.equal(packet.protocolId, V422112_PROTOCOL_ID);
  assert.equal(packet.modelInputBoundary.candidateTargetIdsProhibited, true);
  assert.equal(validateV42219PartitionPlan(plan, fullLedgerBytes).exactOwnedCoverage, true);
  for (const chunk of context.chunks) {
    const [chunkBytes, schemaBytes] = await Promise.all([chunk.chunkLedgerPath, chunk.schemaPath].map((file) => readFile(file)));
    assert.equal(validateV42219ChunkLedger(chunkBytes, fullLedgerBytes, chunk).exactSourceSlice, true);
    assert.equal(sha256(schemaBytes), chunk.schemaSha256);
    const schema = JSON.parse(schemaBytes);
    assert.deepEqual(schema, makeV422112DiscoverySchema({ packet, chunk }));
    assert.equal(Object.hasOwn(schema.properties.candidates.items.properties.responseIntent.properties, "localTargetCandidateIds"), false);
  }
}
console.log(JSON.stringify({ status: "passed", debates: preparation.contexts.length, contexts: preparation.totals.discoveryContexts, exactSourcePlanReplay: true, exactChunkReplay: true, exactSchemaReplay: true, candidateTargetIdsAbsent: true, predecessorOutputsReused: false, modelContextsExecuted: 0, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
