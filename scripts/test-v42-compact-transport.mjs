#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { readJson } from "./lib/v41-lean-production.mjs";
import { V42_OUTPUT_VERSION, V42_PACKET_VERSION, V42_PROTOCOL_ID, buildV42SourceLedger, makeV42PrimarySchema, validateV42PrimaryOutput, validateV42SourceLedger } from "./lib/v42-compact-transport.mjs";

const preparation = await readJson("docs/calibration/v4.2/compact-transport-smoke/preparation-manifest.json");
const smokePacket = await readJson(preparation.debate.packet);
const [smokeEventsBytes, smokeLedgerBytes] = await Promise.all([readFile(smokePacket.sourceChain.eventsPath), readFile(smokePacket.transportChain.sourceLedgerPath)]);
assert.equal(validateV42SourceLedger(smokeLedgerBytes, JSON.parse(smokeEventsBytes), smokePacket.transportChain.sourceLedgerSha256).replayExact, true);
assert.equal(preparation.transport.plainTranscriptDeliveredToModel, false);
assert.equal(preparation.transport.originalEventsDeliveredToModel, false);
assert.ok(preparation.transport.reductionShare > 0.4);

const [oldPacket, oldOutput] = await Promise.all([readJson("docs/calibration/v4.1.7/fresh-six-gate/packets/debate-37.json"), readJson("docs/calibration/v4.1.7/fresh-six-gate/primary-outputs/debate-37.json")]);
const oldEventsBytes = await readFile(oldPacket.sourceChain.eventsPath);
const oldEvents = JSON.parse(oldEventsBytes);
const ledgerBytes = Buffer.from(buildV42SourceLedger(oldEvents));
const packet = { ...oldPacket, schemaVersion: V42_PACKET_VERSION, protocolId: V42_PROTOCOL_ID, transportChain: { sourceLedgerSha256: (await import("node:crypto")).createHash("sha256").update(ledgerBytes).digest("hex") } };
const stripTimes = (move) => { const { startMs, endMs, ...sourceSpan } = move.sourceSpan; return { ...move, sourceSpan }; };
const output = { ...oldOutput, schemaVersion: V42_OUTPUT_VERSION, protocolId: V42_PROTOCOL_ID, sections: oldOutput.sections.map((section) => ({ ...section, proMoves: section.proMoves.map(stripTimes), conMoves: section.conMoves.map(stripTimes) })) };
const validation = validateV42PrimaryOutput(output, packet, oldEvents, oldEventsBytes, ledgerBytes);
assert.equal(validation.status, "passed");
assert.equal(validation.compactTransport.replayExact, true);
assert.equal(makeV42PrimarySchema().properties.sections.items.properties.proMoves.items.properties.sourceSpan.properties.excerpt.maxLength, 600);
const changedLedger = Buffer.concat([ledgerBytes, Buffer.from("\n")]);
assert.throws(() => validateV42PrimaryOutput(output, packet, oldEvents, oldEventsBytes, changedLedger), /hash mismatch/);
console.log(JSON.stringify({ status: "passed", smokeEventLedgerReplayExact: true, baselinePrimaryMoves: validation.moves, schemaMaximumCharacters: 600, compactInputReductionShare: preparation.transport.reductionShare, mutationsRejected: ["changed-source-ledger"], modelContextsExecuted: 0, meteredApiCostUsd: 0 }, null, 2));
