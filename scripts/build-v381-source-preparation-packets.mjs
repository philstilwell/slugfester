#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V381_ROOT, V38_GATE_MANIFEST, V38_SOURCE_AUDIT, assert, makeProposalSchema, proposalPacket } from "./lib/v381-source-preparation.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const [gate, audit] = await Promise.all([readJson(V38_GATE_MANIFEST), readJson(V38_SOURCE_AUDIT)]);
assert(audit.status === "passed-local-chain-hashes-heldout-content-opened-for-source-preparation", "source audit is not ready");
const contexts = [];
for (const debate of gate.sample.debates) {
  const source = audit.debateSources[debate.number];
  assert(source?.debateId === debate.debateId, `${debate.number}: source audit mismatch`);
  const packet = proposalPacket(debate, source);
  const schema = makeProposalSchema(packet);
  const packetPath = `${V381_ROOT}/proposal/packets/debate-${debate.number}.json`;
  const schemaPath = `${V381_ROOT}/proposal/schemas/debate-${debate.number}.schema.json`;
  if (shouldWrite) {
    await mkdir(path.dirname(path.resolve(root, packetPath)), { recursive: true });
    await mkdir(path.dirname(path.resolve(root, schemaPath)), { recursive: true });
    await writeFile(path.resolve(root, packetPath), `${JSON.stringify(packet, null, 2)}\n`);
    await writeFile(path.resolve(root, schemaPath), `${JSON.stringify(schema, null, 2)}\n`);
  }
  contexts.push({ debateNumber: debate.number, packet: packetPath, schema: schemaPath, rawOutput: `${V381_ROOT}/proposal/raw-outputs/debate-${debate.number}.json`, enrichedOutput: `${V381_ROOT}/proposal/enriched-outputs/debate-${debate.number}.json`, transcript: source.transcriptPath, events: source.eventsPath });
}
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", contexts }, null, 2));
