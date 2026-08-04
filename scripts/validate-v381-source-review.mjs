#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { validateReviewOutput } from "./lib/v381-source-preparation.mjs";

const [outputPath, proposalPacketPath, proposalPath, reviewPacketPath, schemaPath] = process.argv.slice(2);
if (!outputPath || !proposalPacketPath || !proposalPath || !reviewPacketPath || !schemaPath) {
  console.error("Usage: node scripts/validate-v381-source-review.mjs OUTPUT PROPOSAL_PACKET ENRICHED_PROPOSAL REVIEW_PACKET SCHEMA");
  process.exit(1);
}
const readJson = async (file) => JSON.parse(await readFile(path.resolve(file), "utf8"));
const [output, packet, proposal, reviewPacket, schema] = await Promise.all([readJson(outputPath), readJson(proposalPacketPath), readJson(proposalPath), readJson(reviewPacketPath), readJson(schemaPath)]);
validateReviewOutput(output, packet, proposal, reviewPacket, schema);
console.log(JSON.stringify({ status: "passed", debateNumber: packet.debateNumber, routeReviews: output.routeReviews.length, moveReviews: output.moveReviews.length }, null, 2));
