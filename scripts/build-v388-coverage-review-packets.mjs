#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V388_DEBATE_NUMBERS, V388_ROOT, makeReviewArtifacts, makeReviewSchema } from "./lib/v388-coverage-review.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const proposalPaths = {
  "103": "docs/calibration/v3.8.4/held-out-score-reconstruction-gate/coverage/proposal/enriched-outputs/debate-103.json",
  "55": "docs/calibration/v3.8.4/held-out-score-reconstruction-gate/coverage/proposal/enriched-outputs/debate-55.json",
  "161": "docs/calibration/v3.8.7/coverage-batch-span-correction/enriched-output.json"
};
const packetPaths = Object.fromEntries(V388_DEBATE_NUMBERS.map((debateNumber) => [debateNumber, `docs/calibration/v3.8.4/held-out-score-reconstruction-gate/coverage/proposal/packets/debate-${debateNumber}.json`]));
const contexts = [];
for (const debateNumber of V388_DEBATE_NUMBERS) {
  const [proposalPacket, enriched] = await Promise.all([readJson(packetPaths[debateNumber]), readJson(proposalPaths[debateNumber])]);
  const { packet, mapping } = makeReviewArtifacts(proposalPacket, enriched);
  const schema = makeReviewSchema(packet);
  const packetPath = `${V388_ROOT}/packets/debate-${debateNumber}.json`;
  const mappingPath = `${V388_ROOT}/private-mappings/debate-${debateNumber}.json`;
  const schemaPath = `${V388_ROOT}/schemas/debate-${debateNumber}.schema.json`;
  if (shouldWrite) {
    for (const file of [packetPath, mappingPath, schemaPath]) await mkdir(path.dirname(path.resolve(root, file)), { recursive: true });
    await writeFile(path.resolve(root, packetPath), `${JSON.stringify(packet, null, 2)}\n`);
    await writeFile(path.resolve(root, mappingPath), `${JSON.stringify(mapping, null, 2)}\n`);
    await writeFile(path.resolve(root, schemaPath), `${JSON.stringify(schema, null, 2)}\n`);
  }
  contexts.push({ debateNumber, proposalPacket: packetPaths[debateNumber], proposal: proposalPaths[debateNumber], packet: packetPath, privateMapping: mappingPath, schema: schemaPath, candidateCount: packet.candidates.length, output: `${V388_ROOT}/outputs/debate-${debateNumber}.json` });
}
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", contexts, modelContextsExecuted: 0 }, null, 2));
