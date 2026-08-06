#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { validateV4219PrimaryOutput } from "./lib/v4219-primary-recovery.mjs";

const [outputPath, packetPath] = process.argv.slice(2);
if (!outputPath || !packetPath) throw new Error("usage: validate-v4219-primary-output.mjs <output> <packet>");
const [output, packet] = await Promise.all([
  readFile(outputPath, "utf8").then(JSON.parse),
  readFile(packetPath, "utf8").then(JSON.parse)
]);
const [eventsBytes, ledgerBytes] = await Promise.all([
  readFile(packet.sourceChain.eventsPath),
  readFile(packet.transportChain.sourceLedgerPath)
]);
console.log(JSON.stringify(validateV4219PrimaryOutput(output, packet, JSON.parse(eventsBytes), eventsBytes, ledgerBytes), null, 2));
