#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { V422_OUTPUT_VERSION, V422_PACKET_VERSION, V422_PROTOCOL_ID, compileV422PrimaryOutput, makeV422PrimarySchema, validateV422PrimaryOutput } from "./lib/v422-chronology-first.mjs";

function convertNested(output, packet) {
  return {
    ...structuredClone(output),
    schemaVersion: V422_OUTPUT_VERSION,
    protocolId: V422_PROTOCOL_ID,
    sections: output.sections.map(({ proMoves, conMoves, ...section }) => section),
    moves: output.sections.flatMap((section) => [
      ...section.proMoves.map((move) => ({ ...move, sectionId: section.sectionId, side: "pro" })),
      ...section.conMoves.map((move) => ({ ...move, sectionId: section.sectionId, side: "con" }))
    ]).sort((a, b) => a.sourceSpan.startEvent - b.sourceSpan.startEvent || a.sourceSpan.endEvent - b.sourceSpan.endEvent || a.moveId.localeCompare(b.moveId)),
    debateNumber: packet.debateNumber,
    debateId: packet.debateId
  };
}

const oldRoot = "docs/calibration/v4.2/compact-transport-smoke";
const [oldPacket, oldOutput] = await Promise.all([readFile(`${oldRoot}/packet.json`, "utf8").then(JSON.parse), readFile(`${oldRoot}/primary-output.json`, "utf8").then(JSON.parse)]);
const packet = { ...oldPacket, schemaVersion: V422_PACKET_VERSION, protocolId: V422_PROTOCOL_ID };
const output = convertNested(oldOutput, packet);
const [eventsBytes, ledgerBytes] = await Promise.all([readFile(packet.sourceChain.eventsPath), readFile(packet.transportChain.sourceLedgerPath)]);
const validation = validateV422PrimaryOutput(output, packet, JSON.parse(eventsBytes), eventsBytes, ledgerBytes);
assert.equal(validation.status, "passed");
assert.equal(validation.chronologyFirst.targetEdgesReferenceEarlierEmittedMoves, true);
const compiled = compileV422PrimaryOutput(output, packet, JSON.parse(eventsBytes));
assert.equal(Number.isInteger(compiled.moves[0].sourceSpan.startMs), true);
const schema = makeV422PrimarySchema();
assert.equal(schema.properties.sections.items.properties.proMoves, undefined);
assert.equal(schema.properties.moves.minItems, 8);
assert.equal(schema.properties.moves.maxItems, 24);
assert.equal(schema.properties.moves.items.properties.sourceSpan.properties.excerpt.maxLength, 600);

const failedRoot = "docs/calibration/v4.2.1/compact-fresh-six-gate";
const [failedPacket, failedOutput] = await Promise.all([readFile(`${failedRoot}/packets/debate-07.json`, "utf8").then(JSON.parse), readFile(`${failedRoot}/primary-outputs/debate-07.json`, "utf8").then(JSON.parse)]);
const failedChronologyPacket = { ...failedPacket, schemaVersion: V422_PACKET_VERSION, protocolId: V422_PROTOCOL_ID };
const failedChronologyOutput = convertNested(failedOutput, failedChronologyPacket);
const [failedEventsBytes, failedLedgerBytes] = await Promise.all([readFile(failedPacket.sourceChain.eventsPath), readFile(failedPacket.transportChain.sourceLedgerPath)]);
assert.throws(() => validateV422PrimaryOutput(failedChronologyOutput, failedChronologyPacket, JSON.parse(failedEventsBytes), failedEventsBytes, failedLedgerBytes), /reply target must already appear/);
console.log(JSON.stringify({ status: "passed", acceptedChronologicalFixtureMoves: validation.moves, rejectedV421FutureTargetFixture: true, nestedMoveArraysRemoved: true, schemaMaximumCharacters: 600, repositoryTimeCompilationPassed: true, modelContextsExecuted: 0, meteredApiCostUsd: 0 }, null, 2));
