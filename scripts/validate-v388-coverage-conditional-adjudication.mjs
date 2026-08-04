#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { containsScoreField } from "./lib/v37-retired-semantic.mjs";
import { assert } from "./lib/v388-coverage-consensus.mjs";
import { validateClosedSchema, validateSchemaValue } from "./lib/v36-decision-cards.mjs";

const [outputPath, packetPath, schemaPath] = process.argv.slice(2);
if (![outputPath, packetPath, schemaPath].every(Boolean)) throw new Error("usage: validate-v388-coverage-conditional-adjudication.mjs OUTPUT PACKET SCHEMA");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(file), "utf8"));
const [output, packet, schema] = await Promise.all([readJson(outputPath), readJson(packetPath), readJson(schemaPath)]);
validateSchemaValue(validateClosedSchema(schema), output, "coverageConditionalAdjudication");
assert(output.schemaVersion === "3.8.8-coverage-conditional-adjudication-output" && output.debateNumber === packet.debateNumber && output.debateId === packet.debateId && output.reviewerRole === "conditional-field-adjudicator", "conditional adjudication identity invalid");
assert(output.fields.length === 1 && output.fields[0].fieldId === packet.disputedFields[0].fieldId && packet.disputedFields[0].candidates.some((item) => item.optionId === output.fields[0].optionId), "conditional adjudication choice invalid");
assert(!containsScoreField(output), "conditional adjudication contains score field");
console.log(JSON.stringify({ status: "passed", debateNumber: packet.debateNumber, disputedFields: 1, scoreFields: 0 }, null, 2));
