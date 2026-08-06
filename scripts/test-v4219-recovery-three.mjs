#!/usr/bin/env node
import { strict as assert } from "node:assert";
import { access, readFile, stat } from "node:fs/promises";
import { canonicalJson } from "./lib/v4-lean-production.mjs";
import { V4219_PACKET_VERSION, V4219_PROTOCOL_ID, V4219_ROOT, classifyV4219PrimaryRoute, makeV4219PrimarySchema, validateV4219SourceLedger } from "./lib/v4219-primary-recovery.mjs";

const [sample, rejectedScreening, screening, preparation] = await Promise.all(["source-only-sample.json", "sample-screening.json", "sample-screening-v4.2.19.1.json", "preparation-manifest.json"].map((file) => readFile(`${V4219_ROOT}/${file}`, "utf8").then(JSON.parse)));
assert.equal(sample.status, "frozen-pending-motion-only-screening");
assert.equal(sample.audit.priorOrRejectedSampleOverlap, 0);
assert.equal(sample.selectionBoundary.durationUsedForRouting, false);
assert.equal(rejectedScreening.status, "sample-screening-rejected-anchor-undercoverage");
assert.equal(rejectedScreening.failure.sampleDebatesRemainFrozen, true);
assert.equal(screening.status, "sample-screened-packet-preparation-authorized");
assert.equal(screening.correctionScope.sampleDebatesChanged, false);
assert.equal(preparation.status, "prepared-three-recovery-direct-contexts");
assert.equal(preparation.contexts.length, 3);
assert.equal(preparation.audioPolicy.mediumConfidenceMoveRequiresAudioVerification, true);
assert.equal(preparation.executionPolicy.retries, 0);
assert.equal(preparation.executionPolicy.scoreDerivationAuthorized, false);
const storedSchema = JSON.parse(await readFile(preparation.inputs.schema, "utf8"));
assert.equal(canonicalJson(storedSchema), canonicalJson(makeV4219PrimarySchema()));
const sharedInputBytes = (await Promise.all(Object.values(preparation.inputs).map((file) => stat(file).then((item) => item.size)))).reduce((sum, value) => sum + value, 0);
for (const context of preparation.contexts) {
  const [packet, eventsBytes, ledgerBytes, packetStats, ledgerStats] = await Promise.all([readFile(context.packet, "utf8").then(JSON.parse), readFile(context.originalEvents), readFile(context.sourceLedger), stat(context.packet), stat(context.sourceLedger)]);
  assert.equal(packet.schemaVersion, V4219_PACKET_VERSION);
  assert.equal(packet.protocolId, V4219_PROTOCOL_ID);
  assert.equal(packet.eventCount, context.sourceLedgerEvents);
  assert.equal(packetStats.size, context.packetBytes);
  assert.equal(ledgerStats.size, context.sourceLedgerBytes);
  assert.equal(sharedInputBytes + packetStats.size + ledgerStats.size, context.compactCopiedInputBytes);
  assert.equal(classifyV4219PrimaryRoute(context).route, "direct");
  const ledger = validateV4219SourceLedger(ledgerBytes, JSON.parse(eventsBytes), packet.transportChain.sourceLedgerSha256);
  assert.equal(ledger.replayExact, true);
  await access(context.rawOutput).then(() => assert.fail(`future output exists: ${context.rawOutput}`), () => true);
  await access(context.compiledOutput).then(() => assert.fail(`future output exists: ${context.compiledOutput}`), () => true);
}
console.log(JSON.stringify({ status: "passed", debates: preparation.contexts.map((context) => ({ debateNumber: context.debateNumber, events: context.sourceLedgerEvents, copiedInputBytes: context.compactCopiedInputBytes, route: context.route })), distinctFamilies: new Set(preparation.contexts.map((context) => context.family)).size, hiddenControl: preparation.controlPolicy.selectedDebateNumber, mediumConfidenceAudioRule: true, modelContextsExecuted: 0, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
