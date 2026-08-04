#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  enrichCoverageProposal,
  validateCoverageProposalRaw,
  validateEnrichedCoverageProposal
} from "./lib/v384-coverage-preparation.mjs";

const [outputPath, packetPath, schemaPath, eventsPath, enrichedPath] = process.argv.slice(2);
if (![outputPath, packetPath, schemaPath, eventsPath].every(Boolean)) {
  throw new Error("usage: validate-v384-coverage-proposal.mjs OUTPUT PACKET SCHEMA EVENTS [ENRICHED_OUTPUT]");
}
const readJson = async (file) => JSON.parse(await readFile(path.resolve(file), "utf8"));
const [output, packet, schema, events] = await Promise.all([
  readJson(outputPath),
  readJson(packetPath),
  readJson(schemaPath),
  readJson(eventsPath)
]);
validateCoverageProposalRaw(output, packet, schema, events);
const enriched = validateEnrichedCoverageProposal(enrichCoverageProposal(output, packet, events), packet, events);
if (enrichedPath) {
  await mkdir(path.dirname(path.resolve(enrichedPath)), { recursive: true });
  await writeFile(path.resolve(enrichedPath), `${JSON.stringify(enriched, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: "passed",
  debateNumber: packet.debateNumber,
  retainedSeeds: enriched.inventorySummary.retainedSeedCount,
  additions: enriched.inventorySummary.additionCount,
  selectedMoves: enriched.inventorySummary.selectedMoveCount,
  representedBridges: enriched.inventorySummary.representedBridgeCount,
  consequentialOmissions: enriched.inventorySummary.consequentialOmissionCount,
  pendingAudioVerification: enriched.inventorySummary.mediumOrLowAdditionCount,
  scoreFields: 0
}, null, 2));
