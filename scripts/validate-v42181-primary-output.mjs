#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { validateV42181PrimaryOutput } from "./lib/v42181-fresh-direct-three.mjs";

const [outputPath, packetPath] = process.argv.slice(2);
if (!outputPath || !packetPath) throw new Error("usage: validate-v42181-primary-output.mjs <output> <packet>");
const [output, packet] = await Promise.all([readFile(outputPath, "utf8").then(JSON.parse), readFile(packetPath, "utf8").then(JSON.parse)]);
const [eventsBytes, ledgerBytes] = await Promise.all([readFile(packet.sourceChain.eventsPath), readFile(packet.transportChain.sourceLedgerPath)]);
console.log(JSON.stringify(validateV42181PrimaryOutput(output, packet, JSON.parse(eventsBytes), eventsBytes, ledgerBytes), null, 2));
