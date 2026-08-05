#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { readJson } from "./lib/v41-lean-production.mjs";
import { validateV421PrimaryOutput } from "./lib/v421-compact-fresh.mjs";

const [outputPath, packetPath] = process.argv.slice(2);
if (!outputPath || !packetPath) throw new Error("usage: validate-v421-primary-output.mjs OUTPUT PACKET");
const [output, packet] = await Promise.all([readJson(outputPath), readJson(packetPath)]);
const [eventsBytes, ledgerBytes] = await Promise.all([readFile(packet.sourceChain.eventsPath), readFile(packet.transportChain.sourceLedgerPath)]);
console.log(JSON.stringify(validateV421PrimaryOutput(output, packet, JSON.parse(eventsBytes), eventsBytes, ledgerBytes), null, 2));
