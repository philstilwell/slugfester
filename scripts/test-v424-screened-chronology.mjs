#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { V424_TOPIC_FAMILIES, classifyV424Motion } from "./lib/v424-source-classification.mjs";
import { V424_OUTPUT_VERSION, V424_PACKET_VERSION, V424_PROTOCOL_ID, compileV424PrimaryOutput, makeV424PrimarySchema, validateV424PrimaryOutput } from "./lib/v424-screened-chronology-fresh.mjs";

assert.equal(classifyV424Motion("Do facts about pain, pleasure, languishing, and horrendous evil favor naturalism, or can soul-building and skeptical theism answer them?"), "evil-hiddenness");
assert.equal(classifyV424Motion("Do human beings have free will and agency?"), "mind-agency");
assert.equal(classifyV424Motion("Is consciousness fundamental to the mind?"), "mind-agency");
assert.equal(classifyV424Motion("Does morality require God?"), "morality-ethics");
assert.equal(V424_TOPIC_FAMILIES.length, 6);

const priorRoot = "docs/calibration/v4.2.2/chronology-first-smoke";
const [priorPacket, priorOutput] = await Promise.all([readFile(`${priorRoot}/packet.json`, "utf8").then(JSON.parse), readFile(`${priorRoot}/primary-output.json`, "utf8").then(JSON.parse)]);
const packet = { ...priorPacket, schemaVersion: V424_PACKET_VERSION, protocolId: V424_PROTOCOL_ID };
const output = { ...priorOutput, schemaVersion: V424_OUTPUT_VERSION, protocolId: V424_PROTOCOL_ID };
const [eventsBytes, ledgerBytes] = await Promise.all([readFile(packet.sourceChain.eventsPath), readFile(packet.transportChain.sourceLedgerPath)]);
const validation = validateV424PrimaryOutput(output, packet, JSON.parse(eventsBytes), eventsBytes, ledgerBytes);
assert.equal(validation.status, "passed");
assert.equal(validation.chronologyFirst.targetEdgesReferenceEarlierEmittedMoves, true);
const compiled = compileV424PrimaryOutput(output, packet, JSON.parse(eventsBytes));
assert.equal(Number.isInteger(compiled.moves[0].sourceSpan.startMs), true);
const schema = makeV424PrimarySchema();
assert.equal(schema.properties.sections.items.properties.proMoves, undefined);
assert.equal(schema.properties.moves.items.properties.sourceSpan.properties.excerpt.maxLength, 600);
console.log(JSON.stringify({ status: "passed", semanticFamilyRegressionRejected: true, explicitMindAgencyRetained: true, topicFamilies: V424_TOPIC_FAMILIES.length, diagnosticMoves: validation.moves, chronologyFirstValidationPassed: true, repositoryTimeCompilationPassed: true, modelContextsExecuted: 0, meteredApiCostUsd: 0 }, null, 2));
