#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { lexicalTokens } from "./lib/v418-source-integrity.mjs";
import { V425_EXCERPT_MAXIMUM_CHARACTERS, V425_OUTPUT_VERSION, V425_PACKET_VERSION, V425_PROTOCOL_ID, compileV425PrimaryOutput, makeV425PrimarySchema, validateV425PrimaryOutput } from "./lib/v425-conservative-excerpt.mjs";

const baseRoot = "docs/calibration/v4.2.2/chronology-first-smoke";
const [basePacket, baseOutput] = await Promise.all([readFile(`${baseRoot}/packet.json`, "utf8").then(JSON.parse), readFile(`${baseRoot}/primary-output.json`, "utf8").then(JSON.parse)]);
const packet = { ...basePacket, schemaVersion: V425_PACKET_VERSION, protocolId: V425_PROTOCOL_ID };
const output = { ...structuredClone(baseOutput), schemaVersion: V425_OUTPUT_VERSION, protocolId: V425_PROTOCOL_ID };
for (const move of output.moves) if (move.sourceSpan.excerpt.length > V425_EXCERPT_MAXIMUM_CHARACTERS) move.sourceSpan.excerpt = lexicalTokens(move.sourceSpan.excerpt).slice(0, 80).join(" ");
const [eventsBytes, ledgerBytes] = await Promise.all([readFile(packet.sourceChain.eventsPath), readFile(packet.transportChain.sourceLedgerPath)]);
const validation = validateV425PrimaryOutput(output, packet, JSON.parse(eventsBytes), eventsBytes, ledgerBytes);
assert.equal(validation.status, "passed"); assert.equal(validation.conservativeExcerpt.maximumCharacters, 450); assert.equal(Number.isInteger(compileV425PrimaryOutput(output, packet, JSON.parse(eventsBytes)).moves[0].sourceSpan.startMs), true);
const schema = makeV425PrimarySchema(); assert.equal(schema.properties.moves.items.properties.sourceSpan.properties.excerpt.maxLength, 450);
const failedRoot = "docs/calibration/v4.2.4/screened-chronology-fresh-six-gate"; const [failedPacket, failedOutput] = await Promise.all([readFile(`${failedRoot}/packets/debate-131.json`, "utf8").then(JSON.parse), readFile(`${failedRoot}/primary-outputs/debate-131.json`, "utf8").then(JSON.parse)]); const rejectedPacket = { ...failedPacket, schemaVersion: V425_PACKET_VERSION, protocolId: V425_PROTOCOL_ID }; const rejectedOutput = { ...failedOutput, schemaVersion: V425_OUTPUT_VERSION, protocolId: V425_PROTOCOL_ID }; const [failedEvents, failedLedger] = await Promise.all([readFile(failedPacket.sourceChain.eventsPath), readFile(failedPacket.transportChain.sourceLedgerPath)]); assert.throws(() => validateV425PrimaryOutput(rejectedOutput, rejectedPacket, JSON.parse(failedEvents), failedEvents, failedLedger), /exceeds 450 characters/);
console.log(JSON.stringify({ status: "passed", acceptedConservativeFixtureMoves: validation.moves, rejectedV424Near600CharacterFixture: true, endpointMaximumCharacters: 450, tokenRange: [12, 100], repositoryTimeCompilationPassed: true, automaticTruncationPerformedByWorkflow: false, modelContextsExecuted: 0, meteredApiCostUsd: 0 }, null, 2));
