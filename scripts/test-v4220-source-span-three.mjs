#!/usr/bin/env node
import { strict as assert } from "node:assert";
import { access, readFile, stat } from "node:fs/promises";
import { canonicalJson } from "./lib/v4-lean-production.mjs";
import { classifyV4219PrimaryRoute } from "./lib/v4219-primary-recovery.mjs";
import { V4220_PACKET_VERSION, V4220_PROTOCOL_ID, V4220_ROOT, makeV4220PrimarySchema, validateV4220SourceLedger } from "./lib/v4220-source-span-rendering.mjs";

const [sample, screening, preparation] = await Promise.all(["source-only-sample.json", "sample-screening.json", "preparation-manifest.json"].map((file) => readFile(`${V4220_ROOT}/${file}`, "utf8").then(JSON.parse)));
assert.equal(sample.status, "frozen-pending-motion-route-screening");
assert.equal(sample.audit.priorOrRejectedSampleOverlap, 0);
assert.equal(sample.audit.distinctTopicFamilies, 3);
assert.equal(screening.status, "sample-screened-packet-preparation-authorized");
assert.equal(preparation.status, "prepared-three-source-span-direct-contexts");
assert.equal(preparation.contexts.length, 3);
assert.equal(preparation.audioPolicy.mediumConfidenceMoveRequiresAudioVerification, true);
assert.equal(preparation.executionPolicy.retries, 0);
assert.equal(preparation.executionPolicy.scoreDerivationAuthorized, false);
assert.equal(canonicalJson(JSON.parse(await readFile(preparation.inputs.schema, "utf8"))), canonicalJson(makeV4220PrimarySchema()));
const sharedInputBytes = (await Promise.all(Object.values(preparation.inputs).map((file) => stat(file).then((item) => item.size)))).reduce((sum, value) => sum + value, 0);
for (const context of preparation.contexts) {
  const [packet, eventsBytes, ledgerBytes, packetStats, ledgerStats] = await Promise.all([readFile(context.packet, "utf8").then(JSON.parse), readFile(context.originalEvents), readFile(context.sourceLedger), stat(context.packet), stat(context.sourceLedger)]);
  assert.equal(packet.schemaVersion, V4220_PACKET_VERSION); assert.equal(packet.protocolId, V4220_PROTOCOL_ID); assert.equal(packet.eventCount, context.sourceLedgerEvents); assert.equal(packetStats.size, context.packetBytes); assert.equal(ledgerStats.size, context.sourceLedgerBytes); assert.equal(sharedInputBytes + packetStats.size + ledgerStats.size, context.compactCopiedInputBytes); assert.equal(classifyV4219PrimaryRoute(context).route, "direct"); assert.equal(validateV4220SourceLedger(ledgerBytes, JSON.parse(eventsBytes), packet.transportChain.sourceLedgerSha256).replayExact, true);
  await access(context.rawOutput).then(() => assert.fail(`future output exists: ${context.rawOutput}`), () => true); await access(context.compiledOutput).then(() => assert.fail(`future output exists: ${context.compiledOutput}`), () => true);
}
console.log(JSON.stringify({ status: "passed", debates: preparation.contexts.map((context) => ({ debateNumber: context.debateNumber, family: context.family, events: context.sourceLedgerEvents, copiedInputBytes: context.compactCopiedInputBytes, route: context.route })), hiddenControl: preparation.controlPolicy.selectedDebateNumber, sourceSpanRendering: true, strictFutureTargetRejection: true, mediumConfidenceAudioRule: true, modelContextsExecuted: 0, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
