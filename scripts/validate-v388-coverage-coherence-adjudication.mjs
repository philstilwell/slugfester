#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { containsScoreField } from "./lib/v37-retired-semantic.mjs";
import { validateClosedSchema, validateSchemaValue } from "./lib/v36-decision-cards.mjs";
import { assert } from "./lib/v388-coverage-consensus.mjs";

const [outputPath, packetPath, schemaPath] = process.argv.slice(2);
if (![outputPath, packetPath, schemaPath].every(Boolean)) throw new Error("usage: validate-v388-coverage-coherence-adjudication.mjs OUTPUT PACKET SCHEMA");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(file), "utf8"));
const [output, packet, schema] = await Promise.all([readJson(outputPath), readJson(packetPath), readJson(schemaPath)]);
validateSchemaValue(validateClosedSchema(schema), output, "coverageCoherenceAdjudication");
const expected = packet.disputedBundles[0];
assert(output.schemaVersion === "3.8.8-coverage-coherence-adjudication-output" && output.debateNumber === packet.debateNumber && output.debateId === packet.debateId && output.reviewerRole === "coverage-coherence-adjudicator", "coherence adjudication identity invalid");
assert(output.bundles.length === 1 && output.bundles[0].fieldId === expected.fieldId && expected.candidates.some((item) => item.optionId === output.bundles[0].optionId), "coherence adjudication choice invalid");
assert(!containsScoreField(output), "coherence adjudication contains score field");
console.log(JSON.stringify({ status: "passed", debateNumber: packet.debateNumber, atomicBundles: 1, scoreFields: 0 }, null, 2));
