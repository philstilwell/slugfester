#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  makeV42219DiscoverySchema,
  validateV42219ChunkLedger,
  validateV42219PartitionPlan,
  V42219_OUTPUT_VERSION,
  V42219_PROTOCOL_ID,
  V42219_ROOT
} from "./lib/v42219-generalized-partition.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const preparation = JSON.parse(await readFile(`${V42219_ROOT}/preparation-manifest.json`, "utf8"));
assert.equal(preparation.status, "three-partition-contexts-prepared-structural-primary-design-required");
assert.equal(preparation.contexts.length, 3);
assert.equal(preparation.authorization.discoveryModelExecution, false);
for (const context of preparation.contexts) {
  const [packetBytes, planBytes, fullLedgerBytes, eventsBytes] = await Promise.all([context.packet, context.plan, context.fullLedger, context.originalEvents].map((file) => readFile(file)));
  assert.equal(sha256(packetBytes), context.packetSha256);
  assert.equal(sha256(planBytes), context.planSha256);
  assert.equal(sha256(fullLedgerBytes), context.fullLedgerSha256);
  assert.equal(sha256(eventsBytes), context.originalEventsSha256);
  const packet = JSON.parse(packetBytes);
  const plan = JSON.parse(planBytes);
  assert.equal(packet.protocolId, V42219_PROTOCOL_ID);
  assert.equal(packet.transportChain.partitionPlanSha256, context.planSha256);
  assert.equal(validateV42219PartitionPlan(plan, fullLedgerBytes).exactOwnedCoverage, true);
  assert.equal(context.chunks.reduce((sum, chunk) => sum + chunk.coreEvents, 0), context.sourceEvents);
  for (const chunk of context.chunks) {
    const [chunkBytes, schemaBytes] = await Promise.all([chunk.chunkLedgerPath, chunk.schemaPath].map((file) => readFile(file)));
    assert.equal(sha256(chunkBytes), chunk.chunkLedgerSha256);
    assert.equal(sha256(schemaBytes), chunk.schemaSha256);
    assert.equal(validateV42219ChunkLedger(chunkBytes, fullLedgerBytes, chunk).exactSourceSlice, true);
    assert.ok(chunk.contextEvents <= plan.limits.contextEventsMaximum);
    assert.ok(chunk.contextBytes <= plan.limits.contextBytesMaximum);
    const schema = JSON.parse(schemaBytes);
    assert.equal(schema.properties.schemaVersion.const, V42219_OUTPUT_VERSION);
    assert.equal(schema.properties.debateNumber.const, context.debateNumber);
    assert.equal(schema.properties.chunkId.const, chunk.chunkId);
    assert.deepEqual(schema, makeV42219DiscoverySchema({ packet, chunk }));
    assert.equal(Object.hasOwn(schema.properties.candidates.items.properties, "moveKind"), false);
    assert.equal(Object.hasOwn(schema.properties.candidates.items.properties.sourceSpan.properties, "excerpt"), false);
  }
}
assert.equal(preparation.totals.discoveryContexts, preparation.contexts.reduce((sum, context) => sum + context.chunks.length, 0));
console.log(JSON.stringify({ status: "passed", debates: preparation.contexts.length, discoveryContexts: preparation.totals.discoveryContexts, exactPlanReplay: true, exactChunkReplay: true, exactSchemaReplay: true, sourceHashesLocked: true, assessmentExecutionAuthorized: false, modelContextsExecuted: 0, audioCalls: 0, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
