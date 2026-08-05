#!/usr/bin/env node

import { readJson } from "./lib/v41-lean-production.mjs";
import { validateV415PassBOutput } from "./lib/v415-triggered-consensus.mjs";

const [outputPath, packetPath, sourcePacketPath] = process.argv.slice(2);
if (!outputPath || !packetPath || !sourcePacketPath) throw new Error("usage: validate-v415-pass-b-output.mjs <output> <pass-b-packet> <source-packet>");
const [output, packet, sourcePacket] = await Promise.all([readJson(outputPath), readJson(packetPath), readJson(sourcePacketPath)]);
console.log(JSON.stringify(validateV415PassBOutput(output, packet, sourcePacket), null, 2));
