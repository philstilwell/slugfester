#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { readJson } from "./lib/v41-lean-production.mjs";
import { validateV418PrimaryOutput } from "./lib/v418-source-integrity.mjs";

const [outputPath, packetPath] = process.argv.slice(2);
if (!outputPath || !packetPath) throw new Error("usage: validate-v418-primary-output.mjs OUTPUT PACKET");
const [output, packet] = await Promise.all([readJson(outputPath), readJson(packetPath)]);
const eventsBytes = await readFile(packet.sourceChain.eventsPath);
const eventsDocument = JSON.parse(eventsBytes);
console.log(JSON.stringify(validateV418PrimaryOutput(output, packet, eventsDocument, eventsBytes), null, 2));
