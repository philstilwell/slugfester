#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  V418_OUTPUT_VERSION,
  V418_PACKET_VERSION,
  V418_PROTOCOL_ID,
  V418_ROOT,
  evaluateV418PrimaryTiming,
  makeV418PrimarySchema
} from "./lib/v418-source-integrity.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sample = JSON.parse(await readFile(`${V418_ROOT}/source-only-sample.json`, "utf8"));
const preparation = JSON.parse(await readFile(`${V418_ROOT}/preparation-manifest.json`, "utf8"));
assert.equal(sample.status, "frozen-before-legacy-score-access");
assert.equal(sample.audit.v417Overlap, 0);
assert.equal(sample.audit.distinctTopicFamilies, 6);
assert.equal(preparation.status, "prepared-source-only-no-model-execution");
assert.equal(preparation.debates.length, 6);
assert.equal(preparation.model.meteredApiCostUsdMaximum, 0);
assert.equal(preparation.sourceIntegrityPolicy.repositoryOwnedSourceTimes, true);

for (const item of preparation.debates) {
  const packetBytes = await readFile(item.packet);
  const packet = JSON.parse(packetBytes);
  assert.equal(packet.schemaVersion, V418_PACKET_VERSION);
  assert.equal(packet.protocolId, V418_PROTOCOL_ID);
  assert.equal(packet.modelInputBoundary.modelSuppliedSourceMillisecondsProhibited, true);
  assert.equal(sha256(await readFile(packet.sourceChain.transcriptPath)), packet.sourceChain.transcriptSha256);
  assert.equal(sha256(await readFile(packet.sourceChain.eventsPath)), packet.sourceChain.eventsSha256);
  assert.equal(sha256(await readFile(packet.sourceChain.localManifestPath)), packet.sourceChain.localManifestSha256);
}

const schema = makeV418PrimarySchema();
assert.equal(schema.properties.schemaVersion.const, V418_OUTPUT_VERSION);
for (const sideKey of ["proMoves", "conMoves"]) {
  const span = schema.properties.sections.items.properties[sideKey].items.properties.sourceSpan;
  assert.deepEqual(span.required, ["startEvent", "endEvent", "excerpt"]);
  assert.equal("startMs" in span.properties, false);
  assert.equal("endMs" in span.properties, false);
}

const timing = evaluateV418PrimaryTiming(["52", "101", "79", "11", "175", "26"].map((debateNumber, index) => ({
  debateNumber,
  gateAcceptancePassed: true,
  elapsedMs: (4 + index * 0.1) * 60000,
  recoverableStreamEvents: 0
})));
assert.equal(timing.runtimePassed, true);
assert.equal(timing.transportCleanContexts, 6);

console.log(JSON.stringify({
  status: "passed",
  debates: preparation.debates.length,
  topicFamilies: sample.audit.distinctTopicFamilies,
  sourceHashesVerified: preparation.debates.length * 3,
  v417Overlap: sample.audit.v417Overlap,
  repositoryOwnedTimesSchemaVerified: true,
  runtimeProjectionValidated: true,
  modelContextsExecuted: 0,
  meteredApiCostUsd: 0
}, null, 2));
