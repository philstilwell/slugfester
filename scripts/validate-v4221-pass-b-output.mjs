#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { validateV4221PassBOutput } from "./lib/v4221-pass-b-consensus.mjs";

const [outputPath, packetPath, sourcePacketPath] = process.argv.slice(2);
if (!outputPath || !packetPath || !sourcePacketPath) throw new Error("usage: validate-v4221-pass-b-output.mjs <output> <pass-b-packet> <source-packet>");
const [output, packet, sourcePacket] = await Promise.all([outputPath, packetPath, sourcePacketPath].map((file) => readFile(file, "utf8").then(JSON.parse)));
const [eventsBytes, ledgerBytes] = await Promise.all([readFile(sourcePacket.sourceChain.eventsPath), readFile(sourcePacket.transportChain.sourceLedgerPath)]);
console.log(JSON.stringify(validateV4221PassBOutput(output, packet, sourcePacket, JSON.parse(eventsBytes), eventsBytes, ledgerBytes), null, 2));
