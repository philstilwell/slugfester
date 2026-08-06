#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { validateV42219ChunkLedger, validateV42219PartitionPlan } from "./lib/v42219-generalized-partition.mjs";

const root = "docs/calibration/v4.2.21.17.19/hard-route-held-out-source-preparation";
const preparation = JSON.parse(await readFile(`${root}/preparation-manifest.json`, "utf8"));
assert.equal(preparation.status, "five-hard-route-held-out-source-and-hardened-discovery-contexts-prepared");
assert.equal(preparation.contexts.length, 5);
assert.equal(preparation.totals.direct, 0);
assert.equal(preparation.totals.partition, 5);
assert.equal(preparation.totals.ownershipBoundedSchemas, preparation.totals.discoveryContexts);
assert.equal(preparation.totals.speakerAllowlistedSchemas, preparation.totals.discoveryContexts);
assert.equal(preparation.totals.modelContextsExecuted, 0);
assert.equal(preparation.totals.scoresDerived, 0);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
for (const context of preparation.contexts) {
  const [packetBytes, planBytes, fullLedgerBytes, eventsBytes] = await Promise.all([readFile(context.packet), readFile(context.plan), readFile(context.fullLedger), readFile(context.originalEvents)]);
  assert.equal(sha256(packetBytes), context.packetSha256);
  assert.equal(sha256(planBytes), context.planSha256);
  assert.equal(sha256(fullLedgerBytes), context.fullLedgerSha256);
  assert.equal(sha256(eventsBytes), context.originalEventsSha256);
  const plan = JSON.parse(planBytes);
  assert.equal(validateV42219PartitionPlan(plan, fullLedgerBytes).status, "passed");
  assert(plan.chunks.length >= 2);
  for (const chunk of context.chunks) {
    const chunkBytes = await readFile(chunk.chunkLedgerPath);
    assert.equal(sha256(chunkBytes), chunk.chunkLedgerSha256);
    assert.equal(validateV42219ChunkLedger(chunkBytes, fullLedgerBytes, chunk).status, "passed");
    const schemaBytes = await readFile(chunk.schemaPath);
    assert.equal(sha256(schemaBytes), chunk.schemaSha256);
    const schema = JSON.parse(schemaBytes);
    const span = schema.properties.candidates.items.properties.sourceSpan.properties;
    const packet = JSON.parse(packetBytes);
    assert.equal(span.startEvent.minimum, chunk.coreStartEvent);
    assert.equal(span.startEvent.maximum, chunk.coreEndEvent);
    assert.equal(span.endEvent.minimum, chunk.contextStartEvent);
    assert.equal(span.endEvent.maximum, chunk.contextEndEvent);
    assert.deepEqual(schema.properties.candidates.items.properties.speaker.enum, [...new Set([...packet.sides.pro.speakers, ...packet.sides.con.speakers])]);
  }
}
console.log(JSON.stringify({
  status: "passed",
  debates: 5,
  direct: 0,
  partition: 5,
  discoveryContexts: preparation.totals.discoveryContexts,
  ownershipBoundedSchemas: preparation.totals.ownershipBoundedSchemas,
  speakerAllowlistedSchemas: preparation.totals.speakerAllowlistedSchemas,
  maximumCopiedInputBytes: preparation.totals.maximumCopiedInputBytes,
  exactSourceReplay: true,
  modelContexts: 0,
  audioCalls: 0,
  scoresDerived: 0,
  nextAuthorized: "discovery-execution-manifest",
}, null, 2));
