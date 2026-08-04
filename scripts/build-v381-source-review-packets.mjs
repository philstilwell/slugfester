#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V381_ROOT, V38_GATE_MANIFEST, V38_SOURCE_AUDIT, makeReviewPacket, makeReviewSchema, validateEnrichedProposal } from "./lib/v381-source-preparation.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const [gate, audit] = await Promise.all([readJson(V38_GATE_MANIFEST), readJson(V38_SOURCE_AUDIT)]);
const contexts = [];
for (const debate of gate.sample.debates) {
  const packetPath = `${V381_ROOT}/proposal/packets/debate-${debate.number}.json`;
  const proposalPath = `${V381_ROOT}/proposal/enriched-outputs/debate-${debate.number}.json`;
  const eventsPath = audit.debateSources[debate.number].eventsPath;
  const [packet, proposal, events] = await Promise.all([readJson(packetPath), readJson(proposalPath), readJson(eventsPath)]);
  validateEnrichedProposal(proposal, packet);
  const reviewPacket = makeReviewPacket(packet, proposal, events);
  const reviewSchema = makeReviewSchema(packet, reviewPacket);
  const reviewPacketPath = `${V381_ROOT}/review/packets/debate-${debate.number}.json`;
  const reviewSchemaPath = `${V381_ROOT}/review/schemas/debate-${debate.number}.schema.json`;
  if (shouldWrite) {
    await mkdir(path.dirname(path.resolve(root, reviewPacketPath)), { recursive: true });
    await mkdir(path.dirname(path.resolve(root, reviewSchemaPath)), { recursive: true });
    await writeFile(path.resolve(root, reviewPacketPath), `${JSON.stringify(reviewPacket, null, 2)}\n`);
    await writeFile(path.resolve(root, reviewSchemaPath), `${JSON.stringify(reviewSchema, null, 2)}\n`);
  }
  contexts.push({ debateNumber: debate.number, packet: reviewPacketPath, schema: reviewSchemaPath, output: `${V381_ROOT}/review/outputs/debate-${debate.number}.json`, transcript: audit.debateSources[debate.number].transcriptPath, events: eventsPath });
}
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", contexts }, null, 2));
