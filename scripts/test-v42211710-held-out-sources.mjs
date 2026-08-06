#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { validateV42219ChunkLedger, validateV42219PartitionPlan } from "./lib/v42219-generalized-partition.mjs";

const root = "docs/calibration/v4.2.21.17.10/held-out-source-preparation";
const preparation = JSON.parse(await readFile(`${root}/preparation-manifest.json`, "utf8"));
assert.equal(preparation.status, "five-held-out-source-and-discovery-contexts-prepared");
assert.equal(preparation.contexts.length, 5);
assert.equal(preparation.totals.direct, 2);
assert.equal(preparation.totals.partition, 3);
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
    assert.equal(sha256(await readFile(chunk.schemaPath)), chunk.schemaSha256);
  }
}
console.log(JSON.stringify({ status: "passed", debates: 5, direct: 2, partition: 3, discoveryContexts: preparation.totals.discoveryContexts, maximumCopiedInputBytes: preparation.totals.maximumCopiedInputBytes, exactSourceReplay: true, modelContexts: 0, audioCalls: 0, scoresDerived: 0, nextAuthorized: "discovery-execution-manifest" }, null, 2));
