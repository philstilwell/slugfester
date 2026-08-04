#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { enrichProposal, validateEnrichedProposal, validateProposalRaw } from "./lib/v381-source-preparation.mjs";

const [rawPath, packetPath, schemaPath, eventsPath, enrichedPath] = process.argv.slice(2);
if (!rawPath || !packetPath || !schemaPath || !eventsPath) {
  console.error("Usage: node scripts/validate-v381-source-proposal.mjs RAW PACKET SCHEMA EVENTS [ENRICHED_OUTPUT]");
  process.exit(1);
}
const readJson = async (file) => JSON.parse(await readFile(path.resolve(file), "utf8"));
const [raw, packet, schema, events] = await Promise.all([readJson(rawPath), readJson(packetPath), readJson(schemaPath), readJson(eventsPath)]);
validateProposalRaw(raw, packet, schema, events);
const enriched = validateEnrichedProposal(enrichProposal(raw, packet), packet);
if (enrichedPath) {
  await mkdir(path.dirname(path.resolve(enrichedPath)), { recursive: true });
  await writeFile(path.resolve(enrichedPath), `${JSON.stringify(enriched, null, 2)}\n`);
}
console.log(JSON.stringify({ status: "passed", debateNumber: packet.debateNumber, routes: raw.routes.length, bridges: raw.routes.reduce((sum, item) => sum + item.bridges.length, 0), candidateMoves: raw.moves.length, deterministicIdsDerived: enriched.moves.length, enrichedOutputWritten: Boolean(enrichedPath) }, null, 2));
