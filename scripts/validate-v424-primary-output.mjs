#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { readJson } from "./lib/v41-lean-production.mjs";
import { validateV424PrimaryOutput } from "./lib/v424-screened-chronology-fresh.mjs";

const [outputPath, packetPath] = process.argv.slice(2);
if (!outputPath || !packetPath) throw new Error("usage: validate-v424-primary-output.mjs OUTPUT PACKET");
const [output, packet] = await Promise.all([readJson(outputPath), readJson(packetPath)]);
const [eventsBytes, ledgerBytes] = await Promise.all([readFile(packet.sourceChain.eventsPath), readFile(packet.transportChain.sourceLedgerPath)]);
console.log(JSON.stringify(validateV424PrimaryOutput(output, packet, JSON.parse(eventsBytes), eventsBytes, ledgerBytes), null, 2));
