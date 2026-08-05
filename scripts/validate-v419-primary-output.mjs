#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { readJson } from "./lib/v41-lean-production.mjs";
import { validateV419PrimaryOutput } from "./lib/v419-schema-bounded-source.mjs";

const [outputPath, packetPath] = process.argv.slice(2);
if (!outputPath || !packetPath) throw new Error("usage: validate-v419-primary-output.mjs OUTPUT PACKET");
const [output, packet] = await Promise.all([readJson(outputPath), readJson(packetPath)]);
const eventsBytes = await readFile(packet.sourceChain.eventsPath);
console.log(JSON.stringify(validateV419PrimaryOutput(output, packet, JSON.parse(eventsBytes), eventsBytes), null, 2));
