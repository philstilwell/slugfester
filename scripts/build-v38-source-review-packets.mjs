#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V38_GATE_MANIFEST, V38_ROOT, V38_SOURCE_AUDIT, makeReviewPacket, makeReviewSchema, validateProposalOutput } from "./lib/v38-source-preparation.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const [manifest, audit] = await Promise.all([readJson(V38_GATE_MANIFEST), readJson(V38_SOURCE_AUDIT)]);
const contexts = [];

for (const debate of manifest.sample.debates) {
  const packetPath = `${V38_ROOT}/source-preparation/proposal/packets/debate-${debate.number}.json`;
  const proposalSchemaPath = `${V38_ROOT}/source-preparation/proposal/schemas/debate-${debate.number}.schema.json`;
  const proposalPath = `${V38_ROOT}/source-preparation/proposal/outputs/debate-${debate.number}.json`;
  const eventsPath = audit.debateSources[debate.number].eventsPath;
  const [packet, proposalSchema, proposal, events] = await Promise.all([readJson(packetPath), readJson(proposalSchemaPath), readJson(proposalPath), readJson(eventsPath)]);
  validateProposalOutput(proposal, packet, proposalSchema, events);
  const reviewPacket = makeReviewPacket(packet, proposal, events);
  const reviewSchema = makeReviewSchema(packet, reviewPacket);
  const reviewPacketPath = `${V38_ROOT}/source-preparation/review/packets/debate-${debate.number}.json`;
  const reviewSchemaPath = `${V38_ROOT}/source-preparation/review/schemas/debate-${debate.number}.schema.json`;
  if (shouldWrite) {
    await mkdir(path.dirname(path.resolve(root, reviewPacketPath)), { recursive: true });
    await mkdir(path.dirname(path.resolve(root, reviewSchemaPath)), { recursive: true });
    await writeFile(path.resolve(root, reviewPacketPath), `${JSON.stringify(reviewPacket, null, 2)}\n`);
    await writeFile(path.resolve(root, reviewSchemaPath), `${JSON.stringify(reviewSchema, null, 2)}\n`);
  }
  contexts.push({ debateNumber: debate.number, packetPath: reviewPacketPath, schemaPath: reviewSchemaPath, candidateMoveCount: reviewPacket.candidates.length, proposalLabelsExposed: false });
}

console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", contexts }, null, 2));
