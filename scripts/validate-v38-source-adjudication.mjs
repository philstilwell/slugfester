#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { validateSourceAdjudicationOutput } from "./lib/v38-source-execution.mjs";

const [outputPath, packetPath, schemaPath] = process.argv.slice(2);
if (!outputPath || !packetPath || !schemaPath) {
  console.error("Usage: node scripts/validate-v38-source-adjudication.mjs OUTPUT PACKET SCHEMA");
  process.exit(1);
}
const readJson = async (file) => JSON.parse(await readFile(path.resolve(file), "utf8"));
const [output, packet, schema] = await Promise.all([readJson(outputPath), readJson(packetPath), readJson(schemaPath)]);
validateSourceAdjudicationOutput(output, packet, schema);
console.log(JSON.stringify({ status: "passed", debateNumber: packet.debateNumber, disputedFields: output.fields.length }, null, 2));
