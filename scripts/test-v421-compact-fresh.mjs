#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { readJson } from "./lib/v41-lean-production.mjs";
import {
  V421_OUTPUT_VERSION,
  V421_PACKET_VERSION,
  V421_PROTOCOL_ID,
  compileV421PrimaryOutput,
  evaluateV421PrimaryTiming,
  makeV421PrimarySchema,
  validateV421PrimaryOutput
} from "./lib/v421-compact-fresh.mjs";

const smokeRoot = "docs/calibration/v4.2/compact-transport-smoke";
const [oldPacket, oldOutput] = await Promise.all([readJson(`${smokeRoot}/packet.json`), readJson(`${smokeRoot}/primary-output.json`)]);
const packet = { ...oldPacket, schemaVersion: V421_PACKET_VERSION, protocolId: V421_PROTOCOL_ID };
const output = { ...oldOutput, schemaVersion: V421_OUTPUT_VERSION, protocolId: V421_PROTOCOL_ID };
const [eventsBytes, ledgerBytes] = await Promise.all([readFile(packet.sourceChain.eventsPath), readFile(packet.transportChain.sourceLedgerPath)]);
const eventsDocument = JSON.parse(eventsBytes);
const validation = validateV421PrimaryOutput(output, packet, eventsDocument, eventsBytes, ledgerBytes);
assert.equal(validation.status, "passed");
assert.equal(validation.compactTransport.replayExact, true);
const compiled = compileV421PrimaryOutput(output, packet, eventsDocument);
assert.equal(compiled.schemaVersion, V421_OUTPUT_VERSION);
assert.equal(Number.isInteger(compiled.sections[0].proMoves[0].sourceSpan.startMs), true);
const schema = makeV421PrimarySchema();
assert.equal(schema.properties.schemaVersion.const, V421_OUTPUT_VERSION);
assert.equal(schema.properties.sections.items.properties.proMoves.items.properties.sourceSpan.properties.excerpt.maxLength, 600);
const changedLedger = Buffer.concat([ledgerBytes, Buffer.from("\n")]);
assert.throws(() => validateV421PrimaryOutput(output, packet, eventsDocument, eventsBytes, changedLedger), /hash mismatch/);
const timing = evaluateV421PrimaryTiming(["1", "2", "3", "4", "5", "6"].map((debateNumber, index) => ({ debateNumber, gateAcceptancePassed: true, elapsedMs: (3 + index * 0.1) * 60000, recoverableStreamEvents: 0 })));
assert.equal(timing.runtimePassed, true);
console.log(JSON.stringify({ status: "passed", diagnosticMoves: validation.moves, compactLedgerReplayExact: true, schemaMaximumCharacters: 600, repositoryTimeCompilationPassed: true, changedLedgerRejected: true, runtimeProjectionValidated: true, modelContextsExecuted: 0, meteredApiCostUsd: 0 }, null, 2));
