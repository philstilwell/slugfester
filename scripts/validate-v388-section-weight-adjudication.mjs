#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { containsScoreField } from "./lib/v37-retired-semantic.mjs";
import { validateClosedSchema, validateSchemaValue } from "./lib/v36-decision-cards.mjs";
import { assert } from "./lib/v388-section-weight.mjs";

const [outputPath, packetPath, schemaPath] = process.argv.slice(2);
if (![outputPath, packetPath, schemaPath].every(Boolean)) throw new Error("usage: validate-v388-section-weight-adjudication.mjs OUTPUT PACKET SCHEMA");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(file), "utf8"));
const [output, packet, schema] = await Promise.all([readJson(outputPath), readJson(packetPath), readJson(schemaPath)]);
validateSchemaValue(validateClosedSchema(schema), output, `sectionWeightAdjudication.${packet.debateNumber}`);
assert(output.schemaVersion === "3.8.8-section-weight-adjudication-output" && output.debateNumber === packet.debateNumber && output.debateId === packet.debateId && output.reviewerRole === "section-weight-adjudicator", "section adjudication identity invalid");
assert(output.plans.length === packet.disputedPlans.length && !containsScoreField(output), "section adjudication count or score prohibition invalid");
if (packet.disputedPlans.length) assert(output.plans[0].fieldId === packet.disputedPlans[0].fieldId && packet.disputedPlans[0].candidates.some((item) => item.optionId === output.plans[0].optionId), "section adjudication option invalid");
console.log(JSON.stringify({ status: "passed", debateNumber: packet.debateNumber, disputedPlans: packet.disputedPlans.length, scoreFields: 0 }, null, 2));
