#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { V423_OUTPUT_VERSION, V423_PACKET_VERSION, V423_PROTOCOL_ID, compileV423PrimaryOutput, makeV423PrimarySchema, validateV423PrimaryOutput } from "./lib/v423-chronology-fresh.mjs";

const priorRoot = "docs/calibration/v4.2.2/chronology-first-smoke";
const [priorPacket, priorOutput] = await Promise.all([readFile(`${priorRoot}/packet.json`, "utf8").then(JSON.parse), readFile(`${priorRoot}/primary-output.json`, "utf8").then(JSON.parse)]);
const packet = { ...priorPacket, schemaVersion: V423_PACKET_VERSION, protocolId: V423_PROTOCOL_ID };
const output = { ...priorOutput, schemaVersion: V423_OUTPUT_VERSION, protocolId: V423_PROTOCOL_ID };
const [eventsBytes, ledgerBytes] = await Promise.all([readFile(packet.sourceChain.eventsPath), readFile(packet.transportChain.sourceLedgerPath)]);
const validation = validateV423PrimaryOutput(output, packet, JSON.parse(eventsBytes), eventsBytes, ledgerBytes);
assert.equal(validation.status, "passed");
assert.equal(validation.chronologyFirst.targetEdgesReferenceEarlierEmittedMoves, true);
const compiled = compileV423PrimaryOutput(output, packet, JSON.parse(eventsBytes));
assert.equal(Number.isInteger(compiled.moves[0].sourceSpan.startMs), true);
const schema = makeV423PrimarySchema();
assert.equal(schema.properties.sections.items.properties.proMoves, undefined);
assert.equal(schema.properties.moves.items.properties.sourceSpan.properties.excerpt.maxLength, 600);
const changed = structuredClone(output);
[changed.moves[0], changed.moves[1]] = [changed.moves[1], changed.moves[0]];
assert.throws(() => validateV423PrimaryOutput(changed, packet, JSON.parse(eventsBytes), eventsBytes, ledgerBytes), /moves must be emitted in source chronology/);
console.log(JSON.stringify({ status: "passed", diagnosticMoves: validation.moves, chronologyFirstValidationPassed: true, changedMoveOrderRejected: true, repositoryTimeCompilationPassed: true, schemaMaximumCharacters: 600, modelContextsExecuted: 0, meteredApiCostUsd: 0 }, null, 2));
