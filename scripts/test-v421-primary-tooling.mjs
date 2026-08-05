#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { V421_OUTPUT_VERSION, V421_PACKET_VERSION, V421_PROTOCOL_ID, V421_ROOT, makeV421PrimarySchema, validateV421SourceLedger } from "./lib/v421-compact-fresh.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sample = JSON.parse(await readFile(`${V421_ROOT}/source-only-sample.json`, "utf8"));
const preparation = JSON.parse(await readFile(`${V421_ROOT}/preparation-manifest.json`, "utf8"));
assert.equal(sample.status, "frozen-before-legacy-score-access");
assert.equal(sample.audit.priorFreshGateOverlap, 0);
assert.deepEqual(sample.audit.durationBandCounts, { "short-under-90": 1, "medium-90-through-120": 3, "long-over-120": 2 });
assert.equal(preparation.status, "prepared-six-compact-source-only-contexts");
assert.equal(preparation.debates.length, 6);
for (const item of preparation.debates) {
  const packet = JSON.parse(await readFile(item.packet, "utf8"));
  assert.equal(packet.schemaVersion, V421_PACKET_VERSION);
  assert.equal(packet.protocolId, V421_PROTOCOL_ID);
  assert.equal(packet.modelInputBoundary.plainTranscriptDeliveredToModel, false);
  assert.equal(packet.modelInputBoundary.originalEventsFileDeliveredToModel, false);
  const [eventsBytes, ledgerBytes] = await Promise.all([readFile(packet.sourceChain.eventsPath), readFile(packet.transportChain.sourceLedgerPath)]);
  assert.equal(sha256(eventsBytes), packet.sourceChain.eventsSha256);
  assert.equal(sha256(await readFile(packet.sourceChain.transcriptPath)), packet.sourceChain.transcriptSha256);
  assert.equal(sha256(await readFile(packet.sourceChain.localManifestPath)), packet.sourceChain.localManifestSha256);
  assert.equal(validateV421SourceLedger(ledgerBytes, JSON.parse(eventsBytes), packet.transportChain.sourceLedgerSha256).replayExact, true);
}
const schema = makeV421PrimarySchema();
assert.equal(schema.properties.schemaVersion.const, V421_OUTPUT_VERSION);
assert.equal(schema.properties.sections.items.properties.proMoves.items.properties.sourceSpan.properties.excerpt.maxLength, 600);
assert.ok(preparation.totals.meanCompactCopiedInputBytes < 300000);
console.log(JSON.stringify({ status: "passed", debates: 6, sourceHashesVerified: 18, sourceLedgersReplayed: 6, priorFreshGateOverlap: 0, durationBandCounts: sample.audit.durationBandCounts, meanCompactCopiedInputBytes: preparation.totals.meanCompactCopiedInputBytes, schemaMaximumCharacters: 600, modelContextsExecuted: 0, meteredApiCostUsd: 0 }, null, 2));
