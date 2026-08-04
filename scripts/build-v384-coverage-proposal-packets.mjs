#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  V384_COVERAGE_ROOT,
  V384_GATE_MANIFEST,
  assert,
  makeCoverageProposalPacket,
  makeCoverageProposalSchema
} from "./lib/v384-coverage-preparation.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const gate = await readJson(V384_GATE_MANIFEST);

assert(gate.status === "frozen-preregistration-construction-only", "v3.8.4 gate preregistration is not frozen");
assert(gate.authorization.deterministicPacketConstruction === true && gate.authorization.coverageProposalModelExecution === false, "coverage packet construction boundary invalid");

const contexts = [];
for (const debate of gate.sample.debates) {
  const [resolved, events] = await Promise.all([
    readJson(debate.resolvedSeedInventoryPath),
    readJson(debate.events.path)
  ]);
  const packet = makeCoverageProposalPacket(debate, resolved, events);
  const schema = makeCoverageProposalSchema(packet);
  const packetPath = `${V384_COVERAGE_ROOT}/proposal/packets/debate-${debate.debateNumber}.json`;
  const schemaPath = `${V384_COVERAGE_ROOT}/proposal/schemas/debate-${debate.debateNumber}.schema.json`;
  if (shouldWrite) {
    await mkdir(path.dirname(path.resolve(root, packetPath)), { recursive: true });
    await mkdir(path.dirname(path.resolve(root, schemaPath)), { recursive: true });
    await writeFile(path.resolve(root, packetPath), `${JSON.stringify(packet, null, 2)}\n`);
    await writeFile(path.resolve(root, schemaPath), `${JSON.stringify(schema, null, 2)}\n`);
  }
  contexts.push({
    debateNumber: debate.debateNumber,
    packet: packetPath,
    schema: schemaPath,
    rawOutput: `${V384_COVERAGE_ROOT}/proposal/raw-outputs/debate-${debate.debateNumber}.json`,
    enrichedOutput: `${V384_COVERAGE_ROOT}/proposal/enriched-outputs/debate-${debate.debateNumber}.json`,
    transcript: debate.transcript.path,
    events: debate.events.path
  });
}

console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", proposalContexts: contexts }, null, 2));
