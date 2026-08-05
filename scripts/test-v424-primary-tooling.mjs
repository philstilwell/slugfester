#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { V424_OUTPUT_VERSION, V424_PACKET_VERSION, V424_PROTOCOL_ID, V424_ROOT, makeV424PrimarySchema, validateV424SourceLedger } from "./lib/v424-screened-chronology-fresh.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [sample, screening, preparation] = await Promise.all(["source-only-sample.json", "sample-screening.json", "preparation-manifest.json"].map((file) => readFile(`${V424_ROOT}/${file}`, "utf8").then(JSON.parse)));
assert.equal(sample.status, "frozen-pending-source-only-semantic-screening");
assert.equal(screening.status, "sample-screened-packet-preparation-authorized");
assert.equal(sample.audit.priorFreshGateOverlap, 0);
assert.deepEqual(sample.audit.durationBandCounts, { "short-under-90": 4, "medium-90-through-120": 1, "long-over-120": 1 });
assert.equal(preparation.status, "prepared-six-screened-chronology-compact-contexts");
assert.equal(preparation.debates.length, 6);
for (const item of preparation.debates) {
  const packet = JSON.parse(await readFile(item.packet, "utf8"));
  assert.equal(packet.schemaVersion, V424_PACKET_VERSION);
  assert.equal(packet.protocolId, V424_PROTOCOL_ID);
  assert.equal(packet.modelInputBoundary.plainTranscriptDeliveredToModel, false);
  assert.equal(packet.modelInputBoundary.originalEventsFileDeliveredToModel, false);
  assert.equal(packet.modelInputBoundary.oneChronologicalMoveInventoryRequired, true);
  const [eventsBytes, ledgerBytes] = await Promise.all([readFile(packet.sourceChain.eventsPath), readFile(packet.transportChain.sourceLedgerPath)]);
  assert.equal(sha256(eventsBytes), packet.sourceChain.eventsSha256);
  assert.equal(sha256(await readFile(packet.sourceChain.transcriptPath)), packet.sourceChain.transcriptSha256);
  assert.equal(sha256(await readFile(packet.sourceChain.localManifestPath)), packet.sourceChain.localManifestSha256);
  assert.equal(validateV424SourceLedger(ledgerBytes, JSON.parse(eventsBytes), packet.transportChain.sourceLedgerSha256).replayExact, true);
}
const schema = makeV424PrimarySchema();
assert.equal(schema.properties.schemaVersion.const, V424_OUTPUT_VERSION);
assert.equal(schema.properties.sections.items.properties.proMoves, undefined);
assert.equal(schema.properties.moves.items.properties.sourceSpan.properties.excerpt.maxLength, 600);
assert.ok(preparation.totals.meanCompactCopiedInputBytes < 300000);
assert.ok(preparation.totals.maximumCompactCopiedInputBytes < 400000);
console.log(JSON.stringify({ status: "passed", debates: 6, sourceHashesVerified: 18, sourceLedgersReplayed: 6, substantiveFamilies: screening.audit.substantiveFamilies, priorFreshGateOverlap: 0, durationBandCounts: sample.audit.durationBandCounts, meanCompactCopiedInputBytes: preparation.totals.meanCompactCopiedInputBytes, maximumCompactCopiedInputBytes: preparation.totals.maximumCompactCopiedInputBytes, chronologyFirst: true, schemaMaximumCharacters: 600, modelContextsExecuted: 0, meteredApiCostUsd: 0 }, null, 2));
