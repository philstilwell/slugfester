#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { validateSectionPlan } from "./lib/v388-section-weight.mjs";

const [outputPath, packetPath, schemaPath] = process.argv.slice(2);
if (![outputPath, packetPath, schemaPath].every(Boolean)) throw new Error("usage: validate-v388-section-weight-plan.mjs OUTPUT PACKET SCHEMA");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(file), "utf8"));
const [output, packet, schema] = await Promise.all([readJson(outputPath), readJson(packetPath), readJson(schemaPath)]);
const summary = validateSectionPlan(output, packet, schema);
console.log(JSON.stringify({ status: "passed", debateNumber: packet.debateNumber, ...summary }, null, 2));
