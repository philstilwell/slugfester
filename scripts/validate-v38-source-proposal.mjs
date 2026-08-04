#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { validateProposalOutput } from "./lib/v38-source-preparation.mjs";

const [outputPath, packetPath, schemaPath, eventsPath] = process.argv.slice(2);
if (!outputPath || !packetPath || !schemaPath || !eventsPath) {
  console.error("Usage: node scripts/validate-v38-source-proposal.mjs OUTPUT PACKET SCHEMA EVENTS");
  process.exit(1);
}
const readJson = async (file) => JSON.parse(await readFile(path.resolve(file), "utf8"));
const [output, packet, schema, events] = await Promise.all([readJson(outputPath), readJson(packetPath), readJson(schemaPath), readJson(eventsPath)]);
validateProposalOutput(output, packet, schema, events);
console.log(JSON.stringify({ status: "passed", debateNumber: packet.debateNumber, routes: output.routes.length, bridges: output.routes.reduce((sum, item) => sum + item.bridges.length, 0), candidateMoves: output.moves.length }, null, 2));
