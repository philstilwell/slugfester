#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { validateV42211PassBOutput } from "./lib/v42211-charity-closure.mjs";

const [outputPath, packetPath, sourcePacketPath] = process.argv.slice(2);
if (!outputPath || !packetPath || !sourcePacketPath) throw new Error("usage: validate-v42211-pass-b-output.mjs <output> <pass-b-packet> <source-packet>");
const [output, packet, sourcePacket] = await Promise.all([outputPath, packetPath, sourcePacketPath].map((file) => readFile(file, "utf8").then(JSON.parse)));
const [eventsBytes, ledgerBytes] = await Promise.all([readFile(sourcePacket.sourceChain.eventsPath), readFile(sourcePacket.transportChain.sourceLedgerPath)]);
console.log(JSON.stringify(validateV42211PassBOutput(output, packet, sourcePacket, JSON.parse(eventsBytes), eventsBytes, ledgerBytes), null, 2));
