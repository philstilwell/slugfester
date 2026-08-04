#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { validateAuditOutput } from "./lib/v371-gold-audit.mjs";

const [outputPath, packetPath, schemaPath] = process.argv.slice(2);
if (!outputPath || !packetPath || !schemaPath) throw new Error("usage: validate-v371-audit-output.mjs OUTPUT PACKET SCHEMA");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(process.cwd(), file), "utf8"));
const [output, packet, schema] = await Promise.all([readJson(outputPath), readJson(packetPath), readJson(schemaPath)]);
validateAuditOutput(output, packet, schema);
console.log(JSON.stringify({ status: "passed", debateNumber: packet.debateNumber, reviewerPass: packet.reviewerPass, decisionCount: output.decisions.length }, null, 2));
