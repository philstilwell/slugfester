#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  V381_ROOT,
  V382_DEBATE_NUMBERS,
  V382_ROOT,
  V38_SOURCE_AUDIT,
  makeReviewPacket,
  makeReviewSchema,
  validateEnrichedProposal
} from "./lib/v382-source-preparation.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const audit = await readJson(V38_SOURCE_AUDIT);
const contexts = [];

for (const debateNumber of V382_DEBATE_NUMBERS) {
  const proposalPacketPath = `${V381_ROOT}/proposal/packets/debate-${debateNumber}.json`;
  const proposalPath = `${V381_ROOT}/proposal/enriched-outputs/debate-${debateNumber}.json`;
  const eventsPath = audit.debateSources[debateNumber].eventsPath;
  const [packet, proposal, events] = await Promise.all([readJson(proposalPacketPath), readJson(proposalPath), readJson(eventsPath)]);
  validateEnrichedProposal(proposal, packet);
  const reviewPacket = makeReviewPacket(packet, proposal, events);
  const reviewSchema = makeReviewSchema(packet, reviewPacket);
  const reviewPacketPath = `${V382_ROOT}/review/packets/debate-${debateNumber}.json`;
  const reviewSchemaPath = `${V382_ROOT}/review/schemas/debate-${debateNumber}.schema.json`;
  if (shouldWrite) {
    await mkdir(path.dirname(path.resolve(root, reviewPacketPath)), { recursive: true });
    await mkdir(path.dirname(path.resolve(root, reviewSchemaPath)), { recursive: true });
    await writeFile(path.resolve(root, reviewPacketPath), `${JSON.stringify(reviewPacket, null, 2)}\n`);
    await writeFile(path.resolve(root, reviewSchemaPath), `${JSON.stringify(reviewSchema, null, 2)}\n`);
  }
  contexts.push({
    debateNumber,
    packet: reviewPacketPath,
    schema: reviewSchemaPath,
    output: `${V382_ROOT}/review/outputs/debate-${debateNumber}.json`,
    proposalPacket: proposalPacketPath,
    proposal: proposalPath,
    transcript: audit.debateSources[debateNumber].transcriptPath,
    events: eventsPath
  });
}

console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", contexts }, null, 2));
