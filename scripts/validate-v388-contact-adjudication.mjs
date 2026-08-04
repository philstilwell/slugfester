#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { assert, containsScoreField } from "./lib/v388-burden-contact.mjs";
import { validateClosedSchema, validateSchemaValue } from "./lib/v36-decision-cards.mjs";

const [outputPath, packetPath, schemaPath] = process.argv.slice(2);
if (![outputPath, packetPath, schemaPath].every(Boolean)) throw new Error("usage: validate-v388-contact-adjudication.mjs OUTPUT PACKET SCHEMA");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(process.cwd(), file), "utf8"));
const [output, packet, schema] = await Promise.all([readJson(outputPath), readJson(packetPath), readJson(schemaPath)]);
validateSchemaValue(validateClosedSchema(schema), output, `v388ContactAdjudication.${packet.debateNumber}`);
assert(output.schemaVersion === "3.8.8-burden-contact-adjudication-output" && output.debateNumber === packet.debateNumber && output.debateId === packet.debateId && output.reviewerRole === "burden-contact-adjudicator", "contact adjudication identity invalid");
assert(output.bundles.length === packet.bundles.length && !containsScoreField(output), "contact adjudication shape invalid");
for (let index = 0; index < packet.bundles.length; index += 1) { const expected = packet.bundles[index], actual = output.bundles[index]; assert(actual.bundleId === expected.bundleId && expected.candidates.some((item) => item.optionId === actual.optionId), `${expected.bundleId}: adjudication identity, order, or option invalid`); const start = expected.atomicExcerpt.indexOf(actual.evidenceText); assert(start >= 0 && expected.atomicExcerpt.indexOf(actual.evidenceText, start + 1) === -1, `${expected.bundleId}: adjudication evidence absent or nonunique`); assert(actual.rationale.trim().length >= 160, `${expected.bundleId}: adjudication rationale too short`); }
console.log(JSON.stringify({ status: "passed", debateNumber: packet.debateNumber, disputedBundles: packet.bundles.length, thirdValues: 0, scoreFields: 0 }, null, 2));
