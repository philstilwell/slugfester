#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { V419_OUTPUT_VERSION, V419_PACKET_VERSION, V419_PROTOCOL_ID, V419_ROOT, evaluateV419PrimaryTiming, makeV419PrimarySchema } from "./lib/v419-schema-bounded-source.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sample = JSON.parse(await readFile(`${V419_ROOT}/source-only-sample.json`, "utf8"));
const preparation = JSON.parse(await readFile(`${V419_ROOT}/preparation-manifest.json`, "utf8"));
assert.equal(sample.status, "frozen-before-legacy-score-access");
assert.equal(sample.audit.v417Overlap + sample.audit.v418Overlap, 0);
assert.equal(sample.audit.distinctTopicFamilies, 6);
assert.equal(preparation.status, "prepared-source-only-no-model-execution");
assert.equal(preparation.debates.length, 6);
for (const item of preparation.debates) {
  const packet = JSON.parse(await readFile(item.packet, "utf8"));
  assert.equal(packet.schemaVersion, V419_PACKET_VERSION);
  assert.equal(packet.protocolId, V419_PROTOCOL_ID);
  assert.equal(packet.modelInputBoundary.excerptMaximumCharacters, 600);
  assert.equal(sha256(await readFile(packet.sourceChain.transcriptPath)), packet.sourceChain.transcriptSha256);
  assert.equal(sha256(await readFile(packet.sourceChain.eventsPath)), packet.sourceChain.eventsSha256);
  assert.equal(sha256(await readFile(packet.sourceChain.localManifestPath)), packet.sourceChain.localManifestSha256);
}
const schema = makeV419PrimarySchema();
assert.equal(schema.properties.schemaVersion.const, V419_OUTPUT_VERSION);
for (const sideKey of ["proMoves", "conMoves"]) assert.equal(schema.properties.sections.items.properties[sideKey].items.properties.sourceSpan.properties.excerpt.maxLength, 600);
const timing = evaluateV419PrimaryTiming(["180", "155", "100", "113", "67", "141"].map((debateNumber, index) => ({ debateNumber, gateAcceptancePassed: true, elapsedMs: (4 + index * 0.1) * 60000, recoverableStreamEvents: 0 })));
assert.equal(timing.runtimePassed, true);
console.log(JSON.stringify({ status: "passed", debates: 6, topicFamilies: 6, sourceHashesVerified: 18, priorFreshGateOverlap: 0, schemaMaximumCharacters: 600, runtimeProjectionValidated: true, modelContextsExecuted: 0, meteredApiCostUsd: 0 }, null, 2));
