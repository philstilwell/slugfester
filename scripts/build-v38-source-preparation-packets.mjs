#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V38_GATE_MANIFEST, V38_ROOT, V38_SOURCE_AUDIT, assert, makeProposalSchema, proposalPacket } from "./lib/v38-source-preparation.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const manifest = JSON.parse(await readFile(path.resolve(root, V38_GATE_MANIFEST), "utf8"));
const audit = JSON.parse(await readFile(path.resolve(root, V38_SOURCE_AUDIT), "utf8"));
assert(audit.status === "passed-local-chain-hashes-heldout-content-opened-for-source-preparation", "source audit is not ready");

const contexts = [];
for (const debate of manifest.sample.debates) {
  const source = audit.debateSources[debate.number];
  assert(source?.debateId === debate.debateId, `${debate.number}: source audit mismatch`);
  const packet = proposalPacket(debate, source);
  const schema = makeProposalSchema(packet);
  const packetPath = `${V38_ROOT}/source-preparation/proposal/packets/debate-${debate.number}.json`;
  const schemaPath = `${V38_ROOT}/source-preparation/proposal/schemas/debate-${debate.number}.schema.json`;
  if (shouldWrite) {
    await mkdir(path.dirname(path.resolve(root, packetPath)), { recursive: true });
    await mkdir(path.dirname(path.resolve(root, schemaPath)), { recursive: true });
    await writeFile(path.resolve(root, packetPath), `${JSON.stringify(packet, null, 2)}\n`);
    await writeFile(path.resolve(root, schemaPath), `${JSON.stringify(schema, null, 2)}\n`);
  }
  contexts.push({ debateNumber: debate.number, packetPath, schemaPath, routeCount: 2, bridgeCount: 10, candidateMoveCount: 8 });
}

console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", contexts }, null, 2));
