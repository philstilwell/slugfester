#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V388_SECTION_DEBATES, V388_SECTION_ROOT, makeSectionPacket, makeSectionSchema } from "./lib/v388-section-weight.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const inventory = JSON.parse(await readFile(path.resolve(root, "docs/calibration/v3.8.8/coverage-consensus/final-coverage-inventory.json"), "utf8"));
const summaries = [];
for (const debateNumber of V388_SECTION_DEBATES) {
  const debate = inventory.debates.find((item) => item.debateNumber === debateNumber);
  const packet = makeSectionPacket(debate);
  const schema = makeSectionSchema(packet);
  if (shouldWrite) {
    await mkdir(path.resolve(root, `${V388_SECTION_ROOT}/packets`), { recursive: true });
    await mkdir(path.resolve(root, `${V388_SECTION_ROOT}/schemas`), { recursive: true });
    await writeFile(path.resolve(root, `${V388_SECTION_ROOT}/packets/debate-${debateNumber}.json`), `${JSON.stringify(packet, null, 2)}\n`);
    await writeFile(path.resolve(root, `${V388_SECTION_ROOT}/schemas/debate-${debateNumber}.schema.json`), `${JSON.stringify(schema, null, 2)}\n`);
  }
  summaries.push({ debateNumber, moves: packet.moves.length, bridges: packet.acceptedBridgeIds.length });
}
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", debates: summaries, scoringAuthorized: false }, null, 2));
